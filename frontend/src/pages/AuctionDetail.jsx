import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api/axios';
import useAuctionStore from '../store/useAuctionStore';
import StatusBadge from '../components/StatusBadge';
import Countdown from '../components/Countdown';
import BidTable from '../components/BidTable';
import BidForm from '../components/BidForm';
import ActivityLog from '../components/ActivityLog';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fmtMoney = (v) =>
  v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : null;

function Pill({ icon, label, value, highlight }) {
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-colors ${
      highlight ? 'bg-indigo-50/80 border-indigo-200' : 'bg-gray-50 border-gray-100'
    }`}>
      <span className="text-base">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium leading-none mb-0.5">{label}</p>
        <p className={`text-sm font-bold leading-none truncate ${highlight ? 'text-indigo-700' : 'text-gray-800'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Panel({ title, icon, children, accent, action }) {
  return (
    <div className={`rounded-2xl border overflow-hidden bg-white shadow-card ${accent ? 'border-indigo-200' : 'border-gray-100'}`}>
      <div className={`flex items-center justify-between px-5 py-4 border-b ${accent ? 'bg-indigo-50/40 border-indigo-100' : 'bg-white border-gray-50'}`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h3 className={`text-sm font-bold uppercase tracking-wide ${accent ? 'text-indigo-700' : 'text-gray-500'}`}>{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AuctionDetail() {
  const { id } = useParams();
  const { currentRfq, bids, logs, setCurrentRfq, setBids, setLogs } = useAuctionStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('bids');
  const [bidFlash, setBidFlash] = useState(false);
  const [showBidForm, setShowBidForm] = useState(true);
  const socketRef = useRef(null);

  const fetchData = async () => {
    try {
      const { data } = await api.get(`/rfq/${id}`);
      setCurrentRfq(data.rfq || data);
      setBids(data.rankedBids || data.bids || []);
      setLogs(data.logs || []);
    } catch {
      setError('Failed to load auction. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const wsUrl = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '/');
    const socket = io(wsUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join_rfq', id));
    socket.on('bid_update', ({ rfq, rankedBids }) => {
      if (rfq) setCurrentRfq(rfq);
      if (rankedBids) setBids(rankedBids);
      setBidFlash(true);
      setTimeout(() => setBidFlash(false), 1500);
    });
    socket.on('auction_status', ({ rfq }) => {
      if (rfq) setCurrentRfq(rfq);
    });

    return () => socket.disconnect();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-sm text-gray-400 font-medium">Loading auction room…</p>
      </div>
    );
  }

  if (error || !currentRfq) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-3xl mb-4">⚠️</div>
        <p className="text-gray-800 font-semibold mb-4">{error || 'Auction not found.'}</p>
        <Link to="/" className="btn-secondary text-sm">← Back to Dashboard</Link>
      </div>
    );
  }

  const rfq = currentRfq;
  const isActive = rfq.status === 'ACTIVE';
  const isPending = rfq.status === 'PENDING';
  const isClosed = rfq.status === 'CLOSED' || rfq.status === 'FORCE_CLOSED';
  const l1Supplier = bids.find((b) => (b.rank ?? b.displayRank) === 1);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/" className="text-gray-400 hover:text-indigo-600 transition-colors font-medium">Auctions</Link>
        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-700 font-semibold truncate max-w-sm">{rfq.name}</span>
      </nav>

      {/* Hero Card */}
      <div className={`bg-white rounded-3xl border shadow-card overflow-hidden ${isActive ? 'border-indigo-100' : 'border-gray-100'}`}>
        {/* Top gradient bar */}
        <div className={`h-1.5 ${isActive ? 'bg-gradient-to-r from-emerald-400 via-indigo-500 to-violet-500' : 'bg-gray-100'}`} />

        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <StatusBadge status={rfq.status} size="lg" />
                <code className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full font-mono">
                  {rfq.referenceId}
                </code>
              </div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight mb-4">{rfq.name}</h2>

              {/* L1 leader banner */}
              {l1Supplier ? (
                <div className={`inline-flex items-center gap-3 p-3 rounded-2xl border transition-all duration-500 ${bidFlash ? 'glow-green' : ''} bg-emerald-50 border-emerald-200`}>
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0 shadow-sm">
                    🏆
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Current L1 Leader</p>
                    <p className="text-base font-black text-emerald-900">{l1Supplier.supplierName}</p>
                  </div>
                  <div className="pl-3 border-l border-emerald-200 ml-1">
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Winning Bid</p>
                    <p className="text-xl font-black text-emerald-800">{fmtMoney(l1Supplier.totalAmount)}</p>
                  </div>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
                  <span>📋</span> No bids submitted yet — be the first!
                </div>
              )}
            </div>

            {/* Right: Countdown */}
            {isActive && (
              <div className={`flex flex-col items-center transition-transform duration-300 ${bidFlash ? 'scale-105' : ''}`}>
                <Countdown targetTime={rfq.bidClose} label="Closes in" size="lg" />
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Hard deadline: <span className="font-medium text-gray-600">{fmtDate(rfq.forcedClose)}</span>
                </p>
              </div>
            )}

            {isPending && (
              <div className="flex flex-col items-center">
                <Countdown targetTime={rfq.bidStart} label="Bidding starts in" size="lg" />
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Starts at: <span className="font-medium text-gray-600">{fmtDate(rfq.bidStart)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Config strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Pill icon="🕐" label="Bid Start" value={fmtDate(rfq.bidStart)} />
        <Pill icon="🕕" label="Bid Close" value={fmtDate(rfq.bidClose)} />
        <Pill icon="⛔" label="Hard Deadline" value={fmtDate(rfq.forcedClose)} />
        <Pill icon="📦" label="Pickup Date" value={fmtDate(rfq.pickupDate)} />
        <Pill icon="⏱️" label="Trigger Window" value={`${rfq.triggerX} minutes`} highlight />
        <Pill icon="➕" label="Extension" value={`${rfq.extensionY} min · Mode ${rfq.extensionTrigger}`} highlight />
      </div>

      {/* Pending Banner */}
      {isPending && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 flex items-center gap-4 animate-slide-up">
          <span className="text-4xl">⏳</span>
          <div>
            <p className="font-bold text-base text-amber-900">
              Auction Scheduled — Bidding Not Started Yet
            </p>
            <p className="text-sm mt-0.5 text-amber-700">
              This auction is scheduled to begin at <span className="font-semibold text-amber-900">{fmtDate(rfq.bidStart)}</span>. 
              The backend scheduler activates it automatically every 10 seconds. You will be able to submit bids as soon as it goes live!
            </p>
          </div>
        </div>
      )}

      {/* Closed banner */}
      {isClosed && (
        <div className={`rounded-2xl border p-5 flex items-center gap-4 animate-slide-up ${
          rfq.status === 'FORCE_CLOSED' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-4xl">{rfq.status === 'FORCE_CLOSED' ? '⛔' : '🔒'}</span>
          <div>
            <p className={`font-bold text-base ${rfq.status === 'FORCE_CLOSED' ? 'text-red-800' : 'text-slate-800'}`}>
              {rfq.status === 'FORCE_CLOSED' ? 'Auction Force-Closed (Hard Deadline Reached)' : 'Auction Closed'}
            </p>
            <p className={`text-sm mt-0.5 ${rfq.status === 'FORCE_CLOSED' ? 'text-red-600' : 'text-slate-500'}`}>
              {rfq.status === 'FORCE_CLOSED'
                ? 'This auction reached its forced deadline and was automatically closed.'
                : 'This auction has ended. No new bids can be accepted.'}
              {l1Supplier && ` Winner: ${l1Supplier.supplierName} with ${fmtMoney(l1Supplier.totalAmount)}.`}
            </p>
          </div>
        </div>
      )}

      {/* Two-column layout: main + bid form */}
      <div className={`grid gap-6 ${isActive ? 'grid-cols-1 xl:grid-cols-5' : 'grid-cols-1'}`}>
        {/* Main content */}
        <div className={`space-y-5 ${isActive ? 'xl:col-span-3' : ''}`}>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {[
              { id: 'bids', label: `Rankings`, icon: '📊', count: bids.length },
              { id: 'log',  label: `Activity`,  icon: '📜', count: logs.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                <span className={`ml-1 text-xs font-normal px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {activeTab === 'bids' && (
            <Panel title="Live Supplier Rankings" icon="📊">
              <BidTable bids={bids} />
            </Panel>
          )}

          {activeTab === 'log' && (
            <Panel title="Activity Log" icon="📜">
              <ActivityLog logs={logs} />
            </Panel>
          )}
        </div>

        {/* Bid Form sidebar — only when ACTIVE */}
        {isActive && (
          <div className="xl:col-span-2">
            <div className="sticky top-20">
              <Panel title="Submit Your Bid" icon="💰" accent
                action={
                  <button
                    onClick={() => setShowBidForm(v => !v)}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold"
                  >
                    {showBidForm ? 'Hide' : 'Show'}
                  </button>
                }
              >
                {showBidForm ? (
                  <BidForm rfqId={id} onBidSubmitted={fetchData} rfq={rfq} bids={bids} />
                ) : (
                  <div className="text-center py-6">
                    <button onClick={() => setShowBidForm(true)} className="btn-primary flex items-center gap-2 mx-auto">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Open Bid Form
                    </button>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
