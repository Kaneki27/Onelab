import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function GapChart({ gaps, summary }) {
  // Count gaps by type
  const gapCounts = {};
  gaps.forEach(gap => {
    gapCounts[gap.type] = (gapCounts[gap.type] || 0) + 1;
  });

  const gapChartData = Object.entries(gapCounts)
    .map(([type, count]) => ({
      type: type.replace(/_/g, ' '),
      count,
      originalType: type
    }))
    .sort((a, b) => b.count - a.count);

  // Map severity levels for bar colors
  const severityMap = {
    DUPLICATE_ENTRY: 'red',
    ORPHAN_REFUND: 'red',
    GHOST_SETTLEMENT: 'red',
    NEXT_MONTH_SETTLEMENT: 'amber',
    AMOUNT_MISMATCH: 'amber',
    ROUNDING_ERROR: 'yellow',
    UNSETTLED: 'yellow',
    VOID_WITH_SETTLEMENT: 'yellow',
    INCONSISTENT_SETTLEMENT: 'yellow',
    REFUND_EXCEEDS_ORIGINAL: 'amber'
  };

  const colorMap = {
    red: '#ef4444',
    amber: '#f59e0b',
    yellow: '#eab308'
  };

  // Transaction status breakdown
  const transactionBreakdown = [
    { name: 'Clean Matched', value: summary.clean_matches, fill: '#10b981' },
    { name: 'Pending', value: summary.pending, fill: '#6366f1' },
    { name: 'Voided', value: summary.voided, fill: '#8b5cf6' },
    { name: 'Gaps', value: summary.gaps_found, fill: '#ef4444' }
  ].filter(item => item.value > 0);

  const CustomPieLabel = (entry) => {
    const percent = ((entry.value / summary.total_transactions) * 100).toFixed(0);
    return `${percent}%`;
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Bar Chart */}
      <div className="bg-dark-card p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-100">Gap Distribution by Type</h3>
        {gapChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gapChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
              <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#999' }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11, fill: '#999' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2d2d3d' }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {gapChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colorMap[severityMap[entry.originalType]] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-center py-12">No gaps detected</p>
        )}
      </div>

      {/* Donut Chart */}
      <div className="bg-dark-card p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-100">Transaction Status Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={transactionBreakdown}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={CustomPieLabel}
              labelLine={false}
            >
              {transactionBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2d2d3d' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2 mt-4 text-xs">
          {transactionBreakdown.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
              <span className="text-gray-400">{item.name}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
