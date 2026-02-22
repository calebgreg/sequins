import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CATEGORY_COLORS } from './GrowthActionCard';

const STAGE_COLORS = {
  stuck:     { color: '#C88888', glow: 'rgba(200,136,136,0.4)' },
  ready:     { color: '#88AAC8', glow: 'rgba(136,170,200,0.4)' },
  sent:      { color: '#A8B898', glow: 'rgba(168,184,152,0.4)' },
  replied:   { color: '#C8B888', glow: 'rgba(200,184,136,0.5)' },
  connected: { color: '#88C898', glow: 'rgba(136,200,152,0.5)' },
};

export { STAGE_COLORS };

export default function GrowthOverlay({ item, type, category, onClose }) {
  const [editedContent, setEditedContent] = useState('');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (item?.content) setEditedContent(item.content);
    else if (item?.draft) setEditedContent(item.draft || '');
    else setEditedContent('');
  }, [item]);

  useEffect(() => {
    if (inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [item]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!item) return null;

  const handleCommand = async () => {
    const cmd = inputValue.toLowerCase().trim();
    if (!cmd) return;

    if (cmd.includes('send') || cmd === 'yes' || cmd === 'go' || cmd.includes('looks good') || cmd === 'approve') {
      if (type === 'action') {
        const updateData = { status: 'approved', approved_at: new Date().toISOString() };
        if (editedContent) updateData.content = editedContent;
        await base44.entities.GrowthAction.update(item.id, updateData);
        queryClient.invalidateQueries(['growthActions']);
        toast.success('Sent');
      }
      onClose();
    } else if (cmd.includes('skip') || cmd.includes('later') || cmd.includes('not now') || cmd === 'no') {
      if (type === 'action') {
        await base44.entities.GrowthAction.update(item.id, { status: 'dismissed' });
        queryClient.invalidateQueries(['growthActions']);
        toast('Skipped');
      }
      onClose();
    }
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommand(); }
  };

  // Determine glow color
  const glow = type === 'action'
    ? (CATEGORY_COLORS[category] || CATEGORY_COLORS.Other).glow
    : (STAGE_COLORS[item.stage] || STAGE_COLORS.ready).glow;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,9,0.9)', backdropFilter: 'blur(30px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 700,
          background: 'rgba(255,252,250,0.05)', backdropFilter: 'blur(60px)',
          borderRadius: 32, border: '1px solid rgba(255,250,248,0.08)',
          padding: '48px', boxShadow: `0 60px 120px rgba(0,0,0,0.5), 0 0 100px ${glow}`,
          maxHeight: '90vh', overflow: 'auto', position: 'relative',
          fontFamily: "'DM Sans', -apple-system, sans-serif",
        }}
      >
        {/* Close button */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,250,248,0.06)', border: 'none', color: 'rgba(255,240,235,0.5)',
          fontSize: 20, cursor: 'pointer',
        }}>x</button>

        {type === 'action' && <ActionContent item={item} category={category} editedContent={editedContent} setEditedContent={setEditedContent} inputValue={inputValue} setInputValue={setInputValue} inputRef={inputRef} handleKeyDown={handleKeyDown} handleCommand={handleCommand} onClose={onClose} />}
        {type === 'pipeline' && <PipelineContent item={item} editedContent={editedContent} setEditedContent={setEditedContent} inputValue={inputValue} setInputValue={setInputValue} inputRef={inputRef} handleKeyDown={handleKeyDown} />}
      </div>
    </div>
  );
}

function ActionContent({ item, category, editedContent, setEditedContent, inputValue, setInputValue, inputRef, handleKeyDown }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
  const context = [item.target_name, item.context?.partner_category, item.context?.circle_size ? `~${item.context.circle_size} families` : null].filter(Boolean).join(' · ');

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: colors.bg, borderRadius: 24, marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.text }}>{category}</span>
      </div>

      <div style={{ fontSize: 36, fontWeight: 600, color: 'rgba(255,248,244,0.95)', marginBottom: 10 }}>{item.title}</div>
      <div style={{ fontSize: 15, color: 'rgba(255,240,235,0.45)', marginBottom: 28 }}>{context}</div>

      {item.summary && (
        <div style={{ fontSize: 15, color: 'rgba(255,238,232,0.4)', marginBottom: 32, lineHeight: 1.65, fontStyle: 'italic', paddingLeft: 16, borderLeft: `2px solid ${colors.text}44` }}>
          {item.summary}
        </div>
      )}

      {item.subject && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,235,230,0.3)', marginBottom: 8 }}>Subject</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,248,244,0.8)' }}>{item.subject}</div>
        </div>
      )}

      {(item.content || editedContent) && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '28px', marginBottom: 28, border: '1px solid rgba(255,250,248,0.08)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,235,230,0.3)', marginBottom: 16 }}>
            Draft{item.action_type ? ` · ${item.action_type}` : ''}
          </div>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            style={{ width: '100%', minHeight: 100, fontSize: 17, color: 'rgba(255,248,244,0.9)', lineHeight: 1.7, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
          />
        </div>
      )}

      {item.context?.partner_website && (
        <a href={item.context.partner_website} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: 12, fontWeight: 500, color: colors.text, textDecoration: 'underline', textUnderlineOffset: 3, marginBottom: 24 }}>
          view website
        </a>
      )}

      <CommandInput inputRef={inputRef} inputValue={inputValue} setInputValue={setInputValue} handleKeyDown={handleKeyDown} placeholder="send · skip · shorter..." glowColor={colors.glow} borderColor={colors.text} />
    </>
  );
}

