import { getAuthToken } from './components/auth.js';
import { customers as custDb, transactions as txDb } from './db.js';

const API_URL = "https://finance-ledger-api.vishalbavliya002.workers.dev/api/backup"; 

export async function backupToCloud() {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const customers = await custDb.getAll();
  const transactions = await txDb.getAll();
  
  const payload = JSON.stringify({ customers, transactions });

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: payload
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Backup failed: ${res.status} - ${txt}`);
  }

  localStorage.setItem('last_cloud_sync', Date.now().toString());
  return true;
}

export async function restoreFromCloud() {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(API_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    if (res.status === 404) return null; 
    const txt = await res.text();
    throw new Error(`Restore failed: ${res.status} - ${txt}`);
  }

  const data = await res.json();
  if (data && data.customers && data.transactions) {
    const { backup } = await import('./db.js');
    await backup.importAll(data);
    localStorage.setItem('last_cloud_sync', Date.now().toString());
    return true;
  }
  return false;
}

export async function checkAndAutoSync() {
  const lastSync = parseInt(localStorage.getItem('last_cloud_sync') || '0', 10);
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  if (now - lastSync > ONE_DAY) {
    try {
      await backupToCloud();
      console.log('Background cloud sync completed');
    } catch (err) {
      console.error('Background sync failed:', err);
    }
  }
}
