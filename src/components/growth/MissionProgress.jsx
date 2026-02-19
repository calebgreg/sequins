import React from 'react';

export default function MissionProgress({ mission }) {
  const percent = Math.round((mission.actual / mission.target) * 100);
  const isComplete = percent >= 100;
  const isBehind = percent < 50;

  // Frosted glass card style - light pink inset
  const cardStyle = {
    background: 'linear-gradient(145deg, rgba(254,240,240,0.9) 0%, rgba(252,235,235,0.85) 50%, rgba(250,242,240,0.8) 100%)',
    boxShadow: 'inset 0 2px 8px rgba(180, 120, 120, 0.06), inset 0 1px 2px rgba(180, 120, 120, 0.04), 0 2px 12px -4px rgba(180,140,135,0.1)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  };

  return (
    <div 
      className="rounded-2xl py-5 px-6 mb-3 flex items-center gap-5"
      style={cardStyle}
    >
      {/* Progress circle */}
      <div 
        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
        style={{
          background: isComplete 
            ? 'linear-gradient(135deg, rgba(184,212,184,0.6), rgba(168,196,168,0.5))'
            : isBehind
              ? 'linear-gradient(135deg, rgba(232,196,196,0.6), rgba(216,180,180,0.5))'
              : 'linear-gradient(135deg, rgba(232,216,212,0.6), rgba(216,200,196,0.5))',
          color: isComplete ? '#6A8A6A' : isBehind ? '#8A5A5A' : '#7A6A66',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06), inset 0 -1px 2px rgba(255,255,255,0.4)',
        }}
      >
        {mission.actual}/{mission.target}
      </div>

      {/* Mission info */}
      <div className="flex-1 min-w-0">
        <div 
          className="text-[15px] font-medium mb-1 truncate"
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