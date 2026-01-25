import React from 'react';
import { Mail, Users, X } from 'lucide-react';

export default function BulkActionBar({
  selectedCount,
  onMessage,
  onAddToTeam,
  onClear,
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-[#1a1a1a] text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4">
      <span className="font-medium text-sm">{selectedCount} selected</span>
      <div className="w-px h-6 bg-white/20" />
      <button
        onClick={onMessage}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#1a1a1a] text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        <Mail size={16} />
        Send Message
      </button>
      <button
        onClick={onAddToTeam}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
      >
        <Users size={16} />
        Add to Team
      </button>
      <button
        onClick={onClear}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/20 text-[#9ca3af] hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}