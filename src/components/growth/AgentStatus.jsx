import React from 'react';
import { motion } from 'framer-motion';

const AGENTS = [
  { key: 'connector', label: 'Connector', emoji: '🤝', color: '#7eb89a', verb: 'finding partners' },
  { key: 'attender', label: 'Attender', emoji: '🎪', color: '#d4a574', verb: 'scouting events' },
  { key: 'accessor', label: 'Accessor', emoji: '🚪', color: '#a48bc4', verb: 'opening doors' },
  { key: 'offerer', label: 'Offerer', emoji: '🎁', color: '#e08080', verb: 'crafting offers' },
  { key: 'converter', label: 'Converter', emoji: '✨', color: '#c9a99c', verb: 'closing trials' },
  { key: 'retainer', label: 'Retainer', emoji: '💜', color: '#9a8aad', verb: 'keeping families' },
  { key: 'referrer', label: 'Referrer', emoji: '📣', color: '#6aadad', verb: 'spreading the word' },
];

export default function AgentStatus({ actions, onTalkTo }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4" style={{ color: '#5A4A46' }}>
        Your agents
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {AGENTS.map((agent) => {
          const agentActions = actions.filter(a => a.agent === agent.key);
          const pending = agentActions.filter(a => a.status === 'pending_review').length;
          const done = agentActions.filter(a => a.status === 'completed' || a.status === 'sent' || a.status === 'approved').length;

          return (
            <button
              key={agent.key}
              onClick={() => onTalkTo?.(agent.key)}
              className="text-left rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] group"
              style={{
                background: `${agent.color}08`,
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{agent.emoji}</span>
                {pending > 0 && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: `${agent.color}25`, color: agent.color }}
                  >
                    {pending}
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold" style={{ color: agent.color }}>
                {agent.label}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: '#b5a599' }}>
                {done > 0 ? `${done} done` : agent.verb}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}