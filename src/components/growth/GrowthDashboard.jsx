import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ChevronRight, CheckCircle2, Clock, XCircle, ArrowRight, Mail, MessageSquare, Phone, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const AGENT_COLORS = {
  connector: { bg: 'rgba(126,184,154,0.12)', text: '#5a7d6a', accent: '#7eb89a' },
  attender: { bg: 'rgba(212,165,116,0.12)', text: '#8a6a3a', accent: '#d4a574' },
  accessor: { bg: 'rgba(164,139,196,0.12)', text: '#6a5a80', accent: '#a48bc4' },
  offerer: { bg: 'rgba(224,128,128,0.12)', text: '#8a4a4a', accent: '#e08080' },
  converter: { bg: 'rgba(201,169,156,0.12)', text: '#6a5a50', accent: '#c9a99c' },
  retainer: { bg: 'rgba(154,138,173,0.12)', text: '#6a5a7a', accent: '#9a8aad' },
  referrer: { bg: 'rgba(106,173,173,0.12)', text: '#4a7a7a', accent: '#6aadad' },
};

const AGENT_EMOJI = {
  connector: '🤝', attender: '🎪', accessor: '🚪', offerer: '🎁',
  converter: '✨', retainer: '💜', referrer: '📣',
};

const ACTION_ICONS = {
  email: Mail, sms: MessageSquare, call: Phone, message: MessageSquare,
};

export default function GrowthDashboard({ studioId, onOpenAgent, onOpenAction }) {
  const { data: outcomes = [] } = useQuery({
    queryKey: ['growthOutcomes', studioId],
    queryFn: () => base44.entities.GrowthOutcome.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['growthActions', studioId],
    queryFn: () => base44.entities.GrowthAction.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['growthPartners', studioId],
    queryFn: () => base44.entities.Partner.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const pendingActions = actions.filter(a => a.status === 'pending_review').sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const completedActions = actions.filter(a => a.status === 'completed' || a.status === 'sent');
  
  // Group outcomes by category
  const categories = {
    acquisition: { label: 'Acquisition', emoji: '🎯', outcomes: outcomes.filter(o => o.category === 'acquisition' && o.is_active) },
    conversion: { label: 'Conversion', emoji: '✨', outcomes: outcomes.filter(o => o.category === 'conversion' && o.is_active) },
    retention: { label: 'Retention', emoji: '💜', outcomes: outcomes.filter(o => o.category === 'retention' && o.is_active) },
    referral: { label: 'Referral', emoji: '📣', outcomes: outcomes.filter(o => o.category === 'referral' && o.is_active) },
  };

  // Calculate pipeline stats per agent
  const agentStats = {};
  outcomes.filter(o => o.is_active).forEach(o => {
    if (!agentStats[o.agent]) {
      agentStats[o.agent] = { outcomes: 0, pending: 0, completed: 0, target: 0 };
    }
    agentStats[o.agent].outcomes++;
    agentStats[o.agent].target += o.target_count;
  });
  actions.forEach(a => {
    if (!agentStats[a.agent]) agentStats[a.agent] = { outcomes: 0, pending: 0, completed: 0, target: 0 };
    if (a.status === 'pending_review') agentStats[a.agent].pending++;
    if (a.status === 'completed' || a.status === 'sent') agentStats[a.agent].completed++;
  });

  return (
    <div className="space-y-8">
      {/* Top row — key numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pending Review" value={pendingActions.length} accent="#d4a574" />
        <StatCard label="Actions Done" value={completedActions.length} accent="#7eb89a" />
        <StatCard label="Partners Found" value={partners.length} accent="#a48bc4" />
        <StatCard label="Active Outcomes" value={outcomes.filter(o => o.is_active).length} accent="#c9a99c" />
      </div>

      {/* Pending actions — THE most useful section */}
      {pendingActions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: '#6A5A56' }}>
              Needs Your Approval
            </h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(212,165,116,0.15)', color: '#d4a574' }}>
              {pendingActions.length} pending
            </span>
          </div>
          <div className="space-y-2">
            {pendingActions.slice(0, 5).map((action, i) => (
              <PendingActionCard key={action.id} action={action} index={i} onOpen={() => onOpenAction?.(action)} />
            ))}
            {pendingActions.length > 5 && (
              <button className="text-sm font-medium w-full py-2 text-center" style={{ color: '#b5a599' }}>
                + {pendingActions.length - 5} more
              </button>
            )}
          </div>
        </section>
      )}

      {/* Agent pipeline — visual, compact */}
      <section>
        <h2 className="text-base font-semibold mb-4" style={{ color: '#6A5A56' }}>
          Growth Agents
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Object.entries(agentStats).map(([agent, stats]) => (
            <AgentCard 
              key={agent} 
              agent={agent} 
              stats={stats} 
              onOpen={() => onOpenAgent?.(agent)} 
            />
          ))}
        </div>
      </section>

      {/* Growth map — outcomes by category */}
      <section>
        <h2 className="text-base font-semibold mb-4" style={{ color: '#6A5A56' }}>
          Growth Map
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(categories).filter(([, cat]) => cat.outcomes.length > 0).map(([key, cat]) => (
            <CategoryCard key={key} category={cat} actions={actions} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div 
      className="rounded-2xl p-4 md:p-5"
      style={{
        background: 'rgba(255,255,255,0.6)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 12px rgba(180,150,140,0.06)',
      }}
    >
      <div className="text-2xl md:text-3xl font-bold" style={{ color: accent }}>{value}</div>
      <div className="text-xs font-medium mt-1" style={{ color: '#b5a599' }}>{label}</div>
    </div>
  );
}

