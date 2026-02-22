import React from 'react';

const CATEGORY_COLORS = {
  Connect:   { glow: 'rgba(140,120,180,0.5)', text: '#A898C8', accent: '#8878B8', bg: 'rgba(140,120,180,0.12)' },
  Celebrate: { glow: 'rgba(180,120,140,0.5)', text: '#C898A8', accent: '#B87888', bg: 'rgba(180,120,140,0.12)' },
  Convert:   { glow: 'rgba(120,160,140,0.5)', text: '#98C8A8', accent: '#78B888', bg: 'rgba(120,160,140,0.12)' },
  Retain:    { glow: 'rgba(180,140,120,0.5)', text: '#C8A898', accent: '#B88878', bg: 'rgba(180,140,120,0.12)' },
  Other:     { glow: 'rgba(160,140,170,0.5)', text: '#B8A8C0', accent: '#9888A8', bg: 'rgba(160,140,170,0.12)' },
};

export { CATEGORY_COLORS };

export default function GrowthActionCard({ action, category, onClick }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
  const context = action.target_name || '';
  const channel = action.action_type || '';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px',
        background: 'rgba(255,252,250,0.03)', borderRadius: 18, cursor: 'pointer',
        transition: 'all 0.2s ease', border: '1px solid rgba(255,250,248,0.04)',
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors.accent, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'rgba(255,248,244,0.9)', marginBottom: 4 }}>
          {action.title}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,240,235,0.4)' }}>
          {context}
        </div>
      </div>
      {channel && (
        <div style={{
          padding: '6px 12px', background: 'rgba(255,250,248,0.05)', borderRadius: 8,
          fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
          color: 'rgba(255,240,235,0.4)',
        }}>
          {channel}
        </div>
      )}
    </div>
  );
}