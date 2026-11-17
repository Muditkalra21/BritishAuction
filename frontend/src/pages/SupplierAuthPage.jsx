import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSupplierAuth } from '../context/SupplierAuthContext';

export default function SupplierAuthPage() {
  const { login, register, isSupplier } = useSupplierAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ companyName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isSupplier) { navigate('/', { replace: true }); return null; }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.companyName, form.email, form.password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error;
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 animate-fade-in">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl shadow-emerald-500/40" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🚛</div>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Supplier Portal</h1>
          <p className="text-sm text-gray-400 mt-1">British Auction · RFQ Platform</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
          {[{ id: 'login', label: 'Sign In' }, { id: 'register', label: 'Create Account' }].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="card p-7 shadow-modal animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Company Name
                </label>
                <input
                  type="text" name="companyName" value={form.companyName}
                  onChange={handleChange} required placeholder="e.g. FastShip Logistics Pvt Ltd"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800
                             placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40
                             focus:border-emerald-400 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email" name="email" value={form.email}
                onChange={handleChange} required placeholder="you@company.com"
                autoFocus={tab === 'login'}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800
                           placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40
                           focus:border-emerald-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Password {tab === 'register' && <span className="text-gray-400 normal-case font-normal">(min 6 chars)</span>}
              </label>
              <input
                type="password" name="password" value={form.password}
                onChange={handleChange} required placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800
                           placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40
                           focus:border-emerald-400 transition"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 animate-fade-in">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white
                         bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700
                         shadow-lg shadow-emerald-500/30 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <span>🚛</span>
              )}
              {loading ? 'Please wait…' : tab === 'login' ? 'Sign In as Supplier' : 'Create Supplier Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          <Link to="/" className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium">
            ← Back to Auction Dashboard
          </Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">
          Admin?{' '}
          <Link to="/login" className="text-indigo-500 hover:underline font-medium">Admin Login →</Link>
        </p>
      </div>
    </div>
  );
}
