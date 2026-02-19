import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Check, AlertCircle, Clock, ChevronRight, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import AdminOnly from '@/components/layout/AdminOnly';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';

const etchedText = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

const AGENTS = [
  { id: 'connector', name: 'Connector', mission: 'Build partnerships', icon: '🤝' },
  { id: 'attender', name: 'Attender', mission: 'Find events', icon: '📍' },
  { id: 'accessor', name: 'Accessor', mission: 'Get into groups', icon: '🚪' },
  { id: 'offerer', name: 'Offerer', mission: 'Invite new families', icon: '💌' },
  { id: 'converter', name: 'Converter', mission: 'Convert trials', icon: '✨' },
  { id: 'retainer', name: 'Retainer', mission: 'Keep families engaged', icon: '💜' },
  { id: 'referrer', name: 'Referrer', mission: 'Generate referrals', icon: '🔄' },
];

function GrowthContent() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id;

  // Fetch outcomes (goals)
  const { data: outcomes = [] } = useQuery({
    queryKey: ['growthOutcomes'],
    queryFn: () => base44.entities.GrowthOutcome.list(),
  });

  // Fetch recent agent logs
  const { data: logs = [] } = useQuery({
    queryKey: ['agentLogs', studioId],
    queryFn: () => base44.entities.AgentLog.filter({ studio_id: studioId }, '-created_date', 50),
    enabled: !!studioId,
  });

  // Fetch pending actions
  const { data: pendingActions = [] } = useQuery({
    queryKey: ['pendingActions', studioId],
    queryFn: () => base44.entities.GrowthAction.filter({ studio_id: studioId, status: 'pending_review' }),
    enabled: !!studioId,
  });

  // Build agent status from real data
  const buildAgentStatus = (agentId) => {
    const agentOutcomes = outcomes.filter(o => o.agent === agentId && o.is_active);
    const agentLogs = logs.filter(l => l.agent === agentId);
    const agentPending = pendingActions.filter(a => a.agent === agentId);
    const lastLog = agentLogs[0];
    
    // Check if there are targets set
    const hasTargets = agentOutcomes.length > 0;
    
    // Check if agent has run recently
    const lastRun = lastLog?.created_date ? new Date(lastLog.created_date) : null;
    const hoursSinceRun = lastRun ? (Date.now() - lastRun.getTime()) / (1000 * 60 * 60) : null;
    
    // Determine status
    let status = 'not_configured';
    let statusColor = '#c4b5ab';
    
    if (!hasTargets) {
      status = 'no_targets';
      statusColor = '#c4b5ab';
    } else if (!lastRun) {
      status = 'never_run';
      statusColor = '#d4a574';
    } else if (hoursSinceRun > 48) {
      status = 'stale';
      statusColor = '#d4a574';
    } else {
      status = 'active';
      statusColor = '#7eb89a';
    }
    
    return {
      outcomes: agentOutcomes,
      lastLog,
      lastRun,
      hoursSinceRun,
      pendingCount: agentPending.length,
      status,
      statusColor,
      hasTargets,
    };
  };

  const totalPending = pendingActions.length;
  const activeAgents = AGENTS.filter(a => buildAgentStatus(a.id).status === 'active').length;
  const needsAttention = AGENTS.filter(a => ['no_targets', 'never_run', 'stale'].includes(buildAgentStatus(a.id).status)).length;

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: '#ffffff',
      }}
    >
      {/* Ambient background */}
      <div 
        className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
      />
      <div 
        className="fixed bottom-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-4xl mx-auto p-6 md:p-10 pt-10 md:pt-16">
        
        {/* Header */}
        <div className="mb-10">
          <p className="text-sm mb-2" style={{ color: '#b5a599' }}>mission control</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={etchedText}>
            Growth Engine
          </h1>
        </div>

        {/* Status Summary */}
        <div 
          className="rounded-2xl p-5 mb-8 flex flex-wrap gap-6"
          style={{ 
            background: 'rgba(255,255,255,0.6)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
          }}
        >
          <div>
            <div className="text-2xl font-bold" style={{ color: activeAgents > 0 ? '#7eb89a' : '#c4b5ab' }}>
              {activeAgents}/7
            </div>
            <div className="text-xs" style={{ color: '#b5a599' }}>agents active</div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: totalPending > 0 ? '#5a4f47' : '#c4b5ab' }}>
              {totalPending}
            </div>
            <div className="text-xs" style={{ color: '#b5a599' }}>awaiting review</div>
          </div>
          {needsAttention > 0 && (
            <div>
              <div className="text-2xl font-bold" style={{ color: '#d4a574' }}>
                {needsAttention}
              </div>
              <div className="text-xs" style={{ color: '#b5a599' }}>need attention</div>
            </div>
          )}
        </div>

        {/* Agent Cards */}
        <div className="space-y-4">
          {AGENTS.map((agent, idx) => {
            const status = buildAgentStatus(agent.id);
            
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl p-5"
                style={{
                  background: 'linear-gradient(145deg, rgba(254,248,248,0.95) 0%, rgba(252,245,245,0.9) 100%)',
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 4px 16px -8px rgba(180,150,140,0.15)',
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{
                      background: 'rgba(255,255,255,0.8)',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,1)',
                    }}
                  >
                    {agent.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold" style={{ color: '#5a4f47' }}>{agent.name}</h3>
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ background: status.statusColor }}
                      />
                    </div>
                    
                    {/* Status-specific message */}
                    {status.status === 'no_targets' && (
                      <p className="text-sm" style={{ color: '#b5a599' }}>
                        No targets set. <span style={{ color: '#a8998e' }}>Set goals to activate.</span>
                      </p>
                    )}
                    
                    {status.status === 'never_run' && (
                      <p className="text-sm" style={{ color: '#d4a574' }}>
                        Has targets but hasn't run yet.
                      </p>
                    )}
                    
                    {status.status === 'stale' && (
                      <p className="text-sm" style={{ color: '#d4a574' }}>
                        Hasn't run in {Math.round(status.hoursSinceRun)} hours.
                      </p>
                    )}
                    
                    {status.status === 'active' && (
                      <div className="text-sm" style={{ color: '#7a6d62' }}>
                        {status.lastLog?.summary || agent.mission}
                      </div>
                    )}
                    
                    {/* Pending actions badge */}
                    {status.pendingCount > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                        style={{ 
                          background: 'rgba(90,79,71,0.08)',
                          color: '#5a4f47',
                        }}
                      >
                        <Circle className="w-2 h-2 fill-current" />
                        {status.pendingCount} waiting for review
                      </div>
                    )}
                    
                    {/* Targets */}
                    {status.outcomes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {status.outcomes.map(o => (
                          <span 
                            key={o.id}
                            className="text-xs px-2.5 py-1 rounded-lg"
                            style={{ 
                              background: 'rgba(255,255,255,0.6)',
                              color: '#a8998e',
                            }}
                          >
                            {o.target_count}/{o.target_period}: {o.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Review Queue Link */}
        {totalPending > 0 && (
          <Link 
            to={createPageUrl('GrowthReview')}
            className="block mt-8 rounded-2xl p-5 transition-all hover:scale-[1.01]"
            style={{
              background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
              boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), inset 0 1px 2px rgba(255,255,255,0.8)',
              border: '1px solid rgba(255, 220, 210, 0.5)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold" style={etchedText}>
                  {totalPending} actions ready to review
                </div>
                <p className="text-sm mt-1" style={{ color: '#a8998e' }}>
                  Your agents prepared these — just need your OK
                </p>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: '#c4a0a0' }} />
            </div>
          </Link>
        )}

        {/* Debug Info */}
        <div className="mt-12 p-4 rounded-xl text-xs" style={{ background: 'rgba(0,0,0,0.02)', color: '#b5a599' }}>
          <div className="font-medium mb-2" style={{ color: '#8b7d72' }}>System Check</div>
          <div>Studio ID: {studioId || 'Not found'}</div>
          <div>Outcomes loaded: {outcomes.length}</div>
          <div>Outcomes with studio_id: {outcomes.filter(o => o.studio_id).length}</div>
          <div>Recent logs: {logs.length}</div>
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