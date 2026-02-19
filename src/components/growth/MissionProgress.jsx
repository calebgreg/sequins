import React from 'react';

export default function MissionProgress({ mission }) {
  const percent = Math.round((mission.actual / mission.target) * 100);
  const isComplete = percent >= 100;
  const isBehind = percent < 50;

  return (
    <div 
      className="rounded-2xl py-5 px-6 mb-3 flex items-center gap-5"
      style={{
        background: 'rgba(255, 252, 251, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: `
          0 2px 20px rgba(180, 140, 135, 0.06),
          0 0 0 1px rgba(255, 255, 255, 0.5),
          inset 0 1px 0 rgba(255, 255, 255, 0.8)
        `,
      }}
    >
      {/* Progress circle */}
      <div 
        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold"
        style={{
          background: isComplete 
            ? 'linear-gradient(135deg, #B8D4B8, #A8C4A8)'
            : isBehind
              ? 'linear-gradient(135deg, #E8C4C4, #D8B4B4)'
              : 'linear-gradient(135deg, #E8D8D4, #D8C8C4)',
          color: isComplete ? '#6A8A6A' : isBehind ? '#8A5A5A' : '#7A6A66',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
        }}
      >
        {mission.actual}/{mission.target}
      </div>

      {/* Mission info */}
      <div className="flex-1">
        <div 
          className="text-[15px] font-medium mb-1"
          style={{ color: '#5A4A46' }}
        >
          {mission.title}
        </div>
        <div 
          className="text-[13px]"
          style={{ color: isBehind ? '#B88A8A' : '#A89894' }}
        >
          {mission.period}
        </div>
      </div>
    </div>
  );
}