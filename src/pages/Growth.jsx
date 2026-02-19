import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ActionCard from '@/components/growth/ActionCard';
import MissionProgress from '@/components/growth/MissionProgress';
import AdminOnly from '@/components/layout/AdminOnly';

function GrowthContent() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id;

  // Fetch pending actions
  const { data: pendingActions = [] } = useQuery({
    queryKey: ['pendingActions', studioId],
    queryFn: () => base44.entities.GrowthAction.filter({ studio_id: studioId, status: 'pending_review' }),
    enabled: !!studioId,
  });

  // Fetch outcomes for mission progress
  const { data: outcomes = [] } = useQuery({
    queryKey: ['growthOutcomes'],
    queryFn: () => base44.entities.GrowthOutcome.list(),
  });

  // Fetch partners, leads, events for context
  const { data: partners = [] } = useQuery({
    queryKey: ['partners', studioId],
    queryFn: () => base44.entities.Partner.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', studioId],
    queryFn: () => base44.entities.Lead.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['communityEvents', studioId],
    queryFn: () => base44.entities.CommunityEvent.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const handleActionSubmit = async (actionId, input) => {
    console.log('Action:', actionId, 'Input:', input);
    // TODO: Wire up to agent processing
  };

  // Transform pending actions into display format
  const currentActions = pendingActions.slice(0, 5).map(action => ({
    id: action.id,
    category: `${action.agent?.charAt(0).toUpperCase()}${action.agent?.slice(1) || 'Growth'} · ${action.action_type || 'Action'}`,
    headline: action.title || 'Pending action',
    subtext: action.target_name || action.summary || '',
    draft: action.content,
    draftLabel: action.action_type === 'email' ? 'Draft email' : 'Draft message',
    channel: action.action_type === 'email' ? 'Email' : action.action_type === 'sms' ? 'Text message' : action.action_type,
    placeholder: "Looks good / Make it shorter / Skip this one...",
  }));

  // If no pending actions, show sample actions for demo
  const displayActions = currentActions.length > 0 ? currentActions : [
    {
      id: 'sample-1',
      category: 'Acquisition · Connect',
      headline: 'No actions ready yet',
      subtext: 'Your growth agents are working on it',
      draft: null,
      placeholder: "Run agents / Check status...",
    },
  ];

  // Build mission progress from outcomes
  const missions = outcomes.filter(o => o.is_active).map(o => ({
    title: o.name,
    actual: 0, // TODO: Calculate from actual data
    target: o.target_count,
    period: `this ${o.target_period}`,
  }));

  return (
    <div 
      className="min-h-screen"
      style={{
        background: '#ffffff',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Ambient background shapes */}
      <div 
        className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
      />
      <div 
        className="fixed bottom-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <div className="relative px-6 md:px-10 pt-10 mb-2">
        <div 
          className="text-sm font-medium mb-1"
          style={{ color: '#b5a599' }}
        >
          February 2026
        </div>
        <h1 
          className="text-3xl md:text-5xl font-bold tracking-tight"
          style={{ 
            color: 'transparent',
            backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
            filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
          }}
        >
          Growth Engine
        </h1>
      </div>

      {/* Main content */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-10 px-6 md:px-10 py-8 pb-16">
        {/* Main column - Current actions */}
        <div>
          <div 
            className="text-[11px] font-bold uppercase tracking-wider mb-5"
            style={{ color: '#C4A8A4', letterSpacing: '1.5px' }}
          >
            Right now
          </div>

          {displayActions.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              onSubmit={handleActionSubmit}
            />
          ))}
        </div>

        {/* Sidebar - Progress */}
        <div>
          <div 
            className="text-[11px] font-bold uppercase tracking-wider mb-4 mt-8 lg:mt-0"
            style={{ color: '#C4A8A4', letterSpacing: '1.5px' }}
          >
            This week
          </div>
          
          {missions.length > 0 ? (
            missions.map((mission, i) => (
              <MissionProgress key={i} mission={mission} />
            ))
          ) : (
            <div 
              className="rounded-2xl py-5 px-6 text-sm"
              style={{
                background: 'linear-gradient(145deg, rgba(254,240,240,0.9) 0%, rgba(252,235,235,0.85) 100%)',
                boxShadow: 'inset 0 2px 8px rgba(180, 120, 120, 0.06)',
                color: '#A89894',
              }}
            >
              No missions configured yet
            </div>
          )}
        </div>
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