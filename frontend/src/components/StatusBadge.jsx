const statusConfig = {
  PENDING:     { label: 'Pending',      dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200', ping: false },
  ACTIVE:      { label: 'Live',         dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200', ping: true },
  CLOSED:      { label: 'Closed',       dot: 'bg-gray-400',    bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200', ping: false },
  FORCE_CLOSED:{ label: 'Force Closed', dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200', ping: false },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = statusConfig[status] || statusConfig.CLOSED;
  const pad = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${pad} ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className="relative flex h-2 w-2 flex-shrink-0">
        {cfg.ping && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
      </span>
      {cfg.label}
    </span>
  );
}
