import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useSupplierAuth } from '../context/SupplierAuthContext';

function Field({ label, name, type = 'text', value, onChange, placeholder, required, min, step, readOnly }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label} {required && <span className="text-rose-400 normal-case font-normal">*required</span>}
      </label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} required={required} min={min} step={step}
        readOnly={readOnly}
        className={`input-field ${readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
      />
    </div>
  );
}

export default function BidForm({ rfqId, onBidSubmitted, rfq, bids = [] }) {
  const { isSupplier, supplier } = useSupplierAuth();

  const [form, setForm] = useState({
    carrierName: '',
    freightCharges: '', originCharges: '', destinationCharges: '',
    transitTime: '', validity: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // If not logged in as supplier, show gate
  if (!isSupplier) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl">&#x1F69B;</div>
        <div>
          <p className="font-bold text-gray-800 mb-1">Supplier Login Required</p>
          <p className="text-sm text-gray-500 mb-4">You must be logged in with a verified supplier account to submit bids.</p>
        </div>
        <Link
          to="/supplier/login"
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white
                     bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700
                     shadow-lg shadow-emerald-500/30 transition"
        >
          <span>&#x1F69B;</span> Login / Register as Supplier
        </Link>
      </div>
    );
  }

  const totalAmount =
    (parseFloat(form.freightCharges) || 0) +
    (parseFloat(form.originCharges) || 0) +
    (parseFloat(form.destinationCharges) || 0);

  const fmtMoney = (v) => v > 0
    ? '\u20B9' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0 })
    : '\u20B90';

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const prevBid = bids.find((b) => b.supplierName === supplier?.companyName);

  const prefillFromPrev = () => {
    if (!prevBid) return;
    setForm({
      carrierName: prevBid.carrierName || '',
      freightCharges: String(prevBid.freightCharges ?? ''),
      originCharges: String(prevBid.originCharges ?? ''),
      destinationCharges: String(prevBid.destinationCharges ?? ''),
      transitTime: prevBid.transitTime || '',
      validity: prevBid.validity || '',
    });
    setMessage(null);
  };

  const applyQuickBid = (reduction) => {
    const current = parseFloat(form.freightCharges) || 0;
    if (current <= 0) { setMessage({ type: 'error', text: 'Enter your Freight Charges first, then use quick-bid buttons.' }); return; }
    setMessage(null);
    setForm((f) => ({ ...f, freightCharges: String(Math.max(1, Math.round(current - reduction))) }));
  };

  const applyQuickBidPct = (pct) => {
    const current = parseFloat(form.freightCharges) || 0;
    if (current <= 0) { setMessage({ type: 'error', text: 'Enter your Freight Charges first, then use quick-bid buttons.' }); return; }
    setMessage(null);
    setForm((f) => ({ ...f, freightCharges: String(Math.max(1, Math.round(current - current * (pct / 100)))) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('supplier_token');
      await api.post(`/rfq/${rfqId}/bid`, {
        ...form,
        supplierName: supplier.companyName,
        freightCharges: parseFloat(form.freightCharges),
        originCharges: parseFloat(form.originCharges),
        destinationCharges: parseFloat(form.destinationCharges),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ type: 'success', text: 'Bid submitted! Rankings are being updated.' });
      setForm({ carrierName: '', freightCharges: '', originCharges: '', destinationCharges: '', transitTime: '', validity: '' });
      onBidSubmitted?.();
    } catch (err) {
      const errMsg = err.response?.data?.error;
      setMessage({ type: 'error', text: typeof errMsg === 'string' ? errMsg : 'Failed to submit bid.' });
    } finally {
      setLoading(false);
    }
  };

  const minDecrement = rfq?.minDecrement ?? 0;
  const hasFreight = parseFloat(form.freightCharges) > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Company (locked from JWT) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold">1</div>
          <h4 className="text-sm font-bold text-gray-800">Your Company Details</h4>
        </div>
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <span className="text-2xl">&#x1F69B;</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-emerald-800 truncate">{supplier.companyName}</p>
            <p className="text-xs text-emerald-600">{supplier.email} &middot; Verified account</p>
          </div>
          {prevBid && (
            <button type="button" onClick={prefillFromPrev}
              className="ml-auto text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition flex-shrink-0"
            >
              &#x26A1; Fill Last Bid
            </button>
          )}
        </div>
        <div className="mt-3">
          <Field label="Carrier / Vehicle" name="carrierName" value={form.carrierName}
            onChange={handleChange} placeholder="e.g. Tata 407, Mahindra Blazo" required />
        </div>
      </div>

      {/* Section 2: Charges */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">2</div>
          <h4 className="text-sm font-bold text-gray-800">Quote Breakdown (&#x20B9;)</h4>
          <span className="text-xs text-gray-400 ml-1">&mdash; lower total = better rank</span>
        </div>

        {/* Quick-bid buttons */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Quick-Bid <span className="normal-case font-normal text-gray-400">(reduces Freight by)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {[500, 1000, 2500, 5000].map((amt) => (
              <button key={amt} type="button" onClick={() => applyQuickBid(amt)} disabled={!hasFreight}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200
                           hover:bg-indigo-100 hover:border-indigo-400 transition active:scale-95
                           disabled:opacity-30 disabled:cursor-not-allowed">
                &minus;&#x20B9;{amt.toLocaleString('en-IN')}
              </button>
            ))}
            {[2, 5, 10].map((pct) => (
              <button key={pct} type="button" onClick={() => applyQuickBidPct(pct)} disabled={!hasFreight}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200
                           hover:bg-violet-100 hover:border-violet-400 transition active:scale-95
                           disabled:opacity-30 disabled:cursor-not-allowed">
                &minus;{pct}%
              </button>
            ))}
          </div>
          {!hasFreight && (
            <p className="text-xs text-gray-400 mt-1.5 italic">
              {prevBid ? 'Click Fill Last Bid above to load your previous charges, then use Quick-Bid.' : 'Enter Freight Charges below to enable Quick-Bid.'}
            </p>
          )}
          {minDecrement > 0 && (
            <p className="text-xs text-amber-600 font-medium mt-2">
              &#x26A0;&#xFE0F; Your bid must be at least <span className="font-bold">&#x20B9;{minDecrement.toLocaleString('en-IN')}</span> below the current L1 bid to be accepted.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Field label="Freight Charges" name="freightCharges" type="number" step="1" min="0"
            value={form.freightCharges} onChange={handleChange} placeholder="e.g. 45000" required />
          <Field label="Origin Charges" name="originCharges" type="number" step="1" min="0"
            value={form.originCharges} onChange={handleChange} placeholder="e.g. 2000" required />
          <Field label="Destination Charges" name="destinationCharges" type="number" step="1" min="0"
            value={form.destinationCharges} onChange={handleChange} placeholder="e.g. 1500" required />
        </div>

        {/* Total live display */}
        <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${
          totalAmount > 0 ? 'bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-200' : 'bg-gray-50 border-gray-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${totalAmount > 0 ? 'bg-indigo-100' : 'bg-gray-100'}`}>
              <svg className={`w-5 h-5 ${totalAmount > 0 ? 'text-indigo-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Your Total Quote</p>
              <p className={`text-xs mt-0.5 ${totalAmount > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>Freight + Origin + Destination charges</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-black tabular-nums ${totalAmount > 0 ? 'text-indigo-700' : 'text-gray-300'}`}>{fmtMoney(totalAmount)}</p>
            {totalAmount > 0 && <p className="text-xs text-indigo-500 mt-0.5">This is your bid amount</p>}
          </div>
        </div>
      </div>

      {/* Section 3: Terms */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">3</div>
          <h4 className="text-sm font-bold text-gray-800">Service Terms</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Transit Time" name="transitTime" value={form.transitTime}
            onChange={handleChange} placeholder="e.g. 36 hours" required />
          <Field label="Quote Validity" name="validity" value={form.validity}
            onChange={handleChange} placeholder="e.g. 30 days or 2024-12-31" required />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span className="text-base flex-shrink-0">{message.type === 'success' ? '\u2705' : '\u274C'}</span>
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400">&#x1F4CA; Submitting a bid lower than the current L1 will make you the new leader.</p>
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 px-8 flex-shrink-0">
          {loading ? (
            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>Submitting&hellip;</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>Submit Bid</>
          )}
        </button>
      </div>
    </form>
  );
}
