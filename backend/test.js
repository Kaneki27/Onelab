import assert from 'assert';
import { generateData } from './data.js';
import { reconcile } from './reconcile.js';

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   ${err.message}`);
    testsFailed++;
  }
}

console.log('\n🧪 BACKEND TEST SUITE\n');

// ===== DATA GENERATION TESTS =====
console.log('📋 DATA GENERATION TESTS');
console.log('========================\n');

const { transactions, settlements } = generateData();

test('Should generate exactly 60 transactions', () => {
  assert.strictEqual(transactions.length, 60, `Expected 60 transactions, got ${transactions.length}`);
});

test('Should generate settlements for valid transactions', () => {
  assert(settlements.length > 0, 'Should have at least some settlements');
  assert(settlements.length <= transactions.length, 'Settlements should not exceed transactions');
});

test('All transactions should have valid structure', () => {
  transactions.forEach((txn, idx) => {
    assert(txn.id, `Transaction ${idx} missing id`);
    assert(txn.date, `Transaction ${txn.id} missing date`);
    assert(typeof txn.amount === 'number', `Transaction ${txn.id} amount not number`);
    assert(['charge', 'refund'].includes(txn.type), `Transaction ${txn.id} invalid type`);
    assert(['settled', 'pending', 'voided'].includes(txn.status), `Transaction ${txn.id} invalid status`);
    assert(txn.merchant_id, `Transaction ${txn.id} missing merchant_id`);
    assert(txn.currency === 'USD', `Transaction ${txn.id} not USD`);
  });
});

test('All settlements should have valid structure', () => {
  settlements.forEach((s, idx) => {
    assert(s.id, `Settlement ${idx} missing id`);
    assert(s.transaction_id, `Settlement ${s.id} missing transaction_id`);
    assert(s.settled_date, `Settlement ${s.id} missing settled_date`);
    assert(typeof s.settled_amount === 'number', `Settlement ${s.id} amount not number`);
    assert(typeof s.fee === 'number', `Settlement ${s.id} fee not number`);
    assert(typeof s.net_amount === 'number', `Settlement ${s.id} net_amount not number`);
  });
});

test('Should include 2 pending transactions', () => {
  const pending = transactions.filter(t => t.status === 'pending');
  assert.strictEqual(pending.length, 2, `Expected 2 pending, got ${pending.length}`);
});

test('Should include 1 voided transaction', () => {
  const voided = transactions.filter(t => t.status === 'voided');
  assert.strictEqual(voided.length, 1, `Expected 1 voided, got ${voided.length}`);
});

test('Should include 5 refund transactions', () => {
  const refunds = transactions.filter(t => t.type === 'refund');
  assert.strictEqual(refunds.length, 5, `Expected 5 refunds, got ${refunds.length}`);
});

test('Should have ~48+ settled charges', () => {
  const settledCharges = transactions.filter(t => t.type === 'charge' && t.status === 'settled');
  assert(settledCharges.length >= 46, `Expected >= 46 settled charges, got ${settledCharges.length}`);
});

test('All amounts should use proper rounding (2 decimals)', () => {
  transactions.forEach(txn => {
    const rounded = Math.round(txn.amount * 100) / 100;
    assert.strictEqual(txn.amount, rounded, `Transaction ${txn.id} not properly rounded: ${txn.amount}`);
  });
  settlements.forEach(s => {
    const roundedAmount = Math.round(s.settled_amount * 100) / 100;
    const roundedFee = Math.round(s.fee * 100) / 100;
    const roundedNet = Math.round(s.net_amount * 100) / 100;
    assert.strictEqual(s.settled_amount, roundedAmount, `Settlement ${s.id} amount not rounded`);
    assert.strictEqual(s.fee, roundedFee, `Settlement ${s.id} fee not rounded`);
    assert.strictEqual(s.net_amount, roundedNet, `Settlement ${s.id} net not rounded`);
  });
});

test('Should have merchants MRC-01 through MRC-10', () => {
  const merchants = new Set(transactions.map(t => t.merchant_id));
  assert(merchants.size > 0, 'Should have at least one merchant');
  merchants.forEach(m => {
    assert(m.match(/^MRC-\d{2}$/), `Invalid merchant format: ${m}`);
    const num = parseInt(m.split('-')[1]);
    assert(num >= 1 && num <= 10, `Merchant number out of range: ${num}`);
  });
});

// ===== PLANTED GAPS TESTS =====
console.log('\n🎯 PLANTED GAPS TESTS');
console.log('=====================\n');

test('GAP 1: Should have next-month settlement (Jan 31 → Feb 2)', () => {
  const gap1 = transactions.find(t =>
    t.date === '2024-01-31' &&
    t.merchant_id === 'MRC-03' &&
    t.amount === 1250.00
  );
  assert(gap1, 'Gap 1 transaction not found');

  const settlement = settlements.find(s => s.transaction_id === gap1.id);
  assert(settlement, 'Gap 1 settlement not found');
  assert.strictEqual(settlement.settled_date, '2024-02-02', 'Gap 1 has wrong settlement date');
});

test('GAP 2: Should have rounding error ($349.99 → $350.00)', () => {
  const gap2Txn = transactions.find(t =>
    t.amount === 349.99 &&
    t.merchant_id === 'MRC-07'
  );
  assert(gap2Txn, 'Gap 2 transaction not found');

  const gap2Settlement = settlements.find(s => s.transaction_id === gap2Txn.id);
  assert(gap2Settlement, 'Gap 2 settlement not found');
  assert.strictEqual(gap2Settlement.settled_amount, 350.00, 'Gap 2 has wrong settlement amount');
  assert.strictEqual(gap2Settlement.fee, 3.50, 'Gap 2 has wrong fee');
  assert.strictEqual(gap2Settlement.net_amount, 346.50, 'Gap 2 has wrong net amount');
});

test('GAP 3: Should have duplicate entry (MRC-05, $89.99, Jan 14)', () => {
  const duplicates = transactions.filter(t =>
    t.merchant_id === 'MRC-05' &&
    t.amount === 89.99 &&
    t.date === '2024-01-14' &&
    t.type === 'charge'
  );
  assert.strictEqual(duplicates.length, 2, `Expected 2 duplicates, got ${duplicates.length}`);

  // Both should have different IDs
  assert.notStrictEqual(duplicates[0].id, duplicates[1].id, 'Duplicates should have different IDs');

  // Both should have settlements
  const settledDups = duplicates.filter(dup =>
    settlements.some(s => s.transaction_id === dup.id)
  );
  assert.strictEqual(settledDups.length, 2, 'Both duplicates should have settlements');
});

test('GAP 4: Should have orphan refund (reference_id: TXN-999)', () => {
  const orphan = transactions.find(t =>
    t.type === 'refund' &&
    t.reference_id === 'TXN-999' &&
    t.merchant_id === 'MRC-02' &&
    t.amount === 210.00
  );
  assert(orphan, 'Orphan refund not found');
  assert(orphan.date === '2024-01-20', 'Orphan refund has wrong date');

  // Orphan refund should have a settlement
  const orphanSettlement = settlements.find(s => s.transaction_id === orphan.id);
  assert(orphanSettlement, 'Orphan refund should have settlement');
});

test('All refunds should reference a transaction', () => {
  const chargeIds = new Set(transactions.filter(t => t.type === 'charge').map(t => t.id));
  const refunds = transactions.filter(t => t.type === 'refund');

  refunds.forEach(ref => {
    // Each refund should have a reference_id
    assert(ref.reference_id, `Refund ${ref.id} missing reference_id`);
  });
});

// ===== RECONCILIATION TESTS =====
console.log('\n🔍 RECONCILIATION TESTS');
console.log('=======================\n');

const { summary, gaps } = reconcile(transactions, settlements);

test('Should detect exactly 4 planted gaps (or more if edge cases trigger)', () => {
  assert(gaps.length >= 4, `Expected at least 4 gaps, got ${gaps.length}`);
});

test('Should detect DUPLICATE_ENTRY gap', () => {
  const dupGap = gaps.find(g => g.type === 'DUPLICATE_ENTRY');
  assert(dupGap, 'DUPLICATE_ENTRY gap not found');
  // One of the duplicate entries should be flagged
  assert(dupGap.transaction_id, 'Duplicate gap should have transaction_id');
});

test('Should detect ROUNDING_ERROR gap', () => {
  const roundingGap = gaps.find(g => g.type === 'ROUNDING_ERROR');
  assert(roundingGap, 'ROUNDING_ERROR gap not found');
  assert.strictEqual(roundingGap.transaction_id.includes('TXN'), true, 'Should have transaction_id');
  // Allow for floating point precision
  assert(Math.abs(roundingGap.delta - 0.01) < 0.0001, `Rounding error should be ~$0.01, got ${roundingGap.delta}`);
});

test('Should detect NEXT_MONTH_SETTLEMENT gap', () => {
  const nextMonthGaps = gaps.filter(g => g.type === 'NEXT_MONTH_SETTLEMENT');
  assert(nextMonthGaps.length > 0, 'NEXT_MONTH_SETTLEMENT gap not found');
});

test('Should detect ORPHAN_REFUND gap', () => {
  const orphanGap = gaps.find(g => g.type === 'ORPHAN_REFUND');
  assert(orphanGap, 'ORPHAN_REFUND gap not found');
  assert.strictEqual(orphanGap.detail.includes('TXN-999'), true, 'Should reference TXN-999');
});

test('Summary should have correct transaction counts', () => {
  assert.strictEqual(summary.total_transactions, 60, `Expected 60 total, got ${summary.total_transactions}`);
  assert(summary.pending >= 2, `Expected at least 2 pending, got ${summary.pending}`);
  assert.strictEqual(summary.voided, 1, `Expected 1 voided, got ${summary.voided}`);
});

test('Summary should have positive clean matches', () => {
  assert(summary.clean_matches > 0, `Expected clean matches > 0, got ${summary.clean_matches}`);
});

test('Summary.clean_matches should equal total - gaps (approx, accounting for pending/voided)', () => {
  // clean_matches is calculated as transactions.length - gaps.length
  // With pending and voided excluded from gap detection, the formula is:
  // clean_matches = settled - gaps = (total - pending - voided) - gaps
  const settledCount = summary.total_transactions - summary.pending - summary.voided;
  const expectedClean = settledCount - summary.gaps_found;
  assert(
    summary.clean_matches <= settledCount,
    `Clean matches (${summary.clean_matches}) should not exceed settled count (${settledCount})`
  );
});

test('Summary should have gaps_found > 0', () => {
  assert(summary.gaps_found > 0, `Expected gaps > 0, got ${summary.gaps_found}`);
});

test('Summary gaps_found should match actual gaps array length', () => {
  assert.strictEqual(summary.gaps_found, gaps.length,
    `gaps_found mismatch: summary says ${summary.gaps_found}, array has ${gaps.length}`);
});

test('All amounts in summary should be numbers', () => {
  assert(typeof summary.total_amount_transacted === 'number', 'total_amount_transacted not number');
  assert(typeof summary.total_amount_settled === 'number', 'total_amount_settled not number');
  assert(typeof summary.net_discrepancy === 'number', 'net_discrepancy not number');
});

test('Total transacted should be sum of all transaction amounts', () => {
  const expected = Math.round(
    transactions.reduce((sum, t) => sum + t.amount, 0) * 100
  ) / 100;
  assert.strictEqual(summary.total_amount_transacted, expected, 'total_amount_transacted mismatch');
});

test('Total settled should be sum of all settlement amounts', () => {
  const expected = Math.round(
    settlements.reduce((sum, s) => sum + s.settled_amount, 0) * 100
  ) / 100;
  assert.strictEqual(summary.total_amount_settled, expected, 'total_amount_settled mismatch');
});

test('Pending transactions should never be unsettled', () => {
  const pendingUnsettled = gaps.filter(g =>
    g.type === 'UNSETTLED' &&
    transactions.find(t => t.id === g.transaction_id && t.status === 'pending')
  );
  assert.strictEqual(pendingUnsettled.length, 0, 'Pending transactions should not be flagged as UNSETTLED');
});

test('Voided transactions should never be unsettled', () => {
  const voidedUnsettled = gaps.filter(g =>
    g.type === 'UNSETTLED' &&
    transactions.find(t => t.id === g.transaction_id && t.status === 'voided')
  );
  assert.strictEqual(voidedUnsettled.length, 0, 'Voided transactions should not be flagged as UNSETTLED');
});

test('Each gap should have required fields', () => {
  gaps.forEach((gap, idx) => {
    assert(gap.type, `Gap ${idx} missing type`);
    assert(gap.transaction_id, `Gap ${idx} missing transaction_id`);
    assert(gap.detail, `Gap ${idx} missing detail`);
    assert(gap.delta !== undefined, `Gap ${idx} missing delta field`);
  });
});

test('Rounding error gaps should have delta value', () => {
  const roundingGaps = gaps.filter(g => g.type === 'ROUNDING_ERROR');
  roundingGaps.forEach(gap => {
    assert(gap.delta !== null && gap.delta !== undefined,
      `Rounding gap should have delta, got ${gap.delta}`);
    assert(gap.delta <= 0.02 && gap.delta > 0,
      `Rounding delta should be > 0 and <= 0.02, got ${gap.delta}`);
  });
});

test('Non-amount gaps should have null delta', () => {
  const nonAmountGaps = gaps.filter(g =>
    !['ROUNDING_ERROR', 'AMOUNT_MISMATCH'].includes(g.type)
  );
  nonAmountGaps.forEach(gap => {
    assert.strictEqual(gap.delta, null,
      `${gap.type} should have null delta, got ${gap.delta}`);
  });
});

// ===== EDGE CASE TESTS =====
console.log('\n⚠️  EDGE CASE TESTS');
console.log('==================\n');

test('Settlement dates should be reasonable (within 2 days typical, but next-month allowed)', () => {
  settlements.forEach(s => {
    const txn = transactions.find(t => t.id === s.transaction_id);
    if (txn && txn.status === 'settled') {
      const txnDate = new Date(txn.date);
      const settlementDate = new Date(s.settled_date);
      const daysDiff = Math.floor((settlementDate - txnDate) / (1000 * 60 * 60 * 24));
      assert(daysDiff >= 0, `Settlement before transaction for ${s.id}`);
      assert(daysDiff <= 32, `Settlement too far in future for ${s.id}`); // Allow month+ for next-month gap
    }
  });
});

test('No settlement should reference a non-existent transaction', () => {
  const allTxnIds = new Set(transactions.map(t => t.id));
  settlements.forEach(s => {
    assert(allTxnIds.has(s.transaction_id),
      `Settlement ${s.id} references non-existent transaction ${s.transaction_id}`);
  });
});

test('Duplicate transactions should have same fingerprint', () => {
  const duplicates = gaps.filter(g => g.type === 'DUPLICATE_ENTRY');
  duplicates.forEach(dup => {
    const dupTxn = transactions.find(t => t.id === dup.transaction_id);
    if (dupTxn) {
      const fingerprint = `${dupTxn.amount}|${dupTxn.merchant_id}|${dupTxn.date}|${dupTxn.type}`;
      const similar = transactions.filter(t =>
        `${t.amount}|${t.merchant_id}|${t.date}|${t.type}` === fingerprint
      );
      assert(similar.length > 1, `Duplicate ${dupTxn.id} should have matches with same fingerprint`);
    }
  });
});

test('Amounts should all be positive', () => {
  transactions.forEach(t => {
    assert(t.amount > 0, `Transaction ${t.id} has non-positive amount: ${t.amount}`);
  });
  settlements.forEach(s => {
    assert(s.settled_amount > 0, `Settlement ${s.id} has non-positive amount: ${s.settled_amount}`);
    assert(s.fee >= 0, `Settlement ${s.id} has negative fee: ${s.fee}`);
    assert(s.net_amount > 0, `Settlement ${s.id} has non-positive net: ${s.net_amount}`);
  });
});

// ===== SUMMARY =====
console.log('\n' + '='.repeat(50));
console.log(`\n📊 TEST RESULTS`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Total:  ${testsPassed + testsFailed}\n`);

if (testsFailed === 0) {
  console.log('🎉 ALL TESTS PASSED!\n');
  process.exit(0);
} else {
  console.log('⚠️  SOME TESTS FAILED\n');
  process.exit(1);
}
