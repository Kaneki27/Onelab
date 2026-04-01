# Payments Reconciliation Tool

A modern, full-stack payments reconciliation dashboard that detects discrepancies between transactions and settlements. Built with Express.js, React, and Tailwind CSS.

## 🎯 Features

- **Automated Data Generation**: Generates 60 test transactions and settlements for January 2024
- **Multi-Type Gap Detection**: Identifies 5 different reconciliation issues:
  - Duplicate entries (fingerprint-based)
  - Rounding errors (tolerance ≤ $0.02)
  - Next-month settlements
  - Orphan refunds
  - Unsettled/ghost transactions
- **Real-Time Dashboard**: Interactive UI with charts, tables, and summary statistics
- **Zero Dependencies**: No database, auth, or environment files needed
- **Vercel Ready**: Deploy instantly with serverless functions

## 📦 Stack

- **Backend**: Node.js + Express.js
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Data**: In-memory JSON (generated on-the-fly)
- **Charts**: Recharts for data visualization
- **Deployment**: Vercel with serverless API functions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm v9+

### Local Development

1. **Clone and Install**
   ```bash
   git clone https://github.com/Kaneki27/Onelab.git
   cd reconciliation-tool

   # Backend
   cd backend && npm install

   # Frontend (in a new terminal)
   cd frontend && npm install
   ```

2. **Run Backend**
   ```bash
   cd backend
   npm start
   # Server runs on http://localhost:3001
   ```

3. **Run Frontend** (in another terminal)
   ```bash
   cd frontend
   npm run dev
   # App runs on http://localhost:5173
   ```

4. **Run Tests** (optional)
   ```bash
   cd backend
   npm test
   ```

## 📊 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/transactions` | GET | Get all 60 transactions |
| `/api/settlements` | GET | Get all settlements |
| `/api/reconcile` | GET | Run full reconciliation + get gaps |

## 🌐 Vercel Deployment

### 1. Connect GitHub
```bash
git push -u origin main
```

### 2. Deploy to Vercel
- Visit [vercel.com](https://vercel.com)
- Click "New Project"
- Import the GitHub repository
- Vercel auto-detects the Vite + serverless setup
- Click "Deploy"

The `vercel.json` configuration handles:
- Building frontend with Vite
- Creating serverless APIs from `/api` folder
- Automatic routing of `/api/*` requests

## 🏗️ Project Structure

```
reconciliation-tool/
├── backend/
│   ├── server.js          # Express app & routes
│   ├── data.js            # 60 transactions + settlements
│   ├── reconcile.js       # 5-step gap detection
│   ├── test.js            # Comprehensive test suite
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── index.css
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── api/                   # Vercel serverless functions
│   ├── reconcile.js
│   ├── transactions.js
│   └── settlements.js
└── vercel.json
```

## 🧪 Testing

```bash
cd backend
npm test
```

Validates data generation, gap detection, and edge cases.

## 🎨 Dashboard Features

- **6 Summary Stats**: Transactions, settlements, clean matches, gaps, amounts, discrepancies
- **Gap Breakdown Chart**: Bar chart with severity color-coding
- **Transaction Status Donut**: Clean/pending/voided/gap breakdown
- **Gaps Table**: Sortable, filterable list with severity indicators
- **Transactions Table**: Full ledger with gap highlighting

## 📝 Data Generation

- 60 transactions across 10 merchants (MRC-01 to MRC-10)
- January 2024 date range (31 days)
- Mix of small ($5–$50), medium ($50–$500), large ($500–$3000) amounts
- 48 settled charges + 5 refunds + 2 pending + 1 voided
- 4 intentional reconciliation gaps for testing

## 🧠 Gap Detection Algorithm

Runs in 5 steps:
1. **Deduplication** - Fingerprint-based duplicate detection
2. **Settlement Matching** - Transaction → Settlement 1:1 mapping
3. **Rounding Tolerance** - Flags deltas > $0.02
4. **Next-Month Check** - Settlements in different month
5. **Orphan Refunds** - Refunds with missing reference charges

## 📄 License

MIT
