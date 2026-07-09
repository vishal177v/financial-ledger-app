// ── format.js ──────────────────────────────────────────────────────────────
// Utility: formatting, date helpers, ID generation
// ---------------------------------------------------------------------------

/**
 * Format a number as Indian currency (₹1,23,456.78)
 * Always shows exactly 2 decimal places.
 * Negative numbers are formatted with a leading minus sign before ₹.
 */
export function formatCurrency(amount) {
  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount * 100) / 100);
  const [intStr, decStr = '00'] = abs.toFixed(2).split('.');

  // Indian grouping: last 3 digits, then groups of 2
  let grouped = '';
  if (intStr.length <= 3) {
    grouped = intStr;
  } else {
    grouped = intStr.slice(-3);
    let rem = intStr.slice(0, -3);
    while (rem.length > 2) {
      grouped = rem.slice(-2) + ',' + grouped;
      rem = rem.slice(0, -2);
    }
    if (rem.length > 0) grouped = rem + ',' + grouped;
  }

  return (isNegative ? '-' : '') + '₹' + grouped + '.' + decStr;
}

/**
 * Format absolute value as Indian currency (no minus sign, always positive display).
 */
export function formatCurrencyAbs(amount) {
  return formatCurrency(Math.abs(amount));
}

/**
 * Format YYYY-MM-DD as "09 Jul 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format YYYY-MM-DD as "09 Jul" (no year)
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/**
 * Returns today as YYYY-MM-DD string (local time)
 */
export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Round to 2 decimal places (banker-safe)
 */
export function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Generate a UUID v4
 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format phone number for WhatsApp (strip non-digits, add country code if missing)
 * Assumes Indian numbers (+91 prefix)
 */
export function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return '91' + digits;
  return digits;
}
