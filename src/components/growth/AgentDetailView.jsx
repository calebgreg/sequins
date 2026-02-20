import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AGENT_CONFIG = {
  connector: {
    label: 'Connector',
    letter: 'C',
    description: 'Discovers local businesses, researches contacts, and drafts outreach emails.',
    actions: [
      { label: 'Find new partners nearby', mode: 'research' },
      { label: 'Research identified partners', mode: 'enrich' },
      { label: 'Draft outreach emails', mode: 'outreach' },
    ],
    functionName: 'runConnectorAgent',
  },
  attender: {
    label: 'Attender',
    letter: 'A',
    description: 'Finds community events where you can meet families and generate leads.',
    actions: [
      { label: 'Scout upcoming events', mode: 'research' },
      { label: 'Evaluate event fit', mode: 'evaluate' },
    ],
    functionName: 'runAttenderAgent',
  },
  accessor: {
    label: 'Accessor',
    letter: 'X',
    description: 'Gets you access to groups of families — daycares, schools, leagues, mommy groups.',
    actions: [
      { label: 'Find access groups', mode: 'research' },
      { label: 'Draft access requests', mode: 'outreach' },
    ],
    functionName: 'runAccessorAgent',
  },
  offerer: {
    label: 'Offerer',
    letter: 'O',
    description: 'Matches leads to trial classes and sends personalized invitations.',
    actions: [
      { label: 'Match leads to offers', mode: 'full' },
    ],
    functionName: 'runOffererAgent',
  },
  converter: {
    label: 'Converter',
    letter: 'V',
    description: 'Follows up with trial families, re-engages no-shows, preps upcoming trials.',
    actions: [
      { label: 'Analyze trial families', mode: 'full' },
    ],
    functionName: 'runConverterAgent',
  },
  retainer: {
    label: 'Retainer',
    letter: 'R',
    description: 'Spots at-risk families before they leave and celebrates student wins.',
    actions: [
      { label: 'Check for at-risk families', mode: 'risk' },
      { label: 'Find celebration moments', mode: 'celebrate' },
    ],
    functionName: 'runRetainerAgent',
  },
  referrer: {
    label: 'Referrer',
    letter: 'F',
    description: 'Generates outbound referrals to partners and finds shareable student moments.',
    actions: [
      { label: 'Match families to partners', mode: 'match' },
      { label: 'Find shareable moments', mode: 'moments' },
    ],
    functionName: 'runReferrerAgent',
  },
};

const etchedText = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

export default function AgentDetailView({ agentKey, studioId, actions = [] }) {
  const [runningMode, setRunningMode] = useState(null);
  const queryClient = useQueryClient();
  const config = AGENT_CONFIG[agentKey];

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['agentLogs', studioId, agentKey],
    queryFn: () => base44.entities.AgentLog.filter({ studio_id: studioId, agent: agentKey }),
    enabled: !!studioId,
  });

  if (!config) return null;

  const agentActions = actions.filter(a => a.agent === agentKey);
  const pending = agentActions.filter(a => a.status === 'pending_review');
  const approved = agentActions.filter(a => a.status === 'approved' || a.status === 'sent');
  const completed = agentActions.filter(a => a.status === 'completed');

  const lastLog = logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  const lastRun = lastLog ? new Date(lastLog.created_date) : null;

  const handleRun = async (mode) => {
    setRunningMode(mode);
    try {
      const res = await base44.functions.invoke(config.functionName, {
        studio_id: studioId,
        mode,
      });
      const data = res.data;
      queryClient.invalidateQueries(['growthActions']);
      queryClient.invalidateQueries(['agentLogs']);

      if (data.actions_created > 0) {
        toast.success(`${config.label} created ${data.actions_created} new action${data.actions_created !== 1 ? 's' : ''}`);
      } else if (data.partners_found > 0) {
        toast.success(`Found ${data.partners_found} new partners`);
      } else if (data.partners_enriched > 0) {
        toast.success(`Enriched ${data.partners_enriched} partners`);
      } else {
        toast('Done — nothing new to do right now');
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
    setRunningMode(null);
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'Never';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
            boxShadow: '0 4px 12px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
          }}
        >
          <span className="text-base font-semibold" style={{ color: '#c9a99c' }}>{config.letter}</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={etchedText}>{config.label}</h2>
          <p className="text-sm mt-0.5" style={{ color: '#b5a599' }}>{config.description}</p>
        </div>
      </div>

      {/* Last run */}
      <div className="flex items-center gap-2 mt-4 mb-8">
        <span className="text-xs" style={{ color: '#c4b5ab' }}>⏱</span>
        <span className="text-xs" style={{ color: '#b5a599' }}>
          Last ran: {formatTimeAgo(lastRun)}
        </span>
        {lastLog?.summary && (
          <>
            <span className="text-xs" style={{ color: '#d4c4ba' }}>·</span>
            <span className="text-xs" style={{ color: '#b5a599' }}>{lastLog.summary}</span>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Pending review', count: pending.length, color: '#e08080' },
          { label: 'Approved', count: approved.length, color: '#7eb89a' },
          { label: 'Completed', count: completed.length, color: '#a48bc4' },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-xl p-4 text-center"
            style={{
              background: 'rgba(255,255,255,0.5)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
            }}
          >
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.count}</div>
            <div className="text-[11px] mt-1" style={{ color: '#b5a599' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Run actions */}
      <h3 className="text-sm font-bold mb-3" style={etchedText}>Run {config.label}</h3>
      <div className="space-y-2 mb-8">
        {config.actions.map(action => {
          const isRunning = runningMode === action.mode;
          return (
            <button
              key={action.mode}
              onClick={() => handleRun(action.mode)}
              disabled={!!runningMode}
              className="w-full text-left rounded-2xl p-4 md:p-5 flex items-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              style={{
                background: isRunning
                  ? 'rgba(255,255,255,0.85)'
                  : 'rgba(255,255,255,0.5)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 16px -8px rgba(180,150,140,0.1)',
              }}
            >
              <span className="text-lg">{action.icon}</span>
              <span className="flex-1 text-sm font-medium" style={{ color: '#6A5A56' }}>
                {action.label}
              </span>
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#c4b5ab' }} />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="#c4b5ab" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Recent activity */}
      {logs.length > 0 && (
        <>
          <h3 className="text-sm font-bold mb-3" style={etchedText}>Recent activity</h3>
          <div className="space-y-2">
            {logs.slice(0, 5).map(log => (
              <div
                key={log.id}
                className="rounded-xl p-4 flex items-start gap-3"
                style={{
                  background: 'rgba(255,255,255,0.35)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)',
                }}
              >
                <div className="mt-0.5">
                  {log.event_type === 'error' ? (
                    <span className="text-xs">❌</span>
                  ) : log.event_type === 'success' ? (
                    <span className="text-xs">✅</span>
                  ) : (
                    <span className="text-xs" style={{ color: '#c4b5ab' }}>→</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm" style={{ color: '#6A5A56' }}>{log.summary}</div>
                  <div className="text-[11px] mt-1" style={{ color: '#c4b5ab' }}>
                    {formatTimeAgo(new Date(log.created_date))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}