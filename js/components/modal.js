// ── modal.js ─────────────────────────────────────────────────────────────────
// Three modal types:
//   showCustomerModal(customer?)     → Promise<CustomerData|null>
//   showTransactionModal(tx?, cid)   → Promise<TransactionData|null>
//   showConfirmModal(title, message) → Promise<boolean>
// ---------------------------------------------------------------------------

import { todayStr, formatCurrency } from '../utils/format.js';

const overlay  = () => document.getElementById('modal-overlay');
const container = () => document.getElementById('modal-container');

function openModal(html) {
  const ov = overlay();
  const ct = container();
  ct.innerHTML = html;
  ov.classList.remove('hidden');
  ct.classList.remove('hidden');

  // Animate in
  requestAnimationFrame(() => {
    ov.classList.add('modal-overlay-visible');
    ct.querySelector('.modal')?.classList.add('modal-visible');
  });

  // Trap scroll
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const ov = overlay();
  const ct = container();
  const modal = ct.querySelector('.modal');

  ov.classList.remove('modal-overlay-visible');
  if (modal) modal.classList.remove('modal-visible');

  setTimeout(() => {
    ov.classList.add('hidden');
    ct.classList.add('hidden');
    ct.innerHTML = '';
    document.body.style.overflow = '';
  }, 280);
}

// ─────────────────────────── CUSTOMER MODAL ─────────────────────────────────

/**
 * Show Add/Edit customer modal.
 * @param {Customer|null} existing  Pass null for Add, existing object for Edit.
 * @returns {Promise<Object|null>}  Resolves with customer data or null on cancel.
 */
export function showCustomerModal(existing = null) {
  return new Promise((resolve) => {
    const isEdit = !!existing;
    const c = existing || {};

    openModal(`
      <div class="modal" id="customer-modal" role="dialog" aria-modal="true" aria-labelledby="cm-title">
        <div class="modal-header">
          <h2 id="cm-title">${isEdit ? 'Edit Customer' : 'Add New Customer'}</h2>
          <button class="modal-close-btn" id="cm-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="cm-name">Full Name</label>
            <input type="text" id="cm-name" placeholder="e.g. Rajesh Patel" value="${c.name || ''}" autocomplete="name" />
          </div>
          <div class="form-group">
            <label for="cm-phone">Phone Number</label>
            <input type="tel" id="cm-phone" placeholder="e.g. 9876543210" value="${c.phone || ''}" autocomplete="tel" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="cm-credit-rate">Return Rate (% p.a.)</label>
              <div class="input-hint">Applied when balance is <span class="badge-positive">positive</span></div>
              <input type="number" id="cm-credit-rate" placeholder="e.g. 12" value="${c.creditRate ?? ''}" min="0" max="100" step="0.01" />
            </div>
            <div class="form-group">
              <label for="cm-debit-rate">Overdraft Rate (% p.a.)</label>
              <div class="input-hint">Applied when balance is <span class="badge-negative">negative</span></div>
              <input type="number" id="cm-debit-rate" placeholder="e.g. 24" value="${c.debitRate ?? ''}" min="0" max="100" step="0.01" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="cm-cancel">Cancel</button>
          <button class="btn btn-primary" id="cm-save">${isEdit ? 'Save Changes' : 'Add Customer'}</button>
        </div>
      </div>
    `);

    // Focus first field
    setTimeout(() => document.getElementById('cm-name')?.focus(), 100);

    function cleanup(result) {
      closeModal();
      resolve(result);
    }

    document.getElementById('cm-close').onclick   = () => cleanup(null);
    document.getElementById('cm-cancel').onclick  = () => cleanup(null);
    overlay().onclick = (e) => { if (e.target === overlay()) cleanup(null); };

    document.getElementById('cm-save').onclick = () => {
      const name       = document.getElementById('cm-name').value.trim();
      const phone      = document.getElementById('cm-phone').value.trim();
      const creditRate = parseFloat(document.getElementById('cm-credit-rate').value);
      const debitRate  = parseFloat(document.getElementById('cm-debit-rate').value);

      if (!name) { highlightError('cm-name', 'Name is required'); return; }
      if (!phone) { highlightError('cm-phone', 'Phone is required'); return; }
      if (isNaN(creditRate) || creditRate < 0) { highlightError('cm-credit-rate', 'Enter a valid rate'); return; }
      if (isNaN(debitRate)  || debitRate  < 0) { highlightError('cm-debit-rate',  'Enter a valid rate'); return; }

      cleanup({
        ...(isEdit ? existing : {}),
        name,
        phone,
        creditRate,
        debitRate,
        preferredLang: 'en',
      });
    };

    // Enter key submits
    container().addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('cm-save')?.click();
      if (e.key === 'Escape') cleanup(null);
    });
  });
}

