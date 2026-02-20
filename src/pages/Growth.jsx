import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ActionQueue from '@/components/growth/ActionQueue';
import AgentStatus from '@/components/growth/AgentStatus';
import AgentDetailView from '@/components/growth/AgentDetailView';
import GrowthChat from '@/components/growth/GrowthChat';
import AdminOnly from '@/components/layout/AdminOnly';
import { AnimatePresence, motion } from 'framer-motion';

const AGENT_META = {
  growth_orchestrator: { label: 'Growth Engine', emoji: '🧠' },
  connector: { label: 'Connector', emoji: '🤝' },
  attender: { label: 'Attender', emoji: '🎪' },
  accessor: { label: 'Accessor', emoji: '🚪' },
  offerer: { label: 'Offerer', emoji: '🎁' },
  converter: { label: 'Converter', emoji: '✨' },
  retainer: { label: 'Retainer', emoji: '💜' },
  referrer: { label: 'Referrer', emoji: '📣' },
};

const etchedText = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

function GrowthContent() {
  const [talkingTo, setTalkingTo] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id || currentUser?.data?.studio_id;

  const { data: actions = [] } = useQuery({
    queryKey: ['growthActions', studioId],
    queryFn: () => base44.entities.GrowthAction.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const pendingCount = actions.filter(a => a.status === 'pending_review').length;

  // Agent conversation — full takeover
  if (talkingTo) {
    const meta = AGENT_META[talkingTo] || AGENT_META.growth_orchestrator;
    return (
      <div 
        className="flex flex-col h-full overflow-hidden"
        style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}
      >
        <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0">
          <button
            onClick={() => setTalkingTo(null)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{
              background: 'rgba(244,240,238,0.6)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="#b5a599" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg">{meta.emoji}</span>
          <span className="text-sm font-semibold" style={{ color: '#8b7d72' }}>{meta.label}</span>
        </div>
        <div className="flex-1 min-h-0">
          <GrowthChat agentName={talkingTo} studioId={studioId} />
        </div>
      </div>
    );
  }

  // Main view
  return (
    <div
      className="h-full overflow-y-auto relative"
      style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}
    >
      {/* Inner inset card — like TeacherStudio */}
      <div className="p-4 md:p-8">
        <div
          className="rounded-3xl p-6 md:p-10 max-w-4xl mx-auto"
          style={{
            backgroundColor: '#fef7f7',
            boxShadow: 'inset 0 2px 12px rgba(180, 120, 120, 0.08), inset 0 1px 3px rgba(180, 120, 120, 0.05)',
          }}
        >
          {/* Header */}
          <div className="mb-8 md:mb-10">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={etchedText}>
              Growth Engine
            </h1>
            {pendingCount > 0 && (
              <p className="text-sm mt-2" style={{ color: '#b5a599' }}>
                {pendingCount} action{pendingCount !== 1 ? 's' : ''} ready for you to review
              </p>
            )}
          </div>

          {/* Action queue */}
          <div className="space-y-10">
            <ActionQueue actions={actions} studioId={studioId} />
            <AgentStatus actions={actions} onTalkTo={(agent) => setTalkingTo(agent)} />
          </div>
        </div>
      </div>

      {/* Floating command bar — positioned within the page flow, not fixed */}
      <div className="sticky bottom-4 mx-auto w-[calc(100%-2rem)] max-w-2xl z-30 px-4 pb-4">
        <button
          onClick={() => setTalkingTo('growth_orchestrator')}
          className="w-full rounded-2xl px-5 py-4 flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: 'linear-gradient(145deg, rgba(255,253,252,0.97) 0%, rgba(254,248,246,0.95) 100%)',
            boxShadow: '0 12px 48px -12px rgba(140,110,100,0.25), 0 4px 12px -4px rgba(140,110,100,0.1), inset 0 1px 1px rgba(255,255,255,0.9)',
            border: '1px solid rgba(220,200,196,0.3)',
          }}
        >
          <span className="text-lg">🧠</span>
          <span className="text-sm" style={{ color: '#b5a599' }}>
            Ask the Growth Engine anything...
          </span>
        </button>
      </div>
    </div>
  );
}

export default function Growth() {
  return (
    <AdminOnly>
      <GrowthContent />
    </AdminOnly>
  );
}