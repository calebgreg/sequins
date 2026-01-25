import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
        className={`relative bg-white rounded-xl transition-all duration-150 cursor-pointer ${
          isSelected
            ? 'border-2 border-[#1a1a1a]'
            : 'border border-[#e5e5e5]'
        } ${
          isTopLevel ? 'p-6' : 'p-5'
        }`}
        style={{
          minWidth: isTopLevel ? '220px' : '180px',
          boxShadow: isHovered
            ? '0 4px 20px rgba(0, 0, 0, 0.08)'
            : '0 1px 3px rgba(0, 0, 0, 0.04)',
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
              ? 'bg-[#1a1a1a] border-[#1a1a1a]'
              : 'border-[#d1d5db] bg-transparent'
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
          className={`mx-auto mb-3 border-2 border-white shadow-sm rounded-full bg-[#f3f4f6] text-[#6b7280] font-medium flex items-center justify-center ${
            isTopLevel ? 'w-16 h-16' : 'w-[52px] h-[52px]'
          }`}
          style={{ fontSize: isTopLevel ? '18px' : '15px' }}
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
        <div
          className={`font-semibold text-center mb-1 text-[#1a1a1a] ${
            isTopLevel ? 'text-base' : 'text-sm'
          }`}
        >
          {person.name}
        </div>

        {/* Title */}
        <div
          className={`text-center text-[#6b7280] leading-snug ${
            isTopLevel ? 'text-sm' : 'text-xs'
          }`}
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
          className={`flex items-center gap-1 mt-2 px-3 py-1.5 rounded-full border-none text-xs font-medium transition-all ${
            isExpanded
              ? 'bg-[#1a1a1a] text-white'
              : 'bg-[#f3f4f6] text-[#1a1a1a]'
          }`}
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