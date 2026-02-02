import React, { useState } from 'react';
import { X, Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from '@tanstack/react-query';

const colors = {
  ink: '#1a1a1a',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
  muted: '#8a8478',
};

export default function BulkActionBar({ selectedIds, students, onClear }) {
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const selectedStudents = students.filter(s => selectedIds.includes(s.id));
  const selectedNames = selectedStudents.slice(0, 3).map(s => s.name).join(', ');
  const moreCount = selectedStudents.length - 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!instruction.trim() || isProcessing) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await base44.functions.invoke('bulkStudentAction', {
        instruction: instruction.trim(),
        studentIds: selectedIds
      });

      setResult(response.data);
      
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['students'] });
        setTimeout(() => {
          setInstruction('');
          setResult(null);
          onClear();
        }, 3000);
      }
    } catch (err) {
      setResult({ success: false, explanation: err.message || 'Something went wrong' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.98) 0%, rgba(252, 231, 231, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 200, 200, 0.4)',
        boxShadow: '0 8px 32px rgba(180, 120, 120, 0.2), 0 0 0 1px rgba(255,255,255,0.5) inset',
        borderRadius: '24px',
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span 
              className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{ backgroundColor: colors.ink, color: '#fff' }}
            >
              {selectedIds.length}
            </span>
            <span className="text-sm" style={{ color: colors.muted }}>
              {selectedNames}{moreCount > 0 && `, +${moreCount} more`}
            </span>
          </div>
          <button 
            onClick={onClear}
            className="p-1.5 rounded-full transition-all hover:scale-105"
            style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
          >
            <X className="w-4 h-4" style={{ color: colors.etchDark }} />
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div 
            className="mb-3 p-3 rounded-xl flex items-start gap-2"
            style={{
              backgroundColor: result.success ? 'rgba(134, 239, 172, 0.2)' : 'rgba(252, 165, 165, 0.2)',
              border: `1px solid ${result.success ? 'rgba(134, 239, 172, 0.4)' : 'rgba(252, 165, 165, 0.4)'}`,
            }}
          >
            {result.success ? (
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#166534' }} />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#991b1b' }} />
            )}
            <div>
              <p className="text-sm" style={{ color: result.success ? '#166534' : '#991b1b' }}>
                {result.explanation}
              </p>
              {result.summary && (
                <p className="text-xs mt-1" style={{ color: colors.muted }}>
                  {result.summary.successful} of {result.summary.total} successful
                </p>
              )}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="What do you want to do?"
            disabled={isProcessing}
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              backgroundColor: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(200,180,170,0.2)',
              color: colors.ink,
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(200,180,170,0.4)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(200,180,170,0.2)'}
          />
          <Button
            type="submit"
            disabled={!instruction.trim() || isProcessing}
            className="h-11 w-11 rounded-xl p-0 transition-all hover:scale-105"
            style={{
              backgroundColor: isProcessing ? colors.muted : colors.ink,
              color: '#fff',
            }}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}