import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AGENT_COLORS = {
  connector: '#7eb89a', attender: '#d4a574', accessor: '#a48bc4', offerer: '#e08080',
  converter: '#c9a99c', retainer: '#9a8aad', referrer: '#6aadad',
};

const etchedText = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

export default function ActionQueueCard({ action, index, isExpanded, isProcessing, onToggle, onApprove, onDismiss, onContentChange }) {
  const [editedContent, setEditedContent] = useState(action.content || '');
  const color = AGENT_COLORS[action.agent] || '#c9a99c';

  useEffect(() => {
    setEditedContent(action.content || '');
  }, [action.content]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -80 }}
      transition={{ delay: index * 0.02 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: isExpanded ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.5)',
        boxShadow: isExpanded
          ? 'inset 0 1px 1px rgba(255,255,255,0.7), 0 12px 40px -12px rgba(180,150,140,0.15)'
          : 'inset 0 1px 1px rgba(255,255,255,0.7), 0 2px 12px -6px rgba(180,150,140,0.08)',
      }}
    >
      {/* Summary row */}
      <div onClick={onToggle} role="button" tabIndex={0} className="w-full text-left p-4 flex items-center gap-3 cursor-pointer">
        {/* Color dot */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color, boxShadow: `0 0 6px ${color}40` }}
        />

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: '#8b7d72' }}>
            {action.title}
          </div>
          {action.target_name && (
            <div className="text-xs mt-0.5 truncate" style={{ color: '#b5a599' }}>
              {action.target_name}
            </div>
          )}
        </div>

        {/* Inline actions when collapsed */}
        {!isExpanded && (
          <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={onDismiss} disabled={isProcessing} className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all active:scale-95" style={{ color: '#c4b5ab' }}>
              skip
            </button>
            <button onClick={onApprove} disabled={isProcessing}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,252,250,0.8))',
                boxShadow: '0 2px 8px -2px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                color: '#8b7d72',
              }}
            >
              approve
            </button>
          </div>
        )}

        <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="#d4c4ba" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

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
              <div className="h-px mb-4" style={{ background: 'rgba(200,180,170,0.15)' }} />

              {action.summary && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#a8998e' }}>{action.summary}</p>
              )}

              {action.subject && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#c4b5ab' }}>Subject</div>
                  <div className="text-sm font-medium" style={{ color: '#8b7d72' }}>{action.subject}</div>
                </div>
              )}

              {action.content && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#c4b5ab' }}>Draft</div>
                  <textarea
                    value={editedContent}
                    onChange={(e) => { setEditedContent(e.target.value); onContentChange?.(e.target.value); }}
                    className="w-full rounded-xl p-4 text-sm leading-relaxed max-h-[300px] overflow-y-auto resize-none outline-none border-none"
                    style={{ background: 'rgba(254,250,249,0.8)', boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.06)', color: '#8b7d72' }}
                    rows={Math.min(12, (editedContent || '').split('\n').length + 2)}
                  />
                </div>
              )}

              {action.context?.partner_website && (
                <a href={action.context.partner_website} target="_blank" rel="noopener noreferrer"
                  className="inline-block text-xs font-medium mb-4"
                  style={{ color: '#c9a99c', textDecoration: 'underline', textUnderlineOffset: '3px' }}
                >
                  view website →
                </a>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={onDismiss} disabled={isProcessing}
                  className="flex-1 h-12 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.6)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.08)', color: '#a8998e' }}
                >
                  Not now
                </button>
                <button onClick={onApprove} disabled={isProcessing}
                  className="flex-1 h-12 rounded-xl text-sm font-bold tracking-tight transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(145deg, rgba(254,247,247,0.95), rgba(252,231,231,0.9), rgba(248,225,220,0.85))',
                    boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), inset 0 1px 2px rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255,220,210,0.5)',
                  }}
                >
                  <span style={etchedText}>{isProcessing ? 'Processing...' : 'Approve & send'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}