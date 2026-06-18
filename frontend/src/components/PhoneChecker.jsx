import React, { useState } from 'react';
import { checkNumber } from '../check.js';
import ResultCard from './ResultCard.jsx';
import CallbackNoteForm from './CallbackNoteForm.jsx';

export default function PhoneChecker({ isMobile = false }) {
  const [number,       setNumber]      = useState('');
  const [result,       setResult]      = useState(null);
  const [loading,      setLoading]     = useState(false);
  const [error,        setError]       = useState('');
  const [selectedZone, setSelectedZone] = useState(null);

  function runCheck(zone) {
    setError('');
    try {
      const data = checkNumber(number.trim(), zone ?? null);
      setResult(data);
      if (data.selectedZone) setSelectedZone(data.selectedZone);
    } catch (e) {
      setError(e.message);
      setResult(null);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!number.trim()) return;
    setResult(null);
    setSelectedZone(null);
    runCheck(null);
  }

  return (
    <div className="space-y-3 max-w-2xl">
      <div className={`bg-white rounded-2xl shadow ${isMobile ? 'p-4' : 'p-6'}`}>
        <h2 className={`font-semibold text-gray-800 mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>Check Callback Window</h2>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="tel"
            value={number}
            onChange={e => setNumber(e.target.value)}
            placeholder="63 2 8123 4567"
            autoFocus
            className={`flex-1 border border-gray-300 rounded-xl px-4 font-mono
                       focus:outline-none focus:ring-2 focus:ring-orange-500
                       ${isMobile ? 'py-4 text-base' : 'py-3 text-base'}`}
          />
          <button
            type="submit"
            disabled={!number.trim()}
            className={`bg-orange-500 text-white rounded-xl font-semibold text-sm
                       hover:bg-orange-600 disabled:opacity-40 transition-colors whitespace-nowrap
                       ${isMobile ? 'px-5 py-4' : 'px-7 py-3'}`}
          >
            Check
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          Start with the country code — + sign optional, e.g.{' '}
          <span className="font-mono">63 2 8123 4567</span> or <span className="font-mono">+63 2 8123 4567</span>
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
        />
      )}

      {result?.verdict === 'call_now' && (
        <CallbackNoteForm result={result} />
      )}
    </div>
  );
}
