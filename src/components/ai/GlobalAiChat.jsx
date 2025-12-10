import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { 
    Sparkles, ArrowUp, X, Globe, Calendar, ArrowRight, 
    ExternalLink, MapPin, Image as ImageIcon, Loader2,
    CheckCircle2, ChevronDown, Send, Command, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import useAiAssistant from './useAiAssistant';

// --- Rich Content Renderers ---
const LinkPreview = ({ data }) => (
    <div className="flex items-center gap-3 p-3 bg-white/60 hover:bg-white/90 border border-white/50 rounded-xl transition-all cursor-pointer group shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-indigo-50/50 flex items-center justify-center text-indigo-500 shrink-0 backdrop-blur-sm">
            <Globe className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium text-gray-900 truncate">{data.title}</h4>
            <p className="text-xs text-gray-500 truncate">{data.url}</p>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
    </div>
);

const ReminderCard = ({ data }) => (
    <div className="flex items-start gap-3 p-3 bg-amber-50/60 border border-amber-100/50 rounded-xl shadow-sm backdrop-blur-sm">
        <div className="mt-0.5 text-amber-500">
            <Calendar className="w-5 h-5" />
        </div>
        <div>
            <h4 className="text-sm font-medium text-amber-900">Reminder Set</h4>
            <p className="text-sm text-amber-700/80">{data.text}</p>
            <div className="mt-1.5 inline-flex items-center text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-100/50 px-2 py-1 rounded-md">
                {data.time}
            </div>
        </div>
    </div>
);

const ActionCard = ({ data }) => (
    <div className="flex items-center gap-3 p-2 pr-4 bg-emerald-50/60 border border-emerald-100/50 rounded-full w-fit shadow-sm backdrop-blur-sm">
        <div className="w-8 h-8 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-emerald-900">{data.text}</span>
    </div>
);

// --- Message Item ---
const MessageItem = ({ message }) => {
    const isAi = message.role === 'assistant';

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`flex flex-col mb-6 ${isAi ? 'items-start' : 'items-end'}`}
        >
            <div className={`flex flex-col max-w-[85%] ${isAi ? 'items-start' : 'items-end'}`}>
                {/* Text Bubble */}
                {message.content && (
                    <div className={`
                        relative px-5 py-3.5 text-[15px] leading-relaxed shadow-sm
                        ${isAi 
                            ? 'bg-white/80 text-gray-800 rounded-2xl rounded-tl-sm border border-white/50 backdrop-blur-md' 
                            : 'bg-[#222222] text-white rounded-2xl rounded-tr-sm'}
                    `}>
                        {isAi && <Sparkles className="w-3 h-3 text-indigo-400 absolute -top-1.5 -left-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        <span className={isAi ? "font-serif tracking-wide" : "font-sans"}>
                            {message.content}
                        </span>
                    </div>
                )}

                {/* Rich Attachments */}
                {message.attachments && (
                    <div className="mt-2 space-y-2 w-full">
                        {message.attachments.map((att, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                {att.type === 'link' && <LinkPreview data={att} />}
                                {att.type === 'reminder' && <ReminderCard data={att} />}
                                {att.type === 'action' && <ActionCard data={att} />}
                            </motion.div>
                        ))}
                    </div>
                )}
                
                {/* Timestamp / Status (Optional polish) */}
                <div className="text-[10px] text-gray-300 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAi ? 'Gene' : 'You'}
                </div>
            </div>
        </motion.div>
    );
};

