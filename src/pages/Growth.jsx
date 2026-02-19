import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Sparkles, Check, X, ChevronRight, Play, Zap, Users, Calendar, Gift, Heart, Share2, RefreshCw } from 'lucide-react';
import AdminOnly from '@/components/layout/AdminOnly';

// Design tokens
const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  muted: '#8a8478',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
};

// Agent metadata
const agentMeta = {
  connector: { icon: Users, label: 'Connector', color: '#8B7355' },
  attender: { icon: Calendar, label: 'Attender', color: '#456577' },
  accessor: { icon: Zap, label: 'Accessor', color: '#5A4577' },
  offerer: { icon: Gift, label: 'Offerer', color: '#776545' },
  converter: { icon: Sparkles, label: 'Converter', color: '#456577' },
  retainer: { icon: Heart, label: 'Retainer', color: '#577745' },
  referrer: { icon: Share2, label: 'Referrer', color: '#774565' },
};

// Etched text style
const etchedStyle = {
  fontWeight: '700',
  letterSpacing: '-0.02em',
  color: 'transparent',
  backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

// Hero Stats Card
function HeroCard({ totalOutcomes, onTrackCount, pendingActions, behindCount }) {
  return (
    <div
      style={{
        padding: '32px',
        borderRadius: '24px',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 200, 200, 0.3)',
        boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: colors.muted, marginBottom: '8px' }}>
          {totalOutcomes} outcomes tracked
        </p>
        <div style={{ ...etchedStyle, fontSize: '48px' }}>
          {onTrackCount} on track
        </div>
        
        {/* Sub-stats */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '12px', 
          marginTop: '24px',
          flexWrap: 'wrap',
        }}>
          <StatCard value={pendingActions} label="PENDING ACTIONS" />
          <StatCard value={onTrackCount} label="ON TRACK" />
          <StatCard value={behindCount} label="NEED FOCUS" highlight={behindCount > 0} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, highlight }) {
  return (
    <div
      style={{
        padding: '16px 32px',
        borderRadius: '16px',
        background: highlight 
          ? 'linear-gradient(145deg, rgba(196, 160, 160, 0.15) 0%, rgba(196, 160, 160, 0.1) 100%)'
          : 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
        boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
        minWidth: '120px',
      }}
    >
      <div style={{ ...etchedStyle, fontSize: '24px' }}>{value}</div>
      <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.muted, marginTop: '4px' }}>
        {label}
      </div>
    </div>
  );
}

// Agent Progress Row
function AgentProgressRow({ agent, progress, isRunning, onRun }) {
  const meta = agentMeta[agent] || { icon: Zap, label: agent, color: '#666' };
  const Icon = meta.icon;
  const percent = progress.target > 0 ? Math.min((progress.current / progress.target) * 100, 100) : 0;
  const isBehind = progress.status === 'behind';
  const isComplete = percent >= 100;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        borderRadius: '16px',
        background: isComplete 
          ? 'rgba(126, 184, 154, 0.08)'
          : isBehind 
            ? 'rgba(196, 160, 160, 0.08)' 
            : 'rgba(255, 255, 255, 0.5)',
        border: `1px solid ${isComplete ? 'rgba(126, 184, 154, 0.2)' : 'rgba(200, 180, 170, 0.1)'}`,
        marginBottom: '8px',
      }}
    >
      {/* Agent Icon */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: `${meta.color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} style={{ color: meta.color }} />
      </div>

      {/* Agent Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.ink }}>{meta.label}</div>
        <div style={{ fontSize: '12px', color: colors.muted }}>
          {progress.outcome_name || `${progress.current}/${progress.target} ${progress.period || 'this period'}`}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100px', flexShrink: 0 }}>
        <div style={{ height: '6px', background: 'rgba(200, 180, 170, 0.15)', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${percent}%`,
              background: isComplete ? '#7eb89a' : isBehind ? colors.etchLight : colors.etchDark,
              borderRadius: '3px',
              transition: 'width 0.3s',
            }}
          />
        </div>
        <div style={{ fontSize: '11px', color: colors.muted, marginTop: '4px', textAlign: 'right' }}>
          {progress.current}/{progress.target}
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={() => onRun(agent)}
        disabled={isRunning}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          border: 'none',
          background: isRunning ? 'rgba(200, 180, 170, 0.1)' : 'rgba(255, 255, 255, 0.8)',
          boxShadow: '0 2px 8px rgba(180,150,140,0.1)',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isRunning ? (
          <RefreshCw size={16} style={{ color: colors.muted, animation: 'spin 1s linear infinite' }} />
        ) : (
          <Play size={16} style={{ color: colors.etchDark }} />
        )}
      </button>
    </div>
  );
}

