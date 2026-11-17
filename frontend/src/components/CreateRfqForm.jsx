import { useState } from 'react';
import api from '../api/axios';

function Field({ label, name, type = 'text', value, onChange, placeholder, required, min, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label} {required && <span className="text-rose-400 normal-case font-normal">*</span>}
      </label>
      {children || (
        <input type={type} name={name} value={value} onChange={onChange}
          placeholder={placeholder} required={required} min={min} className="input-field" />
      )}
    </div>
  );
}

export default function CreateRfqForm({ onCreated }) {
  const [form, setForm] = useState({
    name: '', referenceId: '',
    bidStart: '', bidClose: '', forcedClose: '', pickupDate: '',
    triggerX: 10, extensionY: 5, extensionTrigger: 'A',
    minDecrement: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const { bidStart, bidClose, forcedClose } = form;
    if (!bidStart || !bidClose || !forcedClose) return 'All date/time fields are required.';
    if (new Date(bidClose) <= new Date(bidStart)) return 'Bid Close must be after Bid Start.';
    if (new Date(forcedClose) <= new Date(bidClose)) return 'Forced Close must be after Bid Close.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError(null);
    // datetime-local gives "2026-11-17T05:30" — Zod needs full ISO string with timezone
    const toISO = (v) => v ? new Date(v).toISOString() : v;
    try {
      await api.post('/rfq', {
        ...form,
        bidStart: toISO(form.bidStart),
        bidClose: toISO(form.bidClose),
        forcedClose: toISO(form.forcedClose),
        pickupDate: toISO(form.pickupDate),
        triggerX: parseInt(form.triggerX),
        extensionY: parseInt(form.extensionY),
        minDecrement: parseFloat(form.minDecrement) || 0,
      });
      onCreated?.();
    } catch (err) {
      const errMsg = err.response?.data?.error;
      setError(typeof errMsg === 'string' ? errMsg : 'Failed to create RFQ.');
    } finally {
      setLoading(false);
    }
  };

  const triggers = {
    A: { icon: '🔔', title: 'Always Extend',  desc: 'Any bid in the trigger window extends the auction.' },
    B: { icon: '🔄', title: 'Rank Change',    desc: 'Extends only if any supplier ranking changes.' },
    C: { icon: '🏆', title: 'L1 Change Only', desc: 'Extends only when the lowest bidder (L1) changes.' },
  };

  const SectionHeader = ({ num, title }) => (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
        {num}
      </div>
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Basic Info */}
      <div>
        <SectionHeader num="1" title="Shipment Details" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="RFQ Name" name="name" value={form.name} onChange={handleChange}
            placeholder="e.g. Delhi–Mumbai Freight Q1 2025" required />
          <Field label="Reference ID" name="referenceId" value={form.referenceId} onChange={handleChange}
            placeholder="e.g. RFQ-DEL-MUM-002" required />
        </div>
      </div>

      {/* Timeline */}
      <div>
        <SectionHeader num="2" title="Auction Timeline" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bid Start" name="bidStart" type="datetime-local" value={form.bidStart} onChange={handleChange} required />
          <Field label="Bid Close" name="bidClose" type="datetime-local" value={form.bidClose} onChange={handleChange} required />
          <Field label="Hard Deadline (Forced Close)" name="forcedClose" type="datetime-local" value={form.forcedClose} onChange={handleChange} required />
          <Field label="Pickup / Service Date" name="pickupDate" type="datetime-local" value={form.pickupDate} onChange={handleChange} required />
        </div>
      </div>

      {/* Extension Config */}
      <div>
        <SectionHeader num="3" title="Extension Rules" />
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Trigger Window X <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input type="number" name="triggerX" min="1" value={form.triggerX} onChange={handleChange}
                className="input-field pr-16" required />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">minutes</span>
            </div>
            <p className="text-xs text-gray-400">If a bid arrives within X mins of close</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Extension Duration Y <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input type="number" name="extensionY" min="1" value={form.extensionY} onChange={handleChange}
                className="input-field pr-16" required />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">minutes</span>
            </div>
            <p className="text-xs text-gray-400">The auction time is extended by Y mins</p>
          </div>
        </div>

        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Extension Trigger Mode <span className="text-rose-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(triggers).map(([key, cfg]) => (
            <label
              key={key}
              className={`flex flex-col gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                form.extensionTrigger === key
                  ? 'border-indigo-400 bg-indigo-50/80 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
              }`}
            >
              <input type="radio" name="extensionTrigger" value={key}
                checked={form.extensionTrigger === key} onChange={handleChange} className="sr-only" />
              <div className="flex items-center justify-between">
                <span className="text-xl">{cfg.icon}</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                  form.extensionTrigger === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>Trigger {key}</span>
              </div>
              <p className="text-sm font-bold text-gray-800">{cfg.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{cfg.desc}</p>
            </label>
          ))}
        </div>
      </div>

      {/* Bidding Rules */}
      <div>
        <SectionHeader num="4" title="Bidding Rules" />
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Minimum Bid Decrement (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">₹</span>
            <input
              type="number" name="minDecrement" min="0" step="100"
              value={form.minDecrement} onChange={handleChange}
              placeholder="0"
              className="input-field pl-7"
            />
          </div>
          <p className="text-xs text-gray-400">
            Each new bid must be at least this much lower than the supplier's previous bid. Set 0 to allow any lower amount.
          </p>
        </div>
      </div>

      {error && (        <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="flex justify-end pt-1 border-t border-gray-100">
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 px-10">
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Launching…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Launch Auction
            </>
          )}
        </button>
      </div>
    </form>
  );
}
