// ── worker.js ────────────────────────────────────────────────────────────────
// Web Worker: runs ledger recalculation off the main thread so the UI
// stays responsive even for large ledgers.
// ---------------------------------------------------------------------------

import { recalculateLedger, getLiveRow } from './engine.js';

self.onmessage = function (e) {
  const { type, transactions, customer, today } = e.data;

  if (type === 'calculate') {
    try {
      const enriched = recalculateLedger(transactions, customer);
      const liveRow = getLiveRow(enriched, customer, today);
      self.postMessage({ type: 'result', enriched, liveRow, error: null });
    } catch (err) {
      self.postMessage({ type: 'result', enriched: [], liveRow: null, error: err.message });
    }
  }
};
