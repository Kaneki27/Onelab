export function SummaryBar({ summary }) {
  const stats = [
    { label: 'Total Transactions', value: summary.total_transactions },
    { label: 'Total Settlements', value: summary.total_settlements },
    { label: 'Clean Matches', value: summary.clean_matches },
    { label: 'Gaps Found', value: summary.gaps_found, highlight: summary.gaps_found > 0 ? 'red' : 'green' },
    { label: 'Total Transacted', value: `$${summary.total_amount_transacted.toFixed(2)}` },
    { label: 'Net Discrepancy', value: `$${Math.abs(summary.net_discrepancy).toFixed(2)}`, highlight: summary.net_discrepancy !== 0 ? 'amber' : 'green' }
  ];

  return (
    <div className="grid grid-cols-6 gap-4">
      {stats.map((stat, i) => {
        let bgColor = 'bg-dark-card';
        let textColor = 'text-gray-300';

        if (stat.highlight === 'red') {
          bgColor = 'bg-red-900/20 border border-red-700';
          textColor = 'text-red-400';
        } else if (stat.highlight === 'amber') {
          bgColor = 'bg-amber-900/20 border border-amber-700';
          textColor = 'text-amber-400';
        } else if (stat.highlight === 'green') {
          bgColor = 'bg-emerald-900/20 border border-emerald-700';
          textColor = 'text-emerald-400';
        }

        return (
          <div key={i} className={`${bgColor} p-6 rounded-lg`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold ${textColor}`}>{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}
