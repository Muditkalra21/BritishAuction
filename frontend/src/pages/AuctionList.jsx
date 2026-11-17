import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import Countdown from '../components/Countdown';
import CreateRfqForm from '../components/CreateRfqForm';
import useAuctionStore from '../store/useAuctionStore';
import { useAuth } from '../context/AuthContext';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const fmtMoney = (v) =>
  v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : null;

function StatCard({ label, value, icon, color = 'indigo' }) {
  const colors = {
    indigo: { bg: 'from-indigo-500 to-violet-600', light: 'bg-indigo-50', text: 'text-indigo-600' },
    emerald: { bg: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50', text: 'text-emerald-600' },
    amber: { bg: 'from-amber-500 to-orange-500', light: 'bg-amber-50', text: 'text-amber-600' },
    rose: { bg: 'from-rose-500 to-pink-500', light: 'bg-rose-50', text: 'text-rose-600' },
  };
  const c = colors[color];
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.bg} flex items-center justify-center text-white text-2xl shadow-lg flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="shimmer h-5 w-32 rounded-full" />
          <div className="shimmer h-6 w-56 rounded-lg" />
        </div>
        <div className="shimmer w-10 h-10 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <div key={i} className="shimmer h-16 rounded-xl" />)}
      </div>
      <div className="shimmer h-4 w-48 rounded" />
    </div>
  );
}

export default function AuctionList() {
  const { rfqs, setRfqs } = useAuctionStore();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchRfqs = async () => {
    try {
      const { data } = await api.get('/rfq');
      setRfqs(data);
      setError(null);
    } catch {
      setError('Could not connect to the auction server. Is the backend running on port 3001?');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, rfqId, rfqName) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete auction "${rfqName}"?`)) return;
    try {
      await api.delete(`/rfq/${rfqId}`);
      fetchRfqs();
    } catch (err) {
      alert('Failed to delete auction.');
    }
  };

  useEffect(() => {
    fetchRfqs();
    const id = setInterval(fetchRfqs, 10000);
    return () => clearInterval(id);
  }, []);

  const handleCreated = () => { setShowModal(false); fetchRfqs(); };

  const activeCount = rfqs.filter((r) => r.status === 'ACTIVE').length;
  const pendingCount = rfqs.filter((r) => r.status === 'PENDING').length;
  const closedCount = rfqs.filter((r) => r.status === 'CLOSED' || r.status === 'FORCE_CLOSED').length;
  const totalBids = rfqs.reduce((acc, r) => acc + (r.supplierCount || 0), 0);
  const lowestBid = rfqs.reduce((min, r) =>
    r.currentLowestBid != null && (min == null || r.currentLowestBid < min) ? r.currentLowestBid : min, null);

  const filtered = rfqs.filter((r) => {
    // Status filter
    if (filter === 'ACTIVE' && r.status !== 'ACTIVE') return false;
    if (filter === 'PENDING' && r.status !== 'PENDING') return false;
    if (filter === 'CLOSED' && r.status !== 'CLOSED' && r.status !== 'FORCE_CLOSED') return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = r.name?.toLowerCase().includes(q);
      const matchRef = r.referenceId?.toLowerCase().includes(q);
      if (!matchName && !matchRef) return false;
    }
    return true;
  });

  const filters = [
    { id: 'ALL', label: 'All', count: rfqs.length },
    { id: 'ACTIVE', label: '🔴 Live', count: activeCount },
    { id: 'PENDING', label: '⏳ Pending', count: pendingCount },
    { id: 'CLOSED', label: '🔒 Closed', count: closedCount },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900">
            Auction <span className="gradient-text">Dashboard</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            British-style reverse procurement — lowest bid wins
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Auction
        </button>
      </div>

      {/* Stats — admin only */}
      {!loading && !error && isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
          <StatCard label="Total Auctions" value={rfqs.length} icon="📋" color="indigo" />
          <StatCard label="Live Now" value={activeCount} icon="🔴" color="emerald" />
          <StatCard label="Quotes Submitted" value={totalBids} icon="📨" color="amber" />
          <StatCard label="Best Bid" value={lowestBid != null ? fmtMoney(lowestBid) : '—'} icon="💰" color="rose" />
        </div>
      )}

      {/* Filter and Search toolbar */}
      {!loading && !error && rfqs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  filter === f.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                  filter === f.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200/70 text-gray-500'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search route or ID..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm"
            />
            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center card p-10">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-3xl mb-4">⚠️</div>
          <p className="text-gray-800 font-semibold mb-1">Backend not reachable</p>
          <p className="text-gray-500 text-sm mb-5">{error}</p>
          <button onClick={fetchRfqs} className="btn-secondary text-sm">
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && rfqs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center text-5xl mb-5 shadow-inner">📦</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No auctions yet</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xs">
            Create your first British Auction RFQ to invite logistics suppliers and start competitive bidding.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create First Auction
          </button>
        </div>
      )}

      {/* Auction cards */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((rfq, idx) => {
            const isActive = rfq.status === 'ACTIVE';
            const lowestBid = rfq.currentLowestBid != null ? fmtMoney(rfq.currentLowestBid) : null;
            return (
              <div
                key={rfq.id}
                onClick={() => navigate(`/rfq/${rfq.id}`)}
                className={`card card-hover cursor-pointer p-5 relative overflow-hidden group animate-slide-up`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Top accent line */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-400 via-indigo-500 to-violet-500'
                    : 'bg-gray-100'
                }`} />

                {/* Header */}
                <div className="flex items-start justify-between gap-3 mt-1 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <StatusBadge status={rfq.status} />
                      <code className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md font-mono">
                        {rfq.referenceId}
                      </code>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 leading-snug group-hover:text-indigo-700 transition-colors truncate">
                      {rfq.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDelete(e, rfq.id, rfq.name)}
                        title="Delete Auction"
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${
                      isActive ? 'bg-indigo-50' : 'bg-gray-50'
                    }`}>
                      🚛
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  <div className={`rounded-xl p-3 text-center ${lowestBid ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-400 mb-1 font-medium">L1 Bid</p>
                    <p className={`text-sm font-black ${lowestBid ? 'text-emerald-700' : 'text-gray-400'}`}>
                      {lowestBid || '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1 font-medium">Suppliers</p>
                    <p className="text-sm font-black text-gray-700">{rfq.supplierCount ?? 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1 font-medium">Trigger</p>
                    <p className="text-sm font-black text-indigo-700">{rfq.extensionTrigger || '—'}</p>
                  </div>
                </div>

                {/* Times / Countdown */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-50 gap-2">
                  <div className="text-xs text-gray-400 min-w-0">
                    <span className="block">Closes: <span className="text-gray-600 font-medium">{fmtDate(rfq.bidClose)}</span></span>
                    <span className="block mt-0.5">Hard stop: <span className="text-gray-600 font-medium">{fmtDate(rfq.forcedClose)}</span></span>
                  </div>
                  {isActive && <Countdown targetTime={rfq.bidClose} />}
                </div>

                {/* Hover arrow */}
                <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-1">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No results after filter */}
      {!loading && !error && rfqs.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm font-medium">No auctions match this filter</p>
          <button onClick={() => setFilter('ALL')} className="text-indigo-500 text-xs mt-2 hover:underline">Show all</button>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-modal w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-slide-up">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Create New Auction</h3>
                  <p className="text-xs text-gray-400">Configure a British-style reverse bidding auction</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-6">
              <CreateRfqForm onCreated={handleCreated} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
