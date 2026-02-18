import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, ArrowRight, SkipForward, Mic, Square, TrendingUp } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from 'framer-motion';
import { processIndividualNote, fetchStudentHistory, generateNotePrompt } from './useNoteAI';

export default function StudentNotePrompt({
  classData,
  studentsToPrompt,
  currentIndex,
  teacherName,
  studioId,
  onNext,
  onComplete,
}) {
  const [noteContent, setNoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [smartPrompt, setSmartPrompt] = useState("What stood out today?");
  const [processedNote, setProcessedNote] = useState(null);
  const [recentNotes, setRecentNotes] = useState([]);
  const recognitionRef = useRef(null);

  const currentStudent = studentsToPrompt[currentIndex];
  const isLastStudent = currentIndex === studentsToPrompt.length - 1;

  // Frosted glass styles
  const cardStyle = {
    background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 15px 50px -15px rgba(180,150,140,0.15)',
  };

  const buttonStyle = {
    background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
    boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
    border: '1px solid rgba(255, 220, 210, 0.5)',
  };

  const textGradient = {
    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
  };

  // Fetch recent notes and generate smart prompt when student changes
  useEffect(() => {
    const loadContext = async () => {
      if (currentStudent) {
        const notes = await fetchStudentHistory(currentStudent.name, 5);
        setRecentNotes(notes);
        const prompt = await generateNotePrompt({
          student: currentStudent,
          classData,
          recentNotes: notes,
        });
        setSmartPrompt(prompt);
      }
    };
    loadContext();
    setProcessedNote(null);
    setNoteContent('');
  }, [currentStudent, classData]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setNoteContent(prev => prev + ' ' + finalTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleSubmitNote = async () => {
    setIsLoading(true);
    try {
      if (noteContent.trim()) {
        // Use AI to process and enrich the note
        const processed = await processIndividualNote({
          rawContent: noteContent,
          student: currentStudent,
          classData,
          teacherName,
          recentNotes,
        });

        const noteData = {
          studio_id: studioId,
          student_name: currentStudent.name,
          class_name: classData.title,
          teacher_name: teacherName,
          content: processed?.content || noteContent.trim(),
          category: processed?.category || 'progress',
          sentiment: processed?.sentiment || 'neutral',
          tags: processed?.tags || [],
          date: new Date().toISOString().split('T')[0],
        };

        await base44.entities.StudentNote.create(noteData);
        setProcessedNote(processed);
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
    <div 
      className="flex flex-col min-h-screen relative overflow-hidden"
      style={{ 
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: '#ffffff',
      }}
    >
      {/* Ambient background shapes */}
      <div 
        className="fixed top-[-20%] right-[-10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
      />
      <div 
        className="fixed bottom-[-30%] left-[-15%] w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <div className="relative px-4 md:px-8 py-6 md:py-8">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, rgba(180,160,190,0.2) 0%, rgba(160,140,170,0.15) 100%)',
              }}
            >
              <Sparkles className="w-5 h-5" style={{ color: '#9a8aad' }} />
            </div>
            <div>
              <h2 
                className="text-xl md:text-2xl font-bold tracking-tight"
                style={textGradient}
              >
                Quick Note
              </h2>
              <p className="text-xs" style={{ color: '#b5a599' }}>
                Student {currentIndex + 1} of {studentsToPrompt.length}
              </p>
            </div>
          </div>
          
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {studentsToPrompt.map((_, idx) => (
              <div
                key={idx}
                className="h-2 w-6 md:w-8 rounded-full transition-all"
                style={{
                  background: idx < currentIndex 
                    ? 'linear-gradient(145deg, rgba(180,160,190,0.6) 0%, rgba(160,140,170,0.5) 100%)'
                    : idx === currentIndex 
                    ? 'linear-gradient(145deg, rgba(244,180,180,0.8) 0%, rgba(232,160,160,0.7) 100%)'
                    : 'rgba(220,210,205,0.3)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 px-4 md:px-8 pb-8 flex flex-col max-w-3xl mx-auto w-full justify-center">
        <motion.div
          key={currentStudent.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="rounded-2xl md:rounded-3xl p-5 md:p-8 space-y-6"
          style={cardStyle}
        >
          {/* Student Info */}
          <div className="text-center mb-4">
            <div 
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-medium mx-auto mb-4"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                boxShadow: '0 8px 32px -8px rgba(180,150,140,0.25), inset 0 1px 1px rgba(255,255,255,1)',
                color: '#c9a99c',
              }}
            >
              {currentStudent.name.charAt(0)}
            </div>
            <h3 
              className="text-2xl md:text-3xl font-bold tracking-tight mb-2"
              style={textGradient}
            >
              {currentStudent.name}
            </h3>
            <p className="text-base md:text-lg" style={{ color: '#a8998e' }}>{smartPrompt}</p>
            
            {recentNotes.length > 0 && recentNotes[0].sentiment === 'constructive' && (
              <div 
                className="mt-4 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
                style={{
                  background: 'linear-gradient(145deg, rgba(212,165,116,0.15) 0%, rgba(212,165,116,0.1) 100%)',
                  color: '#c9a574',
                }}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Last: {recentNotes[0].content.slice(0, 35)}...</span>
              </div>
            )}
          </div>

          {/* Voice Recording Area */}
          <div className="relative mb-6">
            <div 
              className="h-20 md:h-24 rounded-xl flex items-center justify-center transition-all duration-300"
              style={{
                background: isRecording 
                  ? 'linear-gradient(145deg, rgba(212,165,116,0.15) 0%, rgba(212,165,116,0.1) 100%)'
                  : 'rgba(255,255,255,0.5)',
                border: isRecording 
                  ? '2px solid rgba(212,165,116,0.3)'
                  : '2px dashed rgba(200,180,170,0.3)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
              }}
            >
              {isRecording ? (
                <div className="flex gap-1 items-center">
                  {[1,2,3,4,5].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [8, 24, 8] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                      className="w-1.5 rounded-full"
                      style={{ background: '#d4a574' }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: '#b5a599' }}>Tap mic to dictate or type below</p>
              )}
            </div>
            
            {/* Mic Button */}
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isLoading}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{
                  background: isRecording 
                    ? 'linear-gradient(145deg, rgba(212,165,116,0.9) 0%, rgba(180,140,100,0.85) 100%)'
                    : 'linear-gradient(145deg, rgba(180,160,190,0.9) 0%, rgba(160,140,170,0.85) 100%)',
                  boxShadow: '0 8px 24px -4px rgba(180,150,140,0.4), inset 0 1px 2px rgba(255,255,255,0.3)',
                  color: '#ffffff',
                }}
              >
                {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Text Input */}
          <div className="pt-2">
            <textarea
              placeholder="Or type your notes here..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              disabled={isLoading}
              className="w-full min-h-[100px] md:min-h-[120px] rounded-xl p-4 text-base resize-none outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.6)',
                boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.08)',
                color: '#6b5d52',
                border: 'none',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="flex-1 h-12 md:h-14 rounded-xl flex items-center justify-center gap-2 text-sm md:text-base font-medium transition-all active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.6)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
                color: '#a8998e',
              }}
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
            <button
              onClick={handleSubmitNote}
              disabled={isLoading}
              className="flex-1 h-12 md:h-14 rounded-xl flex items-center justify-center gap-2 text-sm md:text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
              style={buttonStyle}
            >
              <span style={textGradient}>
                {isLoading ? 'Saving...' : isLastStudent ? 'Finish' : 'Next'}
              </span>
              {!isLoading && <ArrowRight className="w-4 h-4" style={{ color: '#c4a0a0' }} />}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}