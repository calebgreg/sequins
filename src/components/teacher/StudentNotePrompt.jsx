import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, ArrowRight, SkipForward } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from 'framer-motion';

export default function StudentNotePrompt({
  classData,
  studentsToPrompt,
  currentIndex,
  teacherName,
  onNext,
  onComplete,
}) {
  const [noteContent, setNoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentStudent = studentsToPrompt[currentIndex];
  const isLastStudent = currentIndex === studentsToPrompt.length - 1;

  const handleSubmitNote = async () => {
    setIsLoading(true);
    try {
      if (noteContent.trim()) {
        await base44.entities.StudentNote.create({
          student_name: currentStudent.name,
          class_name: classData.title,
          teacher_name: teacherName,
          content: noteContent.trim(),
          category: 'progress',
          sentiment: 'neutral',
          date: new Date().toISOString().split('T')[0],
        });
      }
      
      setNoteContent('');
      
      if (isLastStudent) {
        toast.success('Class notes saved!');
        onComplete();
      } else {
        onNext();
      }
    } catch (error) {
      console.error('Failed to save student note:', error);
      toast.error('Failed to save note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setNoteContent('');
    if (isLastStudent) {
      onComplete();
    } else {
      onNext();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F4F4F6]">
      <div className="px-8 py-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-[#333333]">Quick Note</h2>
              <p className="text-sm text-gray-400">Student {currentIndex + 1} of {studentsToPrompt.length}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {studentsToPrompt.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 w-8 rounded-full transition-colors ${
                  idx < currentIndex ? 'bg-indigo-600' : idx === currentIndex ? 'bg-indigo-400' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 pb-8 flex flex-col max-w-3xl mx-auto w-full justify-center">
        <motion.div
          key={currentStudent.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-[32px] p-8 shadow-lg space-y-6"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-[#F4F4F6] flex items-center justify-center text-3xl font-serif text-[#333333] mx-auto mb-4">
              {currentStudent.name.charAt(0)}
            </div>
            <h3 className="font-serif text-3xl text-[#333333] mb-2">{currentStudent.name}</h3>
            <p className="text-gray-500 font-serif text-lg">What stood out today?</p>
          </div>

          <Textarea
            placeholder="Share any progress, achievements, struggles, or areas to work on..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="min-h-[150px] bg-gray-50 border-gray-200 focus:bg-white transition-colors text-lg p-4 resize-none"
            disabled={isLoading}
            autoFocus
          />

          <div className="flex gap-3">
            <Button
              onClick={handleSkip}
              variant="outline"
              className="flex-1 rounded-full h-14 text-lg font-serif border-gray-200 hover:bg-gray-50"
              disabled={isLoading}
            >
              <SkipForward className="w-5 h-5 mr-2" />
              {isLastStudent ? 'Finish' : 'Skip'}
            </Button>
            <Button
              onClick={handleSubmitNote}
              className="flex-1 rounded-full bg-[#333333] text-white hover:bg-black h-14 text-lg font-serif shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : isLastStudent ? 'Save & Finish' : 'Next'}
              {!isLoading && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}