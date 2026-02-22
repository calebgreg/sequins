import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import AdminOnly from '@/components/layout/AdminOnly';
import GrowthChat from '@/components/growth/GrowthChat';
import OpportunityFeed from '@/components/growth/OpportunityFeed';
import GrowthExpandedCard from '@/components/growth/GrowthExpandedCard';

const CATEGORY_CONFIG = {
  Celebrate: { color: '#C898A8', glow: 'rgba(180,120,140,0.5)', bg: 'rgba(180,120,140,0.12)' },
  Retain:    { color: '#C8A898', glow: 'rgba(180,140,120,0.5)', bg: 'rgba(180,140,120,0.12)' },
  Convert:   { color: '#98C8A8', glow: 'rgba(120,160,140,0.5)', bg: 'rgba(120,160,140,0.12)' },
  Connect:   { color: '#A898C8', glow: 'rgba(140,120,180,0.5)', bg: 'rgba(140,120,180,0.12)' },
  Other:     { color: '#B8A8C0', glow: 'rgba(160,140,170,0.5)', bg: 'rgba(160,140,170,0.12)' },
};

function categorizeAction(action) {
  const title = (action.title || '').toLowerCase();
  const agent = action.agent || '';
  if (agent === 'retainer' || title.includes('check in') || title.includes('at risk') || title.includes('at-risk'))
    return 'Retain';
  if (title.includes('celebrate') || title.includes('win') || title.includes('congrat'))
    return 'Celebrate';
  if (agent === 'converter' || agent === 'offerer' || title.includes('follow') || title.includes('trial'))
    return 'Convert';
  if (agent === 'connector' || agent === 'accessor' || title.includes('reach out'))
    return 'Connect';
  return 'Other';
}

