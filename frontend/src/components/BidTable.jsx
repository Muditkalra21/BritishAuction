const fmt = (val) =>
  val != null ? `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '—';

const RANK_CFG = {
  1: { label: 'L1', gradient: 'from-emerald-500 to-teal-500',  ring: 'ring-emerald-300', glow: 'shadow-emerald-500/30' },
  2: { label: 'L2', gradient: 'from-blue-500 to-indigo-500',   ring: 'ring-blue-300',    glow: 'shadow-blue-500/20' },
  3: { label: 'L3', gradient: 'from-violet-500 to-purple-500', ring: 'ring-violet-300',  glow: 'shadow-violet-500/20' },
};

function RankBadge({ rank }) {
  const cfg = RANK_CFG[rank] || { label: `L${rank}`, gradient: 'from-gray-400 to-slate-400', ring: '', glow: '' };
  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${cfg.gradient} ${cfg.glow}
      flex items-center justify-center ring-2 ${cfg.ring} shadow-lg flex-shrink-0`}>
      <span className="text-white text-xs font-black tracking-tight">{cfg.label}</span>
    </div>
  );
}

function AvatarCircle({ name, isL1 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
      ${isL1 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
      {initials}
    </div>
  );
}

export default function BidTable({ bids = [] }) {
  if (!bids.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-500">No bids submitted yet</p>
        <p className="text-xs text-gray-400 mt-1">Be the first supplier to submit a quote</p>
      </div>
    );
  }

  const effectiveRank = (b) => b.rank ?? b.displayRank;
  const sorted = [...bids]
    .filter((b) => effectiveRank(b) != null)
    .sort((a, b) => effectiveRank(a) - effectiveRank(b));

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {['Rank', 'Supplier', 'Carrier', 'Freight', 'Origin', 'Dest.', 'Total', 'Transit', 'Validity'].map((h) => (
              <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider first:pl-0 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((bid, idx) => {
            const rank = effectiveRank(bid);
            const isL1 = rank === 1;
            return (
              <tr
                key={bid.id || idx}
                className={`group transition-colors duration-200 animate-slide-in ${isL1 ? 'l1-row' : 'hover:bg-slate-50/60'}`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <td className="px-3 py-4 first:pl-0">
                  <RankBadge rank={rank} />
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <AvatarCircle name={bid.supplierName} isL1={isL1} />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isL1 ? 'text-emerald-800' : 'text-gray-800'}`}>
                        {bid.supplierName}
                      </p>
                      {isL1 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-md mt-0.5">
                          🏆 Winning
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">{bid.carrierName}</td>
                <td className="px-3 py-4 text-sm text-gray-700 font-medium">{fmt(bid.freightCharges)}</td>
                <td className="px-3 py-4 text-sm text-gray-700 font-medium">{fmt(bid.originCharges)}</td>
                <td className="px-3 py-4 text-sm text-gray-700 font-medium">{fmt(bid.destinationCharges)}</td>
                <td className="px-3 py-4">
                  <span className={`text-sm font-black ${isL1 ? 'text-emerald-700 gradient-gold' : 'text-gray-900'}`}>
                    {fmt(bid.totalAmount)}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <span className="inline-flex items-center text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium whitespace-nowrap">
                    {bid.transitTime}
                  </span>
                </td>
                <td className="px-3 py-4 text-xs text-gray-400 whitespace-nowrap">{bid.validity}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
