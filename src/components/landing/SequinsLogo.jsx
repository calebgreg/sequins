import React from 'react';

// Cloud SVG with embossed "sequins" text inside
export default function SequinsLogo({ size = 'md' }) {
  const scales = { sm: 0.55, md: 0.85, lg: 1.2 };
  const s = scales[size] || scales.md;

  return (
    <svg
      width={Math.round(120 * s)}
      height={Math.round(52 * s)}
      viewBox="0 0 120 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        {/* Cloud shape filter — soft outer glow + inner shadow for emboss */}
        <filter id="cloudShadow" x="-8%" y="-15%" width="116%" height="130%">
          {/* Outer soft drop shadow */}
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(180,140,140,0.18)" />
        </filter>
        <filter id="emboss" x="-5%" y="-20%" width="110%" height="140%">
          {/* Emboss: light from top-left */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
          <feOffset dx="-0.5" dy="-1" in="blur" result="offsetBlur" />
          <feFlood floodColor="rgba(255,255,255,0.9)" result="white" />
          <feComposite in="white" in2="offsetBlur" operator="in" result="highlight" />
          <feOffset dx="0.5" dy="1" in="blur" result="offsetBlur2" />
          <feFlood floodColor="rgba(180,140,140,0.35)" result="shadow" />
          <feComposite in="shadow" in2="offsetBlur2" operator="in" result="shadowLayer" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="highlight" />
            <feMergeNode in="shadowLayer" />
          </feMerge>
        </filter>
        <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,250,249,1)" />
          <stop offset="100%" stopColor="rgba(248,236,236,1)" />
        </linearGradient>
        {/* Inner shadow for cloud depth */}
        <filter id="cloudInner" x="-5%" y="-10%" width="110%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
          <feOffset dx="0" dy="2" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
          <feFlood floodColor="rgba(180,130,130,0.12)" result="color" />
          <feComposite in="color" in2="shadowDiff" operator="in" result="shadow" />
          <feComposite in="shadow" in2="SourceGraphic" operator="over" />
        </filter>
      </defs>

      {/* Cloud body — built from overlapping circles */}
      <g filter="url(#cloudShadow)">
        {/* Bottom base */}
        <rect x="8" y="28" width="104" height="16" rx="8"
          fill="url(#cloudGrad)"
          style={{ filter: 'url(#cloudInner)' }}
        />
        {/* Bumps across the top */}
        <circle cx="22" cy="28" r="10" fill="url(#cloudGrad)" />
        <circle cx="38" cy="24" r="12" fill="url(#cloudGrad)" />
        <circle cx="56" cy="21" r="13" fill="url(#cloudGrad)" />
        <circle cx="74" cy="23" r="12" fill="url(#cloudGrad)" />
        <circle cx="90" cy="27" r="10" fill="url(#cloudGrad)" />
        <circle cx="103" cy="30" r="8" fill="url(#cloudGrad)" />
        <circle cx="15" cy="32" r="8" fill="url(#cloudGrad)" />
        {/* Fill any gaps in the base */}
        <rect x="8" y="30" width="104" height="14" rx="0" fill="url(#cloudGrad)" />
      </g>

      {/* Embossed "sequins" text */}
      <text
        x="60"
        y="37"
        textAnchor="middle"
        fontFamily="'Georgia', 'Times New Roman', serif"
        fontSize="15"
        fontWeight="400"
        fontStyle="italic"
        letterSpacing="1"
        fill="transparent"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="0.4"
        filter="url(#emboss)"
        style={{
          paintOrder: 'stroke fill',
        }}
      >
        sequins
      </text>
      {/* Second pass for the actual embossed fill */}
      <text
        x="60"
        y="37"
        textAnchor="middle"
        fontFamily="'Georgia', 'Times New Roman', serif"
        fontSize="15"
        fontWeight="400"
        fontStyle="italic"
        letterSpacing="1"
        fill="rgba(210,185,185,0.55)"
      >
        sequins
      </text>
      {/* Highlight pass — top edge glow */}
      <text
        x="60"
        y="36.5"
        textAnchor="middle"
        fontFamily="'Georgia', 'Times New Roman', serif"
        fontSize="15"
        fontWeight="400"
        fontStyle="italic"
        letterSpacing="1"
        fill="rgba(255,255,255,0.7)"
        style={{ filter: 'blur(0.4px)' }}
      >
        sequins
      </text>
    </svg>
  );
}