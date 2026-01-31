import React, { useState } from 'react';
import { Plus } from 'lucide-react';

const colors = {
  muted: '#8a8478',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
};

export default function GhostCard({ onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative flex flex-col items-center">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        className="rounded-2xl border-2 border-dashed p-5 min-w-[180px] cursor-pointer transition-all flex flex-col items-center justify-center"
        style={{ 
          minHeight: '140px',
          borderColor: isHovered ? colors.etchLight : 'rgba(200, 160, 160, 0.4)',
          backgroundColor: isHovered ? 'rgba(254, 247, 247, 0.6)' : 'transparent',
          opacity: isHovered ? 1 : 0.6,
        }}
      >
        {/* Plus Icon Circle */}
        <div
          className="w-[52px] h-[52px] rounded-full mb-3 flex items-center justify-center transition-all"
          style={{
            backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.6)' : 'transparent',
            border: isHovered ? 'none' : `2px dashed ${colors.etchLight}`,
            color: colors.etchLight,
          }}
        >
          <Plus size={24} />
        </div>

        {/* Label */}
        <div 
          className="text-xs text-center font-medium"
          style={{ color: colors.muted }}
        >
          Add role
        </div>
      </div>
    </div>
  );
}