import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save, ArrowLeft, Trash2 } from 'lucide-react';
import ClassImport from './ClassImport';
import ConflictAlert from './ConflictAlert';
import { motion, AnimatePresence } from 'framer-motion';

const formatTime = (val) => {
  const hours = Math.floor(val);
  const minutes = Math.round((val - hours) * 60);
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes}${period}`;
};

export default function ImportScheduleModal({ isOpen, onOpenChange, existingClasses }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'review'
  const [importedClasses, setImportedClasses] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  
  const queryClient = useQueryClient();

  const createClassesMutation = useMutation({
    mutationFn: (newClasses) => base44.entities.DanceClass.bulkCreate(newClasses),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      handleClose();
    }
  });

  const handleClose = () => {
    setStep('upload');
    setImportedClasses([]);
    setConflicts([]);
    onOpenChange(false);
  };

  const analyzeSchedule = (newClasses) => {
    // Compare new classes against existing ones for conflicts
    const all = [...existingClasses, ...newClasses];
    const issues = [];

    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        
        if (a.day !== b.day) continue;

        const aEnd = a.start_time + a.duration;
        const bEnd = b.start_time + b.duration;
        
        // Check for time overlap
        if ((a.start_time < bEnd) && (aEnd > b.start_time)) {
          // Teacher Conflict
          if (a.teacher && b.teacher && a.teacher === b.teacher) {
             issues.push({
               type: 'TEACHER_OVERLAP',
               description: `${a.teacher} is scheduled for "${a.title}" and "${b.title}" at the same time on ${a.day}.`
             });
          }
          // Room Conflict
          if (a.room && b.room && a.room === b.room) {
             issues.push({
               type: 'ROOM_DOUBLE_BOOKED',
               description: `${a.room} is double booked for "${a.title}" and "${b.title}" on ${a.day}.`
             });
          }
        }
      }
    }
    return issues;
  };

  const handleImport = (data) => {
    const formatted = data.map(c => ({
      ...c,
      student_names: [], 
      color: ['pink', 'charcoal'][Math.floor(Math.random() * 2)]
    }));
    setImportedClasses(formatted);
    setConflicts(analyzeSchedule(formatted));
    setStep('review');
  };

  const handlePublish = () => {
    createClassesMutation.mutate(importedClasses);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-[#F9F9FA]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-[#333333]">
              {step === 'upload' ? 'Import Schedule' : 'Review & Publish'}
            </DialogTitle>
            <DialogDescription>
              {step === 'upload' 
                ? 'Upload a PDF or image of your class schedule.' 
                : `Found ${importedClasses.length} classes. Please review before publishing.`}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 'upload' ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ClassImport onImportComplete={handleImport} />
              </motion.div>
            ) : (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <ConflictAlert conflicts={conflicts} />

                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">Draft Classes</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-[#333333]"
                      onClick={() => setStep('upload')}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="divide-y divide-gray-100">
                      {importedClasses.map((cls, idx) => (
                        <div key={idx} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-[#F2DCDD] flex items-center justify-center font-serif text-lg text-[#5A4A4B]">
                            {cls.day}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-[#333333] truncate">{cls.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <span>{formatTime(cls.start_time)} - {formatTime(cls.start_time + cls.duration)}</span>
                              {cls.teacher && <span className="text-gray-400">|</span>}
                              {cls.teacher && <span>{cls.teacher}</span>}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-300 hover:text-red-400"
                            onClick={() => setImportedClasses(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 'review' && (
          <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button 
              onClick={handlePublish}
              disabled={createClassesMutation.isPending}
              className="bg-[#333333] hover:bg-black text-white gap-2"
            >
              {createClassesMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Publish Schedule
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}