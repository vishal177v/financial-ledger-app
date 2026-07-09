// ── backup.js ────────────────────────────────────────────────────────────────
// Export full ledger as JSON → download to device.
// Import from a previously exported JSON file.
// Google Drive redirect for manual cloud backup.
// ---------------------------------------------------------------------------

import { backup as dbBackup } from '../db.js';
import { showToast } from '../components/toast.js';

/**
 * Export all data as a dated JSON file, then open Google Drive for upload.
 */
export async function exportBackup() {
  try {
    const data = await dbBackup.exportAll();
    const now = new Date();
    const dateTag = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `FinanceLedger-backup-${dateTag}.json`;

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Backup downloaded: ${filename}`, 'success');

    // After a short delay, open Google Drive for upload
    setTimeout(() => {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.open('https://drive.google.com/drive/my-drive', '_blank');
      } else {
        window.open('https://drive.google.com/drive/my-drive', '_blank');
      }
      showToast('Google Drive opened — upload your backup file there!', 'info');
    }, 1000);

  } catch (err) {
    console.error('Export failed:', err);
    showToast('Export failed: ' + err.message, 'error');
  }
}

/**
 * Import from a JSON backup file chosen by the user.
 * Replaces ALL existing data.
 * @param {File} file
 */
export async function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        await dbBackup.importAll(data);
        showToast(`Restored ${data.customers.length} customers and ${data.transactions.length} transactions!`, 'success');
        resolve(data);
      } catch (err) {
        console.error('Import failed:', err);
        showToast('Import failed: ' + err.message, 'error');
        reject(err);
      }
    };
    reader.onerror = () => {
      showToast('Could not read file', 'error');
      reject(new Error('FileReader error'));
    };
    reader.readAsText(file);
  });
}

/**
 * Open Google Drive (no download — just browse cloud).
 */
export function openGoogleDrive() {
  window.open('https://drive.google.com/drive/my-drive', '_blank');
}