// ─────────────────────────── TRANSACTION MODAL ──────────────────────────────

/**
 * Show Add/Edit transaction modal.
 *
 * NEW UX:
 *  - Date (auto-filled to today)
 *  - Single Amount field (always positive)
 *  - Description
 *  - Footer: [+ Credit (green)] [− Debit (red)]  ← tap to save with that type
 *  - Edit mode also shows a [Cancel] button
 *
 * @param {EnrichedTransaction|null} existing  null = Add, object = Edit
 * @param {string}                   customerId
 * @param {string|null}              defaultType 'credit' or 'debit'
 * @returns {Promise<Object|null>}
 */
export function showTransactionModal(existing = null, customerId, defaultType = null) {
  return new Promise((resolve) => {
    const isEdit   = !!existing;
    const tx       = existing || {};
    const today    = todayStr();

    // For edit: pre-fill amount as positive and deduce type
    if (isEdit && tx.amount !== undefined) {
      defaultType = tx.amount >= 0 ? 'credit' : 'debit';
    }

    const initAmount = (isEdit && tx.amount !== undefined)
      ? Math.abs(tx.amount).toString()
      : '';

    openModal(`
      <div class="modal" id="tx-modal" role="dialog" aria-modal="true" aria-labelledby="tm-title">
        <div class="modal-header">
          <h2 id="tm-title">${isEdit ? 'Edit Transaction' : 'New Transaction'}</h2>
          <button class="modal-close-btn" id="tm-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="tm-date">Date</label>
            <input type="date" id="tm-date"
                   value="${tx.date || today}"
                   max="${today}" />
          </div>
          <div class="form-group">
            <label for="tm-amount">Amount (₹)</label>
            <input type="number" id="tm-amount"
                   placeholder="0.00"
                   value="${initAmount}"
                   min="0" step="0.01"
                   inputmode="decimal" />
          </div>
          <div class="form-group">
            <label for="tm-desc">Description</label>
            <input type="text" id="tm-desc"
                   placeholder="e.g. Loan, EMI received, Withdrawal…"
                   value="${tx.description || ''}" />
          </div>
        </div>

        <!-- Quick-tap footer -->
        <div class="tx-type-footer">
          ${isEdit ? '<button class="btn btn-ghost btn-sm" id="tm-cancel">Cancel</button>' : ''}
          ${(!defaultType || defaultType === 'credit') ? `
          <button class="btn-tx-credit" id="tm-credit-btn" aria-label="Save as credit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                 width="18" height="18">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Save Credit
          </button>
          ` : ''}
          ${(!defaultType || defaultType === 'debit') ? `
          <button class="btn-tx-debit" id="tm-debit-btn" aria-label="Save as debit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                 width="18" height="18">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Save Debit
          </button>
          ` : ''}
        </div>
      </div>
    `);

    // Auto-focus amount
    setTimeout(() => document.getElementById('tm-amount')?.focus(), 120);

    function cleanup(result) {
      closeModal();
      resolve(result);
    }

    function validateAndSave(type) {
      const date   = document.getElementById('tm-date').value;
      const rawAmt = parseFloat(document.getElementById('tm-amount').value);
      const desc   = document.getElementById('tm-desc').value.trim();

      if (!date) { highlightError('tm-date', 'Date is required'); return; }
      if (!rawAmt || rawAmt <= 0) { highlightError('tm-amount', 'Enter a valid amount'); return; }

      const amount = type === 'credit' ? rawAmt : -rawAmt;

      cleanup({
        ...(isEdit ? existing : {}),
        customerId,
        date,
        description: desc || (type === 'credit' ? 'Credit' : 'Debit'),
        amount,
        createdAt: isEdit ? (existing.createdAt || Date.now()) : Date.now(),
      });
    }

    document.getElementById('tm-close').onclick = () => cleanup(null);
    const crBtn = document.getElementById('tm-credit-btn');
    if (crBtn) crBtn.onclick = () => validateAndSave('credit');
    
    const dbBtn = document.getElementById('tm-debit-btn');
    if (dbBtn) dbBtn.onclick = () => validateAndSave('debit');

    if (isEdit) {
      const cancelBtn = document.getElementById('tm-cancel');
      if (cancelBtn) cancelBtn.onclick = () => cleanup(null);
    }

    overlay().onclick = (e) => { if (e.target === overlay()) cleanup(null); };
    container().addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cleanup(null);
    });
  });
}

