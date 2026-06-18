import React, { useState, useEffect } from 'react';

const US_ZONES = [
  { zone: 'America/New_York',  label: 'Eastern',  city: 'New York'    },
  { zone: 'America/Chicago',   label: 'Central',  city: 'Chicago'     },
  { zone: 'America/Denver',    label: 'Mountain', city: 'Denver'      },
  { zone: 'America/Los_Angeles', label: 'Pacific', city: 'Los Angeles' },
  { zone: 'America/Phoenix',   label: 'Arizona',  city: 'Phoenix'     },
  { zone: 'America/Anchorage', label: 'Alaska',   city: 'Anchorage'   },
  { zone: 'Pacific/Honolulu',  label: 'Hawaii',   city: 'Honolulu'    },
];

const BUSINESS_START = 8;
const BUSINESS_END   = 19;

function getSnapshot(zone) {
  const now   = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour: 'numeric', minute: '2-digit', second: '2-digit',
    hour12: true, timeZoneName: 'short',
  }).formatToParts(now);

  const hourParts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(now);

  const h    = parseInt(hourParts.find(p => p.type === 'hour').value, 10);
  const m    = parseInt(hourParts.find(p => p.type === 'minute').value, 10);
  const abbr = parts.find(p => p.type === 'timeZoneName')?.value ?? '';

  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  }).formatToParts(now);

  const hour   = timeParts.find(p => p.type === 'hour').value;
  const min    = timeParts.find(p => p.type === 'minute').value;
  const sec    = timeParts.find(p => p.type === 'second').value;
  const ampm   = timeParts.find(p => p.type === 'dayPeriod').value;

  return {
    timeStr: `${hour}:${min}`,
    secStr: sec,
    ampm,
    abbr,
    inWindow: h * 60 + m >= BUSINESS_START * 60 && h * 60 + m < BUSINESS_END * 60,
  };
}

export default function USATimezonePanel() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-56 shrink-0">
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
          🇺🇸 USA Timezones
        </h2>
        <div className="space-y-2">
          {US_ZONES.map(({ zone, label, city }) => {
            const { timeStr, secStr, ampm, abbr, inWindow } = getSnapshot(zone);
            return (
              <div
                key={zone}
                className={`rounded-xl px-3 py-2 border ${
                  inWindow ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-gray-500">{label}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    inWindow ? 'bg-green-500 text-white' : 'bg-red-400 text-white'
                  }`}>
                    {inWindow ? 'OK' : 'No'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-xl font-bold text-gray-900 tabular-nums">
                    {timeStr}
                  </span>
                  <span className="font-mono text-sm text-gray-400 tabular-nums">
                    :{secStr}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 ml-0.5">{ampm}</span>
                </div>
                <div className="text-xs text-gray-400">{city} · {abbr}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