function GrowthContent() {
  const [view, setView] = useState('main');
  const [activeCategory, setActiveCategory] = useState(null);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [autoLaunched, setAutoLaunched] = useState(false);
  const containerRef = useRef(null);
  const queryClient = useQueryClient();

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

  const pending = actions.filter(a => a.status === 'pending_review')
    .sort((a, b) => {
      const po = { high: 0, medium: 1, low: 2 };
      return (po[a.priority] || 1) - (po[b.priority] || 1);
    });

  const grouped = {};
  pending.forEach(a => {
    const cat = categorizeAction(a);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  });

  const categories = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
  const filteredActions = activeCategory ? (grouped[activeCategory] || []) : [];
  const totalOpportunities = partners.length + accessGroups.length + leads.length;

  // Mouse tracking for parallax
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setMousePos({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // Auto-expand single card
  useEffect(() => {
    if (filteredActions.length === 1) setExpandedCardId(filteredActions[0].id);
    else setExpandedCardId(null);
  }, [activeCategory, filteredActions.length]);

  const handleApprove = async (action, editedContent) => {
    const updateData = { status: 'approved', approved_at: new Date().toISOString() };
    if (editedContent !== undefined) updateData.content = editedContent;
    await base44.entities.GrowthAction.update(action.id, updateData);
    queryClient.invalidateQueries(['growthActions']);
    toast.success(`Sent`);
    setExpandedCardId(null);
    // If category empty after removal, go back
    const remaining = filteredActions.filter(a => a.id !== action.id);
    if (remaining.length === 0) setActiveCategory(null);
    else if (remaining.length === 1) setExpandedCardId(remaining[0].id);
  };

  const handleDismiss = async (action) => {
    await base44.entities.GrowthAction.update(action.id, { status: 'dismissed' });
    queryClient.invalidateQueries(['growthActions']);
    toast('Skipped');
    setExpandedCardId(null);
    const remaining = filteredActions.filter(a => a.id !== action.id);
    if (remaining.length === 0) setActiveCategory(null);
    else if (remaining.length === 1) setExpandedCardId(remaining[0].id);
  };

  const px = (mousePos.x - 0.5) * 20;
  const py = (mousePos.y - 0.5) * 10;
  const currentColors = activeCategory
    ? CATEGORY_CONFIG[activeCategory] || CATEGORY_CONFIG.Other
    : { glow: 'rgba(180,160,170,0.3)' };

  // Chat view
  if (view === 'chat' || view === 'connector-auto') {
    const chatAgent = view === 'connector-auto' ? 'connector' : 'growth_orchestrator';
    const chatLabel = view === 'connector-auto' ? 'Connector' : 'Growth Engine';
    const autoMsg = view === 'connector-auto'
      ? "Find circles of influence near my studio. Search for daycares, pediatricians, youth sports, schools, and any other places where parents of kids aged 3-12 already gather and trust someone. For each one, identify the person at the center, figure out a genuine angle to connect, and draft a first message I can approve."
      : null;
    return (
      <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ background: '#1a1418' }}>
          <button onClick={() => setView('main')}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'rgba(255,250,248,0.06)' }}>
            <svg className="w-4 h-4" fill="none" stroke="rgba(255,235,230,0.4)" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span style={{ color: 'rgba(255,245,240,0.7)', fontSize: 14, fontWeight: 600 }}>{chatLabel}</span>
        </div>
        <div className="flex-1 min-h-0" style={{ background: '#0d0a0c' }}>
          <GrowthChat agentName={chatAgent} studioId={studioId} autoPrompt={autoMsg} />
        </div>
      </div>
    );
  }

  // Opportunities sub-view
  if (view === 'opportunities') {
    return (
      <div className="h-full overflow-y-auto" style={{ background: 'linear-gradient(165deg, #1a1418 0%, #0d0a0c 100%)', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        <div className="p-6 md:p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('main')}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{ background: 'rgba(255,250,248,0.06)' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="rgba(255,235,230,0.4)" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span style={{ color: 'rgba(255,245,240,0.7)', fontSize: 16, fontWeight: 600 }}>What your agents found</span>
          </div>
          <OpportunityFeed partners={partners} accessGroups={accessGroups} leads={leads} actions={actions} agentLogs={agentLogs} />
        </div>
      </div>
    );
  }

  // Empty state — auto launch connector
  if (pending.length === 0 && totalOpportunities === 0 && !autoLaunched) {
    return (
      <div ref={containerRef} style={{ minHeight: '100vh', background: 'linear-gradient(165deg, #1a1418 0%, #0d0a0c 100%)', fontFamily: "'DM Sans', -apple-system, sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: 'rgba(255,235,230,0.4)', fontWeight: 300, marginBottom: 24 }}>No moves yet</div>
        <button
          onClick={() => { setAutoLaunched(true); setView('connector-auto'); }}
          style={{ padding: '14px 28px', background: 'rgba(255,250,248,0.06)', border: '1px solid rgba(255,250,248,0.08)', borderRadius: 16, color: 'rgba(255,245,240,0.7)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          Start the Growth Engine
        </button>
      </div>
    );
  }

  // Main dark UI
  return (
    <div ref={containerRef} style={{ minHeight: '100vh', background: 'linear-gradient(165deg, #1a1418 0%, #0d0a0c 100%)', fontFamily: "'DM Sans', -apple-system, sans-serif", overflow: 'hidden', position: 'relative' }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%', width: 1000, height: 800,
        background: `radial-gradient(ellipse, ${currentColors.glow} 0%, transparent 70%)`,
        transform: `translate(-50%, -50%) translate(${px * 2}px, ${py * 2}px)`,
        opacity: 0.15, transition: 'background 0.6s ease', pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ padding: '48px 48px 0', transform: `translate(${px * 0.15}px, ${py * 0.15}px)` }}>
        <div style={{ fontSize: 56, fontWeight: 200, color: 'rgba(255,240,235,0.12)', letterSpacing: -2, marginBottom: 8 }}>
          {pending.length}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,235,230,0.3)' }}>
          moves ready
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', padding: '32px 48px 120px', gap: 48 }} className="flex-col md:flex-row">
        {/* Category sidebar */}
        <div style={{ width: 240, flexShrink: 0, transform: `translate(${px * 0.1}px, ${py * 0.1}px)` }} className="hidden md:block">
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,235,230,0.25)', marginBottom: 20, paddingLeft: 4 }}>
            Categories
          </div>
          {categories.map(([cat, items]) => {
            const c = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.Other;
            const isActive = activeCategory === cat;
            return (
              <div key={cat} onClick={() => { setActiveCategory(isActive ? null : cat); setExpandedCardId(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', marginBottom: 8, cursor: 'pointer',
                  background: isActive ? 'rgba(255,250,248,0.08)' : 'rgba(255,250,248,0.02)',
                  backdropFilter: 'blur(20px)', borderRadius: 16, transition: 'all 0.3s ease',
                  border: `1px solid ${isActive ? c.color + '44' : 'rgba(255,250,248,0.04)'}`,
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.color, boxShadow: isActive ? `0 0 20px ${c.glow}` : 'none', transition: 'box-shadow 0.3s' }} />
                <span style={{ fontSize: 15, color: isActive ? 'rgba(255,245,240,0.9)' : 'rgba(255,240,235,0.5)', fontWeight: isActive ? 600 : 400, flex: 1 }}>{cat}</span>
                <span style={{ fontSize: 18, fontWeight: 600, color: isActive ? c.color : 'rgba(255,240,235,0.4)' }}>{items.length}</span>
              </div>
            );
          })}

          {/* Opportunities link */}
          {totalOpportunities > 0 && (
            <div onClick={() => setView('opportunities')} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', marginTop: 24, cursor: 'pointer',
              background: 'rgba(255,250,248,0.02)', borderRadius: 16, border: '1px solid rgba(255,250,248,0.04)',
            }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,240,235,0.2)' }} />
              <span style={{ fontSize: 14, color: 'rgba(255,240,235,0.4)', flex: 1 }}>Pipeline</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,240,235,0.3)' }}>{totalOpportunities}</span>
            </div>
          )}
        </div>

        {/* Mobile category pills */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-2 -mx-2 px-2" style={{ scrollbarWidth: 'none' }}>
          {categories.map(([cat, items]) => {
            const c = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.Other;
            const isActive = activeCategory === cat;
            return (
              <button key={cat} onClick={() => { setActiveCategory(isActive ? null : cat); setExpandedCardId(null); }}
                style={{
                  flexShrink: 0, padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: 'pointer',
                  background: isActive ? 'rgba(255,250,248,0.08)' : 'rgba(255,250,248,0.03)',
                  border: `1px solid ${isActive ? c.color + '44' : 'rgba(255,250,248,0.06)'}`,
                  color: isActive ? 'rgba(255,245,240,0.9)' : 'rgba(255,240,235,0.5)',
                }}>
                {cat} ({items.length})
              </button>
            );
          })}
        </div>

        {/* Cards area */}
        <div style={{ flex: 1, maxWidth: 800 }}>
          {!activeCategory ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'rgba(255,235,230,0.25)', fontSize: 16, fontWeight: 300 }}>
              <div className="hidden md:block" style={{ marginBottom: 12, fontSize: 28, opacity: 0.4 }}>&#8592;</div>
              <span className="hidden md:inline">Select a category to begin</span>
              <span className="md:hidden">Tap a category above</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <AnimatePresence>
                {filteredActions.map((action) => (
                  <GrowthExpandedCard
                    key={action.id}
                    action={action}
                    category={activeCategory}
                    colors={CATEGORY_CONFIG[activeCategory] || CATEGORY_CONFIG.Other}
                    isExpanded={expandedCardId === action.id}
                    onToggle={() => setExpandedCardId(expandedCardId === action.id ? null : action.id)}
                    onApprove={handleApprove}
                    onDismiss={handleDismiss}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar — open chat */}
      <div style={{ position: 'sticky', bottom: 0, padding: '16px 48px 24px', zIndex: 30 }}>
        <button onClick={() => setView('chat')} style={{
          width: '100%', maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px',
          background: 'rgba(255,250,248,0.04)', backdropFilter: 'blur(20px)', borderRadius: 20,
          border: '1px solid rgba(255,250,248,0.06)', cursor: 'pointer', transition: 'all 0.2s',
        }}>
          <span style={{ fontSize: 14, color: 'rgba(255,235,230,0.3)', fontWeight: 400 }}>Tell the Growth Engine what to do...</span>
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="hidden md:flex" style={{
        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', gap: 24,
        padding: '12px 24px', background: 'rgba(255,250,248,0.03)', backdropFilter: 'blur(16px)',
        borderRadius: 16, border: '1px solid rgba(255,250,248,0.04)',
      }}>
        {[{ key: 'enter', label: 'confirm' }, { key: 'esc', label: 'collapse' }].map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,235,230,0.3)', padding: '4px 8px', background: 'rgba(255,250,248,0.06)', borderRadius: 5 }}>{key}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,235,230,0.2)' }}>{label}</span>
          </div>
        ))}
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