import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

const SAMPLE_NUMBERS = [
  ['+1 415 555 2671',   'US · California (Pacific)'],
  ['+1 212 555 1234',   'US · New York (Eastern)'],
  ['+1 312 555 9876',   'US · Chicago (Central)'],
  ['+44 20 7946 0958',  'UK · London'],
  ['+63 2 8123 4567',   'Philippines · Manila'],
  ['+61 2 9374 4000',   'Australia · Sydney'],
  ['+61 8 9321 1234',   'Australia · Perth (different zone)'],
  ['+81 3 1234 5678',   'Japan · Tokyo'],
  ['+91 22 6180 0000',  'India · Mumbai'],
  ['+55 11 9999 8888',  'Brazil · São Paulo'],
];

export default function Settings() {
  const [s, setS]       = useState({
    business_start: '08:00', business_end: '19:00',
    retry_hours: '3', retry_minutes: '15', shared_password: '',
  });
  const [loading, setLoading] = useState(true);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    api.getSettings()
      .then(data => { setS(prev => ({ ...prev, ...data })); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function set(key, val) { setS(prev => ({ ...prev, [key]: val })); setSaved(false); }

  async function handleSave(e) {
    e.preventDefault();
    await api.saveSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading…</div>;

  return (
    <div className="space-y-5 max-w-xl">

      {/* Main settings card */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
          <p className="text-xs text-gray-400 mt-0.5">Changes apply to all agents immediately.</p>
        </div>

        {/* Business hours */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Business Hours <span className="font-normal text-gray-400">(customer's local time)</span>
          </h3>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start</label>
              <input type="time" value={s.business_start} onChange={e => set('business_start', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <span className="text-gray-400 mt-4">–</span>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End</label>
              <input type="time" value={s.business_end} onChange={e => set('business_end', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Retry interval */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Retry Interval</h3>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hours</label>
              <input type="number" min="0" max="23" value={s.retry_hours}
                onChange={e => set('retry_hours', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20
                           focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Minutes</label>
              <input type="number" min="0" max="59" value={s.retry_minutes}
                onChange={e => set('retry_minutes', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20
                           focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="mt-4 text-sm text-gray-400">
              = {s.retry_hours}h {String(s.retry_minutes).padStart(2,'0')}m total
            </div>
          </div>
        </div>

        {/* Shared password */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">
            Team Password{' '}
            <span className="font-normal text-gray-400">(optional — leave blank to allow anyone in)</span>
          </h3>
          <input
            type="text"
            value={s.shared_password}
            onChange={e => set('shared_password', e.target.value)}
            placeholder="Leave blank to disable"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            MVP-level access control only — not suitable for sensitive production data.
            Real per-user auth is a documented future item in the README.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold text-sm
                       hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
          {saved && <span className="text-sm font-medium text-green-600">✓ Saved!</span>}
        </div>
      </form>

      {/* Test numbers reference */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Test Numbers</h3>
        <p className="text-xs text-gray-400 mb-3">
          Copy any of these into the Phone Checker to verify timezone detection and verdict logic.
        </p>
        <div className="space-y-1.5">
          {SAMPLE_NUMBERS.map(([num, label]) => (
            <div key={num} className="flex items-baseline gap-3 text-sm">
              <span
                className="font-mono text-blue-700 cursor-pointer hover:underline select-all"
                onClick={() => navigator.clipboard?.writeText(num)}
                title="Click to copy"
              >
                {num}
              </span>
              <span className="text-gray-400 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
