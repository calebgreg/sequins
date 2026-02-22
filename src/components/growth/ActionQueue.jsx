import React, { useState, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ActionQueueCard from './ActionQueueCard';

const etchedText = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

const CATEGORY_CONFIG = {
  retention: { label: 'Retention', letter: 'R', desc: 'Keep families engaged' },
  outreach: { label: 'Outreach', letter: 'O', desc: 'Build new relationships' },
  follow_up: { label: 'Follow Up', letter: 'F', desc: 'Continue conversations' },
  other: { label: 'Actions', letter: 'A', desc: 'Ready for your review' },
};

function categorizeAction(action) {
  const title = (action.title || '').toLowerCase();
  const agent = action.agent || '';
  if (agent === 'retainer' || title.includes('check in') || title.includes('celebrate') || title.includes('at risk'))
    return 'retention';
  if (agent === 'connector' || agent === 'accessor' || title.includes('reach out'))
    return 'outreach';
  if (agent === 'converter' || agent === 'offerer' || title.includes('follow'))
    return 'follow_up';
  return 'other';
}

export default function ActionQueue({ actions, studioId }) {
  const [expandedId, setExpandedId] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const queryClient = useQueryClient();
  const editedContentRef = useRef({});

  const pending = useMemo(() =>
    actions
      .filter(a => a.status === 'pending_review')
      .sort((a, b) => {
        const po = { high: 0, medium: 1, low: 2 };
        return (po[a.priority] || 1) - (po[b.priority] || 1);
      }),
    [actions]
  );

  const grouped = useMemo(() => {
    const groups = {};
    pending.forEach(a => {
      const cat = categorizeAction(a);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(a);
    });
    return groups;
  }, [pending]);

  const categoryOrder = ['retention', 'outreach', 'follow_up', 'other'];
  const visibleCategories = categoryOrder.filter(c => grouped[c]?.length > 0);

  if (pending.length === 0) return null;

  const handleApprove = async (action) => {
    setProcessingId(action.id);
    const updateData = {
      status: 'approved',
      approved_at: new Date().toISOString(),
    };
    if (editedContentRef.current[action.id] !== undefined) {
      updateData.content = editedContentRef.current[action.id];
    }
    await base44.entities.GrowthAction.update(action.id, updateData);
    queryClient.invalidateQueries(['growthActions']);
    toast.success(`Approved: ${action.title}`);
    setProcessingId(null);
    if (expandedId === action.id) setExpandedId(null);
  };

  const handleDismiss = async (action) => {
    setProcessingId(action.id);
    await base44.entities.GrowthAction.update(action.id, { status: 'dismissed' });
    queryClient.invalidateQueries(['growthActions']);
    toast('Dismissed');
    setProcessingId(null);
    if (expandedId === action.id) setExpandedId(null);
  };

  const handleApproveAll = async (category) => {
    const items = grouped[category] || [];
    for (const action of items) {
      await base44.entities.GrowthAction.update(action.id, {
        status: 'approved',
        approved_at: new Date().toISOString(),
      });
    }
    queryClient.invalidateQueries(['growthActions']);
    toast.success(`Approved all ${items.length} ${CATEGORY_CONFIG[category]?.label || ''} actions`);
  };

  // If a category is selected, show that category's items
  const displayItems = activeCategory ? (grouped[activeCategory] || []) : null;

  return (
    <div>
      {/* Header */}
      <h2 className="text-lg font-bold mb-2" style={etchedText}>
        {pending.length} thing{pending.length !== 1 ? 's' : ''} waiting on you
      </h2>

      {/* Category pills — horizontal scroll on mobile */}
      {!activeCategory && (
        <div className="flex gap-3 mt-5 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {visibleCategories.map(cat => {
            const config = CATEGORY_CONFIG[cat];
            const items = grouped[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="flex-shrink-0 rounded-2xl p-4 md:p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] min-w-[160px] flex-1"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.88) 0%, rgba(255,252,250,0.82) 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 8px 32px -12px rgba(180,150,140,0.15)',
                  border: '1px solid rgba(255,240,235,0.4)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-sm font-bold w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,252,250,0.85))',
                      boxShadow: '0 2px 6px -2px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)',
                      color: '#8a7070',
                    }}
                  >{config.letter}</span>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,252,250,0.85))',
                      boxShadow: '0 2px 6px -2px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)',
                      color: '#8a7070',
                    }}
                  >
                    {items.length}
                  </span>
                </div>
                <div className="text-sm font-bold" style={{ color: '#8b7d72' }}>
                  {config.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#b5a599' }}>
                  {config.desc}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Category detail view */}
      <AnimatePresence mode="wait">
        {activeCategory && displayItems && (
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="mt-4"
          >
            {/* Category header bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setActiveCategory(null); setExpandedId(null); }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.7)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 6px rgba(180,150,140,0.1)',
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="#b5a599" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-base font-bold" style={{ color: '#8b7d72' }}>
                  {CATEGORY_CONFIG[activeCategory]?.emoji} {CATEGORY_CONFIG[activeCategory]?.label}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(200,180,170,0.12)', color: '#b5a599' }}>
                  {displayItems.length}
                </span>
              </div>
              {displayItems.length > 1 && (
                <button
                  onClick={() => handleApproveAll(activeCategory)}
                  className="text-xs font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
                    boxShadow: '0 2px 8px -2px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                    color: '#8a7070',
                  }}
                >
                  Approve all
                </button>
              )}
            </div>

            {/* Action cards */}
            <div className="space-y-2">
              <AnimatePresence>
                {displayItems.map((action, i) => (
                  <ActionQueueCard
                    key={action.id}
                    action={action}
                    index={i}
                    isExpanded={expandedId === action.id}
                    isProcessing={processingId === action.id}
                    onToggle={() => setExpandedId(expandedId === action.id ? null : action.id)}
                    onApprove={() => handleApprove(action)}
                    onDismiss={() => handleDismiss(action)}
                    onContentChange={(val) => { editedContentRef.current[action.id] = val; }}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}