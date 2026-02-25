import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowRight, CheckCircle2, Loader2, Search, Sparkles, Calendar, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function ClassTransferModal({ isOpen, onOpenChange, student, currentClass, allClasses = [] }) {
  const [selectedNewClass, setSelectedNewClass] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState('pick'); // 'pick' | 'confirm' | 'done'
  const queryClient = useQueryClient();

  const availableClasses = useMemo(() => {
    if (!currentClass) return allClasses.filter(c => c.type !== 'admin');
    return allClasses.filter(c => 
      c.id !== currentClass.id && 
      c.type !== 'admin' &&
      !c.student_names?.includes(student.name)
    );
  }, [allClasses, currentClass, student.name]);

  const filteredClasses = useMemo(() => {
    if (!searchQuery) return availableClasses;
    const q = searchQuery.toLowerCase();
    return availableClasses.filter(c =>
      c.title?.toLowerCase().includes(q) ||
      c.style?.toLowerCase().includes(q) ||
      c.teacher?.toLowerCase().includes(q)
    );
  }, [availableClasses, searchQuery]);

  const transferMutation = useMutation({
    mutationFn: async () => {
      const updates = [];

      // Remove from old class
      if (currentClass) {
        const updatedOldNames = (currentClass.student_names || []).filter(n => n !== student.name);
        updates.push(base44.entities.DanceClass.update(currentClass.id, { student_names: updatedOldNames }));
      }

      // Add to new class
      if (selectedNewClass) {
        const updatedNewNames = [...(selectedNewClass.student_names || []), student.name];
        updates.push(base44.entities.DanceClass.update(selectedNewClass.id, { student_names: updatedNewNames }));
      }

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setStep('done');
    }
  });

  const handleConfirm = () => {
    transferMutation.mutate();
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('pick');
      setSelectedNewClass(null);
      setSearchQuery('');
    }, 300);
  };

  const dayLabel = (d) => ({ M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri', S: 'Sat', U: 'Sun' }[d] || d);
  const timeLabel = (t) => {
    if (!t && t !== 0) return '';
    const h = Math.floor(t);
    const m = (t % 1) * 60;
    const date = new Date();
    date.setHours(h, m);
    return format(date, 'h:mma');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-none rounded-[32px] shadow-2xl bg-white">
        <div className="relative overflow-hidden">
          {/* Header gradient */}
          <div 
            className="absolute inset-x-0 top-0 h-32 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(253,238,236,0.8) 0%, transparent 100%)',
            }}
          />

          <div className="relative p-6 pb-0">
            <div className="flex items-center gap-3 mb-1">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(145deg, rgba(164,139,196,0.2) 0%, rgba(180,160,200,0.15) 100%)' }}
              >
                <Sparkles className="w-5 h-5" style={{ color: '#8b7d9a' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#8b7d72' }}>
                  {step === 'done' ? 'Transfer Complete!' : 'Switch Class'}
                </h2>
                <p className="text-sm" style={{ color: '#b5a599' }}>
                  {step === 'done' ? `${student.name} is all set` : `Move ${student.name} to a new class`}
                </p>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: PICK NEW CLASS */}
            {step === 'pick' && (
              <motion.div
                key="pick"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-4"
              >
                {/* Current class indicator */}
                {currentClass && (
                  <div 
                    className="rounded-2xl p-4 flex items-center gap-4"
                    style={{ background: 'rgba(200,100,100,0.08)', border: '1px solid rgba(200,100,100,0.15)' }}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#c87070' }}>Leaving</div>
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: '#8b7d72' }}>{currentClass.title}</p>
                      <p className="text-xs" style={{ color: '#b5a599' }}>
                        {dayLabel(currentClass.day)} {timeLabel(currentClass.start_time)} · {currentClass.teacher || 'Staff'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 rotate-90" style={{ color: '#d4c4ba' }} />
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#b5a599' }} />
                  <input
                    type="text"
                    placeholder="Search classes by name, style, or teacher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 rounded-2xl text-sm focus:outline-none transition-all"
                    style={{
                      background: 'rgba(240,235,230,0.5)',
                      border: '1px solid rgba(200,180,170,0.2)',
                      color: '#8b7d72',
                    }}
                  />
                </div>

                {/* Class list */}
                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                  {filteredClasses.length === 0 ? (
                    <div className="py-8 text-center text-sm" style={{ color: '#b5a599' }}>
                      No matching classes found
                    </div>
                  ) : (
                    filteredClasses.map(cls => {
                      const isSelected = selectedNewClass?.id === cls.id;
                      const spotCount = cls.student_names?.length || 0;
                      return (
                        <button
                          key={cls.id}
                          onClick={() => setSelectedNewClass(cls)}
                          className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01]"
                          style={{
                            background: isSelected 
                              ? 'linear-gradient(145deg, rgba(126,184,154,0.15) 0%, rgba(126,184,154,0.1) 100%)'
                              : 'rgba(255,255,255,0.5)',
                            border: isSelected ? '2px solid rgba(126,184,154,0.4)' : '2px solid transparent',
                            boxShadow: isSelected ? '0 4px 16px rgba(126,184,154,0.1)' : 'none',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium" style={{ color: '#8b7d72' }}>{cls.title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs flex items-center gap-1" style={{ color: '#b5a599' }}>
                                  <Calendar className="w-3 h-3" /> {dayLabel(cls.day)}
                                </span>
                                <span className="text-xs flex items-center gap-1" style={{ color: '#b5a599' }}>
                                  <Clock className="w-3 h-3" /> {timeLabel(cls.start_time)}
                                </span>
                                {cls.teacher && (
                                  <span className="text-xs flex items-center gap-1" style={{ color: '#b5a599' }}>
                                    <User className="w-3 h-3" /> {cls.teacher}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(240,235,230,0.6)', color: '#b5a599' }}>
                                {spotCount} enrolled
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5" style={{ color: '#7eb89a' }} />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Continue button */}
                <button
                  onClick={() => selectedNewClass && setStep('confirm')}
                  disabled={!selectedNewClass}
                  className="w-full py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: selectedNewClass ? '#1a1a1a' : 'rgba(200,180,170,0.3)',
                    color: selectedNewClass ? '#fff' : '#b5a599',
                    boxShadow: selectedNewClass ? '0 8px 24px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  Continue
                </button>
              </motion.div>
            )}

            {/* STEP 2: CONFIRM */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-5"
              >
                <div 
                  className="rounded-2xl p-5 space-y-4"
                  style={{ background: 'rgba(240,235,230,0.4)' }}
                >
                  {/* From */}
                  {currentClass && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,100,100,0.12)' }}>
                        <span className="text-xs" style={{ color: '#c87070' }}>✗</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#c87070' }}>Removing from</p>
                        <p className="font-medium" style={{ color: '#8b7d72' }}>{currentClass.title}</p>
                        <p className="text-xs" style={{ color: '#b5a599' }}>{dayLabel(currentClass.day)} {timeLabel(currentClass.start_time)}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <ArrowRight className="w-4 h-4 rotate-90" style={{ color: '#d4c4ba' }} />
                  </div>

                  {/* To */}
                  {selectedNewClass && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(126,184,154,0.15)' }}>
                        <span className="text-xs" style={{ color: '#7eb89a' }}>✓</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7eb89a' }}>Adding to</p>
                        <p className="font-medium" style={{ color: '#8b7d72' }}>{selectedNewClass.title}</p>
                        <p className="text-xs" style={{ color: '#b5a599' }}>{dayLabel(selectedNewClass.day)} {timeLabel(selectedNewClass.start_time)} · {selectedNewClass.teacher || 'Staff'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Effective date */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: '#b5a599' }}>
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl text-sm focus:outline-none"
                    style={{
                      background: 'rgba(240,235,230,0.5)',
                      border: '1px solid rgba(200,180,170,0.2)',
                      color: '#8b7d72',
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#b5a599' }}>
                    Past attendance records won't be affected
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('pick')}
                    className="flex-1 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01]"
                    style={{ background: 'rgba(240,235,230,0.5)', color: '#8b7d72' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={transferMutation.isPending}
                    className="flex-1 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                    style={{
                      background: '#1a1a1a',
                      color: '#fff',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }}
                  >
                    {transferMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Confirm Transfer'
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: DONE */}
            {step === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 text-center space-y-5"
              >
                <div
                  className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                  style={{ background: 'rgba(126,184,154,0.15)' }}
                >
                  <CheckCircle2 className="w-10 h-10" style={{ color: '#7eb89a' }} />
                </div>

                <div>
                  <p className="text-lg font-bold" style={{ color: '#8b7d72' }}>
                    {student.name} has been moved!
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#b5a599' }}>
                    {currentClass ? `${currentClass.title}` : 'No class'} → {selectedNewClass?.title}
                  </p>
                  <p className="text-xs mt-2" style={{ color: '#b5a599' }}>
                    Effective {format(new Date(effectiveDate), 'MMMM d, yyyy')}
                  </p>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01]"
                  style={{
                    background: '#1a1a1a',
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  }}
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}