function PendingActionCard({ action, index, onOpen }) {
  const colors = AGENT_COLORS[action.agent] || AGENT_COLORS.connector;
  const emoji = AGENT_EMOJI[action.agent] || '🤝';
  const Icon = ACTION_ICONS[action.action_type] || Mail;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onOpen}
      className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-start gap-3"
      style={{
        background: 'rgba(255,255,255,0.6)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 12px rgba(180,150,140,0.06)',
        border: `1px solid ${colors.accent}15`,
      }}
    >
      <div 
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: colors.bg }}
      >
        <Icon className="w-4 h-4" style={{ color: colors.accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.accent }}>
            {emoji} {action.agent}
          </span>
        </div>
        <div className="text-sm font-medium truncate" style={{ color: '#5A4A46' }}>
          {action.title}
        </div>
        {action.target_name && (
          <div className="text-xs mt-0.5 truncate" style={{ color: '#b5a599' }}>
            → {action.target_name}
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0 mt-2" style={{ color: '#d4c4ba' }} />
    </motion.button>
  );
}

function AgentCard({ agent, stats, onOpen }) {
  const colors = AGENT_COLORS[agent] || AGENT_COLORS.connector;
  const emoji = AGENT_EMOJI[agent] || '🤝';
  const progress = stats.target > 0 ? Math.min(100, Math.round((stats.completed / stats.target) * 100)) : 0;

  return (
    <button
      onClick={onOpen}
      className="text-left rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] group"
      style={{
        background: colors.bg,
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg">{emoji}</span>
        {stats.pending > 0 && (
          <span 
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(212,165,116,0.2)', color: '#d4a574' }}
          >
            {stats.pending} pending
          </span>
        )}
      </div>
      <div className="text-sm font-semibold capitalize mb-1" style={{ color: colors.text }}>
        {agent}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full" style={{ background: `${colors.accent}20` }}>
          <div 
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: colors.accent }}
          />
        </div>
        <span className="text-[10px] font-medium" style={{ color: colors.accent }}>
          {stats.completed}/{stats.target}
        </span>
      </div>
      <ChevronRight 
        className="w-3.5 h-3.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" 
        style={{ color: colors.accent }} 
      />
    </button>
  );
}

function CategoryCard({ category, actions }) {
  return (
    <div 
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.5)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{category.emoji}</span>
        <h3 className="text-sm font-semibold" style={{ color: '#6A5A56' }}>{category.label}</h3>
      </div>
      <div className="space-y-2.5">
        {category.outcomes.map(o => {
          const agentActions = actions.filter(a => a.outcome_id === o.id);
          const done = agentActions.filter(a => a.status === 'completed' || a.status === 'sent').length;
          const colors = AGENT_COLORS[o.agent] || AGENT_COLORS.connector;
          
          return (
            <div key={o.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: '#5A4A46' }}>
                  {o.name}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex-1 h-1 rounded-full" style={{ background: `${colors.accent}15` }}>
                    <div 
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, o.target_count > 0 ? (done / o.target_count) * 100 : 0)}%`, background: colors.accent }}
                    />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: '#b5a599' }}>
                    {done}/{o.target_count}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-medium" style={{ color: '#c4b5ab' }}>
                /{o.target_period}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}