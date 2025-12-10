import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { 
    Sparkles, ArrowUp, X, Globe, Calendar, ArrowRight, 
    ExternalLink, MapPin, Image as ImageIcon, Loader2,
    CheckCircle2, ChevronDown
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
                    px-4 py-2.5 rounded-[20px] text-[15px] leading-relaxed max-w-[90%]
                    ${isAi 
                        ? 'bg-white/60 text-gray-800 backdrop-blur-md shadow-sm border border-white/50' 
                        : 'bg-[#111] text-white shadow-md'}
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
    
    // Initial State: Just a suggestion
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
                // Only collapse if empty input, otherwise keep focus
                if (!inputValue.trim()) setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, inputValue]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        // Open if not already
        if (!isOpen) setIsOpen(true);

        const userText = inputValue;
        setInputValue('');
        
        // Add User Message
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

            // Simulate Rich Content for demo purposes based on keywords
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
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center pointer-events-none">
            <motion.div
                ref={containerRef}
                layout
                initial={{ width: '180px', height: '50px', borderRadius: '25px' }}
                animate={{ 
                    width: isOpen ? '400px' : '180px',
                    height: isOpen ? 'auto' : '50px',
                    borderRadius: isOpen ? '24px' : '25px',
                    y: isOpen ? 0 : 0
                }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className={`
                    pointer-events-auto
                    relative bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                    flex flex-col overflow-hidden
                `}
                style={{ maxHeight: '600px' }}
            >
                {/* --- Content Area (Collapsible) --- */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 overflow-y-auto px-4 pt-4 pb-2 min-h-[100px] max-h-[400px] scroll-smooth no-scrollbar flex flex-col"
                            ref={scrollRef}
                        >
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center flex-1 py-8 text-center opacity-40">
                                    <Sparkles className="w-6 h-6 mb-2" />
                                    <p className="text-sm font-medium">How can I help?</p>
                                </div>
                            )}
                            
                            {messages.map(msg => (
                                <MessageItem key={msg.id} message={msg} />
                            ))}

                            {isThinking && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 text-xs text-gray-400 pl-2 mb-2"
                                >
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Processing...</span>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- Input Bar --- */}
                <div 
                    className="flex items-center h-[50px] px-1.5 shrink-0 cursor-text"
                    onClick={() => {
                        setIsOpen(true);
                        inputRef.current?.focus();
                    }}
                >
                    {/* Icon / Trigger */}
                    <div className="w-10 h-10 flex items-center justify-center text-indigo-500 shrink-0">
                        <Sparkles className="w-5 h-5 fill-indigo-500/10" />
                    </div>

                    {/* Input Field */}
                    <input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSend();
                            if (e.key === 'Escape') {
                                setIsOpen(false);
                                inputRef.current?.blur();
                            }
                        }}
                        placeholder={isOpen ? "Ask anything..." : `Ask ${aiName}...`}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-800 placeholder:text-gray-500 font-medium px-2"
                    />

                    {/* Action Button */}
                    <AnimatePresence mode="wait">
                        {inputValue.trim() ? (
                            <motion.button
                                key="send"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                onClick={(e) => { e.stopPropagation(); handleSend(); }}
                                className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-sm"
                            >
                                <ArrowUp className="w-4 h-4" />
                            </motion.button>
                        ) : isOpen ? (
                            <motion.button
                                key="close"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 transition-colors"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </motion.button>
                        ) : null}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}