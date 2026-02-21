import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ActionQueue from '@/components/growth/ActionQueue';
import OpportunityFeed from '@/components/growth/OpportunityFeed';
import AgentDetailView from '@/components/growth/AgentDetailView';
import GrowthChat from '@/components/growth/GrowthChat';
import AdminOnly from '@/components/layout/AdminOnly';

const etchedText = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

function AutoLaunchConnector({ onLaunch }) {
  // Auto-launch after a brief moment so the user sees what's happening
  React.useEffect(() => {
    const timer = setTimeout(onLaunch, 600);
    return () => clearTimeout(timer);
  }, [onLaunch]);

  return (
    <div className="text-center py-12">
      <div 
        className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-sm font-bold"
        style={{ background: 'rgba(126,184,154,0.12)', color: '#7eb89a' }}
      >
        C
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: '#6A5A56' }}>
        Starting the Connector agent...
      </p>
      <p className="text-xs" style={{ color: '#b5a599' }}>
        Finding circles of influence near your studio
      </p>
    </div>
  );
}

function GrowthContent() {
  const [view, setView] = useState('main'); // 'main' | 'agent:key' | 'chat' | 'connector-auto'
  const [autoLaunched, setAutoLaunched] = useState(false);

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

  const { data: partners = [] } = useQuery({
    queryKey: ['partners', studioId],
    queryFn: () => base44.entities.Partner.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: accessGroups = [] } = useQuery({
    queryKey: ['accessGroups', studioId],
    queryFn: () => base44.entities.AccessGroup.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', studioId],
    queryFn: () => base44.entities.Lead.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: agentLogs = [] } = useQuery({
    queryKey: ['agentLogs', studioId],
    queryFn: () => base44.entities.AgentLog.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const pendingActions = actions.filter(a => a.status === 'pending_review');
  const totalOpportunities = partners.length + accessGroups.length + leads.length;
  const hotLeads = leads.filter(l => ['trial_scheduled', 'trial_completed', 'offer_made'].includes(l.funnel_status));
  const readyEmails = pendingActions.filter(a => a.action_type === 'email').length;

  // Agent detail view
  if (view.startsWith('agent:')) {
    const agentKey = view.split(':')[1];
    return (
      <div className="h-full overflow-y-auto" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        <div className="p-4 md:p-8">
          <button
            onClick={() => setView('main')}
            className="mb-4 text-sm font-medium flex items-center gap-2 transition-all active:scale-95"
            style={{ color: '#b5a599' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <AgentDetailView agentKey={agentKey} studioId={studioId} actions={actions} />
        </div>
      </div>
    );
  }

  // Chat view (orchestrator or connector, with optional auto-prompt)
  if (view === 'chat' || view === 'connector-auto') {
    const chatAgent = view === 'connector-auto' ? 'connector' : 'growth_orchestrator';
    const chatLabel = view === 'connector-auto' ? 'Connector' : 'Growth Engine';
    const autoMsg = view === 'connector-auto' 
      ? "Find circles of influence near my studio. Search for daycares, pediatricians, youth sports, schools, and any other places where parents of kids aged 3-12 already gather and trust someone. For each one, identify the person at the center, figure out a genuine angle to connect, and draft a first message I can approve."
      : null;
    return (
      <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0">
          <button
            onClick={() => setView('main')}
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
          <span className="text-sm font-semibold" style={{ color: '#8b7d72' }}>{chatLabel}</span>
        </div>
        <div className="flex-1 min-h-0">
          <GrowthChat agentName={chatAgent} studioId={studioId} autoPrompt={autoMsg} />
        </div>
      </div>
    );
  }

  // Main view — opportunity + revenue
  return (
    <div
      className="h-full overflow-y-auto relative"
      style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}
    >
      <div className="p-4 md:p-8 pb-28">
        <div
          className="rounded-3xl p-6 md:p-10 max-w-4xl mx-auto"
          style={{
            backgroundColor: '#fef7f7',
            boxShadow: 'inset 0 2px 12px rgba(180, 120, 120, 0.08), inset 0 1px 3px rgba(180, 120, 120, 0.05)',
          }}
        >
          {/* Headline — not a title, a statement of what's happening */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={etchedText}>
              {pendingActions.length > 0
                ? `${pendingActions.length} move${pendingActions.length !== 1 ? 's' : ''} ready to make`
                : hotLeads.length > 0
                ? `${hotLeads.length} hot lead${hotLeads.length !== 1 ? 's' : ''} in your funnel`
                : totalOpportunities > 0
                ? `${totalOpportunities} opportunities in motion`
                : 'Growth Engine'
              }
            </h1>
            {totalOpportunities > 0 && (
              <p className="text-sm mt-2" style={{ color: '#b5a599' }}>
                {partners.length} businesses found
                {accessGroups.length > 0 && ` · ${accessGroups.length} access group${accessGroups.length !== 1 ? 's' : ''}`}
                {leads.length > 0 && ` · ${leads.length} lead${leads.length !== 1 ? 's' : ''}`}
                {readyEmails > 0 && ` · ${readyEmails} email${readyEmails !== 1 ? 's' : ''} drafted`}
              </p>
            )}
          </div>

          {/* Actions to approve — these are revenue levers, shown first when they exist */}
          <ActionQueue actions={actions} studioId={studioId} />

          {/* The living landscape of opportunity */}
          {totalOpportunities > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold mb-4" style={etchedText}>
                What your agents found
              </h2>
              <OpportunityFeed
                partners={partners}
                accessGroups={accessGroups}
                leads={leads}
                actions={actions}
                agentLogs={agentLogs}
              />
            </div>
          )}

          {/* Empty state — no waiting, auto-launch the connector */}
          {totalOpportunities === 0 && pendingActions.length === 0 && !autoLaunched && (
            <AutoLaunchConnector onLaunch={() => { setAutoLaunched(true); setView('connector-auto'); }} />
          )}
        </div>
      </div>

      {/* Floating command bar */}
      <div className="sticky bottom-4 mx-auto w-[calc(100%-2rem)] max-w-2xl z-30 px-4 pb-4">
        <button
          onClick={() => setView('chat')}
          className="w-full rounded-2xl px-5 py-4 flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: 'linear-gradient(145deg, rgba(255,253,252,0.97) 0%, rgba(254,248,246,0.95) 100%)',
            boxShadow: '0 12px 48px -12px rgba(140,110,100,0.25), 0 4px 12px -4px rgba(140,110,100,0.1), inset 0 1px 1px rgba(255,255,255,0.9)',
            border: '1px solid rgba(220,200,196,0.3)',
          }}
        >
          <span className="text-sm" style={{ color: '#b5a599' }}>
            Tell the Growth Engine what to do...
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