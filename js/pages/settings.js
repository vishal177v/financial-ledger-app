// ── settings.js ──────────────────────────────────────────────────────────────
// Settings page — Premium monochrome theme
// ---------------------------------------------------------------------------

import { customers } from '../db.js';
import { exportBackup, importBackup, openGoogleDrive } from '../utils/backup.js';
import { showToast } from '../components/toast.js';
import { showConfirmModal } from '../components/modal.js';

// Premium thin-stroke SVG icons
const IC_EXPORT  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const IC_IMPORT  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
const IC_DRIVE   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;
const IC_BACKUP  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const IC_INFO    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
const IC_WARN    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const IC_TIP     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;

export async function renderSettings() {
  const pc = document.getElementById('page-container');
  const allCustomers = await customers.getAll();

  pc.innerHTML = `
    <div class="page" id="settings-page">
      <header class="page-header">
        <div class="header-content">
          <div class="header-brand">
            <div class="brand-icon" aria-hidden="true">⚙</div>
            <div>
              <h1 class="header-title">Settings</h1>
              <p class="header-sub">${allCustomers.length} customer${allCustomers.length !== 1 ? 's' : ''} in ledger</p>
            </div>
          </div>
        </div>
      </header>

      <main class="page-main settings-main">

        <!-- Backup -->
        <section class="settings-section">
          <h2 class="settings-section-title">${IC_BACKUP} Backup &amp; Restore</h2>
          <div class="settings-card">

            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-title">Export Backup</div>
                <div class="settings-item-desc">Download a JSON backup file, then opens Google Drive for upload</div>
              </div>
              <button class="btn btn-primary btn-sm" id="export-btn">
                ${IC_EXPORT} Export
              </button>
            </div>

            <div class="settings-divider"></div>

            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-title">Open Google Drive</div>
                <div class="settings-item-desc">Browse your Drive to manage backup files</div>
              </div>
              <button class="btn btn-ghost btn-sm" id="drive-btn">
                ${IC_DRIVE} Drive
              </button>
            </div>

            <div class="settings-divider"></div>

            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-title">Import / Restore</div>
                <div class="settings-item-desc">
                  <span class="badge-warning">⚠ Replaces ALL existing data</span><br/>
                  Select a previously exported JSON file
                </div>
              </div>
              <label class="btn btn-ghost btn-sm" for="import-file" style="cursor:pointer">
                ${IC_IMPORT} Import
              </label>
              <input type="file" id="import-file" accept=".json" style="display:none" />
            </div>

          </div>
        </section>

        <!-- Tip -->
        <div class="settings-tip">
          ${IC_TIP}
          <span><strong>Daily Backup Tip:</strong> Export → download the file → upload it to a Google Drive folder. Takes 30 seconds and protects all your data.</span>
        </div>

        <!-- About -->
        <section class="settings-section">
          <h2 class="settings-section-title">${IC_INFO} About</h2>
          <div class="settings-card">
            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-title">FinanceLedger</div>
                <div class="settings-item-desc">Version 1.0.0 · Offline PWA · IndexedDB</div>
              </div>
              <span class="settings-badge">v1.0</span>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-title">Interest Model</div>
                <div class="settings-item-desc">Compound daily · Separate return &amp; overdraft rates · Full backdated recalculation</div>
              </div>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-title">Storage</div>
                <div class="settings-item-desc">Local browser IndexedDB · No cloud · No server required</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Danger Zone -->
        <section class="settings-section">
          <h2 class="settings-section-title danger-title">${IC_WARN} Danger Zone</h2>
          <div class="settings-card settings-card-danger">
            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-title">Clear All Data</div>
                <div class="settings-item-desc">Permanently deletes every customer and transaction. Cannot be undone.</div>
              </div>
              <button class="btn btn-danger btn-sm" id="clear-all-btn">Clear All</button>
            </div>
          </div>
        </section>

      </main>
    </div>
  `;

  // Handlers
  document.getElementById('export-btn').onclick = () => exportBackup();

  document.getElementById('drive-btn').onclick = () => openGoogleDrive();

  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ok = await showConfirmModal(
      'Import Backup',
      'This will <strong>replace ALL existing data</strong> with the backup file contents. Continue?'
    );
    if (!ok) { e.target.value = ''; return; }
    await importBackup(file);
    e.target.value = '';
    setTimeout(() => { window.location.hash = '#dashboard'; }, 1500);
  });

  document.getElementById('clear-all-btn').onclick = async () => {
    const ok1 = await showConfirmModal(
      'Clear All Data',
      'This will <strong>permanently delete ALL customers and transactions</strong>. Please export a backup first!'
    );
    if (!ok1) return;
    const ok2 = await showConfirmModal(
      'Are you absolutely sure?',
      'There is <strong>no undo</strong>. All data will be erased permanently.'
    );
    if (!ok2) return;

    try {
      const { transactions: txDb } = await import('../db.js');
      const all = await customers.getAll();
      for (const c of all) {
        await txDb.deleteByCustomer(c.id);
        await customers.delete(c.id);
      }
      showToast('All data cleared', 'warning');
      window.location.hash = '#dashboard';
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
  };
}
