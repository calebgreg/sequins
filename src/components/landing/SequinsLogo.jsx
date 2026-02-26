import React from 'react';

export default function SequinsLogo({ size = 'md' }) {
  const sizes = { sm: 22, md: 32, lg: 48 };
  const fontSize = sizes[size] || 22;

  return (
    <span style={{
      fontFamily: "'Playfair Display', serif",
      fontWeight: 900,
      fontSize,
      letterSpacing: '1px',
      color: 'transparent',
      backgroundImage: 'linear-gradient(180deg, #b0a0a8 0%, #7a6e75 100%)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      textShadow: '0 2px 3px rgba(255,255,255,0.7)',
      filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
      lineHeight: 1,
    }}>
      sequins
    </span>
  );
}