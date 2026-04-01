import { useState } from 'react';

export function TransactionsTable({ transactions, gapTransactionIds }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayTransactions = isExpanded ? transactions : [];

  const severityMap = {
    DUPLICATE_ENTRY: 'red',
    ORPHAN_REFUND: 'red',
    GHOST_SETTLEMENT: 'red',
    NEXT_MONTH_SETTLEMENT: 'amber',
    AMOUNT_MISMATCH: 'amber',
    REFUND_EXCEEDS_ORIGINAL: 'amber',
    ROUNDING_ERROR: 'yellow',
    UNSETTLED: 'yellow',
    VOID_WITH_SETTLEMENT: 'yellow',
    INCONSISTENT_SETTLEMENT: 'yellow'
  };

  const borderColors = {
    red: 'border-l-2 border-l-red-500',
    amber: 'border-l-2 border-l-amber-500',
    yellow: 'border-l-2 border-l-yellow-500'
  };

  return (
    <div className="bg-dark-card p-6 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 mb-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition"
      >
        <span>{isExpanded ? '▾' : '▸'}</span>
        Transactions ({transactions.length})
      </button>

      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left font-semibold text-gray-400">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-400">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-400">Merchant</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-400">Type</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-400">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.map((txn, idx) => {
                const hasGap = gapTransactionIds.has(txn.id);
                const gapColor = hasGap ? severityMap[txn.gapType] : null;
                const borderClass = gapColor ? borderColors[gapColor] : '';
                const isEven = idx % 2 === 0;

                return (
                  <tr
                    key={txn.id}
                    className={`${borderClass} ${isEven ? 'bg-dark-bg/50' : ''} ${hasGap ? 'opacity-75' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-gray-400 text-xs">{txn.id}</td>
                    <td className="px-4 py-3 text-gray-400">{txn.date}</td>
                    <td className="px-4 py-3 text-gray-400">{txn.merchant_id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        txn.type === 'charge'
                          ? 'bg-blue-900/30 text-blue-400'
                          : 'bg-purple-900/30 text-purple-400'
                      }`}>
                        {txn.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400">${txn.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        txn.status === 'settled'
                          ? 'bg-green-900/30 text-green-400'
                          : txn.status === 'pending'
                          ? 'bg-blue-900/30 text-blue-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}>
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
