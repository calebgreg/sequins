import React from 'react';

export default function SequinsLogo({ size = 'md' }) {
  const scales = { sm: 1, md: 1.3, lg: 1.7 };
  const s = scales[size] || 1;

  return (
    <div style={{
      display: 'inline-block',
      padding: `${Math.round(8 * s)}px ${Math.round(18 * s)}px`,
      borderRadius: Math.round(14 * s),
      background: 'linear-gradient(160deg, #f5eeee 0%, #ede4e4 100%)',
      boxShadow: `
        inset 0 2px 4px rgba(255,255,255,0.9),
        inset 0 -2px 4px rgba(160,120,120,0.15),
        0 2px 8px rgba(160,120,120,0.12)
      `,
    }}>
      <span style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontStyle: 'italic',
        fontSize: Math.round(15 * s),
        fontWeight: 400,
        letterSpacing: '0.06em',
        background: 'linear-gradient(180deg, rgba(210,185,185,0.6) 0%, rgba(160,130,130,0.9) 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: 'none',
        filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.8)) drop-shadow(0 -1px 0 rgba(140,100,100,0.2))',
      }}>
        sequins
      </span>
    </div>
  );
}