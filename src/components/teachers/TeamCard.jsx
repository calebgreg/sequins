import React, { useState } from 'react';
import { Users } from 'lucide-react';

export default function TeamCard({ team, memberCount, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className="bg-white rounded-xl border border-[#e5e5e5] p-5 min-w-[200px] cursor-pointer transition-all"
      style={{
        boxShadow: isHovered
          ? '0 4px 20px rgba(0, 0, 0, 0.08)'
          : '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div className="w-10 h-10 rounded-lg bg-[#f3f4f6] flex items-center justify-center mb-3 text-[#6b7280]">
        <Users size={16} />
      </div>

      <div className="font-semibold text-sm text-[#1a1a1a] mb-1">
        {team.name}
      </div>

      <div className="text-xs text-[#6b7280]">
        {memberCount} {memberCount === 1 ? 'person' : 'people'}
      </div>
    </div>
  );
}