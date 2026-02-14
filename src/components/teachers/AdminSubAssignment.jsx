import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { X, ChevronLeft, ChevronRight, Check, Calendar, User, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminSubAssignment = ({ onClose, studioId }) => {
  const [step, setStep] = useState(1); // 1: select class, 2: select date, 3: select sub, 4: confirm
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [notes, setNotes] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  
  const queryClient = useQueryClient();

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['classes', studioId],
    queryFn: () => base44.entities.DanceClass.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  // Fetch teachers
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', studioId],
    queryFn: () => base44.entities.Teacher.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  // Fetch existing sub assignments
  const { data: existingAssignments = [] } = useQuery({
    queryKey: ['subAssignments', studioId],
    queryFn: () => base44.entities.SubAssignment.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  // Get current user for assigned_by
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Create sub assignment mutation
  const createAssignment = useMutation({
    mutationFn: (data) => base44.entities.SubAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subAssignments'] });
      setStep(5); // Success step
    },
  });

  // Filter to only regular classes (not admin tasks)
  const regularClasses = classes.filter(c => c.type !== 'admin' && c.teacher);

  // Get available subs (teachers other than the selected class's teacher)
  const availableSubs = useMemo(() => {
    if (!selectedClass) return [];
    return teachers.filter(t => 
      t.name !== selectedClass.teacher && t.name
    );
  }, [selectedClass, teachers]);

  // Generate dates for the selected class's day
  const availableDates = useMemo(() => {
    if (!selectedClass) return [];
    const dayMap = { 'U': 0, 'M': 1, 'T': 2, 'W': 3, 'R': 4, 'F': 5, 'S': 6 };
    const targetDay = dayMap[selectedClass.day];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day so today is included
    const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });
    
    const dates = [];
    for (let i = 0; i < 4; i++) {
      const weekDate = addDays(weekStart, i * 7 + targetDay);
      if (weekDate >= today) {
        // Check if there's already an assignment for this date
        const hasAssignment = existingAssignments.some(a => 
          a.class_id === selectedClass.id && 
          a.date === format(weekDate, 'yyyy-MM-dd') &&
          a.status !== 'cancelled'
        );
        dates.push({ date: weekDate, hasAssignment });
      }
    }
    return dates;
  }, [selectedClass, weekOffset, existingAssignments]);

  const handleConfirm = () => {
    if (!selectedClass || !selectedDate || !selectedSub) return;

    createAssignment.mutate({
      studio_id: studioId,
      class_id: selectedClass.id,
      class_name: selectedClass.title,
      original_teacher: selectedClass.teacher,
      sub_teacher: selectedSub.name,
      sub_teacher_id: selectedSub.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedClass.start_time,
      duration: selectedClass.duration || 1,
      status: 'scheduled',
      assigned_by: currentUser?.email,
      notes: notes || null,
    });
  };

  const dayCodeToName = {
    'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 
    'R': 'Thursday', 'F': 'Friday', 'S': 'Saturday', 'U': 'Sunday'
  };

  const formatTime = (time) => {
    const hour = Math.floor(time);
    const min = Math.round((time % 1) * 60);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.6)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
  };

  const selectedCardStyle = {
    background: 'linear-gradient(145deg, rgba(126,184,154,0.15) 0%, rgba(140,190,165,0.1) 100%)',
    border: '2px solid rgba(126,184,154,0.4)',
    boxShadow: '0 4px 12px rgba(126,184,154,0.15)',
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ 
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: 'rgba(180,170,160,0.3)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg rounded-[32px] overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, rgba(255,253,252,0.98) 0%, rgba(253,248,246,0.95) 100%)',
          boxShadow: '0 30px 100px -20px rgba(160,140,130,0.25), inset 0 1px 1px rgba(255,255,255,0.9)',
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step > 1 && step < 5 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-black/5"
                style={{ color: '#b5a599' }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold" style={{ color: '#8b7d72' }}>
                {step === 5 ? 'Sub Assigned!' : 'Assign Substitute'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#b5a599' }}>
                {step === 1 && 'Step 1: Select a class'}
                {step === 2 && 'Step 2: Pick the date'}
                {step === 3 && 'Step 3: Choose a sub'}
                {step === 4 && 'Step 4: Confirm assignment'}
                {step === 5 && 'Assignment created successfully'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-black/5"
            style={{ color: '#b5a599' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        {step < 5 && (
          <div className="px-8 pb-4">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(200,190,180,0.2)' }}>
              <motion.div 
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #7eb89a, #6aa888)' }}
                initial={{ width: '0%' }}
                animate={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-8 pb-6 min-h-[320px] max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            
            {/* Step 1: Select Class */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {regularClasses.length === 0 ? (
                  <div className="text-center py-8" style={{ color: '#b5a599' }}>
                    No classes with assigned teachers found
                  </div>
                ) : (
                  regularClasses.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => { setSelectedClass(cls); setStep(2); }}
                      className="w-full rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
                      style={selectedClass?.id === cls.id ? selectedCardStyle : cardStyle}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,1)',
                          }}
                        >
                          <span className="text-lg font-medium" style={{ color: '#c9a99c' }}>
                            {cls.title.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate" style={{ color: '#6b5d52' }}>{cls.title}</h3>
                          <p className="text-sm" style={{ color: '#a8998e' }}>
                            {dayCodeToName[cls.day]} {formatTime(cls.start_time)} · {cls.teacher}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5" style={{ color: '#c4b5ab' }} />
                      </div>
                    </button>
                  ))
                )}
              </motion.div>
            )}

            {/* Step 2: Select Date */}
            {step === 2 && selectedClass && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Selected class summary */}
                <div 
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: 'rgba(200,190,180,0.1)' }}
                >
                  <Calendar className="w-5 h-5" style={{ color: '#a8998e' }} />
                  <div>
                    <p className="font-medium" style={{ color: '#6b5d52' }}>{selectedClass.title}</p>
                    <p className="text-sm" style={{ color: '#a8998e' }}>
                      Every {dayCodeToName[selectedClass.day]} at {formatTime(selectedClass.start_time)}
                    </p>
                  </div>
                </div>

                <p className="text-sm" style={{ color: '#8b7d72' }}>
                  Which {dayCodeToName[selectedClass.day]} needs coverage?
                </p>

                <div className="space-y-2">
                  {availableDates.map(({ date, hasAssignment }) => (
                    <button
                      key={date.toISOString()}
                      onClick={() => { if (!hasAssignment) { setSelectedDate(date); setStep(3); } }}
                      disabled={hasAssignment}
                      className={`w-full rounded-2xl p-4 text-left transition-all ${hasAssignment ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                      style={selectedDate && isSameDay(selectedDate, date) ? selectedCardStyle : cardStyle}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium" style={{ color: '#6b5d52' }}>
                            {format(date, 'EEEE, MMMM d')}
                          </p>
                          <p className="text-sm" style={{ color: '#a8998e' }}>
                            {format(date, 'yyyy')}
                          </p>
                        </div>
                        {hasAssignment ? (
                          <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(212,165,116,0.2)', color: '#d4a574' }}>
                            Already covered
                          </span>
                        ) : (
                          <ChevronRight className="w-5 h-5" style={{ color: '#c4b5ab' }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Week navigation */}
                <div className="flex justify-center gap-4 pt-2">
                  <button
                    onClick={() => setWeekOffset(w => w - 1)}
                    className="text-sm px-4 py-2 rounded-xl transition-all hover:bg-black/5"
                    style={{ color: '#a8998e' }}
                  >
                    ← Earlier
                  </button>
                  <button
                    onClick={() => setWeekOffset(w => w + 1)}
                    className="text-sm px-4 py-2 rounded-xl transition-all hover:bg-black/5"
                    style={{ color: '#a8998e' }}
                  >
                    Later →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Select Sub */}
            {step === 3 && selectedClass && selectedDate && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Summary */}
                <div 
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(200,190,180,0.1)' }}
                >
                  <p className="font-medium" style={{ color: '#6b5d52' }}>{selectedClass.title}</p>
                  <p className="text-sm" style={{ color: '#a8998e' }}>
                    {format(selectedDate, 'EEEE, MMMM d')} at {formatTime(selectedClass.start_time)}
                  </p>
                </div>

                <p className="text-sm" style={{ color: '#8b7d72' }}>
                  Who will cover for {selectedClass.teacher?.split(' ')[0]}?
                </p>

                <div className="space-y-2">
                  {availableSubs.length === 0 ? (
                    <div className="text-center py-8" style={{ color: '#b5a599' }}>
                      No other teachers available
                    </div>
                  ) : (
                    availableSubs.map((teacher) => (
                      <button
                        key={teacher.id}
                        onClick={() => { setSelectedSub(teacher); setStep(4); }}
                        className="w-full rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
                        style={selectedSub?.id === teacher.id ? selectedCardStyle : cardStyle}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
                              boxShadow: 'inset 0 1px 1px rgba(255,255,255,1)',
                            }}
                          >
                            <span className="text-sm font-medium" style={{ color: '#c9a99c' }}>
                              {teacher.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium" style={{ color: '#6b5d52' }}>{teacher.name}</p>
                            {teacher.styles?.length > 0 && (
                              <p className="text-xs" style={{ color: '#b5a599' }}>
                                {teacher.styles.slice(0, 3).join(' · ')}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5" style={{ color: '#c4b5ab' }} />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && selectedClass && selectedDate && selectedSub && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div 
                  className="rounded-2xl p-5"
                  style={{
                    background: 'linear-gradient(145deg, rgba(126,184,154,0.1) 0%, rgba(140,190,165,0.08) 100%)',
                    border: '1px solid rgba(126,184,154,0.2)',
                  }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5" style={{ color: '#7eb89a' }} />
                      <div>
                        <p className="text-xs uppercase tracking-wider" style={{ color: '#7eb89a' }}>Class</p>
                        <p className="font-medium" style={{ color: '#5a7d6a' }}>{selectedClass.title}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5" style={{ color: '#7eb89a' }} />
                      <div>
                        <p className="text-xs uppercase tracking-wider" style={{ color: '#7eb89a' }}>Date & Time</p>
                        <p className="font-medium" style={{ color: '#5a7d6a' }}>
                          {format(selectedDate, 'EEEE, MMMM d')} at {formatTime(selectedClass.start_time)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5" style={{ color: '#7eb89a' }} />
                      <div>
                        <p className="text-xs uppercase tracking-wider" style={{ color: '#7eb89a' }}>Substitute</p>
                        <p className="font-medium" style={{ color: '#5a7d6a' }}>
                          {selectedSub.name} <span style={{ color: '#7eb89a' }}>(covering for {selectedClass.teacher})</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm mb-2 block" style={{ color: '#8b7d72' }}>Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions..."
                    rows={2}
                    className="w-full rounded-xl p-3 text-sm outline-none resize-none"
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.08)',
                      color: '#6b5d52',
                    }}
                  />
                </div>

                {/* Timecard notice */}
                <div 
                  className="rounded-xl p-4 flex gap-3"
                  style={{ background: 'rgba(200,190,180,0.1)' }}
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#a8998e' }} />
                  <p className="text-sm" style={{ color: '#8b7d72' }}>
                    This will show on <strong>{selectedSub.name.split(' ')[0]}'s timecard</strong> for {format(selectedDate, 'MMM d')}. 
                    The class returns to {selectedClass.teacher?.split(' ')[0]} the following week.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 5: Success */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'linear-gradient(145deg, rgba(126,184,154,0.2) 0%, rgba(140,190,165,0.15) 100%)' }}
                >
                  <Check className="w-8 h-8" style={{ color: '#7eb89a' }} />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#5a7d6a' }}>Sub Assigned!</h3>
                <p className="text-sm mb-6" style={{ color: '#8b7d72' }}>
                  {selectedSub?.name} will cover {selectedClass?.title} on {selectedDate ? format(selectedDate, 'MMM d') : ''}.
                </p>
                <div 
                  className="rounded-xl p-4 text-left"
                  style={{ background: 'rgba(200,190,180,0.1)' }}
                >
                  <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#b5a599' }}>What happens now</p>
                  <ul className="space-y-2 text-sm" style={{ color: '#8b7d72' }}>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: '#7eb89a' }} /> Class shows under {selectedSub?.name?.split(' ')[0]}'s schedule
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: '#7eb89a' }} /> Timecard hours credited to sub
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: '#7eb89a' }} /> Returns to {selectedClass?.teacher?.split(' ')[0]} next occurrence
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer Action */}
        <div 
          className="px-8 py-6"
          style={{ 
            background: 'rgba(250,245,243,0.5)',
            borderTop: '1px solid rgba(200,180,170,0.1)',
          }}
        >
          {step === 4 && (
            <button
              onClick={handleConfirm}
              disabled={createAssignment.isPending}
              className="w-full py-4 rounded-2xl text-sm font-medium transition-all hover:scale-[1.01] disabled:opacity-60"
              style={{
                background: 'linear-gradient(145deg, rgba(126,184,154,0.9) 0%, rgba(110,170,140,0.85) 100%)',
                color: '#fff',
                boxShadow: '0 8px 24px -8px rgba(126,184,154,0.4), inset 0 1px 1px rgba(255,255,255,0.2)',
              }}
            >
              {createAssignment.isPending ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          )}

          {step === 5 && (
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl text-sm font-medium transition-all"
              style={{
                background: 'rgba(255,255,255,0.6)',
                color: '#a8998e',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.08)',
              }}
            >
              Done
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminSubAssignment;