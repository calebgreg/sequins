import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { 
    Sparkles, ArrowUp, Mic, X, Zap, Command, 
    Bot, ChevronRight, CornerDownLeft
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import useAiAssistant from './useAiAssistant';

// --- Ethereal Background Component ---
const LivingBackground = ({ state }) => { // state: 'idle', 'thinking', 'listening'
    return (
        <div className="absolute inset-0 overflow-hidden rounded-[40px] pointer-events-none">
            <motion.div 
                animate={{ 
                    scale: state === 'thinking' ? [1, 1.2, 1] : 1,
                    opacity: state === 'thinking' ? 0.6 : 0.3,
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent blur-[100px]"
            />
            <motion.div 
                animate={{ 
                    rotate: 360,
                    scale: state === 'thinking' ? [1.1, 0.9, 1.1] : 1 
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-pink-500/5 to-transparent blur-[80px] rounded-full"
            />
        </div>
    );
};

// --- Transcendent Message Item ---
const MessageStream = ({ message, isLast }) => {
    const isAi = message.role === 'assistant';
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            className={`flex flex-col mb-8 ${isAi ? 'items-start' : 'items-end'}`}
        >
            <div className={`
                max-w-[85%] text-lg md:text-xl font-light leading-relaxed tracking-wide
                ${isAi ? 'text-gray-800' : 'text-gray-500 text-right font-serif italic'}
            `}>
                {message.content}
            </div>
            
            {message.action && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 flex items-center gap-3 px-4 py-3 bg-white/50 border border-white/60 shadow-sm rounded-xl backdrop-blur-md"
                >
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    <span className="text-sm font-medium text-gray-600 uppercase tracking-widest">{message.action}</span>
                </motion.div>
            )}
        </motion.div>
    );
};

export default function GlobalAiChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [aiState, setAiState] = useState('idle'); // idle, thinking
    const [messages, setMessages] = useState([]);
    
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const { aiName } = useAiAssistant();

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setMessages([]);
            setInputValue('');
            setAiState('idle');
        }
    }, [isOpen]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Focus
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 100);
        }
    }, [isOpen]);

    // Toggle with Cmd+J or similar could go here
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg = { 
            id: Date.now().toString(), 
            role: 'user', 
            content: inputValue, 
            timestamp: new Date() 
        };
        
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setAiState('thinking');
        
        // Placeholder loading message
        const loadingId = 'loading-' + Date.now();
        
        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `
                    You are ${aiName}, an omniscient studio intelligence.
                    User: "${userMsg.content}"
                    
                    Respond with profound clarity and brevity. 
                    Do not use typical chatbot pleasantries. 
                    Be the voice of the studio.
                `
            });

            const text = typeof response === 'string' ? response : (response.content || "Command not recognized.");

            setMessages(prev => [...prev, {
                id: loadingId,
                role: 'assistant',
                content: text,
                timestamp: new Date()
            }]);

        } catch (err) {
            setMessages(prev => [...prev, {
                id: loadingId,
                role: 'assistant',
                content: "Connection severed.",
                timestamp: new Date()
            }]);
        } finally {
            setAiState('idle');
        }
    };

    return (
        <>
            {/* --- Ethereal Trigger (Bottom Center) --- */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
                    >
                        <motion.button
                            onClick={() => setIsOpen(true)}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className="group relative flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-xl border border-white/60 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)] transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center justify-center w-5 h-5">
                                <Sparkles className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                                Ask {aiName}
                            </span>
                            <div className="pl-2 border-l border-gray-200 text-xs text-gray-400 font-mono">
                                ⌘J
                            </div>
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- The Intelligence Plane (Overlay) --- */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#F4F4F6]/60 backdrop-blur-3xl"
                    >
                        {/* Close Trigger (Background Click) */}
                        <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-2xl max-h-[80vh] flex flex-col z-10"
                        >
                            {/* Main Card */}
                            <div className="relative bg-white/40 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[40px] overflow-hidden flex flex-col min-h-[400px]">
                                <LivingBackground state={aiState} />

                                {/* Header */}
                                <div className="relative flex items-center justify-between px-8 py-6 flex-shrink-0 z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${aiState === 'thinking' ? 'bg-indigo-500 animate-pulse' : 'bg-green-500'}`} />
                                        <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">{aiName} Intelligence</span>
                                    </div>
                                    <button 
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 text-gray-400 hover:text-gray-800 transition-colors rounded-full hover:bg-white/20"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Stream Area */}
                                <div 
                                    ref={scrollRef}
                                    className="relative flex-1 overflow-y-auto px-8 py-4 no-scrollbar z-10 flex flex-col"
                                >
                                    {messages.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                                            <Bot className="w-12 h-12 text-gray-300 mb-6" strokeWidth={1} />
                                            <h3 className="text-2xl font-serif text-gray-700 mb-2">How can I assist you?</h3>
                                            <p className="text-gray-400 font-light max-w-xs mx-auto">
                                                I can analyze revenue, manage students, or draft communications.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 pb-20">
                                            {messages.map((msg, i) => (
                                                <MessageStream 
                                                    key={msg.id} 
                                                    message={msg} 
                                                    isLast={i === messages.length - 1} 
                                                />
                                            ))}
                                            {aiState === 'thinking' && (
                                                <motion.div 
                                                    initial={{ opacity: 0 }} 
                                                    animate={{ opacity: 1 }}
                                                    className="flex items-center gap-2 text-gray-400"
                                                >
                                                    <Sparkles className="w-4 h-4 animate-spin-slow" />
                                                    <span className="text-sm font-light tracking-widest uppercase">Processing</span>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Input Stage */}
                                <div className="relative p-6 z-20">
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-white/50 rounded-[32px] blur-md transition-all duration-300 group-focus-within:bg-white/80 group-focus-within:shadow-[0_0_40px_rgba(255,255,255,0.6)]" />
                                        <div className="relative flex items-center bg-white/80 border border-white shadow-lg rounded-[32px] overflow-hidden transition-all duration-300 group-focus-within:ring-2 ring-indigo-500/10">
                                            <input
                                                ref={inputRef}
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                                placeholder="Type your request..."
                                                className="flex-1 bg-transparent border-none px-6 py-5 text-lg text-gray-800 placeholder:text-gray-400 focus:ring-0 focus:outline-none font-light"
                                            />
                                            <div className="pr-4 flex items-center gap-2">
                                                <div className="h-6 w-px bg-gray-200 mx-2" />
                                                <button 
                                                    onClick={handleSend}
                                                    disabled={!inputValue.trim()}
                                                    className={`
                                                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                                                        ${inputValue.trim() 
                                                            ? 'bg-[#333333] text-white shadow-lg scale-100' 
                                                            : 'bg-gray-100 text-gray-300 scale-90'}
                                                    `}
                                                >
                                                    {inputValue.trim() ? <ArrowUp className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Footer Hints */}
                                    <div className="flex justify-between items-center mt-4 px-4 text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                                        <div className="flex gap-4">
                                            <span className="hover:text-gray-600 cursor-pointer transition-colors">History</span>
                                            <span className="hover:text-gray-600 cursor-pointer transition-colors">Settings</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CornerDownLeft className="w-3 h-3" /> to send
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}