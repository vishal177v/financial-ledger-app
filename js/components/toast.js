// ── toast.js ─────────────────────────────────────────────────────────────────
// Lightweight toast notification system.
// ---------------------------------------------------------------------------

const ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};

let container = null;

function getContainer() {
  if (!container) {
    container = document.getElementById('toast-container');
  }
  return container;
}

/**
 * Display a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration  ms before auto-dismiss (default 3500)
 */
export function showToast(message, type = 'success', duration = 3500) {
  const c = getContainer();
  if (!c) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" aria-label="Dismiss">×</button>
  `;

  c.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  // Auto-dismiss
  const timer = setTimeout(() => dismiss(toast), duration);

  // Manual dismiss
  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(timer);
    dismiss(toast);
  });
}

function dismiss(toast) {
  toast.classList.remove('toast-visible');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}
