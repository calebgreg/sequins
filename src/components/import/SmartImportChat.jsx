import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from "@/components/ui/button";

const colors = {
  ink: '#1a1a1a',
  muted: '#8a8478',
  etchDark: '#8a7070',
};

export default function SmartImportChat({ context, setContext, onSubmit, isProcessing, fileCount }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (fileCount > 0) onSubmit();
    }
  };

  return (
    <div className="flex gap-3 items-end">
      <div className="flex-1 relative">
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={fileCount > 0
            ? "Add context... e.g. 'These are attendance sheets from Monday and Tuesday Ballet'"
            : "Drop files above first, then add context here..."
          }
          disabled={isProcessing}
          rows={1}
          className="w-full resize-none text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 transition-all"
          style={{
            background: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(200,180,170,0.25)',
            color: colors.ink,
            focusRing: colors.etchDark,
            minHeight: 48,
            maxHeight: 120,
          }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />
      </div>
      <Button
        onClick={onSubmit}
        disabled={fileCount === 0 || isProcessing}
        className="h-12 w-12 rounded-2xl flex-shrink-0"
        style={{ backgroundColor: fileCount > 0 ? colors.ink : '#ccc' }}
      >
        <Send size={18} />
      </Button>
    </div>
  );
}