// Action Card for pending review
function ActionCard({ action, onApprove, onSkip }) {
  const [expanded, setExpanded] = useState(false);
  const meta = agentMeta[action.agent] || { icon: Zap, label: action.agent, color: '#666' };
  const isHighPriority = action.priority === 'high';

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '12px',
        border: isHighPriority ? '1px solid rgba(196, 160, 160, 0.3)' : '1px solid rgba(200, 180, 170, 0.15)',
        boxShadow: '0 4px 16px -4px rgba(180,150,140,0.1)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        {isHighPriority && (
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.etchLight }} />
        )}
        <span
          style={{
            fontSize: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '4px 10px',
            borderRadius: '8px',
            background: `${meta.color}15`,
            color: meta.color,
          }}
        >
          {meta.label}
        </span>
        <span style={{ fontSize: '10px', color: colors.muted, textTransform: 'uppercase' }}>
          {action.action_type}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: '16px', fontWeight: '600', color: colors.ink, marginBottom: '4px' }}>
        {action.title}
      </div>
      {action.target_name && (
        <div style={{ fontSize: '13px', color: colors.muted, marginBottom: '12px' }}>{action.target_name}</div>
      )}

      {/* Summary */}
      {action.summary && (
        <div
          style={{
            fontSize: '13px',
            color: colors.muted,
            lineHeight: '1.5',
            padding: '12px',
            background: 'rgba(200, 180, 170, 0.08)',
            borderRadius: '10px',
            marginBottom: '12px',
          }}
        >
          {action.summary}
        </div>
      )}

      {/* Expandable Content */}
      {action.content && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: colors.etchDark,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: expanded ? '12px' : '16px',
          }}
        >
          <ChevronRight size={14} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          {expanded ? 'Hide draft' : 'View draft'}
        </button>
      )}

      {expanded && action.content && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px',
            border: '1px solid rgba(200, 180, 170, 0.15)',
          }}
        >
          {action.subject && (
            <div style={{ fontSize: '12px', fontWeight: '500', color: colors.ink, marginBottom: '8px' }}>
              Subject: {action.subject}
            </div>
          )}
          <div style={{ fontSize: '13px', color: colors.ink, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {action.content}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onApprove(action)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: colors.ink,
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <Check size={16} /> Approve
        </button>
        <button
          onClick={() => onSkip(action)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.6)',
            color: colors.muted,
            border: '1px solid rgba(200, 180, 170, 0.2)',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          <X size={16} /> Skip
        </button>
      </div>
    </div>
  );
}

