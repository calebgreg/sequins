import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronRight, ChevronLeft } from 'lucide-react';
import AdminOnly from '@/components/layout/AdminOnly';

// Etched text style - matching TeacherStudio
const etchedText = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

function GrowthContent() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id;

  // Fetch pending actions
  const { data: actions = [], refetch } = useQuery({
    queryKey: ['growthActions', studioId],
    queryFn: () => base44.entities.GrowthAction.filter({ studio_id: studioId, status: 'pending_review' }, '-created_date'),
    enabled: !!studioId,
  });

  const currentAction = actions[currentIndex];
  const hasActions = actions.length > 0;

  const handleApprove = async () => {
    if (!currentAction) return;
    await base44.entities.GrowthAction.update(currentAction.id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
    toast.success('Approved');
    if (currentIndex >= actions.length - 1) {
      setCurrentIndex(Math.max(0, actions.length - 2));
    }
    refetch();
  };

  const handleSkip = async () => {
    if (!currentAction) return;
    await base44.entities.GrowthAction.update(currentAction.id, { status: 'dismissed' });
    toast.success('Skipped');
    if (currentIndex >= actions.length - 1) {
      setCurrentIndex(Math.max(0, actions.length - 2));
    }
    refetch();
  };

  const goNext = () => {
    if (currentIndex < actions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: '#ffffff',
      }}
    >
      {/* Ambient background shapes */}
      <div 
        className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
      />
      <div 
        className="fixed bottom-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-2xl mx-auto p-6 md:p-10 pt-10 md:pt-16">
        
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm mb-2" style={{ color: '#b5a599' }}>growth engine</p>
          <h1 
            className="text-3xl md:text-4xl font-bold tracking-tight"
            style={etchedText}
          >
            {hasActions ? `${actions.length} to review` : 'All caught up'}
          </h1>
        </div>

        {/* Main Card */}
        <div 
          className="rounded-3xl p-6 md:p-8"
          style={{
            background: 'linear-gradient(145deg, rgba(254,240,240,0.95) 0%, rgba(252,235,235,0.9) 50%, rgba(250,242,240,0.85) 100%)',
            boxShadow: 'inset 0 2px 12px rgba(180, 120, 120, 0.08), inset 0 1px 3px rgba(180, 120, 120, 0.05)',
          }}
        >
          {!hasActions ? (
            <div className="text-center py-12">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  boxShadow: '0 4px 12px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                }}
              >
                <Check className="w-7 h-7" style={{ color: '#7eb89a' }} />
              </div>
              <p className="text-base" style={{ color: '#8b7d72' }}>
                No actions waiting for your review
              </p>
              <p className="text-sm mt-2" style={{ color: '#b5a599' }}>
                The growth engine is working in the background
              </p>
            </div>
          ) : (
            <>
              {/* Progress indicator */}
              <div className="flex justify-center gap-1.5 mb-6">
                {actions.map((_, idx) => (
                  <div
                    key={idx}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: idx === currentIndex ? '24px' : '8px',
                      background: idx === currentIndex 
                        ? 'linear-gradient(145deg, #c4a0a0 0%, #a08080 100%)'
                        : idx < currentIndex 
                          ? 'rgba(126,184,154,0.4)'
                          : 'rgba(200,180,170,0.3)',
                    }}
                  />
                ))}
              </div>

              {/* Action Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentAction?.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Agent Badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <span 
                      className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg"
                      style={{
                        background: 'rgba(255,255,255,0.7)',
                        color: '#a8998e',
                      }}
                    >
                      {currentAction?.agent}
                    </span>
                    {currentAction?.priority === 'high' && (
                      <span 
                        className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg"
                        style={{
                          background: 'rgba(212,165,116,0.15)',
                          color: '#c9a574',
                        }}
                      >
                        Priority
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-xl md:text-2xl font-semibold mb-2" style={{ color: '#5a4f47' }}>
                    {currentAction?.title}
                  </h2>
                  
                  {currentAction?.target_name && (
                    <p className="text-sm mb-4" style={{ color: '#b5a599' }}>
                      {currentAction.target_name}
                    </p>
                  )}

                  {/* Summary */}
                  {currentAction?.summary && (
                    <div 
                      className="rounded-xl p-4 mb-5"
                      style={{ background: 'rgba(255,255,255,0.5)' }}
                    >
                      <p className="text-sm leading-relaxed" style={{ color: '#7a6d62' }}>
                        {currentAction.summary}
                      </p>
                    </div>
                  )}

                  {/* Draft Content */}
                  {currentAction?.content && (
                    <div className="mb-6">
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#b5a599' }}>
                        Draft {currentAction.action_type === 'email' ? 'Email' : 'Message'}
                      </div>
                      {currentAction.subject && (
                        <div className="text-sm font-medium mb-2" style={{ color: '#6b5d52' }}>
                          Subject: {currentAction.subject}
                        </div>
                      )}
                      <div 
                        className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto"
                        style={{ 
                          background: 'rgba(255,255,255,0.7)',
                          color: '#5a4f47',
                          border: '1px solid rgba(200,180,170,0.15)',
                        }}
                      >
                        {currentAction.content}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleApprove}
                      className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
                      style={{
                        background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
                        boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
                        border: '1px solid rgba(255, 220, 210, 0.5)',
                      }}
                    >
                      <span style={etchedText}>Approve</span>
                    </button>
                    <button
                      onClick={handleSkip}
                      className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-medium transition-all active:scale-[0.98]"
                      style={{
                        background: 'rgba(255,255,255,0.6)',
                        color: '#a8998e',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                      }}
                    >
                      Skip
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              {actions.length > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4" style={{ borderTop: '1px solid rgba(200,180,170,0.15)' }}>
                  <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 text-sm font-medium transition-all disabled:opacity-30"
                    style={{ color: '#a8998e' }}
                  >
                    <ChevronLeft size={18} /> Previous
                  </button>
                  <span className="text-xs" style={{ color: '#c4b5ab' }}>
                    {currentIndex + 1} of {actions.length}
                  </span>
                  <button
                    onClick={goNext}
                    disabled={currentIndex === actions.length - 1}
                    className="flex items-center gap-1 text-sm font-medium transition-all disabled:opacity-30"
                    style={{ color: '#a8998e' }}
                  >
                    Next <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Growth() {
  return (
    <AdminOnly>
      <GrowthContent />
    </AdminOnly>
  );
}