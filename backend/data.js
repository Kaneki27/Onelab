// ASSUMPTIONS:
// 1. All amounts in USD, no FX conversion
// 2. Settlement lag for clean txns is 1–2 business days
// 3. Dataset scope is January 2024 only
// 4. Rounding tolerance threshold is <= $0.02
// 5. Duplicate fingerprint = amount + merchant_id + date + type
// 6. Refund amount <= original charge is valid; > is flagged separately
// 7. Voided and pending transactions are expected to have no settlement
// 8. One transaction maps to exactly one settlement (1:1)
// 9. Detection order determines classification when a txn qualifies for multiple gap types
// 10. Pending transactions are in-flight and not counted as gaps

const merchants = ['MRC-01', 'MRC-02', 'MRC-03', 'MRC-04', 'MRC-05', 'MRC-06', 'MRC-07', 'MRC-08', 'MRC-09', 'MRC-10'];

function round(value) {
  return Math.round(value * 100) / 100;
}

function randomAmount(min, max) {
  return round(Math.random() * (max - min) + min);
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function generateData() {
  const transactions = [];
  const settlements = [];
  let txnId = 1;
  let settlementId = 1;

  const janStart = new Date('2024-01-01');
  const janEnd = new Date('2024-01-31');

  // Track charges for refund references
  const chargeIds = [];

  // SECTION 1: Generate 50 normal clean charges with 1–2 day settlement lag
  // (2 of these will be planted with gaps: one for next-month, one for rounding)
  // (2 additional duplicates will be added after to make 52 total charges)
  for (let i = 0; i < 50; i++) {
    const date = formatDate(randomDate(janStart, janEnd));
    const amount = (() => {
      const rand = Math.random();
      if (rand < 0.33) return randomAmount(5, 49.99); // Small
      if (rand < 0.66) return randomAmount(50, 499.99); // Medium
      return randomAmount(500, 2999.99); // Large
    })();
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];

    const txn = {
      id: `TXN-${String(txnId).padStart(3, '0')}`,
      date,
      amount,
      type: 'charge',
      status: 'settled',
      reference_id: null,
      merchant_id: merchant,
      currency: 'USD'
    };

    chargeIds.push(txn.id);
    transactions.push(txn);

    // Settlement: 1–2 day lag
    let settlementDate = addDays(new Date(date), Math.floor(Math.random() * 2) + 1);
    let settlementAmount = amount;
    let fee = round(amount * 0.01); // 1% fee
    let netAmount = round(amount - fee);

    // GAP 1: Next-month settlement (planted at index 48)
    if (i === 48) {
      // Override with gap 1 data
      txn.date = '2024-01-31';
      txn.amount = 1250.00;
      txn.merchant_id = 'MRC-03';
      settlementDate = new Date('2024-02-02');
      settlementAmount = 1250.00;
      fee = round(1250.00 * 0.01);
      netAmount = round(1250.00 - fee);
    }

    // GAP 2: Rounding error (planted at index 49)
    if (i === 49) {
      // Override with gap 2 data
      txn.amount = 349.99;
      txn.merchant_id = 'MRC-07';
      settlementAmount = 350.00;
      fee = 3.50;
      netAmount = 346.50;
    }

    const settlement = {
      id: `SET-${String(settlementId).padStart(3, '0')}`,
      transaction_id: txn.id,
      settled_date: formatDate(settlementDate),
      settled_amount: settlementAmount,
      fee,
      net_amount: netAmount,
      settlement_batch: `BATCH-2024-${Math.floor(Math.random() * 4) + 1}-${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
      currency: 'USD'
    };

    settlements.push(settlement);
    txnId++;
    settlementId++;
  }

  // GAP 3: Duplicate entry (two transactions with same fingerprint, different IDs)
  const duplicateAmount = 89.99;
  const duplicateDate = '2024-01-14';
  const duplicateMerchant = 'MRC-05';

  for (let dup = 0; dup < 2; dup++) {
    const txn = {
      id: `TXN-${String(txnId).padStart(3, '0')}`,
      date: duplicateDate,
      amount: duplicateAmount,
      type: 'charge',
      status: 'settled',
      reference_id: null,
      merchant_id: duplicateMerchant,
      currency: 'USD'
    };

    chargeIds.push(txn.id);
    transactions.push(txn);

    // Both have settlements
    const settlementDate = addDays(new Date(duplicateDate), 1);
    const fee = round(duplicateAmount * 0.01);
    const settlement = {
      id: `SET-${String(settlementId).padStart(3, '0')}`,
      transaction_id: txn.id,
      settled_date: formatDate(settlementDate),
      settled_amount: duplicateAmount,
      fee,
      net_amount: round(duplicateAmount - fee),
      settlement_batch: 'BATCH-2024-01-A',
      currency: 'USD'
    };

    settlements.push(settlement);
    txnId++;
    settlementId++;
  }

  // SECTION 2: Generate 5 refunds (including 1 orphan)
  const refunds = [
    { amount: 75.50, refToIndex: 5, isOrphan: false }, // Refund index 5
    { amount: 150.00, refToIndex: 15, isOrphan: false }, // Refund index 15
    { amount: 99.99, refToIndex: 25, isOrphan: false }, // Refund index 25
    { amount: 45.00, refToIndex: 35, isOrphan: false }, // Refund index 35
    { amount: 210.00, refToIndex: null, isOrphan: true } // GAP 4: Orphan refund
  ];

  for (const ref of refunds) {
    const refChargeId = ref.isOrphan ? 'TXN-999' : chargeIds[ref.refToIndex];
    const refAmount = ref.amount;
    const refDate = ref.isOrphan ? '2024-01-20' : formatDate(addDays(new Date(formatDate(randomDate(janStart, janEnd))), -1));
    const refMerchant = ref.isOrphan ? 'MRC-02' : merchants[Math.floor(Math.random() * merchants.length)];

    const txn = {
      id: `TXN-${String(txnId).padStart(3, '0')}`,
      date: refDate,
      amount: refAmount,
      type: 'refund',
      status: 'settled',
      reference_id: refChargeId,
      merchant_id: refMerchant,
      currency: 'USD'
    };

    transactions.push(txn);

    // Even orphan refunds have settlements (they were paid out)
    const settlementDate = addDays(new Date(refDate), 1);
    const fee = round(refAmount * 0.01);
    const settlement = {
      id: `SET-${String(settlementId).padStart(3, '0')}`,
      transaction_id: txn.id,
      settled_date: formatDate(settlementDate),
      settled_amount: refAmount,
      fee,
      net_amount: round(refAmount - fee),
      settlement_batch: `BATCH-2024-${Math.floor(Math.random() * 4) + 1}-${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
      currency: 'USD'
    };

    settlements.push(settlement);
    txnId++;
    settlementId++;
  }

  // SECTION 3: Generate 2 pending transactions (no settlement)
  for (let i = 0; i < 2; i++) {
    const date = formatDate(randomDate(addDays(janEnd, -7), janEnd)); // Recent
    const amount = randomAmount(50, 500);

    const txn = {
      id: `TXN-${String(txnId).padStart(3, '0')}`,
      date,
      amount,
      type: 'charge',
      status: 'pending',
      reference_id: null,
      merchant_id: merchants[Math.floor(Math.random() * merchants.length)],
      currency: 'USD'
    };

    transactions.push(txn);
    txnId++;
  }

  // SECTION 4: Generate 1 voided transaction (no settlement)
  {
    const date = formatDate(randomDate(janStart, janEnd));
    const amount = randomAmount(100, 1000);

    const txn = {
      id: `TXN-${String(txnId).padStart(3, '0')}`,
      date,
      amount,
      type: 'charge',
      status: 'voided',
      reference_id: null,
      merchant_id: merchants[Math.floor(Math.random() * merchants.length)],
      currency: 'USD'
    };

    transactions.push(txn);
    txnId++;
  }

  return { transactions, settlements };
}
