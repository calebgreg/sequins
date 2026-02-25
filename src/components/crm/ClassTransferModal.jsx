import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowRight, CheckCircle2, Loader2, Search, Sparkles, Calendar, Clock, User, MinusCircle, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const dayLabel = (d) => ({ M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri', S: 'Sat', U: 'Sun' }[d] || d);
const timeLabel = (t) => {
  if (!t && t !== 0) return '';
  const h = Math.floor(t);
  const m = (t % 1) * 60;
  const date = new Date();
  date.setHours(h, m);
  return format(date, 'h:mma');
};

export default function ClassTransferModal({ isOpen, onOpenChange, student, currentClass, allClasses = [] }) {
  const [mode, setMode] = useState(null); // null | 'switch' | 'drop'
  const [selectedNewClass, setSelectedNewClass] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState('choose'); // 'choose' | 'pick' | 'confirm' | 'done'
  const [issueCredit, setIssueCredit] = useState(false);
  const [creditNote, setCreditNote] = useState('');
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

  // Calculate billing context
  const billingInfo = useMemo(() => {
    if (!currentClass) return null;
    const cost = currentClass.tuition_cost || 0;
    if (!cost) return null;

    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - today.getDate();
    const prorated = Math.round((cost * remainingDays / daysInMonth) * 100) / 100;
    return { monthlyCost: cost, proratedCredit: prorated, remainingDays };
  }, [currentClass]);

  const actionMutation = useMutation({
    mutationFn: async () => {
      const updates = [];

      // Remove from old class
      if (currentClass) {
        const updatedOldNames = (currentClass.student_names || []).filter(n => n !== student.name);
        updates.push(base44.entities.DanceClass.update(currentClass.id, { student_names: updatedOldNames }));
      }

      // Add to new class (switch only)
      if (mode === 'switch' && selectedNewClass) {
        const updatedNewNames = [...(selectedNewClass.student_names || []), student.name];
        updates.push(base44.entities.DanceClass.update(selectedNewClass.id, { student_names: updatedNewNames }));
      }

      await Promise.all(updates);

      // Create credit transaction if requested
      if (mode === 'drop' && issueCredit && billingInfo?.proratedCredit > 0) {
        await base44.entities.Transaction.create({
          parent_email: student.parent_email,
          student_name: student.name,
          type: 'credit',
          amount: billingInfo.proratedCredit,
          status: 'succeeded',
          description: creditNote || `Prorated credit for dropping ${currentClass.title}`,
          date: new Date().toISOString().split('T')[0],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setStep('done');
    }
  });

  const handleConfirm = () => actionMutation.mutate();

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('choose');
      setMode(null);
      setSelectedNewClass(null);
      setSearchQuery('');
      setIssueCredit(false);
      setCreditNote('');
    }, 300);
  };

  const headerTitle = step === 'done'
    ? (mode === 'drop' ? 'Class Dropped' : 'Transfer Complete!')
    : (mode === 'drop' ? 'Drop Class' : mode === 'switch' ? 'Switch Class' : 'Manage Enrollment');

  const headerSub = step === 'done'
    ? `${student.name} is all set`
    : (mode ? `${student.name} · ${currentClass?.title || ''}` : `What would you like to do for ${student.name}?`);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-none rounded-[32px] shadow-2xl bg-white">
        <div className="relative overflow-hidden">
          <div 
            className="absolute inset-x-0 top-0 h-32 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(253,238,236,0.8) 0%, transparent 100%)' }}
          />

          {/* Header */}
          <div className="relative p-6 pb-0">
            <div className="flex items-center gap-3 mb-1">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: mode === 'drop' ? 'rgba(200,100,100,0.12)' : 'linear-gradient(145deg, rgba(164,139,196,0.2) 0%, rgba(180,160,200,0.15) 100%)' }}
              >
                {mode === 'drop' 
                  ? <MinusCircle className="w-5 h-5" style={{ color: '#c87070' }} />
                  : <Sparkles className="w-5 h-5" style={{ color: '#8b7d9a' }} />
                }
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#8b7d72' }}>{headerTitle}</h2>
                <p className="text-sm" style={{ color: '#b5a599' }}>{headerSub}</p>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* STEP 0: CHOOSE ACTION */}
            {step === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-3"
              >
                {/* Current class context */}
                {currentClass && (
                  <div 
                    className="rounded-2xl p-4 flex items-center gap-4 mb-2"
                    style={{ background: 'rgba(240,235,230,0.4)' }}
                  >
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: '#8b7d72' }}>{currentClass.title}</p>
                      <p className="text-xs" style={{ color: '#b5a599' }}>
                        {dayLabel(currentClass.day)} {timeLabel(currentClass.start_time)} · {currentClass.teacher || 'Staff'}
                        {billingInfo ? ` · $${billingInfo.monthlyCost}/mo` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Switch option */}
                <button
                  onClick={() => { setMode('switch'); setStep('pick'); }}
                  className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01] group"
                  style={{
                    background: 'rgba(255,255,255,0.5)',
                    border: '2px solid rgba(164,139,196,0.15)',
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(164,139,196,0.15)' }}>
                      <ArrowRight className="w-5 h-5" style={{ color: '#8b7d9a' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold" style={{ color: '#8b7d72' }}>Switch to Another Class</p>
                      <p className="text-sm" style={{ color: '#b5a599' }}>Move to a different class — keeps them enrolled</p>
                    </div>
                  </div>
                </button>

                {/* Drop option */}
                <button
                  onClick={() => { setMode('drop'); setStep('confirm'); }}
                  className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01] group"
                  style={{
                    background: 'rgba(255,255,255,0.5)',
                    border: '2px solid rgba(200,100,100,0.1)',
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,100,100,0.1)' }}>
                      <MinusCircle className="w-5 h-5" style={{ color: '#c87070' }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold" style={{ color: '#8b7d72' }}>Drop This Class</p>
                      <p className="text-sm" style={{ color: '#b5a599' }}>Remove from roster — option to issue a credit</p>
                    </div>
                  </div>
                </button>
              </motion.div>
            )}

            {/* STEP 1: PICK NEW CLASS (switch only) */}
            {step === 'pick' && mode === 'switch' && (
              <motion.div
                key="pick"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-4"
              >
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#b5a599' }} />
                  <input
                    type="text"
                    placeholder="Search classes by name, style, or teacher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 rounded-2xl text-sm focus:outline-none transition-all"
                    style={{ background: 'rgba(240,235,230,0.5)', border: '1px solid rgba(200,180,170,0.2)', color: '#8b7d72' }}
                  />
                </div>

                {/* Class list */}
                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                  {filteredClasses.length === 0 ? (
                    <div className="py-8 text-center text-sm" style={{ color: '#b5a599' }}>No matching classes found</div>
                  ) : (
                    filteredClasses.map(cls => {
                      const isSelected = selectedNewClass?.id === cls.id;
                      return (
                        <button
                          key={cls.id}
                          onClick={() => setSelectedNewClass(cls)}
                          className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01]"
                          style={{
                            background: isSelected ? 'linear-gradient(145deg, rgba(126,184,154,0.15) 0%, rgba(126,184,154,0.1) 100%)' : 'rgba(255,255,255,0.5)',
                            border: isSelected ? '2px solid rgba(126,184,154,0.4)' : '2px solid transparent',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium" style={{ color: '#8b7d72' }}>{cls.title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs flex items-center gap-1" style={{ color: '#b5a599' }}><Calendar className="w-3 h-3" /> {dayLabel(cls.day)}</span>
                                <span className="text-xs flex items-center gap-1" style={{ color: '#b5a599' }}><Clock className="w-3 h-3" /> {timeLabel(cls.start_time)}</span>
                                {cls.teacher && <span className="text-xs flex items-center gap-1" style={{ color: '#b5a599' }}><User className="w-3 h-3" /> {cls.teacher}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(240,235,230,0.6)', color: '#b5a599' }}>
                                {cls.student_names?.length || 0} enrolled
                              </span>
                              {isSelected && <CheckCircle2 className="w-5 h-5" style={{ color: '#7eb89a' }} />}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep('choose'); setMode(null); setSelectedNewClass(null); }}
                    className="flex-1 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01]"
                    style={{ background: 'rgba(240,235,230,0.5)', color: '#8b7d72' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => selectedNewClass && setStep('confirm')}
                    disabled={!selectedNewClass}
                    className="flex-1 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: selectedNewClass ? '#1a1a1a' : 'rgba(200,180,170,0.3)',
                      color: selectedNewClass ? '#fff' : '#b5a599',
                    }}
                  >
                    Continue
                  </button>
                </div>
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
                <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(240,235,230,0.4)' }}>
                  {/* From */}
                  {currentClass && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,100,100,0.12)' }}>
                        <span className="text-xs" style={{ color: '#c87070' }}>✗</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#c87070' }}>
                          {mode === 'drop' ? 'Dropping' : 'Removing from'}
                        </p>
                        <p className="font-medium" style={{ color: '#8b7d72' }}>{currentClass.title}</p>
                        <p className="text-xs" style={{ color: '#b5a599' }}>{dayLabel(currentClass.day)} {timeLabel(currentClass.start_time)}</p>
                      </div>
                    </div>
                  )}

                  {/* To (switch only) */}
                  {mode === 'switch' && selectedNewClass && (
                    <>
                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 rotate-90" style={{ color: '#d4c4ba' }} />
                      </div>
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
                    </>
                  )}
                </div>

                {/* Effective date */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: '#b5a599' }}>Effective Date</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl text-sm focus:outline-none"
                    style={{ background: 'rgba(240,235,230,0.5)', border: '1px solid rgba(200,180,170,0.2)', color: '#8b7d72' }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#b5a599' }}>Past attendance records won't be affected</p>
                </div>

                {/* Billing section (drop only, and only if class has a cost) */}
                {mode === 'drop' && billingInfo && (
                  <div 
                    className="rounded-2xl p-4 space-y-3"
                    style={{ background: 'rgba(164,139,196,0.08)', border: '1px solid rgba(164,139,196,0.15)' }}
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" style={{ color: '#8b7d9a' }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8b7d9a' }}>Billing Impact</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#8b7d72' }}>Monthly tuition for this class</span>
                      <span className="font-medium" style={{ color: '#8b7d72' }}>${billingInfo.monthlyCost}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#8b7d72' }}>Prorated credit ({billingInfo.remainingDays} days remaining)</span>
                      <span className="font-medium" style={{ color: '#7eb89a' }}>${billingInfo.proratedCredit}</span>
                    </div>

                    <div 
                      className="flex items-center justify-between pt-3"
                      style={{ borderTop: '1px solid rgba(164,139,196,0.15)' }}
                    >
                      <label className="text-sm font-medium cursor-pointer flex items-center gap-2" style={{ color: '#8b7d72' }}>
                        <input
                          type="checkbox"
                          checked={issueCredit}
                          onChange={(e) => setIssueCredit(e.target.checked)}
                          className="rounded"
                        />
                        Issue account credit
                      </label>
                      {issueCredit && (
                        <span className="text-sm font-bold" style={{ color: '#7eb89a' }}>${billingInfo.proratedCredit}</span>
                      )}
                    </div>

                    {issueCredit && (
                      <input
                        type="text"
                        placeholder="Credit note (optional)"
                        value={creditNote}
                        onChange={(e) => setCreditNote(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl text-sm focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(200,180,170,0.2)', color: '#8b7d72' }}
                      />
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (mode === 'switch') { setStep('pick'); }
                      else { setStep('choose'); setMode(null); }
                    }}
                    className="flex-1 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01]"
                    style={{ background: 'rgba(240,235,230,0.5)', color: '#8b7d72' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={actionMutation.isPending}
                    className="flex-1 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                    style={{
                      background: mode === 'drop' ? '#c87070' : '#1a1a1a',
                      color: '#fff',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }}
                  >
                    {actionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      mode === 'drop' ? 'Confirm Drop' : 'Confirm Transfer'
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
                  style={{ background: mode === 'drop' ? 'rgba(200,100,100,0.1)' : 'rgba(126,184,154,0.15)' }}
                >
                  <CheckCircle2 className="w-10 h-10" style={{ color: mode === 'drop' ? '#c87070' : '#7eb89a' }} />
                </div>

                <div>
                  <p className="text-lg font-bold" style={{ color: '#8b7d72' }}>
                    {mode === 'drop' 
                      ? `${student.name} dropped from ${currentClass?.title}`
                      : `${student.name} has been moved!`
                    }
                  </p>
                  {mode === 'switch' && (
                    <p className="text-sm mt-1" style={{ color: '#b5a599' }}>
                      {currentClass?.title} → {selectedNewClass?.title}
                    </p>
                  )}
                  <p className="text-xs mt-2" style={{ color: '#b5a599' }}>
                    Effective {format(new Date(effectiveDate), 'MMMM d, yyyy')}
                  </p>
                  {mode === 'drop' && issueCredit && billingInfo && (
                    <p className="text-sm mt-3 font-medium" style={{ color: '#7eb89a' }}>
                      ${billingInfo.proratedCredit} credit applied to account
                    </p>
                  )}
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-4 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01]"
                  style={{ background: '#1a1a1a', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
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