import React, { useState } from 'react';

function fmtNow(zone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(new Date());
}

export default function CallbackNoteForm({ result }) {
  const { formattedNumber, selectedZone } = result;

  const [scriptUrl,    setScriptUrl]    = useState(() => localStorage.getItem('cwc_script_url') || '');
  const [urlDraft,     setUrlDraft]     = useState('');
  const [customerName, setCustomerName] = useState('');
  const [callDetails,  setCallDetails]  = useState('');
  const [agentName,    setAgentName]    = useState(() => localStorage.getItem('cwc_agent_name') || '');
  const [status,       setStatus]       = useState('idle'); // idle | sending | done | error

  const agentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function saveUrl() {
    const u = urlDraft.trim();
    if (!u.startsWith('https://script.google.com')) return alert('Paste a valid Google Apps Script URL.');
    localStorage.setItem('cwc_script_url', u);
    setScriptUrl(u);
    setUrlDraft('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    const payload = {
      customerName: customerName.trim(),
      customerPhone: formattedNumber,
      customerTime: fmtNow(selectedZone),
      agentName: agentName.trim(),
      agentTime: fmtNow(agentTz),
      callDetails: callDetails.trim(),
    };
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload),
      });
      localStorage.setItem('cwc_agent_name', agentName.trim());
      setStatus('done');
      setCustomerName('');
      setCallDetails('');
    } catch {
      setStatus('error');
    }
  }

  // ── Setup: no URL saved yet ───────────────────────────────────────────────
  if (!scriptUrl) {
    return (
      <div className="bg-white rounded-2xl shadow border border-dashed border-gray-300 p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-0.5">📋 Log callbacks to Google Sheets</p>
          <p className="text-xs text-gray-500">
            Paste your Google Apps Script Web App URL once and it's saved in this browser.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={urlDraft}
            onChange={e => setUrlDraft(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={saveUrl}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700"
          >
            Save
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Don't have the URL yet?{' '}
          <button
            onClick={() => alert(SETUP_INSTRUCTIONS)}
            className="text-blue-500 underline"
          >
            See setup instructions
          </button>
        </p>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (status === 'done') {
    return (
      <div className="bg-green-50 rounded-2xl shadow border border-green-200 p-5 text-center space-y-2">
        <p className="text-green-700 text-lg font-bold">✅ Logged to Google Sheets</p>
        <p className="text-green-600 text-xs">Email notification sent to zotacvoicemail@gmail.com</p>
        <button
          onClick={() => setStatus('idle')}
          className="text-xs text-green-700 underline mt-1"
        >
          Log another callback
        </button>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-5 space-y-3">
      <h3 className="text-sm font-bold text-gray-800">📋 Log This Callback</h3>

      {/* Auto-filled info strip */}
      <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500 space-y-1">
        <div><span className="font-medium text-gray-600">Phone:</span> <span className="font-mono">{formattedNumber}</span></div>
        <div><span className="font-medium text-gray-600">Customer time:</span> {fmtNow(selectedZone)}</div>
        <div><span className="font-medium text-gray-600">Agent time (PH):</span> {fmtNow(agentTz)}</div>
      </div>

      {/* Customer Name */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
        <input
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          required
          placeholder="e.g. John Smith"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Call Details */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Call Details *</label>
        <textarea
          value={callDetails}
          onChange={e => setCallDetails(e.target.value)}
          required
          rows={5}
          placeholder="Describe the callback — issue details, what was discussed, follow-up needed..."
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Agent Name */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Agent Name *</label>
        <input
          value={agentName}
          onChange={e => setAgentName(e.target.value)}
          required
          placeholder="Your name"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-0.5">Saved for next time.</p>
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold
                   hover:bg-blue-700 disabled:opacity-40 transition-colors"
      >
        {status === 'sending' ? 'Logging…' : 'Log to Google Sheets'}
      </button>

      {status === 'error' && (
        <p className="text-red-600 text-xs text-center">
          Failed to submit. Check your Script URL is correct and the app is deployed.
        </p>
      )}

      <p className="text-xs text-gray-400 text-center">
        <button type="button" onClick={() => { localStorage.removeItem('cwc_script_url'); setScriptUrl(''); }}
          className="underline">
          Change Script URL
        </button>
      </p>
    </form>
  );
}

const SETUP_INSTRUCTIONS = `SETUP: Log Callbacks to Google Sheets

1. Go to sheets.google.com → create a new sheet, name it "Callback Log"

2. Inside that sheet: Extensions → Apps Script

3. Delete any existing code and paste the script from the README or ask your developer.

4. Click Deploy → New Deployment
   - Type: Web App
   - Execute as: Me
   - Who has access: Anyone
   → Click Deploy → Authorize with your Google account

5. Copy the Web App URL (looks like https://script.google.com/macros/s/.../exec)

6. Paste it in the box in this app and click Save.`;
