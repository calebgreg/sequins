import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown, ChevronUp, ExternalLink, Mail, MessageSquare, Phone, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const AGENT_COLORS = {
  connector: '#7eb89a', attender: '#d4a574', accessor: '#a48bc4', offerer: '#e08080',
  converter: '#c9a99c', retainer: '#9a8aad', referrer: '#6aadad',
};

const AGENT_EMOJI = {
  connector: '🤝', attender: '🎪', accessor: '🚪', offerer: '🎁',
  converter: '✨', retainer: '💜', referrer: '📣',
};

export default function ActionQueue({ actions, studioId }) {
  const [expandedId, setExpandedId] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const queryClient = useQueryClient();

  const pending = actions
    .filter(a => a.status === 'pending_review')
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });

  if (pending.length === 0) return null;

  const handleApprove = async (action) => {
    setProcessingId(action.id);
    await base44.entities.GrowthAction.update(action.id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
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

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-lg font-bold" style={{ color: '#5A4A46' }}>
          {pending.length} thing{pending.length !== 1 ? 's' : ''} waiting on you
        </h2>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {pending.map((action, i) => (
            <ActionCard
              key={action.id}
              action={action}
              index={i}
              isExpanded={expandedId === action.id}
              isProcessing={processingId === action.id}
              onToggle={() => setExpandedId(expandedId === action.id ? null : action.id)}
              onApprove={() => handleApprove(action)}
              onDismiss={() => handleDismiss(action)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ActionCard({ action, index, isExpanded, isProcessing, onToggle, onApprove, onDismiss }) {
  const color = AGENT_COLORS[action.agent] || '#c9a99c';
  const emoji = AGENT_EMOJI[action.agent] || '🤝';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.7)',
        boxShadow: isExpanded
          ? `inset 0 0 0 1.5px ${color}30, 0 8px 32px -8px rgba(180,140,135,0.12)`
          : 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 12px rgba(180,150,140,0.06)',
      }}
    >
      {/* Summary row — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 md:p-5 flex items-start gap-4"
        disabled={isProcessing}
      >
        {/* Agent indicator */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}12` }}
        >
          <span className="text-base">{emoji}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: '#5A4A46' }}>
            {action.title}
          </div>
          {action.target_name && (
            <div className="text-xs mt-0.5" style={{ color: '#b5a599' }}>
              → {action.target_name}
            </div>
          )}
          {action.summary && !isExpanded && (
            <div className="text-xs mt-1.5 line-clamp-1" style={{ color: '#a8998e' }}>
              {action.summary}
            </div>
          )}
        </div>

        {/* Quick action buttons — visible without expanding */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {!isExpanded && (
            <>
              <button
                onClick={onDismiss}
                disabled={isProcessing}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-50 active:scale-90"
                style={{ color: '#d4c4ba' }}
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={onApprove}
                disabled={isProcessing}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                style={{ background: `${color}15`, color }}
                title="Approve"
              >
                <Check className="w-4 h-4" />
              </button>
            </>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            style={{ color: '#d4c4ba' }}
          />
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0">
              {/* Divider */}
              <div className="h-px mb-4" style={{ background: `${color}15` }} />

              {/* Why this matters */}
              {action.summary && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color }}>
                    Why
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#6A5A56' }}>
                    {action.summary}
                  </p>
                </div>
              )}

              {/* Subject */}
              {action.subject && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#c4b5ab' }}>
                    Subject
                  </div>
                  <div className="text-sm font-medium" style={{ color: '#5A4A46' }}>
                    {action.subject}
                  </div>
                </div>
              )}

              {/* Message content */}
              {action.content && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#c4b5ab' }}>
                    Draft
                  </div>
                  <div
                    className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto"
                    style={{ background: 'rgba(250,248,246,0.8)', color: '#5A4A46' }}
                  >
                    {action.content}
                  </div>
                </div>
              )}

              {/* Website link */}
              {action.context?.partner_website && (
                <a
                  href={action.context.partner_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium mb-4 hover:underline"
                  style={{ color }}
                >
                  <ExternalLink className="w-3 h-3" />
                  View website
                </a>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onDismiss}
                  disabled={isProcessing}
                  className="flex-1 h-11 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: 'rgba(240,235,233,0.6)',
                    color: '#a8998e',
                  }}
                >
                  Not now
                </button>
                <button
                  onClick={onApprove}
                  disabled={isProcessing}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: `linear-gradient(145deg, ${color} 0%, ${color}dd 100%)`,
                    color: '#fff',
                    boxShadow: `0 4px 16px -4px ${color}60`,
                  }}
                >
                  {isProcessing ? 'Processing...' : 'Approve & send'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}