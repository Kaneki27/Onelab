import { useEffect, useState } from 'react';
import axios from 'axios';
import { SummaryBar } from './components/SummaryBar';
import { GapChart } from './components/GapChart';
import { GapsTable } from './components/GapsTable';
import { TransactionsTable } from './components/TransactionsTable';

function App() {
  const [summary, setSummary] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = 'http://localhost:3001/api';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [txnRes, reconcileRes] = await Promise.all([
        axios.get(`${API_URL}/transactions`),
        axios.get(`${API_URL}/reconcile`)
      ]);

      setTransactions(txnRes.data);
      setSummary(reconcileRes.data.summary);
      setGaps(reconcileRes.data.gaps);
    } catch (err) {
      setError(err.message === 'Network Error'
        ? 'Backend not running. Please start: cd backend && npm install && npm start'
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Build a set of transaction IDs that have gaps (for highlighting)
  const gapTransactionIds = new Map();
  gaps.forEach(gap => {
    if (!gapTransactionIds.has(gap.transaction_id)) {
      gapTransactionIds.set(gap.transaction_id, gap.type);
    }
  });

  // Enhance transactions with gap info
  const transactionsWithGaps = transactions.map(txn => ({
    ...txn,
    gapType: gapTransactionIds.get(txn.id) || null
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p className="text-gray-400">Loading reconciliation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-dark-card p-8 rounded-lg max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-6 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-1">Reconciliation Dashboard</h1>
          <p className="text-gray-400">January 2024 · {transactions.length} Transactions</p>
        </div>
        <button
          onClick={fetchData}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-full font-medium transition"
        >
          Re-run Reconciliation
        </button>
      </div>

      {/* Summary Bar */}
      <div className="mb-8">
        <SummaryBar summary={summary} />
      </div>

      {/* Charts Row */}
      <div className="mb-8">
        <GapChart gaps={gaps} summary={summary} />
      </div>

      {/* Gaps Table */}
      <div className="mb-8">
        <GapsTable gaps={gaps} />
      </div>

      {/* Transactions Table */}
      <div>
        <TransactionsTable transactions={transactionsWithGaps} gapTransactionIds={gapTransactionIds} />
      </div>
    </div>
  );
}

export default App;
