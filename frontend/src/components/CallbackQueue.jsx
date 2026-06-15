import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

// Formats an ISO string in the agent's own browser timezone
function fmtAgent(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(iso));
  } catch { return iso; }
}

// Live clock showing current time in a given IANA zone (updates every minute)
function LiveZoneTime({ timezone }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!timezone) return <span className="text-gray-300">—</span>;
  try {
    const s = now.toLocaleTimeString('en-US', {
      timeZone: timezone, hour12: false,
      hour: '2-digit', minute: '2-digit',
    });
    return <span className="font-mono tabular-nums">{s}</span>;
  } catch { return <span className="text-gray-300">err</span>; }
}

const STATUS_CLS = {
  Pending:   'bg-amber-100 text-amber-800',
  Called:    'bg-green-100 text-green-700',
  Cancelled: 'bg-gray-100 text-gray-500',
};

const VERDICT_CLS = {
  call_now: 'text-green-600 font-semibold',
  schedule: 'text-amber-600 font-semibold',
};

const FILTERS = ['Pending', 'All', 'Called', 'Cancelled'];

export default function CallbackQueue({ refreshKey }) {
  const [queue,  setQueue]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');

  const load = useCallback(async () => {
    try { setQueue(await api.getQueue()); }
    catch (e) { console.error('Queue fetch failed:', e); }
    finally   { setLoading(false); }
  }, []);

  // Refresh on mount, on refreshKey bump, and every 30 s
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load, refreshKey]);

  async function setStatus(id, status) {
    await api.updateQueueStatus(id, status);
    setQueue(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  const rows = filter === 'All' ? queue : queue.filter(r => r.status === filter);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Callback Queue</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Shared across all agents · times shown in YOUR local timezone · auto-refreshes every 30 s
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
              {f !== 'All' && (
                <span className="ml-1 opacity-60">
                  ({queue.filter(r => r.status === f).length})
                </span>
              )}
            </button>
          ))}
          <button
            onClick={load}
            className="ml-1 text-xs text-blue-500 hover:underline"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading queue…</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow py-16 text-center text-gray-400">
          {filter === 'Pending'
            ? 'No pending callbacks. Use the Phone Checker tab to add one.'
            : 'No items match this filter.'}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Customer', 'Timezone', 'Local Now', 'Callback Due (Your Time)', 'Verdict', 'Status', 'Agent', 'Actions']
                    .map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(row => (
                  <tr key={row.id} className={row.status !== 'Pending' ? 'opacity-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-gray-900 whitespace-nowrap">
                        {row.formatted_number ?? row.customer_number}
                      </div>
                      <div className="text-xs text-gray-400">{row.country}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[9rem] break-words">
                      {row.timezone}
                    </td>
                    <td className="px-4 py-3">
                      <LiveZoneTime timezone={row.timezone} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                      {row.verdict === 'call_now'
                        ? <span className="text-green-600">Was OK at check time</span>
                        : fmtAgent(row.callback_due_iso)}
                    </td>
                    <td className={`px-4 py-3 text-xs whitespace-nowrap ${VERDICT_CLS[row.verdict] ?? ''}`}>
                      {row.verdict === 'call_now' ? '✅ OK' : '⏳ Schedule'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[row.status] ?? ''}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.agent_name}</td>
                    <td className="px-4 py-3">
                      {row.status === 'Pending' && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setStatus(row.id, 'Called')}
                            className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs
                                       font-medium hover:bg-green-200 transition-colors"
                          >
                            Called ✓
                          </button>
                          <button
                            onClick={() => setStatus(row.id, 'Cancelled')}
                            className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs
                                       font-medium hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
