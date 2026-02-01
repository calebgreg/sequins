import React, { useState } from 'react';

export default function AddNoteModal({ isOpen, onClose, onSave, saving, teacherName }) {
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!content.trim()) return;
    onSave(content.trim());
    setContent('');
  };

  const firstName = teacherName?.split(' ')[0] || 'them';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-lg rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(253,238,236,0.98) 0%, rgba(250,232,228,0.95) 50%, rgba(252,243,240,0.98) 100%)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9), 0 30px 100px -20px rgba(180,150,140,0.5)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Top accent bar */}
        <div 
          className="h-1"
          style={{
            background: 'linear-gradient(90deg, rgba(200,170,156,0.3) 0%, rgba(200,170,156,0.6) 50%, rgba(200,170,156,0.3) 100%)',
          }}
        />

        {/* Inner glow */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 30% 10%, rgba(255,255,255,0.5) 0%, transparent 50%)',
          }}
        />

        <div className="relative p-8">
          {/* Header with icon */}
          <div className="flex items-center gap-4 mb-6">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, rgba(200,170,156,0.2) 0%, rgba(200,170,156,0.1) 100%)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5)',
              }}
            >
              <span style={{ color: '#c8aa9c', fontSize: '20px' }}>✎</span>
            </div>
            <div>
              <h2 
                className="text-2xl font-bold tracking-tight"
                style={{ 
                  color: 'transparent',
                  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  textShadow: '0 2px 3px rgba(255,255,255,0.7)',
                  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                }}
              >
                Note for {firstName}
              </h2>
              <p className="text-sm mt-0.5" style={{ color: '#b5a599' }}>
                Private staff note · only visible to admins
              </p>
            </div>
          </div>

          {/* Text area */}
          <div 
            className="rounded-2xl p-1"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,252,250,0.5) 100%)',
              boxShadow: 'inset 0 2px 4px rgba(180,150,140,0.08), 0 1px 2px rgba(255,255,255,0.8)',
            }}
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`What's on your mind about ${firstName}?`}
              rows={4}
              className="w-full p-4 rounded-xl text-base resize-none focus:outline-none bg-transparent"
              style={{
                color: '#6b5d52',
                lineHeight: 1.6,
              }}
              autoFocus
            />
          </div>

          {/* Helper text */}
          <p className="text-xs mt-3 px-1" style={{ color: '#c4b5ab' }}>
            Notes help you remember conversations, goals, and context.
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white/30"
              style={{ color: '#a8998e' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!content.trim() || saving}
              className="px-8 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: content.trim() 
                  ? 'linear-gradient(145deg, #8b7d72 0%, #6b5d52 100%)'
                  : 'rgba(180,170,160,0.3)',
                color: content.trim() ? '#fff' : '#a8998e',
                boxShadow: content.trim() 
                  ? '0 8px 24px -4px rgba(107,93,82,0.4), inset 0 1px 1px rgba(255,255,255,0.1)'
                  : 'none',
              }}
            >
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}