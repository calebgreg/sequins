import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, Users, Check, ArrowRight, ChevronLeft } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function MakeupClassModal({ isOpen, onOpenChange, absenceRecord, studentName }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [step, setStep] = useState('select_class'); // 'select_class', 'select_date', 'confirm'
  const queryClient = useQueryClient();

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list()
  });

  // Get next 2 weeks of dates
  const upcomingDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      dates.push(addDays(today, i));
    }
    return dates;
  }, []);

  // Get available dates for selected class
  const availableDates = useMemo(() => {
    if (!selectedClass) return [];
    const dayMap = { 'U': 0, 'M': 1, 'T': 2, 'W': 3, 'R': 4, 'F': 5, 'S': 6 };
    const classDay = dayMap[selectedClass.day];
    return upcomingDates.filter(date => date.getDay() === classDay);
  }, [selectedClass, upcomingDates]);

  const assignMakeupMutation = useMutation({
    mutationFn: async () => {
      // Update the original absence record with makeup info
      await base44.entities.Attendance.update(absenceRecord.id, {
        makeup_class_id: selectedClass.id,
        makeup_class_name: selectedClass.title,
        makeup_date: format(selectedDate, 'yyyy-MM-dd')
      });

      // Add student to the makeup class roster if not already there
      if (!selectedClass.student_names?.includes(studentName)) {
        const updatedStudents = [...(selectedClass.student_names || []), studentName];
        await base44.entities.DanceClass.update(selectedClass.id, {
          student_names: updatedStudents
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Makeup class scheduled!');
      onOpenChange(false);
      resetState();
    },
    onError: () => {
      toast.error('Failed to schedule makeup class');
    }
  });

  const resetState = () => {
    setSelectedClass(null);
    setSelectedDate(null);
    setStep('select_class');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const handleSelectClass = (cls) => {
    setSelectedClass(cls);
    setStep('select_date');
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setStep('confirm');
  };

  const handleConfirm = () => {
    assignMakeupMutation.mutate();
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.6)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
  };

  const selectedCardStyle = {
    background: 'linear-gradient(145deg, rgba(164,139,196,0.2) 0%, rgba(180,160,200,0.15) 100%)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5), 0 0 0 2px rgba(164,139,196,0.4)',
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-none" style={{ background: '#faf8f7' }}>
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            {step !== 'select_class' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep(step === 'confirm' ? 'select_date' : 'select_class')}
                className="rounded-full w-8 h-8"
                style={{ background: 'rgba(255,255,255,0.6)', color: '#8b7d72' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="text-xl font-medium" style={{ color: '#8b7d72' }}>
                {step === 'select_class' && 'Schedule Makeup Class'}
                {step === 'select_date' && 'Select Date'}
                {step === 'confirm' && 'Confirm Makeup'}
              </DialogTitle>
              <p className="text-sm mt-1" style={{ color: '#b5a599' }}>
                {studentName} • Missed {absenceRecord?.class_name} on {absenceRecord?.date && format(new Date(absenceRecord.date), 'MMM d')}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Select Class */}
            {step === 'select_class' && (
              <motion.div
                key="select_class"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <p className="text-sm mb-4" style={{ color: '#9a8b80' }}>
                  Choose a class for the makeup:
                </p>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {classes.filter(c => c.type !== 'admin').map((cls) => {
                      const dayNames = { 'U': 'Sun', 'M': 'Mon', 'T': 'Tue', 'W': 'Wed', 'R': 'Thu', 'F': 'Fri', 'S': 'Sat' };
                      return (
                        <button
                          key={cls.id}
                          onClick={() => handleSelectClass(cls)}
                          className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                          style={cardStyle}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium" style={{ color: '#8b7d72' }}>{cls.title}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#b5a599' }}>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {dayNames[cls.day]}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mma')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {cls.student_names?.length || 0}
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4" style={{ color: '#c4b5ab' }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </motion.div>
            )}

            {/* Step 2: Select Date */}
            {step === 'select_date' && (
              <motion.div
                key="select_date"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div 
                  className="p-3 rounded-xl mb-4"
                  style={{ background: 'rgba(164,139,196,0.1)' }}
                >
                  <p className="font-medium text-sm" style={{ color: '#8b7d9a' }}>
                    {selectedClass?.title}
                  </p>
                </div>
                <p className="text-sm mb-4" style={{ color: '#9a8b80' }}>
                  Select a date for the makeup class:
                </p>
                <ScrollArea className="h-[250px] pr-4">
                  <div className="space-y-2">
                    {availableDates.map((date) => (
                      <button
                        key={date.toISOString()}
                        onClick={() => handleSelectDate(date)}
                        className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={selectedDate && isSameDay(selectedDate, date) ? selectedCardStyle : cardStyle}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ background: 'rgba(164,139,196,0.15)' }}
                            >
                              <span className="text-lg font-light" style={{ color: '#8b7d9a' }}>
                                {format(date, 'd')}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium" style={{ color: '#8b7d72' }}>
                                {format(date, 'EEEE')}
                              </p>
                              <p className="text-xs" style={{ color: '#b5a599' }}>
                                {format(date, 'MMMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          {selectedDate && isSameDay(selectedDate, date) && (
                            <Check className="w-5 h-5" style={{ color: '#8b7d9a' }} />
                          )}
                        </div>
                      </button>
                    ))}
                    {availableDates.length === 0 && (
                      <div className="text-center py-8" style={{ color: '#b5a599' }}>
                        No upcoming dates for this class
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </motion.div>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div 
                  className="p-5 rounded-2xl text-center"
                  style={{
                    background: 'linear-gradient(145deg, rgba(164,139,196,0.15) 0%, rgba(180,160,200,0.1) 100%)',
                  }}
                >
                  <p className="text-sm mb-2" style={{ color: '#9a8b80' }}>Makeup Class</p>
                  <p className="text-xl font-medium mb-1" style={{ color: '#8b7d72' }}>
                    {selectedClass?.title}
                  </p>
                  <p className="text-lg" style={{ color: '#8b7d9a' }}>
                    {selectedDate && format(selectedDate, 'EEEE, MMMM d')}
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#b5a599' }}>
                    {selectedClass && format(new Date().setHours(Math.floor(selectedClass.start_time), (selectedClass.start_time % 1) * 60), 'h:mm a')}
                  </p>
                </div>

                <p className="text-sm text-center" style={{ color: '#9a8b80' }}>
                  {studentName} will be added to the class roster for this date.
                </p>

                <Button
                  onClick={handleConfirm}
                  disabled={assignMakeupMutation.isPending}
                  className="w-full h-12 rounded-xl text-base font-medium"
                  style={{
                    background: 'linear-gradient(145deg, rgba(164,139,196,0.9) 0%, rgba(140,115,175,0.85) 100%)',
                    color: 'white',
                    boxShadow: '0 4px 12px -2px rgba(164,139,196,0.4)',
                  }}
                >
                  {assignMakeupMutation.isPending ? 'Scheduling...' : 'Confirm Makeup Class'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}