import React from 'react';

const AGENTS = [
  { key: 'connector', label: 'Connector', emoji: '🤝', color: '#7eb89a', verb: 'finding partners' },
  { key: 'attender', label: 'Attender', emoji: '🎪', color: '#d4a574', verb: 'scouting events' },
  { key: 'accessor', label: 'Accessor', emoji: '🚪', color: '#a48bc4', verb: 'opening doors' },
  { key: 'offerer', label: 'Offerer', emoji: '🎁', color: '#e08080', verb: 'crafting offers' },
  { key: 'converter', label: 'Converter', emoji: '✨', color: '#c9a99c', verb: 'closing trials' },
  { key: 'retainer', label: 'Retainer', emoji: '💜', color: '#9a8aad', verb: 'keeping families' },
  { key: 'referrer', label: 'Referrer', emoji: '📣', color: '#6aadad', verb: 'spreading the word' },
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {AGENTS.map((agent) => {
          const agentActions = actions.filter(a => a.agent === agent.key);
          const pending = agentActions.filter(a => a.status === 'pending_review').length;
          const done = agentActions.filter(a => a.status === 'completed' || a.status === 'sent' || a.status === 'approved').length;

          return (
            <button
              key={agent.key}
              onClick={() => onTalkTo?.(agent.key)}
              className="text-left rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
                boxShadow: '0 4px 12px -4px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)',
              }}
            >
              <span className="text-lg block mb-2">{agent.emoji}</span>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#c4a0a0' }}>
                {agent.label}
              </div>
              <div className="text-[11px] mt-1" style={{ color: '#b5a599' }}>
                {pending > 0 
                  ? `${pending} pending` 
                  : done > 0 
                  ? `${done} done` 
                  : agent.verb}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}