// Main Dashboard
function GrowthContent() {
  const queryClient = useQueryClient();
  const [runningAgents, setRunningAgents] = useState({});

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id;

  // Fetch orchestrator dashboard
  const { data: dashboard, refetch: refetchDashboard } = useQuery({
    queryKey: ['growthDashboard', studioId],
    queryFn: async () => {
      const res = await base44.functions.invoke('runOrchestratorAgent', { studio_id: studioId });
      return res.data?.dashboard || {};
    },
    enabled: !!studioId,
    staleTime: 60000,
  });

  // Fetch pending actions
  const { data: actions = [], refetch: refetchActions } = useQuery({
    queryKey: ['growthActions', studioId],
    queryFn: () => base44.entities.GrowthAction.filter({ studio_id: studioId, status: 'pending_review' }, '-created_date'),
    enabled: !!studioId,
  });

  // Run agent
  const runAgent = async (agent) => {
    setRunningAgents(prev => ({ ...prev, [agent]: true }));
    try {
      const functionName = `run${agent.charAt(0).toUpperCase() + agent.slice(1)}Agent`;
      await base44.functions.invoke(functionName, { studio_id: studioId, mode: 'full' });
      toast.success(`${agentMeta[agent]?.label || agent} completed`);
      refetchDashboard();
      refetchActions();
    } catch (err) {
      toast.error(`Failed to run ${agent}`);
    } finally {
      setRunningAgents(prev => ({ ...prev, [agent]: false }));
    }
  };

  // Approve action
  const handleApprove = async (action) => {
    await base44.entities.GrowthAction.update(action.id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
    toast.success('Action approved!');
    refetchActions();
  };

  // Skip action
  const handleSkip = async (action) => {
    await base44.entities.GrowthAction.update(action.id, { status: 'dismissed' });
    toast.success('Action skipped');
    refetchActions();
  };

  // Calculate stats
  const agentProgress = dashboard?.agent_progress || {};
  const agents = ['connector', 'attender', 'accessor', 'offerer', 'converter', 'retainer', 'referrer'];
  
  const totalOutcomes = agents.filter(a => agentProgress[a]?.target > 0).length;
  const onTrackCount = agents.filter(a => {
    const p = agentProgress[a];
    return p && (p.status === 'on_track' || p.status === 'ahead' || p.status === 'complete');
  }).length;
  const behindCount = agents.filter(a => agentProgress[a]?.status === 'behind').length;

  const highPriorityActions = actions.filter(a => a.priority === 'high');
  const normalActions = actions.filter(a => a.priority !== 'high');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.paper,
        padding: '24px',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Hero Card */}
        <HeroCard
          totalOutcomes={totalOutcomes}
          onTrackCount={onTrackCount}
          pendingActions={actions.length}
          behindCount={behindCount}
        />

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left: Agent Progress */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.ink }}>Agent Progress</h2>
              <button
                onClick={() => refetchDashboard()}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.muted,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            <div
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                borderRadius: '20px',
                padding: '16px',
                border: '1px solid rgba(200, 180, 170, 0.15)',
              }}
            >
              {agents.map(agent => (
                <AgentProgressRow
                  key={agent}
                  agent={agent}
                  progress={agentProgress[agent] || { current: 0, target: 0, status: 'no_target' }}
                  isRunning={runningAgents[agent]}
                  onRun={runAgent}
                />
              ))}
            </div>
          </div>

          {/* Right: Pending Actions */}
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.ink, marginBottom: '16px' }}>
              Pending Actions ({actions.length})
            </h2>

            {actions.length === 0 ? (
              <div
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                  borderRadius: '20px',
                  padding: '40px',
                  textAlign: 'center',
                  border: '1px solid rgba(200, 180, 170, 0.15)',
                }}
              >
                <Sparkles size={32} style={{ color: colors.etchLight, marginBottom: '12px' }} />
                <div style={{ fontSize: '14px', color: colors.muted }}>
                  No pending actions. Run agents to generate recommendations.
                </div>
              </div>
            ) : (
              <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
                {highPriorityActions.length > 0 && (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: colors.etchLight, marginBottom: '8px' }}>
                      High Priority
                    </div>
                    {highPriorityActions.map(action => (
                      <ActionCard key={action.id} action={action} onApprove={handleApprove} onSkip={handleSkip} />
                    ))}
                  </>
                )}
                {normalActions.length > 0 && (
                  <>
                    {highPriorityActions.length > 0 && (
                      <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: colors.muted, marginBottom: '8px', marginTop: '16px' }}>
                        Normal
                      </div>
                    )}
                    {normalActions.map(action => (
                      <ActionCard key={action.id} action={action} onApprove={handleApprove} onSkip={handleSkip} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
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