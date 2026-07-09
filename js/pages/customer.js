// ── customer.js ──────────────────────────────────────────────────────────────
// Individual customer ledger page — Premium monochrome theme
// ---------------------------------------------------------------------------

import { customers, transactions as txDb } from '../db.js';
import { recalculateLedger, getLiveRow } from '../engine.js';
import { formatCurrency, formatDate, formatDateShort, todayStr, generateId } from '../utils/format.js';
import { showToast } from '../components/toast.js';
import { showCustomerModal, showTransactionModal, showConfirmModal, showReminderModal } from '../components/modal.js';
import { shareReceipt, shareAccountSummary } from '../components/whatsapp.js';

// ── Premium SVG icons (stroke-width 1.5, round caps) ────────────────────────
const ICON_BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;
const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const ICON_PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_WA   = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
const ICON_SHARE_SM  = `<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
const ICON_EDIT_SM   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const ICON_DELETE_SM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;

// ── Module state ─────────────────────────────────────────────────────────────
let _customerId = null;
let _customer   = null;
let _enriched   = [];
let _liveRow    = null;

export async function renderCustomerPage(customerId) {
  _customerId = customerId;
  const pc = document.getElementById('page-container');

  _customer = await customers.get(customerId);
  if (!_customer) {
    pc.innerHTML = `<div class="error-state">Customer not found.</div>`;
    return;
  }

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  pc.innerHTML = `
    <div class="page kb-page" id="customer-page">

      <!-- KB Header -->
      <header class="kb-header">
        <button class="kb-back-btn" id="back-btn" aria-label="Back">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <div class="kb-avatar">${getInitials(_customer.name)}</div>
        <div class="kb-header-info" id="edit-customer-btn" style="cursor:pointer;">
          <div class="kb-name">${_customer.name} <span class="kb-tag">Customer</span></div>
          <div class="kb-subtitle">View settings</div>
        </div>
        <a href="tel:${_customer.phone.replace(/\D/g, '')}" class="kb-icon-btn" title="Call Customer" style="display: flex;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        </a>
      </header>

      <!-- Floating Balance Card -->
      <div class="kb-hero-wrapper">
        <div class="kb-hero-card">
          <div class="kb-hero-label" id="kb-hero-label">You will give</div>
          <div style="display: flex; flex-direction: column; align-items: flex-end;">
            <div class="kb-hero-value" id="bb-balance">₹ 0</div>
            <div class="kb-hero-principal" id="bb-principal" style="font-size: 0.75rem; font-weight: 500; color: var(--text-4); margin-top: 2px;">Principal: ₹ 0</div>
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="kb-action-bar">
        <div class="kb-action-item" id="btn-action-report">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Report
        </div>
        <div class="kb-action-item" id="btn-action-reminder">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Reminder
        </div>
        <div class="kb-action-item" id="btn-action-sms">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          SMS
        </div>
      </div>

      <!-- Ledger Headers -->
      <div class="kb-ledger-header">
        <div class="kb-col kb-col-entries">ENTRIES</div>
        <div class="kb-col kb-col-gave">YOU GAVE</div>
        <div class="kb-col kb-col-got">YOU GOT</div>
      </div>

      <!-- Ledger Main -->
      <main class="kb-ledger-main" id="ledger-main">
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
      </main>

      <!-- Fixed Bottom Buttons -->
      <div class="kb-bottom-bar">
        <button class="kb-btn kb-btn-gave" id="add-debit-btn">YOU GAVE ₹</button>
        <button class="kb-btn kb-btn-got" id="add-credit-btn">YOU GOT ₹</button>
      </div>

    </div>
  `;

  // Wire up
  document.getElementById('back-btn').onclick = () => { window.location.hash = '#dashboard'; };

  document.getElementById('edit-customer-btn').onclick = async () => {
    const updated = await showCustomerModal(_customer);
    if (updated) {
      await customers.update(updated);
      _customer = updated;
      showToast('Customer updated!');
      renderCustomerPage(customerId);
    }
  };

  document.getElementById('delete-customer-btn').onclick = async () => {
    const confirm = await showConfirmModal('Delete Customer', 'This will permanently delete this customer and ALL their transactions. This action cannot be undone. Are you absolutely sure?');
    if (confirm) {
      // 1. Delete all transactions for this customer
      const rawTxs = await txDb.getByCustomer(_customerId);
      for (const tx of rawTxs) {
        await txDb.delete(tx.id);
      }
      
      // 2. Delete the customer
      await customers.delete(_customerId);
      
      showToast('Customer and all transactions deleted', 'success');
      window.location.hash = '#dashboard';
    }
  };

  const handleAddTx = async (type) => {
    const newTx = await showTransactionModal(null, customerId, type);
    if (newTx) {
      newTx.id = generateId();
      newTx.customerId = customerId;
      await txDb.add(newTx);
      showToast('Transaction added!', 'success');
      await refreshLedger();
    }
  };

  document.getElementById('add-credit-btn').onclick = () => handleAddTx('credit');
  document.getElementById('add-debit-btn').onclick  = () => handleAddTx('debit');

  const openReminderModal = () => {
    const principal = _liveRow ? _liveRow.principalBalance : (_enriched.length > 0 ? _enriched[_enriched.length - 1].principalBalance : 0);
    const balance = _liveRow ? _liveRow.closingBalance : (_enriched.length > 0 ? _enriched[_enriched.length - 1].closingBalance : 0);
    showReminderModal(_customer, balance, principal);
  };

  document.getElementById('btn-action-reminder').onclick = openReminderModal;
  document.getElementById('btn-action-sms').onclick = openReminderModal;

  document.getElementById('btn-action-report').onclick = () => {
    if (_enriched.length === 0) { showToast('No transactions to report', 'info'); return; }
    shareAccountSummary(_customer, _enriched, _liveRow);
  };

  await refreshLedger();
}

async function refreshLedger() {
  const rawTxs = await txDb.getByCustomer(_customerId);
  _enriched = recalculateLedger(rawTxs, _customer);
  _liveRow  = getLiveRow(_enriched, _customer, todayStr());

  const currentBalance = _liveRow
    ? _liveRow.closingBalance
    : _enriched.length > 0 ? _enriched[_enriched.length - 1].closingBalance : 0;

  const bbEl = document.getElementById('bb-balance');
  const bbLabel = document.getElementById('kb-hero-label');
  if (bbEl && bbLabel) {
    bbEl.textContent = formatCurrency(Math.abs(currentBalance));
    if (currentBalance === 0) {
      bbLabel.textContent = 'Settled up';
      bbEl.className = 'kb-hero-value';
    } else if (currentBalance < 0) {
      bbLabel.textContent = 'You will get'; // In our app, negative balance means customer owes us, so we get. Or wait, if debit = GAVE, and credit = GOT. GAVE (debit) makes balance negative. If balance negative, we gave them money, so "You will get".
      bbEl.className = 'kb-hero-value kb-green';
    } else {
      bbLabel.textContent = 'You will give'; // Positive balance = we got money from them, so we give them back.
      bbEl.className = 'kb-hero-value kb-red';
    }
    const principal = _liveRow ? _liveRow.principalBalance : _enriched[_enriched.length - 1].principalBalance;
    document.getElementById('bb-principal').textContent = 'Principal: ' + formatCurrency(Math.abs(principal));
  }

  renderLedgerTable();
}

function renderLedgerTable() {
  const main = document.getElementById('ledger-main');
  if (!main) return;

  if (_enriched.length === 0 && !_liveRow) {
    main.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <h3>No Transactions Yet</h3>
      </div>
    `;
    return;
  }

  // Group by date
  const groups = {};
  const reversed = [..._enriched].reverse();
  
  if (_liveRow) {
    const monthStr = _liveRow.date.substring(0, 7); // YYYY-MM
    groups[monthStr] = [_liveRow];
  }
  
  for (const tx of reversed) {
    const monthStr = tx.date.substring(0, 7);
    if (!groups[monthStr]) groups[monthStr] = [];
    groups[monthStr].push(tx);
  }

  let html = '';
  
  for (const [monthStr, txs] of Object.entries(groups)) {
    const [yyyy, mm] = monthStr.split('-');
    const dateObj = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, 1);
    const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    
    html += `
      <div class="kb-date-header">
        <span class="kb-date-line"></span>
        <span class="kb-date-text">${dateLabel}</span>
        <span class="kb-date-line"></span>
      </div>
    `;
    
    for (const tx of txs) {
      html += buildKbRow(tx, tx === _liveRow);
    }
  }

  main.innerHTML = html;

  // Wire row clicks for edit/actions
  document.querySelectorAll('.kb-tx-row').forEach((row) => {
    row.onclick = async (e) => {
      if (row.classList.contains('kb-live-row')) return;
      const id = row.dataset.id;
      const tx = _enriched.find(t => t.id === id);
      if (!tx) return;

      if (e.target.closest('.kb-tx-menu')) {
        e.stopPropagation();
        
        // Remove any existing dropdowns first
        document.querySelectorAll('.tx-dropdown').forEach(el => el.remove());

        const rect = e.target.closest('.kb-tx-menu').getBoundingClientRect();
        
        const sheetHtml = `
          <div id="tx-dropdown-overlay" class="tx-dropdown" style="position: fixed; inset: 0; z-index: 1000;"></div>
          <div id="tx-dropdown-menu" class="tx-dropdown" style="position: fixed; top: ${rect.bottom + 4}px; right: 16px; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid var(--border); z-index: 1001; min-width: 150px; overflow: hidden; animation: fade-in 0.15s ease-out;">
            <button id="tx-action-edit" style="width: 100%; padding: 12px 16px; background: transparent; border: none; color: var(--text-1); font-size: 0.9rem; text-align: left; display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit
            </button>
            <div style="height: 1px; background: var(--border);"></div>
            <button id="tx-action-delete" style="width: 100%; padding: 12px 16px; background: transparent; border: none; color: var(--red); font-size: 0.9rem; text-align: left; display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Delete
            </button>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', sheetHtml);
        
        const closeSheet = () => document.querySelectorAll('.tx-dropdown').forEach(el => el.remove());

        document.getElementById('tx-dropdown-overlay').onclick = closeSheet;

        document.getElementById('tx-action-edit').onclick = async () => {
          closeSheet();
          const updated = await showTransactionModal(tx, _customerId);
          if (updated) {
            await txDb.update(updated);
            showToast('Transaction updated', 'success');
            refreshLedger();
          }
        };

        document.getElementById('tx-action-delete').onclick = async () => {
          closeSheet();
          const confirm = await showConfirmModal('Delete Transaction', 'Are you sure you want to permanently delete this transaction?');
          if (confirm) {
            await txDb.delete(tx.id);
            showToast('Transaction deleted', 'success');
            refreshLedger();
          }
        };
      } else {
        // Normal row click -> directly open edit for convenience
        const updated = await showTransactionModal(tx, _customerId);
        if (updated) {
          await txDb.update(updated);
          showToast('Transaction updated', 'success');
          refreshLedger();
        }
      }
    };
  });
}

function buildKbRow(tx, isLive) {
  // debit = gave, credit = got
  const isDebit = tx.amount < 0; 
  const isCredit = tx.amount > 0;
  
  const absAmount = Math.abs(tx.amount);
  const amountStr = absAmount > 0 ? formatCurrency(absAmount) : '';
  
  let gaveHtml = '';
  let gotHtml = '';
  
  if (isDebit) {
    gaveHtml = `<div class="kb-amt kb-gave-text">${amountStr}</div>`;
  } else if (isCredit) {
    gotHtml = `<div class="kb-amt kb-got-text">${amountStr}</div>`;
  }

  // Time formatting (e.g. 01 Jul, 07:02 PM)
  let timeStr = '';
  if (!isLive && tx.date) {
    try {
      const d = new Date(tx.date);
      const datePart = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      timeStr = `${datePart}, ${timePart}`;
    } catch(e) {}
  }
  
  const closingStr = formatCurrency(Math.abs(tx.closingBalance));
  const closingColor = tx.closingBalance === 0 ? 'kb-bal-neutral' : (tx.closingBalance < 0 ? 'kb-bal-green' : 'kb-bal-red'); // negative balance = they owe us (we get) -> green pill? Khatabook uses green pill if positive? Usually GAVE (we lent money) is red, they owe us. Khatabook uses red for "You gave", green for "You got". If I gave 1000, balance is 1000 (I get back). Let's just color it based on sign.

  if (isLive) {
    return `
      <div class="kb-tx-row kb-live-row">
        <div class="kb-col kb-col1">
          <div class="kb-tx-time">Today</div>
          <div class="kb-tx-bal ${closingColor}">Bal. ${closingStr}</div>
        </div>
        <div class="kb-col kb-col2 kb-gave-bg"></div>
        <div class="kb-col kb-col3 kb-got-bg"></div>
        <div class="kb-tx-overlay">
          ${tx.description} (Int: ${formatCurrency(Math.abs(tx.interestApplied || 0))})
        </div>
      </div>
    `;
  }

  return `
    <div class="kb-tx-row" data-id="${tx.id}" style="padding-right: 32px;">
      <div class="kb-col kb-col1">
        <div class="kb-tx-time">${timeStr}</div>
        <div class="kb-tx-bal ${closingColor}">Bal. ${closingStr}</div>
      </div>
      <div class="kb-col kb-col2 ${isDebit ? 'kb-gave-bg' : ''}">
        ${gaveHtml}
      </div>
      <div class="kb-col kb-col3 ${isCredit ? 'kb-got-bg' : ''}">
        ${gotHtml}
      </div>
      <div class="kb-tx-menu" style="position: absolute; right: 8px; top: 16px; cursor: pointer; padding: 4px; color: var(--text-4);">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>
      </div>
    </div>
  `;
}
