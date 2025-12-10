import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { 
    Send, Sparkles, X, Minimize2, Maximize2, Paperclip, 
    Bot, User, Mic, Image as ImageIcon, CheckCircle2,
    ArrowRight, Loader2, Command, Zap, MessageSquare
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import useAiAssistant from './useAiAssistant';

// --- Polished Message Component ---
const MessageItem = ({ message, aiName }) => {
    const isAi = message.role === 'assistant';
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className={`flex gap-4 mb-8 ${isAi ? 'flex-row' : 'flex-row-reverse'}`}
        >
            {/* Avatar */}
            <div className="flex-shrink-0 flex flex-col justify-end">
                <div className={`
                    w-8 h-8 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm
                    ${isAi 
                        ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white' 
                        : 'bg-white text-gray-800 border border-gray-100'}
                `}>
                    {isAi ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
            </div>
            
            {/* Content Bubble */}
            <div className={`flex flex-col max-w-[80%] ${isAi ? 'items-start' : 'items-end'}`}>
                <div className={`
                    relative px-6 py-4 text-[15px] leading-relaxed shadow-sm
                    ${isAi 
                        ? 'bg-white/80 border border-white/60 text-gray-800 rounded-2xl rounded-bl-sm backdrop-blur-md' 
                        : 'bg-[#222] text-white rounded-2xl rounded-br-sm shadow-xl'}
                `}>
                    {message.content}
                    
                    {/* Tiny triangle for speech bubble effect */}
                    {/* <div className={`absolute bottom-0 w-3 h-3 ${isAi ? '-left-1.5 bg-white/80' : '-right-1.5 bg-[#222]'} [clip-path:polygon(0_0,100%_100%,0_100%)] ${isAi ? '' : 'rotate-90'}`} /> */}
                </div>

                {/* Rich Action Card */}
                {message.action && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        className="w-full max-w-sm bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-1 flex items-center gap-3 overflow-hidden pr-4 shadow-sm"
                    >
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-emerald-500 shadow-sm flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                            <div className="text-[10px] font-bold text-emerald-800/60 uppercase tracking-widest">Action Completed</div>
                            <div className="text-sm font-semibold text-emerald-900 truncate">{message.action}</div>
                        </div>
                    </motion.div>
                )}
                
                {/* Timestamp / Status */}
                <div className={`mt-2 text-[10px] font-medium text-gray-300 ${isAi ? 'text-left ml-1' : 'text-right mr-1'}`}>
                    {isAi ? aiName : 'You'} • {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
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
            content: "Welcome back. I'm ready to help you run the studio.", 
            timestamp: new Date() 
        }
    ]);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    const { aiName } = useAiAssistant();

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    // Focus on open
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
        
        // Simulate thinking state
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
                    You are ${aiName}, an advanced studio management AI.
                    User input: "${userMsg.content}"
                    Context: The user is in a dance studio management app.
                    
                    Respond with a short, helpful, and sophisticated tone. 
                    Avoid robotic greetings. Be direct and elegant.
                `
            });

            const aiResponseText = typeof response === 'string' ? response : (response.content || "I couldn't process that request.");

            setMessages(prev => prev.map(m => 
                m.id === loadingId 
                    ? { ...m, content: aiResponseText, isLoading: false } 
                    : m
            ));

        } catch (err) {
            setMessages(prev => prev.map(m => 
                m.id === loadingId 
                    ? { ...m, content: "I seem to be offline. Please check your connection.", isLoading: false } 
                    : m
            ));
        }
    };

    return (
        <>
            {/* --- Trigger Button --- */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -180 }}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-8 right-8 z-50 group"
                    >
                        {/* Pulse Effect */}
                        <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20 duration-1000" />
                        
                        {/* Main Button */}
                        <div className="relative w-16 h-16 rounded-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 backdrop-blur-xl flex items-center justify-center overflow-hidden">
                            {/* Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50 via-purple-50 to-pink-50 opacity-100 group-hover:opacity-80 transition-opacity" />
                            
                            {/* Icon */}
                            <div className="relative z-10 text-transparent bg-clip-text bg-gradient-to-tr from-indigo-600 to-purple-600">
                                <Sparkles className="w-7 h-7 text-indigo-600" fill="currentColor" fillOpacity={0.2} />
                            </div>
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* --- Chat Window --- */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-8 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.95 }}
                            animate={{ 
                                opacity: 1, 
                                y: 0, 
                                scale: 1,
                                width: isExpanded ? '800px' : '440px',
                                height: isExpanded ? '85vh' : '650px'
                            }}
                            exit={{ opacity: 0, y: 100, scale: 0.95, transition: { duration: 0.2 } }}
                            transition={{ type: "spring", damping: 30, stiffness: 350 }}
                            className={`
                                pointer-events-auto
                                relative bg-white/60 backdrop-blur-[40px] rounded-[36px] 
                                shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.5)] 
                                flex flex-col overflow-hidden
                            `}
                        >
                            {/* Abstract Ambient Background */}
                            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-b from-indigo-300/20 to-purple-300/20 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-pink-300/20 blur-[60px] rounded-full pointer-events-none translate-y-1/3 -translate-x-1/3" />

                            {/* Header */}
                            <div className="h-20 flex items-center justify-between px-6 flex-shrink-0 z-10 border-b border-white/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                        <Bot className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-serif text-lg text-gray-800 leading-none tracking-tight">{aiName}</h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button 
                                        variant="ghost" size="icon" 
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="h-9 w-9 rounded-full text-gray-400 hover:text-gray-900 hover:bg-white/50"
                                    >
                                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                    </Button>
                                    <Button 
                                        variant="ghost" size="icon" 
                                        onClick={() => setIsOpen(false)}
                                        className="h-9 w-9 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div 
                                className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth z-10"
                                ref={scrollRef}
                            >
                                <div className="space-y-2">
                                    {messages.map((msg) => (
                                        <MessageItem key={msg.id} message={msg} aiName={aiName} />
                                    ))}
                                    
                                    {/* Typing Indicator */}
                                    {messages[messages.length - 1]?.isLoading && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 ml-1"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg backdrop-blur-sm">
                                                <Sparkles className="w-4 h-4" />
                                            </div>
                                            <div className="bg-white/50 backdrop-blur-md px-4 py-3 rounded-2xl rounded-bl-sm border border-white/50">
                                                <div className="flex gap-1.5">
                                                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Input Area */}
                            <div className="p-6 pt-2 z-10 bg-gradient-to-t from-white/40 to-transparent">
                                {/* Quick Actions */}
                                {messages.length < 3 && (
                                    <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                                        {[
                                            { icon: Zap, label: 'Today\'s Summary' }, 
                                            { icon: User, label: 'New Student' }, 
                                            { icon: MessageSquare, label: 'Draft Email' }
                                        ].map((action, i) => (
                                            <motion.button 
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 * i }}
                                                onClick={() => setInputValue(action.label)}
                                                className="
                                                    flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white/90 
                                                    border border-white/60 hover:border-indigo-200 
                                                    text-gray-600 hover:text-indigo-600 
                                                    rounded-full text-xs font-semibold shadow-sm hover:shadow-md transition-all
                                                "
                                            >
                                                <action.icon className="w-3.5 h-3.5" />
                                                {action.label}
                                            </motion.button>
                                        ))}
                                    </div>
                                )}

                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 rounded-[28px] opacity-20 blur-md group-focus-within:opacity-40 transition-opacity duration-500" />
                                    
                                    <div className="relative flex items-end gap-2 bg-white/80 backdrop-blur-xl p-2 pl-4 rounded-[28px] border border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300">
                                        <Input
                                            ref={inputRef}
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                            placeholder={`Ask ${aiName} anything...`}
                                            className="border-none bg-transparent shadow-none focus-visible:ring-0 px-2 py-3.5 h-auto max-h-32 min-h-[50px] text-[15px] placeholder:text-gray-400 text-gray-800"
                                        />
                                        
                                        <div className="flex gap-1 mb-1.5 mr-1.5">
                                            {!inputValue.trim() && (
                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100/50">
                                                    <Paperclip className="w-5 h-5" />
                                                </Button>
                                            )}
                                            
                                            <Button 
                                                onClick={handleSend}
                                                disabled={!inputValue.trim()}
                                                className={`
                                                    h-9 rounded-full transition-all duration-300 shadow-md
                                                    ${inputValue.trim() 
                                                        ? 'w-12 bg-[#222] hover:bg-black text-white' 
                                                        : 'w-9 bg-gray-100 text-gray-400 hover:bg-gray-200'}
                                                `}
                                            >
                                                {inputValue.trim() ? <ArrowRight className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center mt-3">
                                    <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                                        Powered by Base44 Intelligence
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}