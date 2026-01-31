import React, { useState } from 'react';
import { Users } from 'lucide-react';

const colors = {
  muted: '#8a8478',
  frostShadow: 'rgba(180, 120, 120, 0.08)',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
};

const EtchedText = ({ children, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
  };
  
  return (
    <span
      className={`${sizes[size]} font-bold tracking-tight ${className}`}
      style={{
        color: 'transparent',
        backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
        filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
      }}
    >
      {children}
    </span>
  );
};

export default function TeamCard({ team, memberCount, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className="rounded-2xl p-5 min-w-[200px] cursor-pointer transition-all"
      style={{
        background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.98) 0%, rgba(252, 231, 231, 0.95) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 200, 200, 0.4)',
        boxShadow: isHovered
          ? '0 8px 24px rgba(180, 120, 120, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.6)'
          : `0 4px 16px ${colors.frostShadow}, inset 0 1px 2px rgba(255, 255, 255, 0.6)`,
      }}
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          color: colors.etchDark,
        }}
      >
        <Users size={16} />
      </div>

      <div className="mb-1">
        <EtchedText size="md">{team.name}</EtchedText>
      </div>

      <div className="text-xs" style={{ color: colors.muted }}>
        {memberCount} {memberCount === 1 ? 'person' : 'people'}
      </div>
    </div>
  );
}