import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Mic, Square } from 'lucide-react';
import { useRef } from 'react';

const examples = [
  '"Lit up during freeze dance"',
  '"Shy at first, opened up during the group number"',
  '"Natural turner, great spotting"',
  '"Best listener in the class"',
];

export default function TrialNoteGate({ childName, onSubmit, onCancel }) {
  const [note, setNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  React.useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event) => {
        let t = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) t += event.results[i][0].transcript;
        }
        if (t) setNote(prev => (prev + ' ' + t).trim());
      };
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const textGradient = {
    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-3xl p-6 space-y-5"
        style={{
          background: 'linear-gradient(165deg, #fffaf9 0%, #fef2ef 50%, #fdf5f3 100%)',
          boxShadow: '0 25px 60px -10px rgba(180,150,140,0.35)',
        }}
      >
        {/* Header */}
        <div className="text-center">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'linear-gradient(145deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.1) 100%)' }}
          >
            <Sparkles className="w-7 h-7" style={{ color: '#d97706' }} />
          </div>
          <h3 className="text-xl font-bold" style={textGradient}>
            What stood out about {childName}?
          </h3>
          <p className="text-sm mt-1" style={{ color: '#b5a599' }}>
            This was a trial student — one note helps us follow up
          </p>
        </div>

        {/* Examples */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {examples.map((ex, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.7)', color: '#9a8b80', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}
              onClick={() => setNote(ex.replace(/"/g, ''))}
            >
              {ex}
            </span>
          ))}
        </div>

        {/* Input */}
        <div className="relative">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Type or dictate what you noticed..."
            className="w-full min-h-[100px] rounded-xl p-4 text-base resize-none outline-none"
            style={{
              background: 'rgba(255,255,255,0.6)',
              boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.08)',
              color: '#6b5d52',
              border: 'none',
            }}
          />
          <button
            type="button"
            onClick={toggleRecording}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: isRecording
                ? 'linear-gradient(145deg, rgba(212,165,116,0.9) 0%, rgba(180,140,100,0.85) 100%)'
                : 'linear-gradient(145deg, rgba(180,160,190,0.9) 0%, rgba(160,140,170,0.85) 100%)',
              color: '#fff',
              boxShadow: '0 4px 12px -4px rgba(180,150,140,0.3)',
            }}
          >
            {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.6)', color: '#a8998e' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(note.trim())}
            disabled={!note.trim()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
            style={{
              background: 'linear-gradient(145deg, rgba(254,247,247,0.95) 0%, rgba(252,231,231,0.9) 50%, rgba(248,225,220,0.85) 100%)',
              boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), inset 0 1px 2px rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,220,210,0.5)',
            }}
          >
            <span style={textGradient}>Save Note</span>
            <ArrowRight className="w-4 h-4" style={{ color: '#c4a0a0' }} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}