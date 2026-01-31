import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const colors = {
  ink: '#1a1a1a',
  muted: '#8a8478',
  frost: '#fef7f7',
  frostShadow: 'rgba(180, 120, 120, 0.08)',
  frostDeep: 'rgba(180, 120, 120, 0.05)',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
};

const EtchedText = ({ children, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
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

const getInitials = (name) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function StaffCard({
  person,
  reportCount,
  isExpanded,
  onToggleExpand,
  isSelected,
  onSelect,
  onCardClick,
  isTopLevel = false,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const hasReports = reportCount > 0;

  return (
    <div className="relative flex flex-col items-center">
      {/* Card */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onCardClick(person)}
        className={`relative rounded-2xl transition-all duration-150 cursor-pointer ${
          isSelected
            ? 'ring-2 ring-offset-2 ring-[#8a7070]'
            : ''
        } ${
          isTopLevel ? 'p-6' : 'p-5'
        }`}
        style={{
          minWidth: isTopLevel ? '220px' : '180px',
          background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.98) 0%, rgba(252, 231, 231, 0.95) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 200, 200, 0.4)',
          boxShadow: isHovered
            ? '0 8px 24px rgba(180, 120, 120, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.6)'
            : `0 4px 16px ${colors.frostShadow}, inset 0 1px 2px rgba(255, 255, 255, 0.6)`,
        }}
      >
        {/* Selection Checkbox */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(person.id);
          }}
          className={`absolute top-2.5 left-2.5 w-[18px] h-[18px] rounded-full border flex items-center justify-center cursor-pointer transition-all ${
            isSelected
              ? 'bg-[#8a7070] border-[#8a7070]'
              : 'border-[#c4a0a0] bg-white/50'
          } ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}
        >
          {isSelected && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        {/* Avatar */}
        <div
          className={`mx-auto mb-3 border-2 border-white/60 shadow-sm rounded-full flex items-center justify-center ${
            isTopLevel ? 'w-16 h-16' : 'w-[52px] h-[52px]'
          }`}
          style={{ 
            fontSize: isTopLevel ? '18px' : '15px',
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            color: colors.etchDark,
            fontWeight: 600,
          }}
        >
          {person.avatar_url ? (
            <img
              src={person.avatar_url}
              alt={person.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitials(person.name)
          )}
        </div>

        {/* Name */}
        <div className="text-center mb-1">
          <EtchedText size={isTopLevel ? 'lg' : 'md'}>
            {person.name}
          </EtchedText>
        </div>

        {/* Title */}
        <div
          className={`text-center leading-snug ${
            isTopLevel ? 'text-sm' : 'text-xs'
          }`}
          style={{ color: colors.muted }}
        >
          {person.title || 'Staff Member'}
        </div>
      </div>

      {/* Report Count Badge */}
      {hasReports && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(person.id);
          }}
          className="flex items-center gap-1 mt-2 px-3 py-1.5 rounded-full border-none text-xs font-medium transition-all"
          style={{
            backgroundColor: isExpanded ? colors.etchDark : 'rgba(255, 255, 255, 0.6)',
            color: isExpanded ? '#fff' : colors.etchDark,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {reportCount}
          {isExpanded ? (
            <ChevronUp size={12} />
          ) : (
            <ChevronDown size={12} />
          )}
        </button>
      )}
    </div>
  );
}