/**
 * Show Reminder Options Modal
 */
export function showReminderModal(customer, balance, principal) {
  return new Promise((resolve) => {
    const isDebit = balance < 0;
    const status = isDebit ? 'You owe' : 'Positive'; 
    const balIcon = isDebit ? '🔴' : '🟢';
    const prinIcon = principal < 0 ? '🔴' : '🟢';

    const dateStr = new Date().toLocaleDateString();
    const balStr = (balance < 0 ? '-' : '') + formatCurrency(Math.abs(balance));
    const prinStr = (principal < 0 ? '-' : '') + formatCurrency(Math.abs(principal));

    openModal(`
      <div class="modal modal-entering" role="dialog" aria-labelledby="modal-title" style="max-width: 400px; width: 100%; border-radius: 24px 24px 0 0;">
        <div class="modal-header" style="border-bottom: none; padding-bottom: 0;">
          <h2 id="modal-title" style="font-size: 1.15rem;">Share Reminder</h2>
          <button class="modal-close" id="rm-close" aria-label="Close modal" style="background: var(--black-2); border-radius: 50%;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div class="modal-body">
          <p style="margin-bottom: 20px; font-size: 0.9rem; color: var(--text-3);">Select details to include for <strong style="color: var(--text-1);">${customer.name}</strong></p>
          
          <div class="rm-option" id="rm-opt-prin" data-checked="true" style="border: 2px solid var(--brand-blue); background: rgba(0, 102, 255, 0.05); padding: 16px; border-radius: 12px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s;">
            <div>
              <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 2px; color: var(--text-1);">Principal Balance</div>
              <div style="font-size: 0.85rem; color: var(--text-3); font-variant-numeric: tabular-nums;">${prinStr}</div>
            </div>
            <div class="rm-check" style="color: var(--brand-blue); display: flex;">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-.997-6l7.07-7.071-1.414-1.414-5.656 5.657-2.829-2.829-1.414 1.414L11.003 16z"/></svg>
            </div>
          </div>
          
          <div class="rm-option" id="rm-opt-bal" data-checked="true" style="border: 2px solid var(--brand-blue); background: rgba(0, 102, 255, 0.05); padding: 16px; border-radius: 12px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s;">
            <div>
              <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 2px; color: var(--text-1);">Total Balance (with Interest)</div>
              <div style="font-size: 0.85rem; color: var(--text-3); font-variant-numeric: tabular-nums;">${balStr}</div>
            </div>
            <div class="rm-check" style="color: var(--brand-blue); display: flex;">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-.997-6l7.07-7.071-1.414-1.414-5.656 5.657-2.829-2.829-1.414 1.414L11.003 16z"/></svg>
            </div>
          </div>

          <div style="display: flex; gap: 12px; flex-direction: column;">
            <button id="rm-wa-btn" style="width: 100%; padding: 14px; background: #25D366; color: white; border: none; border-radius: 12px; font-size: 1rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: background 0.2s;">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Share via WhatsApp
            </button>
            <button id="rm-sms-btn" style="width: 100%; padding: 14px; background: var(--black-2); color: var(--text-1); border: 1px solid var(--border); border-radius: 12px; font-size: 1rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: background 0.2s;">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              Share via SMS
            </button>
          </div>
        </div>
      </div>
    `);

    function toggleOption(optId) {
      const el = document.getElementById(optId);
      if (!el) return;
      const isChecked = el.getAttribute('data-checked') === 'true';
      if (isChecked) {
        el.setAttribute('data-checked', 'false');
        el.style.borderColor = 'transparent';
        el.style.background = 'var(--black-2)';
        el.querySelector('.rm-check').style.display = 'none';
      } else {
        el.setAttribute('data-checked', 'true');
        el.style.borderColor = 'var(--brand-blue)';
        el.style.background = 'rgba(0, 102, 255, 0.05)';
        el.querySelector('.rm-check').style.display = 'flex';
      }
    }

    document.getElementById('rm-opt-prin').onclick = () => toggleOption('rm-opt-prin');
    document.getElementById('rm-opt-bal').onclick = () => toggleOption('rm-opt-bal');

    function buildMessage() {
      const incPrin = document.getElementById('rm-opt-prin').getAttribute('data-checked') === 'true';
      const incBal  = document.getElementById('rm-opt-bal').getAttribute('data-checked') === 'true';
      
      let lines = [];
      if (incPrin) lines.push(`${prinIcon} Principal Balance: ${prinStr}`);
      if (incBal)  lines.push(`${balIcon} Total Balance: ${balStr} (${status})`);
      lines.push(`📅 Date: ${dateStr}`);
      
      if (!incPrin && !incBal) return `Date: ${dateStr}`;
      return lines.join('\n');
    }

    function cleanup() {
      closeModal();
      resolve(true);
    }

    document.getElementById('rm-close').onclick = cleanup;
    
    document.getElementById('rm-wa-btn').onclick = () => {
      const text = buildMessage();
      const url = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      cleanup();
    };

    document.getElementById('rm-sms-btn').onclick = () => {
      const text = buildMessage();
      const ua = navigator.userAgent.toLowerCase();
      const separator = ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 ? '&' : '?';
      const url = `sms:${customer.phone.replace(/\D/g, '')}${separator}body=${encodeURIComponent(text)}`;
      window.open(url, '_self');
      cleanup();
    };

    overlay().onclick = (e) => { if (e.target === overlay()) cleanup(); };
    container().addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cleanup();
    });
  });
}

// ─────────────────────────── CONFIRM MODAL ──────────────────────────────────


/**
 * Show a confirmation dialog.
 * @param {string} title
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    openModal(`
      <div class="modal modal-sm" id="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="conf-title">
        <div class="modal-header">
          <h2 id="conf-title">${title}</h2>
        </div>
        <div class="modal-body">
          <p class="confirm-msg">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="conf-cancel">Cancel</button>
          <button class="btn btn-danger" id="conf-ok">Delete</button>
        </div>
      </div>
    `);

    function cleanup(result) {
      closeModal();
      resolve(result);
    }

    document.getElementById('conf-cancel').onclick = () => cleanup(false);
    document.getElementById('conf-ok').onclick     = () => cleanup(true);
    overlay().onclick = (e) => { if (e.target === overlay()) cleanup(false); };

    container().addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Enter')  document.getElementById('conf-ok')?.click();
    });
  });
}

// ─────────────────────────── HELPERS ────────────────────────────────────────

function highlightError(inputId, msg) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.classList.add('input-error');
  el.addEventListener('input', () => el.classList.remove('input-error'), { once: true });
  if (msg) el.setCustomValidity(msg);
}