function PipelineContent({ item, editedContent, setEditedContent, inputValue, setInputValue, inputRef, handleKeyDown }) {
  const stage = item.stage || 'ready';
  const sc = STAGE_COLORS[stage] || STAGE_COLORS.ready;
  const data = item.data || item;
  const research = data.ai_research || {};

  // Partner-type pipeline items
  const name = data.name || item.name || '';
  const category = data.category || '';
  const reach = research.circle_size ? `~${research.circle_size} families` : '';
  const personName = research.person_name || data.gatekeeper_name || '';
  const personRole = research.person_role || '';
  const angle = research.angle || data.notes || '';

  const stageLabels = { stuck: 'Stuck', ready: 'Ready to send', sent: 'Sent', replied: 'Replied', connected: 'Connected' };

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: `${sc.color}22`, borderRadius: 24, marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: sc.color }}>{stageLabels[stage] || stage}</span>
      </div>

      <div style={{ fontSize: 36, fontWeight: 600, color: 'rgba(255,248,244,0.95)', marginBottom: 10 }}>{personName || name}</div>
      <div style={{ fontSize: 15, color: 'rgba(255,240,235,0.45)', marginBottom: 28 }}>
        {[personRole, name, category, reach].filter(Boolean).join(' · ')}
      </div>

      {/* Research findings */}
      {(research.what_we_found || research.what_they_do) && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,240,235,0.3)', marginBottom: 14 }}>What we found</div>
          <div style={{ fontSize: 15, color: 'rgba(255,245,240,0.7)', lineHeight: 1.65 }}>
            {research.what_they_do || research.what_we_found}
          </div>
        </div>
      )}

      {/* Angle / reasoning */}
      {angle && (
        <div style={{ fontSize: 15, color: 'rgba(255,238,232,0.4)', marginBottom: 28, lineHeight: 1.65, fontStyle: 'italic', paddingLeft: 16, borderLeft: `2px solid ${sc.color}44` }}>
          {angle}
        </div>
      )}

      {/* Referral stats for connected partners */}
      {stage === 'connected' && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          <div style={{ flex: 1, padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,250,248,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 300, color: 'rgba(255,248,244,0.9)', marginBottom: 6 }}>{data.referrals_sent || 0}</div>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,240,235,0.35)' }}>Sent to them</div>
          </div>
          <div style={{ flex: 1, padding: 20, background: 'rgba(136,200,152,0.08)', borderRadius: 14, border: '1px solid rgba(136,200,152,0.15)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 300, color: '#88C898', marginBottom: 6 }}>{data.referrals_received || 0}</div>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(136,200,152,0.6)' }}>Received</div>
          </div>
        </div>
      )}

      {/* Status / outcome */}
      {data.relationship_status && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: `${sc.color}15`, borderRadius: 14, border: `1px solid ${sc.color}33`, marginBottom: 28 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc.color }} />
          <span style={{ fontSize: 15, color: sc.color, fontWeight: 500 }}>{data.relationship_status.replace(/_/g, ' ')}</span>
        </div>
      )}

      <CommandInput inputRef={inputRef} inputValue={inputValue} setInputValue={setInputValue} handleKeyDown={handleKeyDown} placeholder="send · skip · shorter..." glowColor={sc.glow} borderColor={sc.color} />
    </>
  );
}

function CommandInput({ inputRef, inputValue, setInputValue, handleKeyDown, placeholder, glowColor, borderColor }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: 16,
      border: `1px solid ${inputValue ? borderColor + '44' : 'rgba(255,250,248,0.08)'}`,
      overflow: 'hidden', transition: 'all 0.2s',
      boxShadow: inputValue ? `0 0 30px ${glowColor}` : 'none',
    }}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ width: '100%', padding: '22px 28px', fontSize: 17, color: 'rgba(255,248,244,0.9)', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit' }}
      />
    </div>
  );
}