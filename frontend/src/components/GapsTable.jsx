export function GapsTable({ gaps }) {
  const severityMap = {
    DUPLICATE_ENTRY: { level: 1, color: 'red' },
    ORPHAN_REFUND: { level: 1, color: 'red' },
    GHOST_SETTLEMENT: { level: 1, color: 'red' },
    NEXT_MONTH_SETTLEMENT: { level: 2, color: 'amber' },
    AMOUNT_MISMATCH: { level: 2, color: 'amber' },
    REFUND_EXCEEDS_ORIGINAL: { level: 2, color: 'amber' },
    ROUNDING_ERROR: { level: 3, color: 'yellow' },
    UNSETTLED: { level: 3, color: 'yellow' },
    VOID_WITH_SETTLEMENT: { level: 3, color: 'yellow' },
    INCONSISTENT_SETTLEMENT: { level: 3, color: 'yellow' }
  };

  const colorDots = {
    red: '#ef4444',
    amber: '#f59e0b',
    yellow: '#eab308'
  };

  const sortedGaps = [...gaps].sort((a, b) => {
    const severityA = severityMap[a.type]?.level || 4;
    const severityB = severityMap[b.type]?.level || 4;
    return severityA - severityB;
  });

  if (gaps.length === 0) {
    return (
      <div className="bg-dark-card p-6 rounded-lg">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-4xl mb-2">✓</div>
            <p className="text-emerald-400 font-medium">All transactions reconciled</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card p-6 rounded-lg overflow-x-auto">
      <h3 className="text-lg font-semibold mb-4 text-gray-100">Detected Gaps</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-4 py-3 text-left font-semibold text-gray-400">Severity</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-400">Gap Type</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-400">Txn ID</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-400">Settlement ID</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-400">Detail</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-400">Delta</th>
          </tr>
        </thead>
        <tbody>
          {sortedGaps.map((gap, idx) => {
            const severity = severityMap[gap.type];
            const isEven = idx % 2 === 0;

            return (
              <tr key={`${gap.transaction_id}-${idx}`} className={isEven ? 'bg-dark-bg/50' : ''}>
                <td className="px-4 py-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colorDots[severity?.color] || '#6366f1' }}
                  ></div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    severity?.color === 'red' ? 'bg-red-900 text-red-200' :
                    severity?.color === 'amber' ? 'bg-amber-900 text-amber-200' :
                    'bg-yellow-900 text-yellow-200'
                  }`}>
                    {gap.type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-gray-400">{gap.transaction_id}</td>
                <td className="px-4 py-3 font-mono text-gray-400">{gap.settlement_id || '—'}</td>
                <td className="px-4 py-3 text-gray-400">{gap.detail}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-400">
                  {gap.delta !== null ? `$${Math.abs(gap.delta).toFixed(2)}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
