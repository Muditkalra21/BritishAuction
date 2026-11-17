const eventConfig = {
  BID_SUBMITTED:  { icon: '📥', label: 'New Bid',          color: 'bg-blue-100 text-blue-700',    border: 'border-l-blue-400' },
  TIME_EXTENDED:  { icon: '⏱️', label: 'Time Extended',    color: 'bg-amber-100 text-amber-700',  border: 'border-l-amber-400' },
  STATUS_CHANGED: { icon: '🔄', label: 'Status Changed',   color: 'bg-indigo-100 text-indigo-700',border: 'border-l-indigo-400' },
  AUCTION_OPENED: { icon: '🟢', label: 'Auction Opened',   color: 'bg-emerald-100 text-emerald-700', border: 'border-l-emerald-400' },
  AUCTION_CLOSED: { icon: '🔒', label: 'Auction Closed',   color: 'bg-gray-100 text-gray-600',    border: 'border-l-gray-400' },
};

const fmtTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { timeStyle: 'medium', dateStyle: 'short' }) : '—';

export default function ActivityLog({ logs = [] }) {
  if (!logs.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-500">No activity yet</p>
        <p className="text-xs text-gray-400 mt-1">Events will appear here as the auction progresses</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
      {[...logs].reverse().map((log, idx) => {
        const eventKey = log.eventType || log.event;
        const cfg = eventConfig[eventKey] || { icon: 'ℹ️', label: eventKey, color: 'bg-gray-100 text-gray-600', border: 'border-l-gray-300' };
        return (
          <div
            key={log.id || idx}
            className={`flex items-start gap-3 p-3.5 rounded-xl bg-white border border-gray-100 border-l-4 ${cfg.border} animate-slide-in shadow-sm`}
            style={{ animationDelay: `${idx * 20}ms` }}
          >
            <span className="text-lg flex-shrink-0 mt-0.5">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                <span className="text-xs text-gray-400">{fmtTime(log.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{log.description || log.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
