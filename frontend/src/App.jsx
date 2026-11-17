import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import AuctionList from './pages/AuctionList';
import AuctionDetail from './pages/AuctionDetail';
import LoginPage from './pages/LoginPage';
import SupplierAuthPage from './pages/SupplierAuthPage';
import { useAuth } from './context/AuthContext';
import { useSupplierAuth } from './context/SupplierAuthContext';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const { isAdmin, admin, logout } = useAuth();
  const { isSupplier, supplier, logout: supplierLogout } = useSupplierAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/40 group-hover:shadow-indigo-500/60 transition-shadow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">British Auction</p>
            <p className="text-xs text-gray-400 leading-none mt-0.5">RFQ Procurement Platform</p>
          </div>
        </Link>

        {/* Center — Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-3 py-1 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live Auction Engine
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {!isHome && (
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
          )}

          {isAdmin ? (
            /* Logged-in admin */
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-indigo-700">{admin?.username || 'Admin'}</span>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : isSupplier ? (
            /* Logged-in supplier */
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
                <span className="text-base">🚛</span>
                <span className="text-xs font-semibold text-emerald-700 truncate max-w-[120px]">{supplier?.companyName}</span>
              </div>
              <button onClick={() => supplierLogout()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            /* Guest */
            <div className="flex items-center gap-2">
              <Link to="/supplier/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-50 border border-emerald-100 transition-colors"
              >
                <span>🚛</span>
                <span className="hidden sm:inline">Supplier Login</span>
              </Link>
              <Link to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Admin
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <Routes>
            <Route path="/" element={<AuctionList />} />
            <Route path="/rfq/:id" element={<AuctionDetail />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/supplier/login" element={<SupplierAuthPage />} />
          </Routes>
        </main>
        <footer className="mt-16 border-t border-gray-100 bg-white/60">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
            <span>British Auction RFQ System — Reverse Bidding Platform</span>
            <span>Scheduler: every 10s · Real-time via Socket.IO · PostgreSQL on Neon</span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
