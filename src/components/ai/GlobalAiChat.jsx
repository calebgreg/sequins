import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { 
    Sparkles, ArrowUp, X, Globe, Calendar, ArrowRight, 
    ExternalLink, MapPin, Image as ImageIcon, Loader2,
    CheckCircle2, ChevronDown, Send
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import useAiAssistant from './useAiAssistant';

// --- Rich Content Renderers ---
const LinkPreview = ({ data }) => (
    <div className="flex items-center gap-3 p-3 bg-white/50 hover:bg-white/80 border border-white/60 rounded-xl transition-colors cursor-pointer group">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
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
    <div className="flex items-start gap-3 p-3 bg-amber-50/50 border border-amber-100/60 rounded-xl">
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
    <div className="flex items-center gap-3 p-2 pr-4 bg-emerald-50/50 border border-emerald-100/60 rounded-full w-fit">
        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
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
            className={`flex flex-col mb-4 ${isAi ? 'items-start' : 'items-end'}`}
        >
            {/* Text Bubble */}
            {message.content && (
                <div className={`
                    px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed max-w-[90%]
                    ${isAi 
                        ? 'bg-gray-100/80 text-gray-800 backdrop-blur-md' 
                        : 'bg-[#333333] text-white'}
                `}>
                    {message.content}
                </div>
            )}

            {/* Rich Attachments */}
            {message.attachments && (
                <div className="mt-2 space-y-2 w-full max-w-[90%]">
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
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `
                    You are ${aiName}, a sophisticated studio assistant.
                    User: "${userText}"
                    
                    Respond concisely.
                `
            });

            const text = typeof response === 'string' ? response : (response.content || "Done.");

            // Simulate Rich Content
            const attachments = [];
            const lowerText = userText.toLowerCase();
            
            if (lowerText.includes('website') || lowerText.includes('link')) {
                attachments.push({ type: 'link', title: 'Studio Homepage', url: 'https://studio.com' });
            }
            if (lowerText.includes('remind') || lowerText.includes('schedule')) {
                attachments.push({ type: 'reminder', text: 'Prepare for 5pm class', time: 'Today, 4:45 PM' });
            }
            if (lowerText.includes('email') || lowerText.includes('send') || lowerText.includes('create')) {
                attachments.push({ type: 'action', text: 'Draft created' });
            }

            setMessages(prev => [...prev, { 
                id: Date.now() + 1, 
                role: 'assistant', 
                content: text,
                attachments: attachments.length > 0 ? attachments : null
            }]);

        } catch (err) {
            setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: "I couldn't reach the server." }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end pointer-events-none">
            <motion.div
                ref={containerRef}
                layout
                initial={{ width: 'auto', height: 'auto', borderRadius: '32px' }}
                animate={{ 
                    width: isOpen ? '320px' : 'auto',
                    height: isOpen ? 'auto' : 'auto',
                    borderRadius: isOpen ? '20px' : '32px',
                    backgroundColor: isOpen ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0)',
                    boxShadow: isOpen ? '0 10px 40px rgba(0,0,0,0.08)' : 'none',
                    backdropFilter: isOpen ? 'blur(12px)' : 'none',
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="pointer-events-auto overflow-hidden relative flex flex-col origin-bottom-right"
            >
                {/* --- CLOSED STATE: Just the Name --- */}
                {!isOpen && (
                    <motion.button
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="group flex items-center gap-2 px-2 py-2 cursor-pointer"
                    >
                        <span className="text-xl font-serif text-gray-400 group-hover:text-[#333333] transition-colors duration-300 tracking-wide">
                            {aiName}
                        </span>

                    </motion.button>
                )}

                {/* --- OPEN STATE: Chat Interface --- */}
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 flex flex-col h-full relative"
                    >
                        {/* Messages Area (Only shows if there are messages) */}
                        {messages.length > 0 && (
                            <div 
                                className="flex-1 overflow-y-auto px-4 pt-4 max-h-[300px] no-scrollbar space-y-3"
                                ref={scrollRef}
                            >
                                {messages.map(msg => (
                                    <MessageItem key={msg.id} message={msg} />
                                ))}

                                {isThinking && (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 pl-1">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Thinking...</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Compact Input Area */}
                        <div className="p-2">
                            <div className="relative flex items-center bg-gray-50/50 rounded-xl transition-all overflow-hidden">
                                <input
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSend();
                                        if (e.key === 'Escape') setIsOpen(false);
                                    }}
                                    placeholder={`Ask ${aiName}...`}
                                    className="flex-1 bg-transparent border-none px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-0 focus:outline-none"
                                />
                                {inputValue.trim() ? (
                                    <button 
                                        onClick={handleSend}
                                        className="p-1.5 mr-1.5 bg-[#333333] text-white rounded-lg hover:bg-black transition-colors"
                                    >
                                        <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setIsOpen(false)}
                                        className="p-1.5 mr-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}