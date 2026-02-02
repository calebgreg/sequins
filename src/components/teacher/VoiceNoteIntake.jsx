import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Sparkles, Check, RotateCcw, Hash, TrendingUp, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import useNoteInference from './useNoteInference';
import { processBulkNotes, fetchStudentHistory } from './useNoteAI';

export default function VoiceNoteIntake({ classData, students, teacherName, onNotesProcessed }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [classInsights, setClassInsights] = useState(null);
  const recognitionRef = useRef(null);

  const { detectedTags } = useNoteInference({
    content: transcript,
    classes: [classData],
    students
  });

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        // Simple append for this demo, handling state updates carefully in real app
        if (finalTranscript) {
           setTranscript(prev => prev + ' ' + finalTranscript);
        }
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    setClassInsights(null);

    try {
      // Fetch recent notes for students in this class for historical context
      const classStudents = students.filter(s => classData.student_names?.includes(s.name));
      const recentNotesPromises = classStudents.slice(0, 10).map(s => fetchStudentHistory(s.name, 3));
      const recentNotesArrays = await Promise.all(recentNotesPromises);
      const recentNotes = recentNotesArrays.flat();

      // Use the powerful AI processing layer
      const res = await processBulkNotes({
        transcript,
        classData,
        students,
        teacherName,
        recentNotes,
      });

      if (res?.notes) {
        // Store class insights for display
        if (res.class_insights) {
          setClassInsights(res.class_insights);
        }
        onNotesProcessed(res.notes);
        setTranscript('');
      }

    } catch (error) {
      console.error("Processing failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        {/* Visualizer / Status */}
        <div className={`h-32 rounded-2xl flex items-center justify-center transition-colors duration-500 ${isRecording ? 'bg-red-50 border-2 border-red-100' : 'bg-gray-50 border-2 border-dashed border-gray-200'}`}>
          {isRecording ? (
             <div className="flex gap-1 items-center">
                {[1,2,3,4,5].map(i => (
                  <motion.div
                    key={i}
                    animate={{ height: [10, 30, 10] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                    className="w-2 bg-red-400 rounded-full"
                  />
                ))}
             </div>
          ) : (
            <p className="text-gray-400 text-sm">Tap microphone to start dictating</p>
          )}
        </div>

        {/* Mic Button */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
          <Button
            size="icon"
            className={`h-14 w-14 rounded-full shadow-lg transition-all duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-600 scale-110' : 'bg-[#333333] hover:bg-black'}`}
            onClick={toggleRecording}
          >
            {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      <div className="pt-8 space-y-4">
        <div className="relative">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Or type your notes here..."
            className="w-full min-h-[100px] p-4 rounded-xl border border-gray-200 focus:border-[#F2DCDD] focus:ring-0 outline-none resize-none text-gray-700 bg-white"
          />
          {detectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 px-1">
               <div className="flex items-center text-xs text-[#333333] font-medium mr-1">
                 <Sparkles className="w-3 h-3 mr-1 text-purple-500" /> Auto-tagged:
               </div>
               {detectedTags.map(tag => (
                 <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                   <Hash className="w-3 h-3 mr-1 opacity-50" />
                   {tag}
                 </span>
               ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          {transcript && (
             <Button variant="ghost" onClick={() => setTranscript('')} className="text-gray-400 hover:text-red-500">
               <RotateCcw className="w-4 h-4 mr-2" /> Clear
             </Button>
          )}
          <Button 
            onClick={handleAnalyze} 
            disabled={!transcript.trim() || isProcessing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-full px-6"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isProcessing ? "Analyzing Notes..." : "Process with AI"}
          </Button>
        </div>
      </div>
    </div>
  );
}