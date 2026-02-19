import React, { useState } from 'react';

export default function ActionCard({ action, onSubmit }) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = () => {
    if (!input.trim()) return;
    setIsProcessing(true);
    onSubmit(action.id, input);
    setTimeout(() => {
      setIsProcessing(false);
      setInput('');
    }, 1000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Frosted glass card style - light pink inset
  const cardStyle = {
    background: 'linear-gradient(145deg, rgba(254,240,240,0.95) 0%, rgba(252,235,235,0.9) 50%, rgba(250,242,240,0.85) 100%)',
    boxShadow: 'inset 0 2px 12px rgba(180, 120, 120, 0.08), inset 0 1px 3px rgba(180, 120, 120, 0.05), 0 4px 24px -8px rgba(180,140,135,0.15)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  };

  return (
    <div 
      className="rounded-3xl p-7 mb-5"
      style={cardStyle}
    >
      {/* Category tag */}
      <div 
        className="inline-block text-[10px] font-semibold uppercase mb-3.5"
        style={{ 
          color: '#C4A8A4', 
          letterSpacing: '1.2px',
        }}
      >
        {action.category}
      </div>

      {/* Headline - etched text */}
      <div 
        className="text-xl font-semibold mb-1.5 leading-tight"
        style={{ 
          color: 'transparent',
          backgroundImage: 'linear-gradient(180deg, #8a7070 0%, #6A5A56 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          textShadow: '0 2px 3px rgba(255,255,255,0.5)',
        }}
      >
        {action.headline}
      </div>

      {/* Subtext */}
      <div 
        className="text-sm mb-5"
        style={{ color: '#A89894' }}
      >
        {action.subtext}
      </div>

      {/* Draft message if present */}
      {action.draft && (
        <div 
          className="rounded-2xl p-4 px-5 mb-5"
          style={{
            background: 'rgba(255, 255, 255, 0.5)',
            borderLeft: '3px solid #E8D8D4',
            boxShadow: 'inset 0 1px 2px rgba(180,140,135,0.06)',
          }}
        >
          <div 
            className="text-[11px] font-semibold uppercase mb-2.5"
            style={{ color: '#C4A8A4', letterSpacing: '1px' }}
          >
            {action.draftLabel || 'Draft message'}
          </div>
          <div 
            className="text-[15px] leading-relaxed whitespace-pre-wrap"
            style={{ color: '#5A4A46' }}
          >
            {action.draft}
          </div>
          {action.channel && (
            <div 
              className="mt-3.5 text-xs"
              style={{ color: '#B8A8A4' }}
            >
              via {action.channel}
            </div>
          )}
        </div>
      )}

      {/* Natural language input */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.6)',
          border: '1px solid rgba(220, 200, 196, 0.3)',
          boxShadow: 'inset 0 1px 3px rgba(180,140,135,0.05)',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={action.placeholder || "Looks good / Make it shorter / Try email instead..."}
          disabled={isProcessing}
          className="w-full py-4 px-5 text-[15px] bg-transparent border-none outline-none placeholder:text-[#c4b5ab]"
          style={{ color: '#5A4A46' }}
        />
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div 
          className="mt-3 text-[13px] italic"
          style={{ color: '#B8A8A4' }}
        >
          Working on it...
        </div>
      )}
    </div>
  );
}