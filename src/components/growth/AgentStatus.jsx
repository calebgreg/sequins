import React from 'react';

const AGENTS = [
  { key: 'connector', label: 'Connector', verb: 'finding partners' },
  { key: 'attender', label: 'Attender', verb: 'scouting events' },
  { key: 'accessor', label: 'Accessor', verb: 'opening doors' },
  { key: 'offerer', label: 'Offerer', verb: 'crafting offers' },
  { key: 'converter', label: 'Converter', verb: 'closing trials' },
  { key: 'retainer', label: 'Retainer', verb: 'keeping families' },
  { key: 'referrer', label: 'Referrer', verb: 'spreading the word' },
];

const etchedText = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

export default function AgentStatus({ actions, onTalkTo }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4" style={etchedText}>
        Your agents
      </h2>
      <div className="space-y-2">
        {AGENTS.map((agent) => {
          const agentActions = actions.filter(a => a.agent === agent.key);
          const pending = agentActions.filter(a => a.status === 'pending_review').length;
          const done = agentActions.filter(a => a.status === 'completed' || a.status === 'sent' || a.status === 'approved').length;

          return (
            <button
              key={agent.key}
              onClick={() => onTalkTo?.(agent.key)}
              className="w-full text-left rounded-2xl p-4 md:p-5 flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'rgba(255,255,255,0.5)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 16px -8px rgba(180,150,140,0.1)',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
                    boxShadow: '0 4px 12px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: '#c9a99c' }}>
                    {agent.label.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#8b7d72' }}>
                    {agent.label}
                  </div>
                  <div className="text-xs" style={{ color: '#b5a599' }}>
                    {pending > 0 ? `${pending} pending` : done > 0 ? `${done} done` : agent.verb}
                  </div>
                </div>
              </div>
              <svg className="w-4 h-4" fill="none" stroke="#d4c4ba" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}