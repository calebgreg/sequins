import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GrowthDashboard from '@/components/growth/GrowthDashboard';
import GrowthChat from '@/components/growth/GrowthChat';
import ActionDetailSheet from '@/components/growth/ActionDetailSheet';
import AdminOnly from '@/components/layout/AdminOnly';
import { X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AGENTS = [
  { name: 'growth_orchestrator', label: 'Growth Engine', emoji: '🧠' },
  { name: 'connector', label: 'Connector', emoji: '🤝' },
  { name: 'attender', label: 'Attender', emoji: '🎪' },
  { name: 'accessor', label: 'Accessor', emoji: '🚪' },
  { name: 'offerer', label: 'Offerer', emoji: '🎁' },
  { name: 'converter', label: 'Converter', emoji: '✨' },
  { name: 'retainer', label: 'Retainer', emoji: '💜' },
  { name: 'referrer', label: 'Referrer', emoji: '📣' },
];

function GrowthContent() {
  const [activeAgent, setActiveAgent] = useState(null); // null = dashboard view
  const [selectedAction, setSelectedAction] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id || currentUser?.data?.studio_id;

  const etchedText = {
    color: 'transparent',
    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
    filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
  };

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{
        background: '#ffffff',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Ambient shapes */}
      <div 
        className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
      />
      <div 
        className="fixed bottom-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <div className="relative px-6 md:px-10 pt-10 pb-2">
        <div className="text-sm font-medium mb-1" style={{ color: '#b5a599' }}>
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight" style={etchedText}>
          Growth Engine
        </h1>
      </div>

      {/* View switcher — Dashboard vs Agent chat */}
      <div className="relative px-6 md:px-10 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setActiveAgent(null)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.97]"
            style={{
              background: activeAgent === null 
                ? 'linear-gradient(145deg, rgba(254,240,240,0.95) 0%, rgba(252,235,235,0.9) 100%)'
                : 'transparent',
              boxShadow: activeAgent === null 
                ? 'inset 0 2px 12px rgba(180, 120, 120, 0.08), 0 2px 8px rgba(180,140,135,0.08)'
                : 'none',
              color: activeAgent === null ? '#6A5A56' : '#b5a599',
            }}
          >
            <span>📊</span>
            <span className="hidden md:inline">Dashboard</span>
          </button>

          <div className="w-px mx-1" style={{ background: 'rgba(220,200,196,0.3)' }} />

          {AGENTS.map(agent => (
            <button
              key={agent.name}
              onClick={() => setActiveAgent(agent.name)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.97]"
              style={{
                background: activeAgent === agent.name 
                  ? 'linear-gradient(145deg, rgba(254,240,240,0.95) 0%, rgba(252,235,235,0.9) 100%)'
                  : 'transparent',
                boxShadow: activeAgent === agent.name 
                  ? 'inset 0 2px 12px rgba(180, 120, 120, 0.08), 0 2px 8px rgba(180,140,135,0.08)'
                  : 'none',
                color: activeAgent === agent.name ? '#6A5A56' : '#b5a599',
              }}
            >
              <span>{agent.emoji}</span>
              <span className="hidden md:inline">{agent.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="relative flex-1 px-6 md:px-10 pb-8">
        <AnimatePresence mode="wait">
          {activeAgent === null ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <GrowthDashboard 
                studioId={studioId} 
                onOpenAgent={(agent) => setActiveAgent(agent)}
                onOpenAction={(action) => setSelectedAction(action)}
              />
            </motion.div>
          ) : (
            <motion.div
              key={activeAgent}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(254,248,248,0.6) 0%, rgba(252,246,244,0.4) 100%)',
                height: 'calc(100vh - 240px)',
              }}
            >
              <GrowthChat 
                key={activeAgent}
                agentName={activeAgent} 
                studioId={studioId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action detail sheet */}
      <ActionDetailSheet 
        action={selectedAction} 
        open={!!selectedAction} 
        onClose={() => setSelectedAction(null)} 
      />
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