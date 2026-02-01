import React, { useState } from 'react';

export default function AddNoteModal({ isOpen, onClose, onSave, saving }) {
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!content.trim()) return;
    onSave(content.trim());
    setContent('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md rounded-3xl p-6"
        style={{
          background: 'linear-gradient(145deg, rgba(253,238,236,0.95) 0%, rgba(250,232,228,0.9) 50%, rgba(252,243,240,0.95) 100%)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 25px 80px -20px rgba(180,150,140,0.4)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Inner glow */}
        <div 
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)',
          }}
        />

        <div className="relative">
          <h2 
            className="text-xl font-bold tracking-tight mb-4"
            style={{ 
              color: 'transparent',
              backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
            }}
          >
            Add Note
          </h2>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note about this teacher..."
            rows={4}
            className="w-full p-4 rounded-2xl text-sm resize-none focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.6)',
              color: '#8b7d72',
              boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.1)',
              border: '1px solid rgba(200,180,170,0.2)',
            }}
            autoFocus
          />

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-70"
              style={{ color: '#b5a599' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!content.trim() || saving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
                boxShadow: '0 4px 16px -4px rgba(180,150,140,0.3), inset 0 1px 2px rgba(255,255,255,0.8)',
                border: '1px solid rgba(255, 220, 210, 0.5)',
              }}
            >
              <span
                style={{
                  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}