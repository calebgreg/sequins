import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export default function GhostCard({ onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative flex flex-col items-center">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        className={`bg-transparent rounded-xl border-2 border-dashed p-5 min-w-[180px] cursor-pointer transition-all flex flex-col items-center justify-center ${
          isHovered ? 'bg-[#f9fafb] opacity-100' : 'opacity-50'
        } border-[#e5e5e5]`}
        style={{ minHeight: '140px' }}
      >
        {/* Plus Icon Circle */}
        <div
          className={`w-[52px] h-[52px] rounded-full mb-3 flex items-center justify-center text-[#9ca3af] transition-all ${
            isHovered
              ? 'bg-[#f3f4f6]'
              : 'border-2 border-dashed border-[#d1d5db]'
          }`}
        >
          <Plus size={24} />
        </div>

        {/* Label */}
        <div className="text-xs text-[#9ca3af] text-center font-medium">
          Add role
        </div>
      </div>
    </div>
  );
}