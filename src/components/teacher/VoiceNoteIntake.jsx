import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Sparkles, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from "@/api/base44Client";

export default function VoiceNoteIntake({ classData, students, teacherName, onNotesProcessed }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);

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

    try {
      // Filter students in this class to help the AI match names
      const classStudents = students.filter(s => classData.student_names?.includes(s.name));
      const studentNames = classStudents.map(s => s.name).join(', ');

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `
          You are an expert dance education assistant. 
          Analyze the following voice dictation from a teacher after a ${classData.title} class.
          
          Context:
          - Teacher: ${teacherName}
          - Students in class: ${studentNames}
          
          Task:
          1. Identify specific feedback for individual students.
          2. Identify general class feedback (assign to "Class Summary").
          3. Categorize each note (Technique, Behavior, Progress, General).
          4. Determine sentiment (Positive, Neutral, Constructive).
          
          Dictation:
          "${transcript}"
          
          Return JSON:
          {
            "notes": [
              {
                "student_name": "Name (or 'Class Summary')",
                "content": "Refined, professional note text",
                "category": "technique" | "behavior" | "progress" | "general",
                "sentiment": "positive" | "neutral" | "constructive"
              }
            ]
          }
        `,
        response_json_schema: {
          type: "object",
          properties: {
            notes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  student_name: { type: "string" },
                  content: { type: "string" },
                  category: { type: "string", enum: ["technique", "behavior", "progress", "general"] },
                  sentiment: { type: "string", enum: ["positive", "neutral", "constructive"] }
                }
              }
            }
          }
        }
      });

      if (res?.notes) {
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
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Or type your notes here..."
          className="w-full min-h-[100px] p-4 rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-100 outline-none resize-none text-gray-700 bg-white"
        />

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