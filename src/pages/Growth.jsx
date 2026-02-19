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
        background: 'linear-gradient(165deg, #FFF9F8 0%, #FDF5F4 40%, #FAF0EF 100%)',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Header */}
      <div className="px-6 md:px-10 pt-10 mb-2">
        <div 
          className="text-[13px] font-medium mb-2"
          style={{ color: '#C8B8B4', letterSpacing: '0.3px' }}
        >
          Dashboard / Growth
        </div>
        <h1 
          className="text-4xl md:text-[42px] font-semibold italic m-0"
          style={{
            color: '#E0D0CC',
            letterSpacing: '-1px',
            textShadow: `
              1px 1px 0 rgba(255,255,255,0.9),
              2px 2px 4px rgba(180,150,145,0.15)
            `,
          }}
        >
          Growth Engine
        </h1>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-10 px-6 md:px-10 py-8 pb-16">
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
                background: 'rgba(255, 252, 251, 0.7)',
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