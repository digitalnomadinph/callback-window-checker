import React, { useState } from 'react';
import { api } from '../api.js';
import ResultCard from './ResultCard.jsx';

export default function PhoneChecker({ agentName, onSavedToQueue }) {
  const [number,      setNumber]      = useState('');
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [savedId,     setSavedId]     = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);

  async function runCheck(zoneOverride) {
    const zone = zoneOverride !== undefined ? zoneOverride : selectedZone;
    setLoading(true);
    setError('');
    setSavedId(null);
    try {
      const data = await api.check(number.trim(), zone);
      setResult(data);
      if (data.selectedZone) setSelectedZone(data.selectedZone);
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!number.trim()) return;
    setResult(null);
    setSavedId(null);
    setSelectedZone(null);
    runCheck(null);
  }

  async function handleSaveToQueue() {
    if (!result) return;
    try {
      const saved = await api.saveToQueue({
        agent_name:               agentName,
        customer_number:          number.trim(),
        formatted_number:         result.formattedNumber,
        country:                  result.country,
        timezone:                 result.selectedZone,
        local_time_iso:           result.localTime,
        verdict:                  result.verdict,
        callback_due_iso:         result.callbackDueIso,
        callback_due_customer_iso: result.callbackDueCustomerIso,
        next_window_iso:          result.nextWindowIso,
      });
      setSavedId(saved.id);
      onSavedToQueue();
    } catch (e) {
      alert('Could not save to queue: ' + e.message);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Check Callback Window</h2>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="tel"
            value={number}
            onChange={e => setNumber(e.target.value)}
            placeholder="+1 415 555 2671"
            autoFocus
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base font-mono
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !number.trim()}
            className="bg-blue-600 text-white px-7 py-3 rounded-xl font-semibold text-sm
                       hover:bg-blue-700 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {loading ? 'Checking…' : 'Check'}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          Enter the full international number with country code, e.g. <span className="font-mono">+63 2 8123 4567</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm leading-relaxed">
          {error}
        </div>
      )}

      {result && (
        <ResultCard
          result={result}
          onZoneChange={zone => { setSelectedZone(zone); runCheck(zone); }}
          onSaveToQueue={handleSaveToQueue}
          savedId={savedId}
        />
      )}
    </div>
  );
}
