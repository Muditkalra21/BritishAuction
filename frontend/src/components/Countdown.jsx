import { useState, useEffect } from 'react';

function pad(n) { return String(Math.max(0, n)).padStart(2, '0'); }

export default function Countdown({ targetTime, label = 'Closes in', size = 'md' }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(targetTime) - Date.now()) / 1000));
      setRemaining(diff);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  const urgent = remaining < 300 && remaining > 0;
  const critical = remaining < 60 && remaining > 0;
  const done = remaining === 0;

  if (size === 'lg') {
    return (
      <div className={`text-center select-none ${critical ? 'animate-pulse' : ''}`}>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-center gap-1.5">
          {[{ v: pad(h), u: 'h' }, { v: pad(m), u: 'm' }, { v: pad(s), u: 's' }].map(({ v, u }) => (
            <div key={u} className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl tabular-nums shadow-inner
                ${done ? 'bg-gray-100 text-gray-400'
                  : critical ? 'bg-red-50 text-red-600 ring-2 ring-red-200'
                  : urgent  ? 'bg-amber-50 text-amber-700 ring-2 ring-amber-200'
                              : 'bg-indigo-50 text-indigo-700'}`}>
                {v}
              </div>
              <span className="text-xs text-gray-400 font-medium mt-1">{u}</span>
            </div>
          ))}
        </div>
        {done && (
          <p className="text-xs text-gray-400 mt-2 font-medium">
            {label.toLowerCase().includes('start') ? 'Starting now…' : 'Auction ended'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tabular-nums
      ${done ? 'bg-gray-100 text-gray-500'
        : critical ? 'bg-red-100 text-red-700 animate-pulse'
        : urgent  ? 'bg-amber-100 text-amber-700'
                  : 'bg-indigo-100 text-indigo-700'}`}>
      <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {done ? (label.toLowerCase().includes('start') ? 'Starting…' : 'Closed') : `${pad(h)}:${pad(m)}:${pad(s)}`}
    </div>
  );
}
