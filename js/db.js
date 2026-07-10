// ── db.js ───────────────────────────────────────────────────────────────────
// IndexedDB wrapper — all CRUD for customers and transactions
// ---------------------------------------------------------------------------

const DB_NAME = 'FinanceLedgerDB';
const DB_VERSION = 1;

let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Customers object store
      if (!db.objectStoreNames.contains('customers')) {
        const cs = db.createObjectStore('customers', { keyPath: 'id' });
        cs.createIndex('name', 'name', { unique: false });
      }

      // Transactions object store
      if (!db.objectStoreNames.contains('transactions')) {
        const ts = db.createObjectStore('transactions', { keyPath: 'id' });
        ts.createIndex('customerId', 'customerId', { unique: false });
        ts.createIndex('date', 'date', { unique: false });
      }
    };

    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────── CUSTOMERS ──────────────────────────────────────

export const customers = {
  /** @returns {Promise<Customer[]>} */
  getAll() {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db
            .transaction('customers', 'readonly')
            .objectStore('customers')
            .getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        })
    );
  },

  /** @returns {Promise<Customer>} */
  get(id) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db
            .transaction('customers', 'readonly')
            .objectStore('customers')
            .get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        })
    );
  },

  /** @returns {Promise<void>} */
  add(customer) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db
            .transaction('customers', 'readwrite')
            .objectStore('customers')
            .add(customer);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    );
  },

  /** @returns {Promise<void>} */
  update(customer) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db
            .transaction('customers', 'readwrite')
            .objectStore('customers')
            .put(customer);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    );
  },

  /** @returns {Promise<void>} */
  delete(id) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db
            .transaction('customers', 'readwrite')
            .objectStore('customers')
            .delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    );
  },
};

// ─────────────────────────── TRANSACTIONS ───────────────────────────────────

export const transactions = {
  /** @returns {Promise<Transaction[]>} */
  getAll() {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db
            .transaction('transactions', 'readonly')
            .objectStore('transactions')
            .getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        })
    );
  },

  /** @returns {Promise<Transaction[]>} */
  getByCustomer(customerId) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const idx = db
            .transaction('transactions', 'readonly')
            .objectStore('transactions')
            .index('customerId');
          const req = idx.getAll(IDBKeyRange.only(customerId));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        })
    );
  },

  /** @returns {Promise<void>} */
  add(tx) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db
            .transaction('transactions', 'readwrite')
            .objectStore('transactions')
            .add(tx);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    );
  },

  /** @returns {Promise<void>} */
  update(tx) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db
            .transaction('transactions', 'readwrite')
            .objectStore('transactions')
            .put(tx);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    );
  },

  /** @returns {Promise<void>} */
  delete(id) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db
            .transaction('transactions', 'readwrite')
            .objectStore('transactions')
            .delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    );
  },

  /** Delete ALL transactions belonging to a customer */
  deleteByCustomer(customerId) {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const dbTx = db.transaction('transactions', 'readwrite');
          const idx = dbTx.objectStore('transactions').index('customerId');
          const req = idx.openCursor(IDBKeyRange.only(customerId));
          req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };
          dbTx.oncomplete = () => resolve();
          dbTx.onerror = () => reject(dbTx.error);
        })
    );
  },
};

// ─────────────────────────── BACKUP ─────────────────────────────────────────

export const backup = {
  /** @returns {Promise<{customers: Customer[], transactions: Transaction[]}>} */
  async exportAll() {
    const db = await openDB();
    const [cust, trans] = await Promise.all([
      new Promise((resolve, reject) => {
        const req = db
          .transaction('customers', 'readonly')
          .objectStore('customers')
          .getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
      new Promise((resolve, reject) => {
        const req = db
          .transaction('transactions', 'readonly')
          .objectStore('transactions')
          .getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
    ]);
    return { customers: cust, transactions: trans };
  },

  /** Wipe and re-import everything */
  async importAll(data) {
    if (!data || !Array.isArray(data.customers) || !Array.isArray(data.transactions)) {
      throw new Error('Invalid backup file format');
    }

    const db = await openDB();

    // Clear stores
    await new Promise((resolve, reject) => {
      const dbTx = db.transaction(['customers', 'transactions'], 'readwrite');
      dbTx.objectStore('customers').clear();
      dbTx.objectStore('transactions').clear();
      dbTx.oncomplete = resolve;
      dbTx.onerror = () => reject(dbTx.error);
    });

    // Re-insert
    for (const c of data.customers) await customers.add(c);
    for (const t of data.transactions) await transactions.add(t);
  },
};
