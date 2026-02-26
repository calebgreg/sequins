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
      backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a0745a12ebbb83d6190412/d0c8e354b_ChatGPTImageFeb242026at10_46_54AM.png')`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      lineHeight: 1,
    }}>
      sequins
    </span>
  );
}