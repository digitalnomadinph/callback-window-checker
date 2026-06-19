import React, { useState, useEffect, useRef } from 'react';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwhExqtU7hEphKCNP7WWUkp5sAQMFEPsdd1lPgUO1O7cXyEFUf4ecHB2OuXNoWb8lUs/exec';
const CLOCKIN_KEY = 'cwc_clockin';
const PH_TZ = 'Asia/Manila';

function fmtNow() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(new Date());
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatHours(ms) {
  const totalMins = Math.floor(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h === 0 ? `${m} min` : `${h}h ${m}m`;
}

async function getClientInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  const deviceType = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'Mobile' : 'PC';
  const screenRes = `${screen.width}x${screen.height}`;

  let ip = 'Unknown', city = '', country = '', isp = '';
  try {
    const r = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    const d = await r.json();
    ip = d.ip || 'Unknown';
    city = d.city || '';
    country = d.country_name || '';
    isp = d.org || '';
  } catch {
    try {
      const r2 = await fetch('https://api.ipify.org?format=json');
      ip = (await r2.json()).ip || 'Unknown';
    } catch {}
  }

  return { ip, city, country, isp, deviceType, os, browser, screenRes };
}

async function compressToThumb(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_W = 320;
        const scale = Math.min(1, MAX_W / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL('image/jpeg', 0.12).split(',')[1];
        resolve(b64.length < 20000 ? b64 : '');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function AttendanceTab({ isMobile }) {
  const [agentName, setAgentName] = useState(() => localStorage.getItem('cwc_agent_name') || '');
  const [clockIn, setClockIn] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CLOCKIN_KEY)); } catch { return null; }
  });
  const [elapsed, setElapsed] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CLOCKIN_KEY));
      return saved ? Date.now() - saved.ts : 0;
    } catch { return 0; }
  });
  const [screenshot, setScreenshot] = useState(null);
  const [status, setStatus] = useState('idle');
  const [lastAction, setLastAction] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!clockIn) { clearInterval(timerRef.current); setElapsed(0); return; }
    timerRef.current = setInterval(() => setElapsed(Date.now() - clockIn.ts), 1000);
    return () => clearInterval(timerRef.current);
  }, [clockIn]);

  async function handleClockIn() {
    if (!agentName.trim()) { alert('Enter your agent name first.'); return; }
    setStatus('sending');

    const [info, b64] = await Promise.all([
      getClientInfo(),
      screenshot ? compressToThumb(screenshot.file) : Promise.resolve(''),
    ]);

    const ts = Date.now();
    const timestamp = fmtNow();
    const payload = {
      type: 'attendance',
      action: 'CLOCK_IN',
      agentName: agentName.trim(),
      timestamp,
      ip: info.ip,
      location: [info.city, info.country].filter(Boolean).join(', '),
      isp: info.isp,
      device: info.deviceType,
      os: info.os,
      browser: info.browser,
      screenRes: info.screenRes,
      screenshot: b64,
      _t: ts,
    };

    try {
      await fetch(SCRIPT_URL + '?' + new URLSearchParams(payload).toString(), {
        method: 'GET', mode: 'no-cors', cache: 'no-store',
      });
      localStorage.setItem('cwc_agent_name', agentName.trim());
      const data = { ts, phTime: timestamp, agentName: agentName.trim() };
      localStorage.setItem(CLOCKIN_KEY, JSON.stringify(data));
      setClockIn(data);
      setElapsed(0);
      setStatus('idle');
      setLastAction({ type: 'in', time: timestamp });
      setScreenshot(null);
    } catch {
      setStatus('error');
    }
  }

  async function handleClockOut() {
    if (!clockIn) return;
    setStatus('sending');

    const info = await getClientInfo();
    const ts = Date.now();
    const durationMs = ts - clockIn.ts;
    const timestamp = fmtNow();

    const payload = {
      type: 'attendance',
      action: 'CLOCK_OUT',
      agentName: clockIn.agentName,
      timestamp,
      ip: info.ip,
      location: [info.city, info.country].filter(Boolean).join(', '),
      isp: info.isp,
      device: info.deviceType,
      os: info.os,
      browser: info.browser,
      screenRes: info.screenRes,
      clockInTime: clockIn.phTime,
      duration: formatDuration(durationMs),
      durationHours: (durationMs / 3600000).toFixed(4),
      _t: ts,
    };

    try {
      await fetch(SCRIPT_URL + '?' + new URLSearchParams(payload).toString(), {
        method: 'GET', mode: 'no-cors', cache: 'no-store',
      });
      localStorage.removeItem(CLOCKIN_KEY);
      setLastAction({ type: 'out', time: timestamp, duration: formatHours(durationMs) });
      setClockIn(null);
      setElapsed(0);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setScreenshot({ file, preview: URL.createObjectURL(file) });
  }

  const isClockedIn = !!clockIn;

  return (
    <div className={`space-y-3 ${isMobile ? '' : 'max-w-lg mx-auto pt-1'}`}>
      <div className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-800">🕐 Attendance Log</h3>

        {/* Agent Name */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Agent Name</label>
          <input
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
            disabled={isClockedIn}
            placeholder="Your name"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-orange-500
                       disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* Live Timer */}
        {isClockedIn && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-green-600 font-medium">Clocked in · {clockIn.phTime}</p>
            <p className="text-3xl font-mono font-bold text-green-800 mt-1 tracking-widest">
              {formatDuration(elapsed)}
            </p>
          </div>
        )}

        {/* Clock In / Out Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleClockIn}
            disabled={isClockedIn || status === 'sending'}
            className="py-3 rounded-xl text-sm font-bold bg-blue-900 text-white
                       hover:bg-blue-800 disabled:opacity-40 transition-colors"
          >
            {status === 'sending' && !isClockedIn ? 'Logging…' : '✅ Clock In'}
          </button>
          <button
            onClick={handleClockOut}
            disabled={!isClockedIn || status === 'sending'}
            className="py-3 rounded-xl text-sm font-bold bg-red-600 text-white
                       hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            {status === 'sending' && isClockedIn ? 'Logging…' : '🔴 Clock Out'}
          </button>
        </div>

        {/* Screenshot Upload */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Kayako + Vonage screenshot <span className="text-gray-400 font-normal">(optional — attach before Clock In)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed
                            border-gray-200 rounded-xl p-3 hover:border-orange-300 transition-colors">
            <span className="text-xl">📷</span>
            <span className="text-xs text-gray-500 truncate">
              {screenshot ? screenshot.file.name : 'Tap to attach screenshot or photo'}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {screenshot && (
            <img
              src={screenshot.preview}
              alt="Screenshot preview"
              className="mt-2 rounded-xl w-full max-h-48 object-contain bg-gray-50 border border-gray-200"
            />
          )}
        </div>

        {status === 'error' && (
          <p className="text-red-500 text-xs text-center">Failed to log. Please try again.</p>
        )}
      </div>

      {/* Last Action Confirmation */}
      {lastAction && (
        <div className={`rounded-2xl shadow border p-4 text-center space-y-0.5 ${
          lastAction.type === 'in'
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-100'
        }`}>
          <p className={`font-bold text-sm ${lastAction.type === 'in' ? 'text-green-700' : 'text-blue-800'}`}>
            {lastAction.type === 'in' ? '✅ Clocked In' : '👋 Clocked Out'}
          </p>
          <p className="text-xs text-gray-500">{lastAction.time}</p>
          {lastAction.duration && (
            <p className="text-sm font-semibold text-blue-700 pt-1">
              Session: {lastAction.duration}
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center px-4 pb-2">
        IP address, device, and location are captured automatically.
      </p>
    </div>
  );
}