export default function GlobalAiChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    
    const [messages, setMessages] = useState([]);

    const inputRef = useRef(null);
    const scrollRef = useRef(null);
    const containerRef = useRef(null);
    const { aiName } = useAiAssistant();

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, isThinking]);

    // Click outside to collapse
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target) && isOpen) {
                if (!inputValue.trim()) setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, inputValue]);

    // Focus input on open
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        if (!isOpen) setIsOpen(true);

        const userText = inputValue;
        setInputValue('');
        
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userText }]);
        setIsThinking(true);

        try {
            // Fetch real data context
            const [students, classes] = await Promise.all([
                base44.entities.Student.list(),
                base44.entities.DanceClass.list()
            ]);
            
            const activeStudents = students.filter(s => s.status === 'active');
            
            // Create a concise roster for the LLM
            const studentRoster = activeStudents.map(s => `${s.name} (${s.age} yrs)`).join(', ');
            
            const context = `
                REAL TIME STUDIO DATA:
                - Total Enrolled Students: ${students.length}
                - Active Students Count: ${activeStudents.length}
                - Total Classes: ${classes.length}
                
                STUDENT ROSTER (Name & Age):
                ${studentRoster}
            `;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `
                    You are ${aiName}, a sophisticated and helpful studio assistant connected to the live database.
                    
                    ${context}

                    User Question: "${userText}"
                    
                    Answer the user's question accurately based ONLY on the data provided above. 
                    Be concise, elegant, and helpful. Use a professional but warm tone.
                `
            });

            const text = typeof response === 'string' ? response : (response.content || "I've processed your request.");

            // Simulate Rich Content for demo purposes (can be enhanced with real logic later)
            const attachments = [];
            const lowerText = userText.toLowerCase();
            
            if (lowerText.includes('website') || lowerText.includes('link')) {
                attachments.push({ type: 'link', title: 'Studio Portal', url: 'https://studio.com' });
            }
            if (lowerText.includes('remind') || lowerText.includes('schedule')) {
                attachments.push({ type: 'reminder', text: 'Reminder added to your calendar', time: 'Today, 4:45 PM' });
            }

            setMessages(prev => [...prev, { 
                id: Date.now() + 1, 
                role: 'assistant', 
                content: text,
                attachments: attachments.length > 0 ? attachments : null
            }]);

        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: "I'm having trouble connecting to the studio data right now." }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none font-sans">
            <AnimatePresence>
                <motion.div
                    ref={containerRef}
                    layout
                    initial={{ width: 'auto', height: 'auto', borderRadius: '40px' }}
                    animate={{ 
                        width: isOpen ? '360px' : 'auto',
                        height: isOpen ? 'auto' : 'auto',
                        borderRadius: isOpen ? '24px' : '40px',
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className={`
                        pointer-events-auto overflow-hidden relative flex flex-col origin-bottom-right
                        ${isOpen ? 'bg-white/80 backdrop-blur-xl shadow-2xl border border-white/40 ring-1 ring-black/5' : 'bg-transparent'}
                    `}
                    style={{
                        maxHeight: '80vh'
                    }}
                >
                    {/* --- CLOSED STATE: Floating Pill --- */}
                    {!isOpen && (
                        <motion.button
                            layoutId="chat-trigger"
                            initial={{ opacity: 1, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => setIsOpen(true)}
                            className="group flex items-center gap-3 pl-4 pr-1.5 py-1.5 bg-white/90 hover:bg-white backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95"
                        >
                            <span className="text-lg font-serif text-[#333333] tracking-tight group-hover:text-black transition-colors">
                                {aiName}
                            </span>
                            <div className="w-10 h-10 rounded-full bg-[#333333] text-white flex items-center justify-center shadow-md group-hover:bg-black transition-colors">
                                <Sparkles className="w-5 h-5" />
                            </div>
                        </motion.button>
                    )}

                    {/* --- OPEN STATE: Chat Interface --- */}
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col h-full relative min-h-[120px]"
                        >
                            {/* Decorative Header Gradient */}
                            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-white/50 to-transparent pointer-events-none z-0" />

                            {/* Actions / Close */}
                            <div className="absolute top-3 right-3 z-20">
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-gray-500 hover:text-black transition-colors backdrop-blur-sm"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Messages Container */}
                            <div 
                                className={`
                                    flex-1 overflow-y-auto px-5 pt-12 pb-2 no-scrollbar scroll-smooth
                                    ${messages.length === 0 ? 'min-h-[150px] flex items-center justify-center' : 'max-h-[500px]'}
                                `}
                                ref={scrollRef}
                            >
                                {messages.length === 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-center space-y-3 opacity-60"
                                    >
                                        <div className="w-12 h-12 mx-auto bg-gradient-to-tr from-indigo-100 to-purple-50 rounded-2xl flex items-center justify-center text-indigo-500 shadow-inner">
                                            <Bot className="w-6 h-6" />
                                        </div>
                                        <p className="font-serif text-xl text-[#333333]">
                                            Hello, I'm {aiName}.
                                        </p>
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">
                                            Studio Assistant
                                        </p>
                                    </motion.div>
                                )}

                                {messages.map(msg => (
                                    <MessageItem key={msg.id} message={msg} />
                                ))}

                                {isThinking && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-2 pl-2 mb-4"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                                            <Sparkles className="w-3 h-3 text-white animate-pulse" />
                                        </div>
                                        <span className="text-xs font-medium text-gray-400 animate-pulse">Processing...</span>
                                    </motion.div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-3 bg-white/50 backdrop-blur-md border-t border-white/50">
                                <div className="relative flex items-center bg-white rounded-[20px] shadow-sm border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-200 transition-all overflow-hidden group">
                                    <div className="pl-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                        <Command className="w-4 h-4" />
                                    </div>
                                    <input
                                        ref={inputRef}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSend();
                                            if (e.key === 'Escape') setIsOpen(false);
                                        }}
                                        placeholder="Ask anything..."
                                        className="flex-1 bg-transparent border-none px-3 py-3.5 text-[15px] text-gray-800 placeholder:text-gray-400 focus:ring-0 focus:outline-none"
                                    />
                                    <div className="pr-1.5">
                                        <button 
                                            onClick={handleSend}
                                            disabled={!inputValue.trim()}
                                            className={`
                                                p-2 rounded-xl transition-all duration-300
                                                ${inputValue.trim() 
                                                    ? 'bg-[#333333] text-white shadow-lg hover:scale-105 active:scale-95' 
                                                    : 'bg-gray-100 text-gray-300'}
                                            `}
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-[10px] text-center text-gray-300 mt-2 font-medium tracking-wide">
                                    POWERED BY BASE44 INTELLIGENCE
                                </div>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}