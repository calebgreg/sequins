import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronRight, ChevronLeft, Play, RefreshCw } from 'lucide-react';
import AdminOnly from '@/components/layout/AdminOnly';

// Etched text style - matching TeacherStudio
const etchedText = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

// Agent display names (friendly, not technical)
const agentDisplay = {
  connector: { name: 'Partnerships', emoji: '🤝' },
  attender: { name: 'Events', emoji: '🎪' },
  accessor: { name: 'Access', emoji: '🚪' },
  offerer: { name: 'Offers', emoji: '🎁' },
  converter: { name: 'Trials', emoji: '✨' },
  retainer: { name: 'Retention', emoji: '💜' },
  referrer: { name: 'Referrals', emoji: '💫' },
};

function GrowthContent() {
  const [runningAgents, setRunningAgents] = useState({});
  const [selectedAction, setSelectedAction] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id;

  // Fetch orchestrator dashboard
  const { data: dashboard, refetch: refetchDashboard, isLoading } = useQuery({
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

  const runAgent = async (agent) => {
    setRunningAgents(prev => ({ ...prev, [agent]: true }));
    try {
      const functionName = `run${agent.charAt(0).toUpperCase() + agent.slice(1)}Agent`;
      await base44.functions.invoke(functionName, { studio_id: studioId, mode: 'full' });
      toast.success(`${agentDisplay[agent]?.name || agent} agent completed`);
      refetchDashboard();
      refetchActions();
    } catch (err) {
      toast.error(`Failed to run agent`);
    } finally {
      setRunningAgents(prev => ({ ...prev, [agent]: false }));
    }
  };

  const handleApprove = async (action) => {
    await base44.entities.GrowthAction.update(action.id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
    toast.success('Approved');
    setSelectedAction(null);
    refetchActions();
  };

  const handleSkip = async (action) => {
    await base44.entities.GrowthAction.update(action.id, { status: 'dismissed' });
    toast.success('Skipped');
    setSelectedAction(null);
    refetchActions();
  };

  const agentProgress = dashboard?.agent_progress || {};
  const agents = ['connector', 'attender', 'accessor', 'offerer', 'converter', 'retainer', 'referrer'];
  
  const onTrackCount = agents.filter(a => {
    const p = agentProgress[a];
    return p && (p.status === 'on_track' || p.status === 'ahead' || p.status === 'complete');
  }).length;
  const behindCount = agents.filter(a => agentProgress[a]?.status === 'behind').length;

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: '#ffffff',
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
      <div 
        className="fixed top-[40%] left-[60%] w-[400px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(200,180,220,0.4) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-4xl mx-auto p-6 md:p-10">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="text-sm mb-2" style={{ color: '#b5a599' }}>growth engine</p>
          <h1 
            className="text-4xl md:text-5xl font-bold tracking-tight mb-3"
            style={etchedText}
          >
            {actions.length > 0 ? `${actions.length} waiting` : 'All clear'}
          </h1>
          <p className="text-base" style={{ color: '#a8998e' }}>
            {behindCount > 0 
              ? `${behindCount} areas need attention`
              : onTrackCount > 0 
                ? `${onTrackCount} outcomes on track`
                : 'Run agents to start growing'
            }
          </p>
        </motion.div>

        {/* Main Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl p-6 md:p-8"
          style={{
            background: 'linear-gradient(145deg, rgba(254,240,240,0.95) 0%, rgba(252,235,235,0.9) 50%, rgba(250,242,240,0.85) 100%)',
            boxShadow: 'inset 0 2px 12px rgba(180, 120, 120, 0.08), inset 0 1px 3px rgba(180, 120, 120, 0.05)',
          }}
        >
          {/* Stats Row */}
          <div className="flex justify-center gap-3 mb-8">
            <div 
              className="px-6 py-4 rounded-2xl text-center min-w-[100px]"
              style={{
                background: 'rgba(255,255,255,0.7)',
                boxShadow: '0 4px 16px -4px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)',
              }}
            >
              <div className="text-2xl font-bold" style={etchedText}>{actions.length}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: '#b5a599' }}>
                Pending
              </div>
            </div>
            <div 
              className="px-6 py-4 rounded-2xl text-center min-w-[100px]"
              style={{
                background: 'rgba(255,255,255,0.7)',
                boxShadow: '0 4px 16px -4px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)',
              }}
            >
              <div className="text-2xl font-bold" style={etchedText}>{onTrackCount}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: '#b5a599' }}>
                On Track
              </div>
            </div>
            <div 
              className="px-6 py-4 rounded-2xl text-center min-w-[100px]"
              style={{
                background: behindCount > 0 ? 'rgba(212,165,116,0.1)' : 'rgba(255,255,255,0.7)',
                boxShadow: '0 4px 16px -4px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)',
              }}
            >
              <div className="text-2xl font-bold" style={etchedText}>{behindCount}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: behindCount > 0 ? '#d4a574' : '#b5a599' }}>
                Behind
              </div>
            </div>
          </div>

          {/* Agent Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            {agents.map((agent, idx) => {
              const progress = agentProgress[agent] || { current: 0, target: 0, status: 'no_target' };
              const display = agentDisplay[agent];
              const isRunning = runningAgents[agent];
              const isBehind = progress.status === 'behind';
              const isComplete = progress.percent >= 100;
              
              return (
                <motion.button
                  key={agent}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  onClick={() => runAgent(agent)}
                  disabled={isRunning}
                  className="rounded-2xl p-4 text-left transition-all active:scale-95 hover:scale-[1.02] disabled:opacity-60"
                  style={{
                    background: isBehind 
                      ? 'linear-gradient(145deg, rgba(212,165,116,0.12) 0%, rgba(212,165,116,0.08) 100%)'
                      : isComplete
                        ? 'linear-gradient(145deg, rgba(126,184,154,0.12) 0%, rgba(126,184,154,0.08) 100%)'
                        : 'rgba(255,255,255,0.6)',
                    boxShadow: '0 4px 12px -4px rgba(180,150,140,0.1), inset 0 1px 1px rgba(255,255,255,0.8)',
                    border: isBehind ? '1px solid rgba(212,165,116,0.2)' : '1px solid rgba(255,255,255,0.5)',
                  }}
                >
                  <div className="text-xl mb-2">{display.emoji}</div>
                  <div className="text-sm font-semibold mb-1" style={{ color: '#6b5d52' }}>
                    {display.name}
                  </div>
                  <div className="text-xs" style={{ color: '#b5a599' }}>
                    {isRunning ? (
                      <span className="flex items-center gap-1">
                        <RefreshCw size={10} className="animate-spin" /> Running...
                      </span>
                    ) : progress.target > 0 ? (
                      `${progress.current}/${progress.target}`
                    ) : (
                      'Tap to run'
                    )}
                  </div>
                  
                  {/* Mini progress bar */}
                  {progress.target > 0 && (
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(200,180,170,0.2)' }}>
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${Math.min((progress.current / progress.target) * 100, 100)}%`,
                          background: isComplete ? '#7eb89a' : isBehind ? '#d4a574' : '#c4a0a0',
                        }}
                      />
                    </div>
                  )}
                </motion.button>
              );
            })}
            
            {/* Refresh All Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => refetchDashboard()}
              className="rounded-2xl p-4 text-center transition-all active:scale-95 hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.4)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                border: '1px dashed rgba(200,180,170,0.3)',
              }}
            >
              <RefreshCw size={20} style={{ color: '#c4a0a0', margin: '0 auto 8px' }} />
              <div className="text-xs font-medium" style={{ color: '#b5a599' }}>Refresh</div>
            </motion.button>
          </div>

          {/* Pending Actions */}
          <div>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#8b7d72' }}>
              {actions.length > 0 ? 'Ready for review' : 'No pending actions'}
            </h2>

            {actions.length === 0 ? (
              <div 
                className="rounded-2xl p-8 text-center"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                }}
              >
                <div className="text-3xl mb-3">✨</div>
                <p className="text-sm" style={{ color: '#b5a599' }}>
                  Tap an agent above to generate growth actions
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {actions.slice(0, 5).map((action, idx) => {
                  const display = agentDisplay[action.agent] || { name: action.agent, emoji: '📋' };
                  const isHigh = action.priority === 'high';
                  
                  return (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * idx }}
                      onClick={() => setSelectedAction(action)}
                      className="rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98] hover:scale-[1.01]"
                      style={{
                        background: 'rgba(255,255,255,0.7)',
                        boxShadow: '0 4px 12px -4px rgba(180,150,140,0.1), inset 0 1px 1px rgba(255,255,255,1)',
                        borderLeft: isHigh ? '3px solid #d4a574' : '3px solid transparent',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-lg">{display.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: '#6b5d52' }}>
                            {action.title}
                          </div>
                          <div className="text-xs truncate" style={{ color: '#b5a599' }}>
                            {action.summary || action.target_name}
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color: '#d4c4ba' }} />
                      </div>
                    </motion.div>
                  );
                })}
                
                {actions.length > 5 && (
                  <p className="text-xs text-center pt-2" style={{ color: '#b5a599' }}>
                    +{actions.length - 5} more actions
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Action Detail Sheet */}
      <AnimatePresence>
        {selectedAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(180,170,160,0.3)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSelectedAction(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-[32px] overflow-hidden max-h-[85vh] overflow-y-auto"
              style={{
                background: 'linear-gradient(165deg, rgba(255,253,252,0.98) 0%, rgba(253,248,246,0.95) 100%)',
                boxShadow: '0 -10px 40px rgba(160,140,130,0.2)',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(200,180,170,0.3)' }} />
              </div>

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-2xl">{agentDisplay[selectedAction.agent]?.emoji || '📋'}</div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold" style={{ color: '#6b5d52' }}>
                      {selectedAction.title}
                    </div>
                    {selectedAction.target_name && (
                      <div className="text-sm" style={{ color: '#b5a599' }}>{selectedAction.target_name}</div>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {selectedAction.summary && (
                  <div 
                    className="rounded-xl p-4 mb-4"
                    style={{ background: 'rgba(200,180,170,0.08)' }}
                  >
                    <p className="text-sm leading-relaxed" style={{ color: '#7a6d62' }}>
                      {selectedAction.summary}
                    </p>
                  </div>
                )}

                {/* Draft Content */}
                {selectedAction.content && (
                  <div className="mb-6">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#b5a599' }}>
                      {selectedAction.action_type === 'email' ? 'Email Draft' : 'Message'}
                    </div>
                    {selectedAction.subject && (
                      <div className="text-sm font-medium mb-2" style={{ color: '#6b5d52' }}>
                        Subject: {selectedAction.subject}
                      </div>
                    )}
                    <div 
                      className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                      style={{ 
                        background: 'rgba(255,255,255,0.7)',
                        color: '#5a4f47',
                        border: '1px solid rgba(200,180,170,0.15)',
                      }}
                    >
                      {selectedAction.content}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedAction)}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(145deg, rgba(126,184,154,0.9) 0%, rgba(110,168,140,0.85) 100%)',
                      color: '#fff',
                      boxShadow: '0 8px 24px -8px rgba(126,184,154,0.4)',
                    }}
                  >
                    <Check size={18} /> Approve
                  </button>
                  <button
                    onClick={() => handleSkip(selectedAction)}
                    className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-medium transition-all active:scale-[0.98]"
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      color: '#a8998e',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                    }}
                  >
                    <X size={18} /> Skip
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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