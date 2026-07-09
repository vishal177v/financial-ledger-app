// ── whatsapp.js ──────────────────────────────────────────────────────────────
// WhatsApp sharing helpers:
//   shareReceipt()        — single transaction receipt
//   shareAccountSummary() — full account statement
// ---------------------------------------------------------------------------

import { formatCurrency, formatDate, formatPhone } from '../utils/format.js';

/**
 * Open WhatsApp with a pre-filled message.
 * On mobile → wa.me deep-link; on desktop → web.whatsapp.com
 * @param {string} phone  Raw phone number (digits only, with or without country code)
 * @param {string} text   URL-encoded message text
 */
function openWhatsApp(phone, text) {
  const encodedText = encodeURIComponent(text);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const phoneNum = formatPhone(phone);

  let url;
  if (isMobile) {
    url = `https://wa.me/${phoneNum}?text=${encodedText}`;
  } else {
    url = `https://web.whatsapp.com/send?phone=${phoneNum}&text=${encodedText}`;
  }
  window.open(url, '_blank');
}

/**
 * Share a single transaction receipt via WhatsApp.
 * @param {Customer}            customer
 * @param {EnrichedTransaction} tx
 */
export function shareReceipt(customer, tx) {
  const isTxDebit = tx.amount < 0;
  const isBalDebit = tx.closingBalance < 0;
  
  const absAmount = formatCurrency(Math.abs(tx.amount));
  const absBal = formatCurrency(Math.abs(tx.closingBalance));

  const txIcon = isTxDebit ? '🔴' : '🟢';
  const balIcon = isBalDebit ? '🔴' : '🟢';

  const text = [
    `Transaction: ${tx.description || 'N/A'}`,
    `${txIcon} Amount: ${absAmount}`,
    `📅 Date: ${new Date(tx.date).toLocaleDateString()}`,
    `${balIcon} Total Balance: ${absBal}`,
  ].join('\n');

  openWhatsApp(customer.phone, text);
}

/**
 * Share a full account summary via WhatsApp.
 * @param {Customer}            customer
 * @param {EnrichedTransaction[]} enriched
 * @param {LiveRow|null}        liveRow
 */
export function shareAccountSummary(customer, enriched, liveRow) {
  if (!enriched || enriched.length === 0) return;

  const totalCredit  = enriched.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalDebit   = enriched.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalInterest = enriched.reduce((s, t) => s + (t.interestApplied || 0), 0)
                      + (liveRow ? (liveRow.interestApplied || 0) : 0);

  const currentBalance = liveRow ? liveRow.closingBalance : enriched[enriched.length - 1].closingBalance;
  const firstDate = formatDate(enriched[0].date);
  const asOfDate = liveRow ? formatDate(liveRow.date) : formatDate(enriched[enriched.length - 1].date);
  const balanceStatus = currentBalance >= 0 ? '🟢 Positive' : '🔴 Overdraft';

  const text = [
    `📊 *Account Statement*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Customer:        ${customer.name}`,
    `Phone:           ${customer.phone}`,
    `Statement From:  ${firstDate}`,
    `As of Date:      ${asOfDate}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Total Credits:   ${formatCurrency(totalCredit)}`,
    `Total Debits:    ${formatCurrency(totalDebit)}`,
    `Interest/Return: ${totalInterest >= 0 ? '+' : ''}${formatCurrency(totalInterest)}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Current Balance: *${formatCurrency(currentBalance)}*`,
    `Status:          ${balanceStatus}`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Credit Rate:  ${customer.creditRate}% p.a.`,
    `Overdraft Rate: ${customer.debitRate}% p.a.`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `_FinanceLedger App_`,
  ].join('\n');

  openWhatsApp(customer.phone, text);
}
