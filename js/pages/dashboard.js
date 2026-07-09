// ── dashboard.js ─────────────────────────────────────────────────────────────
// Customer list dashboard — Premium monochrome theme
// ---------------------------------------------------------------------------

import { customers, transactions } from '../db.js';
import { recalculateLedger, getLiveRow } from '../engine.js';
import { formatCurrency, todayStr } from '../utils/format.js';

let searchQuery = '';

// SVG icons (premium thin stroke)
const ICON_SEARCH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`;

export async function renderDashboard() {
  const pc = document.getElementById('page-container');
  pc.innerHTML = `
    <div class="page" id="dashboard-page" style="padding-top: 0;">
      <header class="page-header" style="background: #fff; padding-bottom: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); z-index: 50;">
        <div class="search-bar-wrapper" style="padding-bottom: 0;">
          <div style="display: flex; gap: 8px;">
            <div class="search-bar" style="flex: 1;">
              <span class="search-icon">${ICON_SEARCH}</span>
              <input type="search" id="dashboard-search"
                     placeholder="Search Customer"
                     value="${searchQuery}" autocomplete="off"
                     aria-label="Search customers" />
              <svg class="search-filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            </div>
            <button style="display: flex; align-items: center; gap: 6px; padding: 0 12px; background: #fff; border: 1px solid var(--brand-blue); border-radius: 6px; color: var(--brand-blue); font-weight: 600; font-size: 0.8rem; cursor: pointer;">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M7 15h0M7 9h0M11 15h0M11 9h0M15 15h0M15 9h0"></path></svg>
              Cashbook
            </button>
          </div>
        </div>
      </header>

      <main class="page-main" id="dashboard-main" style="padding: 0; padding-bottom: 120px;">
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
      </main>
    </div>
  `;

  document.getElementById('dashboard-search').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderCustomerCards();
  });

  await renderCustomerCards();
}

async function renderCustomerCards() {
  const main = document.getElementById('dashboard-main');
  if (!main) return;

  try {
    const allCustomers = await customers.getAll();
    const today = todayStr();

    const filtered = allCustomers.filter(c =>
      c.name.toLowerCase().includes(searchQuery) ||
      c.phone.includes(searchQuery)
    );

    if (filtered.length === 0) {
      main.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">◎</span>
          <h3>${searchQuery ? 'No results found' : 'No customers yet'}</h3>
          <p>${searchQuery
            ? 'Try a different name or phone number.'
            : 'Tap the <strong>+</strong> button below to add your first customer.'}</p>
        </div>
      `;
      return;
    }

    const cards = await Promise.all(
      filtered.map(async (customer) => {
        try {
          const txs = await transactions.getByCustomer(customer.id);
          const enriched = recalculateLedger(txs, customer);
          const liveRow = getLiveRow(enriched, customer, today);
          const balance = liveRow
            ? liveRow.closingBalance
            : enriched.length > 0 ? enriched[enriched.length - 1].closingBalance : 0;
          const principal = liveRow
            ? liveRow.principalBalance
            : enriched.length > 0 ? enriched[enriched.length - 1].principalBalance : 0;
          return { customer, balance, principal, txCount: txs.length };
        } catch {
          return { customer, balance: 0, principal: 0, txCount: 0 };
        }
      })
    );

    cards.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    const totalPositive = cards.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0);
    const totalOverdraft = cards.filter(c => c.balance < 0).reduce((s, c) => s + c.balance, 0);

    main.innerHTML = `
      <div class="customers-grid" id="customers-grid">
        ${cards.map(({ customer, balance, principal, txCount }) =>
          buildCustomerCard(customer, balance, principal, txCount)
        ).join('')}
      </div>
    `;

    main.querySelectorAll('.customer-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // If clicking the remind button, don't navigate
        if (e.target.closest('.remind-link')) return;
        window.location.hash = `#customer/${card.dataset.id}`;
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          window.location.hash = `#customer/${card.dataset.id}`;
        }
      });
    });

    main.querySelectorAll('.remind-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.stopPropagation();
        const cid = link.dataset.id;
        const balance = parseFloat(link.dataset.balance);
        const principal = parseFloat(link.dataset.principal);
        const cardInfo = cards.find(c => c.customer.id === cid);
        if (!cardInfo || !cardInfo.customer.phone) {
          alert('No phone number for this customer.');
          return;
        }

        // We will define showReminderModal in modal.js, but since dashboard doesn't import it yet,
        // we should dynamically import or add it to window, or import it at the top of dashboard.js.
        // Let's assume we'll export it from modal.js and import it here.
        import('../components/modal.js').then(module => {
           module.showReminderModal(cardInfo.customer, balance, principal);
        });
      });
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    main.innerHTML = `<div class="error-state">Failed to load: ${err.message}</div>`;
  }
}

function buildCustomerCard(customer, balance, principal, txCount) {
  // If balance < 0, customer owes us (Debit), so we get -> Red in Khatabook
  const isDebit = balance < 0; 
  const isCredit = balance > 0;
  
  const balanceClass = isDebit ? 'balance-negative' : (isCredit ? 'balance-positive' : '');
  const bgClass = isDebit ? 'kb-list-gave-bg' : (isCredit ? 'kb-list-got-bg' : '');
  
  const initials = customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  let rightActionHtml = '';
  if (isDebit) {
    rightActionHtml = `<div class="remind-link" data-id="${customer.id}" data-balance="${balance}" data-principal="${principal}">REMIND <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></div>`;
  }

  // Time ago logic for the screenshot aesthetic
  // For simplicity, we'll use a placeholder like "2 hours ago" or use the actual updated date if we had one.
  // Since we don't store "updatedAt" directly easily here without querying, let's just show the phone number as the meta for now, or "XX days ago" if we had last tx date.
  const metaText = customer.phone;

  return `
    <div class="customer-card" data-id="${customer.id}" role="button" tabindex="0">
      <div class="card-left">
        <div class="customer-avatar" aria-hidden="true">${initials}</div>
        <div class="customer-info">
          <div class="customer-name">${customer.name}</div>
          <div class="customer-meta">${metaText}</div>
        </div>
      </div>
      <div class="card-right ${bgClass}">
        <div class="balance-amount ${balanceClass}">${formatCurrency(Math.abs(balance))}</div>
        <div style="font-size: 0.65rem; color: var(--text-4); margin-bottom: 4px;">Principal: ${formatCurrency(Math.abs(principal))}</div>
        ${rightActionHtml}
      </div>
    </div>
  `;
}
