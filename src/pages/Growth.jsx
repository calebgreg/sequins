import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ActionCard from '@/components/growth/ActionCard';
import MissionProgress from '@/components/growth/MissionProgress';
import AdminOnly from '@/components/layout/AdminOnly';

function GrowthContent() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id || currentUser?.data?.studio_id;

  // Fetch pending actions
  const { data: pendingActions = [] } = useQuery({
    queryKey: ['pendingActions', studioId],
    queryFn: () => base44.entities.GrowthAction.filter({ studio_id: studioId, status: 'pending_review' }),
    enabled: !!studioId,
  });

  // Fetch outcomes for mission progress - filter by studio
  const { data: outcomes = [] } = useQuery({
    queryKey: ['growthOutcomes', studioId],
    queryFn: () => base44.entities.GrowthOutcome.filter({ studio_id: studioId }),
    enabled: !!studioId,
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

  const queryClient = useQueryClient();

  const handleActionSubmit = async (actionId, input) => {
    const action = pendingActions.find(a => a.id === actionId);
    if (!action) return null;

    const lowerInput = input.toLowerCase().trim();

    // Skip / dismiss
    if (['skip', 'dismiss', 'no', 'pass', 'next', 'nah', 'remove'].some(w => lowerInput === w || lowerInput.startsWith(w + ' '))) {
      await base44.entities.GrowthAction.update(actionId, { status: 'dismissed' });
      queryClient.invalidateQueries({ queryKey: ['pendingActions'] });
      return null;
    }

    // Send as-is
    if (['send it', 'send', 'approve', 'looks good', 'good', 'yes', 'go', 'do it', 'lgtm', 'perfect', 'ship it', 'fire', 'send it!'].some(w => lowerInput === w || lowerInput.startsWith(w))) {
      await base44.entities.GrowthAction.update(actionId, { status: 'approved', approved_at: new Date().toISOString() });
      queryClient.invalidateQueries({ queryKey: ['pendingActions'] });
      return "Approved — it'll go out.";
    }

    // Anything else = LLM rewrite the draft based on the instruction
    const rewriteResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are rewriting a draft outreach message based on feedback.

ORIGINAL DRAFT:
Subject: ${action.subject || '(none)'}
Body: ${action.content || '(none)'}
Target: ${action.target_name} (${action.context?.partner_type || 'business'})

USER FEEDBACK: "${input}"

Rewrite the message incorporating the feedback. Keep it under 100 words. Be warm and neighborly.

Return JSON: { "subject": "new subject", "body": "new body" }`,
      response_json_schema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          body: { type: "string" }
        }
      }
    });

    await base44.entities.GrowthAction.update(actionId, {
      subject: rewriteResult.subject,
      content: rewriteResult.body,
    });
    queryClient.invalidateQueries({ queryKey: ['pendingActions'] });
    return null;
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

  // Group outcomes by category
  const outcomesByCategory = outcomes.filter(o => o.is_active).reduce((acc, o) => {
    const cat = o.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({
      id: o.id,
      title: o.name,
      actual: 0, // TODO: Calculate from actual data
      target: o.target_count,
      period: o.target_period,
      agent: o.agent,
    });
    return acc;
  }, {});

  const categoryOrder = ['acquisition', 'conversion', 'retention', 'referral'];
  const categoryLabels = {
    acquisition: 'Acquisition',
    conversion: 'Conversion', 
    retention: 'Retention',
    referral: 'Referral',
  };
  const categoryIcons = {
    acquisition: '🎯',
    conversion: '✨',
    retention: '💜',
    referral: '🤝',
  };

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

        {/* Sidebar - Progress grouped by category */}
        <div className="space-y-6">
          {categoryOrder.map(cat => {
            const items = outcomesByCategory[cat];
            if (!items || items.length === 0) return null;
            
            return (
              <div key={cat}>
                <div 
                  className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                  style={{ color: '#C4A8A4', letterSpacing: '1.5px' }}
                >
                  <span>{categoryIcons[cat]}</span>
                  {categoryLabels[cat]}
                </div>
                
                {items.map((mission) => (
                  <MissionProgress key={mission.id} mission={mission} />
                ))}
              </div>
            );
          })}
          
          {Object.keys(outcomesByCategory).length === 0 && (
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