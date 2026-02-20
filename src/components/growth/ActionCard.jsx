import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActionCard({ action, onSubmit }) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState(null);
  const inputRef = useRef(null);

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;
    setIsProcessing(true);
    setResponse(null);
    
    const result = await onSubmit(action.id, input.trim());
    
    setIsProcessing(false);
    if (result) {
      setResponse(result);
      setInput('');
    } else {
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const etchedText = {
    color: 'transparent',
    backgroundImage: 'linear-gradient(180deg, #8a7070 0%, #6A5A56 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    textShadow: '0 2px 3px rgba(255,255,255,0.5)',
  };

  return (
    <div 
      className="rounded-3xl p-6 md:p-7 mb-5"
      style={{
        background: 'linear-gradient(145deg, rgba(254,240,240,0.95) 0%, rgba(252,235,235,0.9) 50%, rgba(250,242,240,0.85) 100%)',
        boxShadow: 'inset 0 2px 12px rgba(180, 120, 120, 0.08), inset 0 1px 3px rgba(180, 120, 120, 0.05), 0 4px 24px -8px rgba(180,140,135,0.15)',
      }}
    >
      {/* Category tag */}
      <div 
        className="inline-block text-[10px] font-semibold uppercase mb-3"
        style={{ color: '#C4A8A4', letterSpacing: '1.2px' }}
      >
        {action.category}
      </div>

      {/* Headline */}
      <div className="text-xl font-semibold mb-1 leading-tight" style={etchedText}>
        {action.headline}
      </div>

      {/* Subtext */}
      {action.subtext && (
        <div className="text-sm mb-4" style={{ color: '#A89894' }}>
          {action.subtext}
        </div>
      )}

      {/* Draft content */}
      {action.draft && (
        <div className="mb-4">
          {action.subject && (
            <div 
              className="text-sm font-medium mb-2 px-5"
              style={{ color: '#7A6A66' }}
            >
              Subject: {action.subject}
            </div>
          )}
          <div 
            className="rounded-2xl p-4 px-5"
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              borderLeft: '3px solid #E8D8D4',
              boxShadow: 'inset 0 1px 2px rgba(180,140,135,0.06)',
            }}
          >
            <div 
              className="text-[15px] leading-relaxed whitespace-pre-wrap"
              style={{ color: '#5A4A46' }}
            >
              {action.draft}
            </div>
            {action.channel && (
              <div className="mt-3 text-xs" style={{ color: '#B8A8A4' }}>
                via {action.channel}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Response from processing */}
      <AnimatePresence>
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 text-sm rounded-xl px-4 py-3"
            style={{
              background: 'rgba(126,184,154,0.1)',
              color: '#5a7d6a',
            }}
          >
            {response}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Natural language input — the only interaction */}
      <div 
        className="rounded-xl flex items-center gap-2"
        style={{
          background: 'rgba(255, 255, 255, 0.6)',
          border: '1px solid rgba(220, 200, 196, 0.3)',
          boxShadow: 'inset 0 1px 3px rgba(180,140,135,0.05)',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={action.placeholder || "Send it / tweak the tone / skip / rewrite for a gym owner..."}
          disabled={isProcessing}
          className="flex-1 py-4 pl-5 pr-2 text-[15px] bg-transparent border-none outline-none placeholder:text-[#c4b5ab]"
          style={{ color: '#5A4A46' }}
        />
        {(input.trim() || isProcessing) && (
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !input.trim()}
            className="mr-3 p-2 rounded-lg transition-all active:scale-95"
            style={{ color: isProcessing ? '#c4b5ab' : '#a8908a' }}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}