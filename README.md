# Reconciliation Tool

A full-stack payments reconciliation system built with Node.js/Express and React. Generates synthetic transaction data, detects reconciliation gaps, and visualizes results on a clean dashboard.

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Backend Setup
```bash
cd backend
npm install
npm start
```
Backend runs on http://localhost:3001

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:5173

## Features

### Data Generation
- **60 synthetic transactions** for January 2024 spread across 10 merchants
- **4 planted gaps** woven into realistic data:
  1. **Next-month settlement** — Transaction settled in February
  2. **Rounding error** — $0.01 discrepancy between transaction and settlement
  3. **Duplicate entry** — Same amount/merchant on same date with different IDs
  4. **Orphan refund** — Refund referencing non-existent charge

### Gap Detection (5-step algorithm)
1. **Deduplication** — Identify duplicate fingerprints (amount + merchant + date + type)
2. **Settlement matching** — Find unsettled transactions and ghost settlements
3. **Rounding check** — Flag discrepancies <= $0.02
4. **Next-month settlement** — Detect cross-month settlement delays
5. **Orphan refund** — Find refunds with invalid charge references

Additional checks:
- **Amount mismatch** — Significant discrepancies > $0.02
- **Inconsistent settlement** — Fee arithmetic errors
- **Void with settlement** — Voided transactions with settlement records
- **Refund exceeds original** — Refund larger than original charge

### Dashboard UI
- **Summary bar** — 6 key metrics with color-coded alerts
- **Gap distribution chart** — Bar chart grouped by gap type
- **Transaction breakdown** — Donut chart showing clean/pending/voided/gaps
- **Gaps table** — Detailed view sorted by severity (red → amber → yellow)
- **Transactions table** — Expandable list with gap highlighting

### API Endpoints
- `GET /api/transactions` — All 60 transactions
- `GET /api/settlements` — All settlements
- `GET /api/reconcile` — Run reconciliation, returns gaps and summary

## Data Structure

### Transaction
```json
{
  "id": "TXN-001",
  "date": "2024-01-15",
  "amount": 249.99,
  "type": "charge",
  "status": "settled",
  "reference_id": null,
  "merchant_id": "MRC-03",
  "currency": "USD"
}
```

### Settlement
```json
{
  "id": "SET-001",
  "transaction_id": "TXN-001",
  "settled_date": "2024-01-16",
  "settled_amount": 249.99,
  "fee": 2.50,
  "net_amount": 247.49,
  "settlement_batch": "BATCH-2024-01-A",
  "currency": "USD"
}
```

## Design
- **Dark theme** — #0f1117 background, #1a1d27 cards
- **Accent color** — Indigo (#6366f1)
- **Font** — Inter (Google Fonts)
- **Severity levels**:
  - 🔴 Red — Critical (duplicate, orphan, ghost)
  - 🟠 Amber — High (next-month, amount mismatch)
  - 🟡 Yellow — Medium (rounding, inconsistency)

## Development

### Backend Structure
- `data.js` — Generate 60 transactions with 4 planted gaps
- `reconcile.js` — 5-step gap detection engine
- `server.js` — Express API with CORS

### Frontend Structure
- `App.jsx` — Main component with API integration
- `components/SummaryBar.jsx` — 6-stat summary cards
- `components/GapChart.jsx` — Bar and donut charts
- `components/GapsTable.jsx` — Sortable gaps table
- `components/TransactionsTable.jsx` — Collapsible transaction list

### No External Dependencies
- No database — all data in-memory JSON
- No authentication — demo mode
- No environment files — hardcoded ports (3001, 5173)
- No third-party APIs — fully self-contained

## Assumptions
1. All amounts in USD, no FX conversion
2. Settlement lag is 1–2 business days for clean transactions
3. Scope: January 2024 only
4. Rounding tolerance: <= $0.02
5. Duplicate fingerprint = amount + merchant_id + date + type
6. Refund amount <= original is valid
7. Voided/pending transactions don't need settlements
8. 1:1 mapping between transactions and settlements
9. Detection order determines gap classification
10. Pending transactions are in-flight, not flagged as gaps

## Testing
Run reconciliation multiple times — data is regenerated on each backend restart.
