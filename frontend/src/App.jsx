import React, { useState } from 'react';
import AgentAuth from './components/AgentAuth.jsx';
import PhoneChecker from './components/PhoneChecker.jsx';
import CallbackQueue from './components/CallbackQueue.jsx';
import Settings from './components/Settings.jsx';

const TABS = [
  { id: 'checker', label: 'Phone Checker' },
  { id: 'queue',   label: 'Callback Queue' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const [agentName, setAgentName] = useState(() => localStorage.getItem('agentName') ?? '');
  const [tab, setTab]             = useState('checker');
  const [queueKey, setQueueKey]   = useState(0);

  if (!agentName) {
    return (
      <AgentAuth
        onAuth={name => {
          localStorage.setItem('agentName', name);
          setAgentName(name);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-700 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 pt-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold leading-tight">Callback Window Checker</h1>
            <p className="text-blue-300 text-xs">24/7 Support Team Coordination</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-200">Agent:</span>
            <span className="font-semibold">{agentName}</span>
            <button
              onClick={() => { localStorage.removeItem('agentName'); setAgentName(''); }}
              className="ml-2 text-xs text-blue-300 hover:text-white underline"
            >
              Switch
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 mt-2 flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-white text-white'
                  : 'border-transparent text-blue-300 hover:text-white hover:border-blue-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'checker' && (
          <PhoneChecker
            agentName={agentName}
            onSavedToQueue={() => setQueueKey(k => k + 1)}
          />
        )}
        {tab === 'queue'   && <CallbackQueue refreshKey={queueKey} />}
        {tab === 'settings' && <Settings />}
      </main>
    </div>
  );
}
