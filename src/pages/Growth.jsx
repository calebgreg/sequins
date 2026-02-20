import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GrowthChat from '@/components/growth/GrowthChat';
import MissionProgress from '@/components/growth/MissionProgress';
import AdminOnly from '@/components/layout/AdminOnly';

const AGENTS = [
  { name: 'growth_orchestrator', label: 'Growth Engine', emoji: '🧠', description: 'The brain — assesses everything, sets priorities' },
  { name: 'connector', label: 'Connector', emoji: '🤝', description: 'Build relationships with local businesses' },
  { name: 'attender', label: 'Attender', emoji: '🎪', description: 'Find & attend community events' },
  { name: 'accessor', label: 'Accessor', emoji: '🚪', description: 'Gain access to groups of families' },
  { name: 'offerer', label: 'Offerer', emoji: '🎁', description: 'Create compelling offers for prospects' },
  { name: 'converter', label: 'Converter', emoji: '✨', description: 'Turn trials into enrollments' },
  { name: 'retainer', label: 'Retainer', emoji: '💜', description: 'Keep current families engaged' },
  { name: 'referrer', label: 'Referrer', emoji: '📣', description: 'Generate word-of-mouth referrals' },
];

function GrowthContent() {
  const [activeAgent, setActiveAgent] = useState('growth_orchestrator');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id || currentUser?.data?.studio_id;

  // Fetch outcomes for sidebar progress
  const { data: outcomes = [] } = useQuery({
    queryKey: ['growthOutcomes', studioId],
    queryFn: () => base44.entities.GrowthOutcome.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const etchedText = {
    color: 'transparent',
    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
    filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
  };

  const activeAgentMeta = AGENTS.find(a => a.name === activeAgent);

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        background: '#ffffff',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Ambient shapes */}
      <div 
        className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
      />
      <div 
        className="fixed bottom-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <div className="relative px-6 md:px-10 pt-10 pb-4">
        <div className="text-sm font-medium mb-1" style={{ color: '#b5a599' }}>
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight" style={etchedText}>
          Growth Engine
        </h1>
      </div>

      {/* Agent switcher row */}
      <div className="relative px-6 md:px-10 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {AGENTS.map(agent => (
            <button
              key={agent.name}
              onClick={() => setActiveAgent(agent.name)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.97]"
              style={{
                background: activeAgent === agent.name 
                  ? 'linear-gradient(145deg, rgba(254,240,240,0.95) 0%, rgba(252,235,235,0.9) 100%)'
                  : 'transparent',
                boxShadow: activeAgent === agent.name 
                  ? 'inset 0 2px 12px rgba(180, 120, 120, 0.08), 0 2px 8px rgba(180,140,135,0.08)'
                  : 'none',
                color: activeAgent === agent.name ? '#6A5A56' : '#b5a599',
              }}
            >
              <span>{agent.emoji}</span>
              <span className="hidden md:inline">{agent.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="relative flex-1 flex flex-col lg:flex-row gap-0 lg:gap-6 px-0 lg:px-10 pb-0">
        {/* Chat area — this IS the agent interface */}
        <div 
          className="flex-1 flex flex-col rounded-none lg:rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(254,248,248,0.6) 0%, rgba(252,246,244,0.4) 100%)',
            minHeight: 'calc(100vh - 240px)',
            maxHeight: 'calc(100vh - 180px)',
          }}
        >
          <GrowthChat 
            key={activeAgent}
            agentName={activeAgent} 
            studioId={studioId}
          />
        </div>

        {/* Sidebar — condensed progress */}
        <div className="hidden lg:block w-[320px] flex-shrink-0 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <div 
            className="text-[11px] font-bold uppercase tracking-wider mb-3"
            style={{ color: '#C4A8A4', letterSpacing: '1.5px' }}
          >
            Outcomes
          </div>

          {outcomes.filter(o => o.is_active).map(o => (
            <OutcomeCard key={o.id} outcome={o} activeAgent={activeAgent} onAgentClick={setActiveAgent} />
          ))}

          {outcomes.length === 0 && (
            <div className="text-sm p-4 rounded-xl" style={{ color: '#b5a599', background: 'rgba(255,255,255,0.5)' }}>
              No outcomes configured yet. Ask the Growth Engine to help you set them up.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OutcomeCard({ outcome, activeAgent, onAgentClick }) {
  const isActive = activeAgent === outcome.agent;
  
  return (
    <button
      onClick={() => onAgentClick(outcome.agent)}
      className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: isActive 
          ? 'linear-gradient(145deg, rgba(254,240,240,0.95) 0%, rgba(252,235,235,0.9) 100%)'
          : 'rgba(255,255,255,0.5)',
        boxShadow: isActive 
          ? 'inset 0 2px 12px rgba(180, 120, 120, 0.08)'
          : 'inset 0 1px 1px rgba(255,255,255,0.7)',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#C4A8A4' }}>
          {outcome.agent}
        </span>
        <span className="text-xs" style={{ color: '#b5a599' }}>
          {outcome.target_count}/{outcome.target_period}
        </span>
      </div>
      <div className="text-sm font-medium" style={{ color: '#6A5A56' }}>
        {outcome.name}
      </div>
    </button>
  );
}

export default function Growth() {
  return (
    <AdminOnly>
      <GrowthContent />
    </AdminOnly>
  );
}