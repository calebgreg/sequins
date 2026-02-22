import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function buildContext(action) {
  const parts = [];
  if (action.target_name) parts.push(action.target_name);
  if (action.context?.partner_category) parts.push(action.context.partner_category);
  if (action.context?.circle_size) parts.push(`~${action.context.circle_size} families`);
  return parts.join(' · ') || '';
}

export default function GrowthExpandedCard({ action, category, colors, isExpanded, onToggle, onApprove, onDismiss }) {
  const [editedContent, setEditedContent] = useState(action.content || '');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { setEditedContent(action.content || ''); }, [action.content]);
  useEffect(() => { if (isExpanded && inputRef.current) inputRef.current.focus(); }, [isExpanded]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cmd = inputValue.toLowerCase().trim();
      if (cmd.includes('send') || cmd.includes('looks good') || cmd === 'yes' || cmd === 'go' || cmd === 'approve') {
        onApprove(action, editedContent);
      } else if (cmd.includes('skip') || cmd.includes('not now') || cmd.includes('later') || cmd === 'no') {
        onDismiss(action);
      }
      setInputValue('');
    }
    if (e.key === 'Escape') {
      onToggle();
      setInputValue('');
    }
  };

  const context = buildContext(action);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -80 }}
      style={{
        background: isExpanded ? 'rgba(255,252,250,0.07)' : 'rgba(255,252,250,0.03)',
        backdropFilter: 'blur(40px)',
        borderRadius: isExpanded ? 28 : 20,
        border: `1px solid ${isExpanded ? colors.color + '33' : 'rgba(255,250,248,0.06)'}`,
        overflow: 'hidden', transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
        cursor: isExpanded ? 'default' : 'pointer',
        boxShadow: isExpanded ? `0 40px 80px rgba(0,0,0,0.4), 0 0 60px ${colors.glow}` : '0 10px 30px rgba(0,0,0,0.2)',
        transform: isExpanded ? 'scale(1)' : 'scale(0.98)',
      }}
      onClick={() => !isExpanded && onToggle()}
    >
      {/* Header row */}
      <div style={{ padding: isExpanded ? '32px 36px 24px' : '20px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: isExpanded ? 14 : 10, height: isExpanded ? 14 : 10, borderRadius: '50%',
          background: colors.color, boxShadow: isExpanded ? `0 0 20px ${colors.glow}` : 'none',
          flexShrink: 0, transition: 'all 0.3s',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: isExpanded ? 22 : 16, fontWeight: isExpanded ? 600 : 500, color: 'rgba(255,248,244,0.9)', marginBottom: isExpanded ? 6 : 2, transition: 'all 0.3s' }}>
            {action.title}
          </div>
          <div style={{ fontSize: isExpanded ? 13 : 12, color: 'rgba(255,240,235,0.4)' }}>
            {context}
          </div>
        </div>
        {action.action_type && (
          <div style={{ padding: '6px 14px', background: 'rgba(255,250,248,0.06)', borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,240,235,0.4)' }}>
            {action.action_type}
          </div>
        )}
        {isExpanded && (
          <div onClick={(e) => { e.stopPropagation(); onToggle(); setInputValue(''); }}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,250,248,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, color: 'rgba(255,240,235,0.4)' }}>
            x
          </div>
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 36px 36px' }}>
              {/* Reasoning */}
              {action.summary && (
                <div style={{ fontSize: 14, color: 'rgba(255,238,232,0.4)', marginBottom: 28, lineHeight: 1.65, fontStyle: 'italic', paddingLeft: 16, borderLeft: `2px solid ${colors.color}44` }}>
                  {action.summary}
                </div>
              )}

              {/* Subject line */}
              {action.subject && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,235,230,0.3)', marginBottom: 8 }}>Subject</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,248,244,0.8)' }}>{action.subject}</div>
                </div>
              )}

              {/* Editable draft */}
              {(action.content || editedContent) && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '24px 28px', marginBottom: 24, border: '1px solid rgba(255,250,248,0.08)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,235,230,0.3)', marginBottom: 16 }}>
                    Draft
                  </div>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    style={{ width: '100%', minHeight: 100, fontSize: 15, color: 'rgba(255,248,244,0.9)', lineHeight: 1.7, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                  />
                </div>
              )}

              {/* Link */}
              {action.context?.partner_website && (
                <a href={action.context.partner_website} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', fontSize: 12, fontWeight: 500, color: colors.color, textDecoration: 'underline', textUnderlineOffset: 3, marginBottom: 24 }}>
                  view website
                </a>
              )}

              {/* Command input */}
              <div style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 16,
                border: `1px solid ${inputValue ? colors.color + '44' : 'rgba(255,250,248,0.08)'}`,
                overflow: 'hidden', transition: 'all 0.2s',
                boxShadow: inputValue ? `0 0 30px ${colors.glow}` : 'none',
              }}>
                <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="send / skip / edit above..."
                  style={{ width: '100%', padding: '20px 24px', fontSize: 15, color: 'rgba(255,248,244,0.9)', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {/* Button row fallback for mobile */}
              <div className="flex gap-3 mt-4 md:hidden">
                <button onClick={() => onDismiss(action)} style={{ flex: 1, height: 48, borderRadius: 16, fontSize: 14, fontWeight: 500, background: 'rgba(255,250,248,0.04)', border: '1px solid rgba(255,250,248,0.08)', color: 'rgba(255,240,235,0.5)', cursor: 'pointer' }}>
                  Skip
                </button>
                <button onClick={() => onApprove(action, editedContent)} style={{ flex: 1, height: 48, borderRadius: 16, fontSize: 14, fontWeight: 600, background: `${colors.color}22`, border: `1px solid ${colors.color}44`, color: colors.color, cursor: 'pointer' }}>
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}