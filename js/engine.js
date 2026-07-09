// ── engine.js ────────────────────────────────────────────────────────────────
// Core compound-daily-interest calculation engine.
// Pure functions — no DOM, no DB, safe to run inside a Web Worker.
//
// CONVENTION:
//   Transaction.amount  → positive = credit, negative = debit
//   Customer.creditRate → annual % applied when balance ≥ 0
//   Customer.debitRate  → annual % applied when balance < 0
// ---------------------------------------------------------------------------

/**
 * Number of calendar days between two YYYY-MM-DD date strings.
 * Returns 0 if same date, positive if toDate is later.
 */
export function daysBetween(fromDateStr, toDateStr) {
  const d1 = new Date(fromDateStr + 'T00:00:00');
  const d2 = new Date(toDateStr + 'T00:00:00');
  return Math.round((d2 - d1) / 86_400_000);
}

/**
 * Compound balance over N calendar days.
 * Each day: balance *= (1 + dailyRate)
 * dailyRate = annualRate / 100 / 365
 *
 * @param {number} balance    Starting balance
 * @param {string} fromDate   YYYY-MM-DD
 * @param {string} toDate     YYYY-MM-DD
 * @param {Object} customer   { creditRate, debitRate }
 * @returns {{ balance: number, interest: number }}
 */
function compoundBetween(balance, fromDate, toDate, customer) {
  const days = daysBetween(fromDate, toDate);
  if (days <= 0) return { balance, interest: 0 };

  let b = balance;
  let totalInterest = 0;

  for (let i = 0; i < days; i++) {
    const annualRate = b >= 0
      ? (customer.creditRate || 0)
      : (customer.debitRate || 0);
    const dailyInterest = b * (annualRate / 100 / 365);
    totalInterest += dailyInterest;
    b += dailyInterest;
  }

  return { balance: b, interest: totalInterest };
}

function r2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Recalculate the full ledger for a customer.
 *
 * Steps:
 *  1. Sort transactions by date asc, then createdAt asc (tie-break).
 *  2. For each transaction:
 *     a. Compound the running balance from the previous transaction date to this date.
 *     b. Record openingBalance (after compounding, before this tx amount).
 *     c. Apply tx.amount → new running balance = closingBalance.
 *  3. Return enriched array in sorted order.
 *
 * @param {Transaction[]} rawTransactions
 * @param {Customer}      customer
 * @returns {EnrichedTransaction[]}
 */
export function recalculateLedger(rawTransactions, customer) {
  if (!rawTransactions || rawTransactions.length === 0) return [];

  // Sort: date asc, then createdAt asc for same-date
  const sorted = [...rawTransactions].sort((a, b) => {
    const dc = a.date.localeCompare(b.date);
    if (dc !== 0) return dc;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  let runningBalance = 0;
  let runningPrincipal = 0;
  let prevDate = null;

  return sorted.map((tx) => {
    let interestApplied = 0;

    if (prevDate !== null && tx.date !== prevDate) {
      // Compound from previous transaction date to this transaction's date
      const result = compoundBetween(runningBalance, prevDate, tx.date, customer);
      interestApplied = result.interest;
      runningBalance = result.balance;
    }

    const openingBalance = r2(runningBalance);
    interestApplied = r2(interestApplied);

    // Apply the transaction amount
    runningBalance += tx.amount; // positive = credit, negative = debit
    runningPrincipal += tx.amount;
    const closingBalance = r2(runningBalance);

    prevDate = tx.date;

    return {
      ...tx,
      openingBalance,
      interestApplied,
      closingBalance,
      principalBalance: r2(runningPrincipal)
    };
  });
}

/**
 * Compute the live "as of today" summary row.
 * This is NOT stored — it's generated fresh every time the ledger is opened.
 *
 * @param {EnrichedTransaction[]} enrichedTransactions  Output of recalculateLedger()
 * @param {Customer}              customer
 * @param {string}                todayDateStr           YYYY-MM-DD
 * @returns {LiveRow|null}  null if no transactions or last tx is today/future
 */
export function getLiveRow(enrichedTransactions, customer, todayDateStr) {
  if (!enrichedTransactions || enrichedTransactions.length === 0) return null;

  const lastTx = enrichedTransactions[enrichedTransactions.length - 1];
  const days = daysBetween(lastTx.date, todayDateStr);

  if (days <= 0) {
    // Last transaction is today — show static live row with 0 interest
    return {
      id: '__live__',
      date: todayDateStr,
      description: 'Balance as of Today',
      amount: 0,
      openingBalance: lastTx.closingBalance,
      interestApplied: 0,
      closingBalance: lastTx.closingBalance,
      principalBalance: lastTx.principalBalance || 0,
      isLive: true,
    };
  }

  const result = compoundBetween(lastTx.closingBalance, lastTx.date, todayDateStr, customer);

  return {
    id: '__live__',
    date: todayDateStr,
    description: 'Balance as of Today',
    amount: 0,
    openingBalance: r2(lastTx.closingBalance),
    interestApplied: r2(result.interest),
    closingBalance: r2(result.balance),
    principalBalance: lastTx.principalBalance || 0,
    isLive: true,
  };
}
