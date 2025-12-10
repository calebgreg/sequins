import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    Send, Sparkles, X, Minimize2, Maximize2, Paperclip, 
    Bot, User, Mic, Image as ImageIcon, CheckCircle2,
    ArrowRight, Loader2, Command
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import useAiAssistant from './useAiAssistant';

// --- Components ---

const MessageItem = ({ message, aiName }) => {
    const isAi = message.role === 'assistant';
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-4 mb-6 ${isAi ? 'flex-row' : 'flex-row-reverse'}`}
        >
            {isAi && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mt-1">
                    <Sparkles className="w-4 h-4" />
                </div>
            )}
            
            <div className={`flex flex-col max-w-[85%] ${isAi ? 'items-start' : 'items-end'}`}>
                <div className={`
                    text-[15px] leading-relaxed
                    ${isAi ? 'text-gray-100' : 'text-white/90 bg-white/10 px-4 py-2 rounded-2xl rounded-tr-sm backdrop-blur-sm'}
                `}>
                    {message.content}
                </div>

                {/* Action Card */}
                {message.action && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 overflow-hidden backdrop-blur-md"
                    >
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Action Completed</div>
                            <div className="text-sm font-medium text-white/90 truncate">{message.action}</div>
                        </div>
                    </motion.div>
                )}
                
                {isAi && (
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {/* Optional actions like Copy/Retry could go here */}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default function GlobalAiChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([
        { 
            id: 'intro', 
            role: 'assistant', 
            content: "I'm ready when you are. Ask me anything about your studio.", 
            timestamp: new Date() 
        }
    ]);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    const { aiName } = useAiAssistant();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 300);
        }
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
        
        const loadingId = 'loading-' + Date.now();
        setMessages(prev => [...prev, { 
            id: loadingId, 
            role: 'assistant', 
            content: '...', 
            isLoading: true, 
            timestamp: new Date() 
        }]);

        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `
                    You are ${aiName}, a highly capable studio AI.
                    User: "${userMsg.content}"
                    Respond concisely and elegantly.
                `
            });

            const aiResponseText = typeof response === 'string' ? response : (response.content || "I couldn't process that.");

            setMessages(prev => prev.map(m => 
                m.id === loadingId 
                    ? { ...m, content: aiResponseText, isLoading: false } 
                    : m
            ));

        } catch (err) {
            setMessages(prev => prev.map(m => 
                m.id === loadingId 
                    ? { ...m, content: "Connection interrupted.", isLoading: false } 
                    : m
            ));
        }
    };

    return (
        <>
            {/* Trigger Orb */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-8 right-8 z-50 w-14 h-14 group"
                    >
                        <div className="absolute inset-0 bg-black rounded-full blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                        <div className="relative w-full h-full rounded-full bg-[#111] border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                             <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 via-purple-500/10 to-transparent" />
                             <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-indigo-600/50 to-transparent blur-md group-hover:h-3/4 transition-all duration-500" />
                             <Sparkles className="w-6 h-6 text-white relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Glass Interface */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.9 }}
                            animate={{ 
                                opacity: 1, 
                                y: 0, 
                                scale: 1,
                                width: isExpanded ? '700px' : '420px',
                                height: isExpanded ? '85vh' : '600px'
                            }}
                            exit={{ opacity: 0, y: 40, scale: 0.9, transition: { duration: 0.2 } }}
                            transition={{ type: "spring", damping: 30, stiffness: 350 }}
                            className={`
                                pointer-events-auto
                                relative bg-[#0a0a0a]/90 backdrop-blur-2xl rounded-[32px] 
                                shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)] 
                                border border-white/10 flex flex-col overflow-hidden
                            `}
                        >
                            {/* Decorative Gradients */}
                            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
                            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />
                            
                            {/* Header */}
                            <div className="h-16 flex items-center justify-between px-6 flex-shrink-0 z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                    <span className="font-medium text-white/80 tracking-wide text-sm">{aiName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        onClick={() => setIsOpen(false)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div 
                                className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth"
                                ref={scrollRef}
                            >
                                <div className="space-y-2">
                                    {messages.map((msg) => (
                                        <MessageItem key={msg.id} message={msg} aiName={aiName} />
                                    ))}
                                </div>
                                
                                {messages[messages.length - 1]?.isLoading && (
                                    <div className="flex items-center gap-1 ml-12 h-8">
                                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 rounded-full bg-white/50" />
                                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-white/50" />
                                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-white/50" />
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 z-10">
                                <div className="relative group bg-white/5 border border-white/10 rounded-[28px] focus-within:bg-white/10 focus-within:border-white/20 transition-all duration-300">
                                    <Input
                                        ref={inputRef}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Type a command..."
                                        className="border-none bg-transparent shadow-none focus-visible:ring-0 px-6 py-4 h-14 text-white placeholder:text-white/30 text-base"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                         {!inputValue.trim() && (
                                            <button className="w-10 h-10 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors">
                                                <Mic className="w-5 h-5" />
                                            </button>
                                         )}
                                         <button 
                                            onClick={handleSend}
                                            disabled={!inputValue.trim()}
                                            className={`
                                                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                                                ${inputValue.trim() ? 'bg-white text-black scale-100 opacity-100' : 'scale-90 opacity-0'}
                                            `}
                                         >
                                             <ArrowRight className="w-5 h-5" />
                                         </button>
                                    </div>
                                </div>
                                
                                {messages.length < 3 && (
                                    <div className="flex justify-center gap-3 mt-4 overflow-hidden">
                                        {['Revenue today?', 'Draft parent email', 'New student'].map((s, i) => (
                                            <button 
                                                key={s}
                                                onClick={() => setInputValue(s)}
                                                className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-xs text-white/50 hover:text-white transition-all"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}