import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AnimatePresence } from 'framer-motion';
import AdminOnly from '@/components/layout/AdminOnly';
import GrowthChat from '@/components/growth/GrowthChat';
import GrowthActionCard, { CATEGORY_COLORS } from '@/components/growth/GrowthActionCard';
import GrowthOverlay from '@/components/growth/GrowthOverlay';
import GrowthPipeline from '@/components/growth/GrowthPipeline';

function categorizeAction(action) {
  const title = (action.title || '').toLowerCase();
  const agent = action.agent || '';
  // Check title-based categories FIRST (before agent), so "Celebrate X's win!" from retainer agent lands in Celebrate
  if (title.includes('celebrate') || title.includes('win') || title.includes('congrat'))
    return 'Celebrate';
  if (agent === 'retainer' || title.includes('check in') || title.includes('at risk') || title.includes('at-risk'))
    return 'Retain';
  if (agent === 'converter' || agent === 'offerer' || title.includes('follow') || title.includes('trial'))
    return 'Convert';
  if (agent === 'connector' || agent === 'accessor' || title.includes('reach out'))
    return 'Connect';
  return 'Other';
}

function GrowthContent() {
  const [view, setView] = useState('actions'); // 'actions' | 'pipeline' | 'chat' | 'connector-auto'
  const [activeCategory, setActiveCategory] = useState(null);
  const [overlayItem, setOverlayItem] = useState(null);
  const [overlayType, setOverlayType] = useState(null);
  const [overlayCategory, setOverlayCategory] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [autoLaunched, setAutoLaunched] = useState(false);
  const containerRef = useRef(null);

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

  const pending = useMemo(() =>
    actions.filter(a => a.status === 'pending_review')
      .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] || 1) - ({ high: 0, medium: 1, low: 2 }[b.priority] || 1)),
    [actions]
  );

  const grouped = useMemo(() => {
    const g = {};
    pending.forEach(a => {
      const cat = categorizeAction(a);
      if (!g[cat]) g[cat] = [];
      g[cat].push(a);
    });
    return g;
  }, [pending]);

  const categories = useMemo(() => Object.entries(grouped).sort((a, b) => b[1].length - a[1].length), [grouped]);
  const filteredActions = activeCategory ? (grouped[activeCategory] || []) : [];
  const totalPipeline = partners.length + accessGroups.length + leads.length;
  const actionableCount = pending.length;

  // Parallax
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setMousePos({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const px = (mousePos.x - 0.5) * 15;
  const py = (mousePos.y - 0.5) * 8;

  const currentGlow = activeCategory
    ? (CATEGORY_COLORS[activeCategory] || CATEGORY_COLORS.Other).glow
    : 'rgba(180,160,170,0.3)';

  const openActionOverlay = (action, category) => {
    setOverlayItem(action);
    setOverlayType('action');
    setOverlayCategory(category);
  };

  const openPipelineOverlay = (item) => {
    setOverlayItem(item.raw || item);
    setOverlayType('pipeline');
    setOverlayCategory(null);
  };

  const closeOverlay = () => {
    setOverlayItem(null);
    setOverlayType(null);
    setOverlayCategory(null);
  };

  // Chat views
  if (view === 'chat' || view === 'connector-auto') {
    const chatAgent = view === 'connector-auto' ? 'connector' : 'growth_orchestrator';
    const chatLabel = view === 'connector-auto' ? 'Connector' : 'Growth Engine';
    const autoMsg = view === 'connector-auto'
      ? "Find circles of influence near my studio. Search for daycares, pediatricians, youth sports, schools, and any other places where parents of kids aged 3-12 already gather and trust someone. For each one, identify the person at the center, figure out a genuine angle to connect, and draft a first message I can approve."
      : null;
    return (
      <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ background: '#1a1418' }}>
          <button onClick={() => setView('actions')} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,250,248,0.06)' }}>
            <svg className="w-4 h-4" fill="none" stroke="rgba(255,235,230,0.4)" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span style={{ color: 'rgba(255,245,240,0.7)', fontSize: 14, fontWeight: 600 }}>{chatLabel}</span>
        </div>
        <div className="flex-1 min-h-0" style={{ background: '#0d0a0c' }}>
          <GrowthChat agentName={chatAgent} studioId={studioId} autoPrompt={autoMsg} />
        </div>
      </div>
    );
  }

  // Empty state
  if (actionableCount === 0 && totalPipeline === 0 && !autoLaunched) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(165deg, #1a1418 0%, #0d0a0c 100%)', fontFamily: "'DM Sans', -apple-system, sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: 'rgba(255,235,230,0.4)', fontWeight: 300, marginBottom: 24 }}>No moves yet</div>
        <button onClick={() => { setAutoLaunched(true); setView('connector-auto'); }}
          style={{ padding: '14px 28px', background: 'rgba(255,250,248,0.06)', border: '1px solid rgba(255,250,248,0.08)', borderRadius: 16, color: 'rgba(255,245,240,0.7)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          Start the Growth Engine
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ minHeight: '100vh', background: 'linear-gradient(165deg, #1a1418 0%, #0d0a0c 100%)', fontFamily: "'DM Sans', -apple-system, sans-serif", overflow: 'hidden', position: 'relative' }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '35%', left: '50%', width: 1000, height: 700,
        background: `radial-gradient(ellipse, ${currentGlow} 0%, transparent 70%)`,
        transform: `translate(-50%, -50%) translate(${px * 2}px, ${py * 2}px)`,
        opacity: 0.2, transition: 'background 0.5s ease', pointerEvents: 'none',
      }} />

      {/* Overlay */}
      {overlayItem && (
        <GrowthOverlay item={overlayItem} type={overlayType} category={overlayCategory} onClose={closeOverlay} />
      )}

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ padding: '40px 48px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} className="flex-col md:flex-row gap-4">
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,235,230,0.25)', marginBottom: 8 }}>Growth Engine</div>
            <div style={{ fontSize: 48, fontWeight: 200, color: 'rgba(255,240,235,0.12)', letterSpacing: -2 }}>
              {actionableCount}
              <span style={{ fontSize: 20, marginLeft: 12, color: 'rgba(255,240,235,0.08)' }}>need you</span>
            </div>
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,250,248,0.03)', borderRadius: 14 }}>
            {['actions', 'pipeline'].map(v => (
              <button key={v} onClick={() => { setView(v); setActiveCategory(null); }}
                style={{
                  padding: '10px 20px', background: view === v ? 'rgba(255,250,248,0.08)' : 'transparent',
                  border: 'none', borderRadius: 10,
                  color: view === v ? 'rgba(255,245,240,0.9)' : 'rgba(255,240,235,0.4)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
                }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* ACTIONS VIEW */}
        {view === 'actions' && (
          <div style={{ display: 'flex', padding: '0 48px 48px', gap: 48 }} className="flex-col md:flex-row">
            {/* Desktop sidebar */}
            <div style={{ width: 220, flexShrink: 0 }} className="hidden md:block">
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,235,230,0.2)', marginBottom: 16 }}>Categories</div>
              {categories.map(([cat, items]) => {
                const c = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
                const isActive = activeCategory === cat;
                return (
                  <div key={cat} onClick={() => setActiveCategory(isActive ? null : cat)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', marginBottom: 6, cursor: 'pointer',
                      background: isActive ? 'rgba(255,250,248,0.07)' : 'rgba(255,250,248,0.02)',
                      borderRadius: 14, transition: 'all 0.25s ease',
                    }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.accent, boxShadow: isActive ? `0 0 16px ${c.glow}` : 'none' }} />
                    <span style={{ fontSize: 14, color: isActive ? 'rgba(255,245,240,0.9)' : 'rgba(255,240,235,0.5)', flex: 1 }}>{cat}</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: isActive ? c.text : 'rgba(255,240,235,0.35)' }}>{items.length}</span>
                  </div>
                );
              })}
            </div>

            {/* Mobile pills */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-2 -mx-2 px-2" style={{ scrollbarWidth: 'none' }}>
              {categories.map(([cat, items]) => {
                const c = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
                const isActive = activeCategory === cat;
                return (
                  <button key={cat} onClick={() => setActiveCategory(isActive ? null : cat)}
                    style={{
                      flexShrink: 0, padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: 'pointer',
                      background: isActive ? 'rgba(255,250,248,0.08)' : 'rgba(255,250,248,0.03)',
                      border: `1px solid ${isActive ? c.accent + '44' : 'rgba(255,250,248,0.06)'}`,
                      color: isActive ? 'rgba(255,245,240,0.9)' : 'rgba(255,240,235,0.5)',
                    }}>
                    {cat} ({items.length})
                  </button>
                );
              })}
            </div>

            {/* Cards */}
            <div style={{ flex: 1 }}>
              {!activeCategory ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'rgba(255,235,230,0.25)' }}>
                  <div className="hidden md:block" style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>&#8592;</div>
                  <span className="hidden md:inline">Select a category</span>
                  <span className="md:hidden">Tap a category above</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredActions.map(action => (
                    <GrowthActionCard
                      key={action.id}
                      action={action}
                      category={activeCategory}
                      onClick={() => openActionOverlay(action, activeCategory)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PIPELINE VIEW */}
        {view === 'pipeline' && (
          <GrowthPipeline
            partners={partners}
            accessGroups={accessGroups}
            leads={leads}
            onItemClick={openPipelineOverlay}
          />
        )}
      </div>

      {/* Bottom chat bar */}
      <div style={{ position: 'sticky', bottom: 0, padding: '16px 48px 24px', zIndex: 30 }}>
        <button onClick={() => setView('chat')} style={{
          width: '100%', maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px',
          background: 'rgba(255,250,248,0.04)', backdropFilter: 'blur(20px)', borderRadius: 20,
          border: '1px solid rgba(255,250,248,0.06)', cursor: 'pointer',
        }}>
          <span style={{ fontSize: 14, color: 'rgba(255,235,230,0.3)' }}>Tell the Growth Engine what to do...</span>
        </button>
      </div>

      {/* Hints */}
      <div className="hidden md:flex" style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        padding: '10px 20px', background: 'rgba(255,250,248,0.03)', backdropFilter: 'blur(16px)',
        borderRadius: 12, fontSize: 11, color: 'rgba(255,235,230,0.25)',
      }}>
        Click any card to expand · ESC to close
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