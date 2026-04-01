export function reconcile(transactions, settlements) {
  const gaps = [];

  // Build maps for quick lookup
  const settlementsByTxnId = new Map();
  const txnsById = new Map();
  const chargeAmountsById = new Map();

  settlements.forEach(s => settlementsByTxnId.set(s.transaction_id, s));
  transactions.forEach(t => {
    txnsById.set(t.id, t);
    if (t.type === 'charge') {
      chargeAmountsById.set(t.id, t.amount);
    }
  });

  // Track which transactions have been flagged as duplicate (to avoid double-flagging)
  const flaggedAsDuplicate = new Set();

  // ===== STEP 1: Deduplicate =====
  const fingerprints = new Map(); // fingerprint -> [txn, txn, ...]
  transactions.forEach(txn => {
    const fp = `${txn.amount}|${txn.merchant_id}|${txn.date}|${txn.type}`;
    if (!fingerprints.has(fp)) {
      fingerprints.set(fp, []);
    }
    fingerprints.get(fp).push(txn);
  });

  fingerprints.forEach((group, fp) => {
    if (group.length > 1) {
      // Sort by date parsed to ensure consistent ordering
      group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      // Skip first (original), flag rest as DUPLICATE_ENTRY
      for (let i = 1; i < group.length; i++) {
        const dupTxn = group[i];
        gaps.push({
          type: 'DUPLICATE_ENTRY',
          transaction_id: dupTxn.id,
          settlement_id: settlementsByTxnId.get(dupTxn.id)?.id || null,
          detail: `Duplicate transaction: same amount ($${dupTxn.amount}), merchant (${dupTxn.merchant_id}), date (${dupTxn.date}), type (${dupTxn.type})`,
          delta: null
        });
        flaggedAsDuplicate.add(dupTxn.id);
      }
    }
  });

  // ===== STEP 2: Match transactions to settlements =====
  transactions.forEach(txn => {
    // Skip if already flagged as duplicate
    if (flaggedAsDuplicate.has(txn.id)) {
      return;
    }

    const settlement = settlementsByTxnId.get(txn.id);

    // Check for UNSETTLED (no settlement, must not be pending/voided)
    if (!settlement && txn.status !== 'pending' && txn.status !== 'voided') {
      gaps.push({
        type: 'UNSETTLED',
        transaction_id: txn.id,
        settlement_id: null,
        detail: `Transaction ${txn.id} has no matched settlement record`,
        delta: null
      });
    }
  });

  // Check for GHOST_SETTLEMENT (settlement with no transaction)
  settlements.forEach(settlement => {
    if (!txnsById.has(settlement.transaction_id)) {
      gaps.push({
        type: 'GHOST_SETTLEMENT',
        transaction_id: settlement.transaction_id,
        settlement_id: settlement.id,
        detail: `Settlement ${settlement.id} references non-existent transaction ${settlement.transaction_id}`,
        delta: null
      });
    }
  });

  // ===== STEP 3: Rounding check (matched pairs only) =====
  settlements.forEach(settlement => {
    const txn = txnsById.get(settlement.transaction_id);
    if (!txn || flaggedAsDuplicate.has(txn.id)) return;

    const delta = Math.abs(txn.amount - settlement.settled_amount);
    if (delta > 0) {
      if (delta <= 0.02) {
        gaps.push({
          type: 'ROUNDING_ERROR',
          transaction_id: txn.id,
          settlement_id: settlement.id,
          detail: `Rounding discrepancy: transaction $${txn.amount} vs settlement $${settlement.settled_amount}`,
          delta
        });
      } else if (delta > 0.02) {
        gaps.push({
          type: 'AMOUNT_MISMATCH',
          transaction_id: txn.id,
          settlement_id: settlement.id,
          detail: `Significant amount mismatch: transaction $${txn.amount} vs settlement $${settlement.settled_amount}`,
          delta
        });
      }
    }
  });

  // ===== STEP 4: Next-month settlement check (matched pairs only) =====
  settlements.forEach(settlement => {
    const txn = txnsById.get(settlement.transaction_id);
    if (!txn || flaggedAsDuplicate.has(txn.id)) return;

    // Check if gap type already recorded for this txn (to avoid overwriting)
    const existingGap = gaps.find(g => g.transaction_id === txn.id);
    if (existingGap) return; // Skip if already has a gap from earlier steps

    const txnDate = new Date(txn.date);
    const settlementDate = new Date(settlement.settled_date);

    if (settlementDate.getMonth() > txnDate.getMonth() ||
        (settlementDate.getMonth() === txnDate.getMonth() && settlementDate.getFullYear() > txnDate.getFullYear())) {
      gaps.push({
        type: 'NEXT_MONTH_SETTLEMENT',
        transaction_id: txn.id,
        settlement_id: settlement.id,
        detail: `Settlement dated ${settlement.settled_date} in next month relative to transaction date ${txn.date}`,
        delta: null
      });
    }
  });

  // ===== STEP 5: Orphan refund check =====
  const chargeIds = new Set(
    transactions.filter(t => t.type === 'charge').map(t => t.id)
  );

  transactions.forEach(txn => {
    if (txn.type === 'refund' && !flaggedAsDuplicate.has(txn.id)) {
      if (!chargeIds.has(txn.reference_id)) {
        gaps.push({
          type: 'ORPHAN_REFUND',
          transaction_id: txn.id,
          settlement_id: settlementsByTxnId.get(txn.id)?.id || null,
          detail: `Refund references non-existent charge ID: ${txn.reference_id}`,
          delta: null
        });
      }
    }
  });

  // ===== ADDITIONAL CHECKS =====
  // Check for INCONSISTENT_SETTLEMENT
  settlements.forEach(settlement => {
    const computed = settlement.settled_amount - settlement.fee;
    if (Math.abs(computed - settlement.net_amount) > 0.01) {
      // Only flag if not already flagged for other reasons
      const existingGap = gaps.find(g => g.settlement_id === settlement.id);
      if (!existingGap) {
        gaps.push({
          type: 'INCONSISTENT_SETTLEMENT',
          transaction_id: settlement.transaction_id,
          settlement_id: settlement.id,
          detail: `Settlement fee arithmetic: $${settlement.settled_amount} - $${settlement.fee} = $${computed}, but net_amount = $${settlement.net_amount}`,
          delta: null
        });
      }
    }
  });

  // Check for VOID_WITH_SETTLEMENT
  transactions.forEach(txn => {
    if (txn.status === 'voided' && settlementsByTxnId.has(txn.id)) {
      const settlement = settlementsByTxnId.get(txn.id);
      gaps.push({
        type: 'VOID_WITH_SETTLEMENT',
        transaction_id: txn.id,
        settlement_id: settlement.id,
        detail: `Voided transaction ${txn.id} has settlement record ${settlement.id}`,
        delta: null
      });
    }
  });

  // Check for REFUND_EXCEEDS_ORIGINAL
  transactions.forEach(txn => {
    if (txn.type === 'refund' && txn.reference_id && chargeIds.has(txn.reference_id)) {
      const originalAmount = chargeAmountsById.get(txn.reference_id);
      if (txn.amount > originalAmount) {
        gaps.push({
          type: 'REFUND_EXCEEDS_ORIGINAL',
          transaction_id: txn.id,
          settlement_id: settlementsByTxnId.get(txn.id)?.id || null,
          detail: `Refund amount $${txn.amount} exceeds original charge $${originalAmount}`,
          delta: null
        });
      }
    }
  });

  // ===== Compute Summary =====
  // Build set of transaction IDs that have at least one gap
  const gapTransactionIds = new Set(gaps.map(g => g.transaction_id));

  const summary = {
    total_transactions: transactions.length,
    total_settlements: settlements.length,
    clean_matches: transactions.filter(t =>
      t.status !== 'pending' &&
      t.status !== 'voided' &&
      !gapTransactionIds.has(t.id)
    ).length,
    pending: transactions.filter(t => t.status === 'pending').length,
    voided: transactions.filter(t => t.status === 'voided').length,
    gaps_found: gaps.length,
    total_amount_transacted: parseFloat(transactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)),
    total_amount_settled: parseFloat(settlements.reduce((sum, s) => sum + s.settled_amount, 0).toFixed(2)),
    net_discrepancy: parseFloat((settlements.reduce((sum, s) => sum + s.settled_amount, 0) - transactions.filter(t => t.status === 'settled' || t.status === 'pending').reduce((sum, t) => sum + t.amount, 0)).toFixed(2))
  };

  return { summary, gaps };
}
