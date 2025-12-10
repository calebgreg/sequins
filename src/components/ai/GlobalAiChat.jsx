import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { 
    Sparkles, ArrowUp, X, Globe, Calendar, ExternalLink, 
    Command, Bot, Search, CornerDownLeft
} from 'lucide-react';
import useAiAssistant from './useAiAssistant';

// --- Components ---

const LinkPreview = ({ data }) => (
    <div className="flex items-center gap-3 p-2.5 bg-gray-50/80 hover:bg-gray-100 border border-gray-200/60 rounded-lg transition-colors cursor-pointer group w-full max-w-sm">
        <div className="w-8 h-8 rounded-md bg-white border border-gray-100 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
            <Globe className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-gray-900 truncate">{data.title}</h4>
            <p className="text-[10px] text-gray-500 truncate">{data.url}</p>
        </div>
        <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-600" />
    </div>
);

const MessageItem = ({ message }) => {
    const isAi = message.role === 'assistant';

    return (
        <div className={`flex flex-col mb-4 w-full ${isAi ? 'items-start' : 'items-end'}`}>
            <div className={`max-w-[85%] ${isAi ? 'items-start' : 'items-end'}`}>
                {/* Label */}
                <div className="text-[10px] font-medium text-gray-400 mb-1 px-1">
                    {isAi ? 'Gene' : 'You'}
                </div>

                {/* Content */}
                {message.content && (
                    <div className={`
                        px-4 py-2.5 text-[14px] leading-relaxed shadow-sm backdrop-blur-md
                        ${isAi 
                            ? 'bg-white/60 text-gray-900 rounded-2xl rounded-tl-sm border border-gray-200/50' 
                            : 'bg-black/90 text-white rounded-2xl rounded-tr-sm border border-black/10'}
                    `}>
                        {message.content}
                    </div>
                )}

                {/* Attachments */}
                {message.attachments && (
                    <div className="mt-2 space-y-2 w-full">
                        {message.attachments.map((att, i) => (
                            <div key={i}>
                                {att.type === 'link' && <LinkPreview data={att} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
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

    // Click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                // Only close if empty and clicked outside
                if (!inputValue.trim() && messages.length === 0) {
                     setIsOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [inputValue, messages.length]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        if (!isOpen) setIsOpen(true);

        const userText = inputValue;
        setInputValue('');
        
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userText }]);
        setIsThinking(true);

        try {
            // Omnipotent Data Context - Fetching ALL key entities
            const [students, classes, settingsList, plans, teachers] = await Promise.all([
                base44.entities.Student.list(),
                base44.entities.DanceClass.list(),
                base44.entities.StudioSettings.list(),
                base44.entities.TuitionPlan.list(),
                base44.entities.Teacher.list().catch(() => []) // Graceful fallback
            ]);
            
            // 1. Process Settings
            const settings = settingsList[0] || {};

            // 2. Process Classes (Crucial for schedule questions)
            const scheduleContext = classes.map(c => 
                `- ${c.title} (${c.style}): ${c.day}s at ${c.start_time}:00 with ${c.teacher || 'Staff'} (${c.duration}hr)`
            ).join('\n');

            // 3. Process Students (Concise roster)
            const activeStudents = students.filter(s => s.status === 'active');
            const rosterContext = activeStudents.map(s => `${s.name} (${s.age}, ${s.level})`).join(', ');

            // 4. Process Tuition/Pricing
            const pricingContext = plans.map(p => 
                `- ${p.name}: $${p.amount} (${p.billing_frequency})`
            ).join('\n');

            // 5. Construct Master Context
            const context = `
                STUDIO INFORMATION:
                Name: ${settings.name || 'The Studio'}
                Type: ${settings.type}
                
                FULL CLASS SCHEDULE:
                ${scheduleContext}

                TUITION & PRICING:
                ${pricingContext}

                STUDENT ROSTER (${activeStudents.length} active):
                ${rosterContext}

                TEACHERS:
                ${teachers.map(t => t.name).join(', ')}
            `;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `
                    System: You are ${aiName || 'Gene'}, the intelligent OS for this dance studio.
                    You have access to the COMPLETE real-time database below.
                    
                    ${context}

                    User Query: "${userText}"
                    
                    Instructions:
                    1. Answer the user's question accurately using the provided data.
                    2. If asked about schedules, list the specific days and times from the SCHEDULE section.
                    3. If asked about students, use the ROSTER section.
                    4. Keep answers concise, professional, and helpful. Plain text only.
                `
            });

            const text = typeof response === 'string' ? response : (response.content || "Done.");

            setMessages(prev => [...prev, { 
                id: Date.now() + 1, 
                role: 'assistant', 
                content: text
            }]);

        } catch (err) {
            setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: "I couldn't reach the database." }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === 'Escape') {
            if (inputValue) setInputValue('');
            else setIsOpen(false);
        }
    };

    const handleFocus = () => {
        setIsOpen(true);
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[420px] px-4 font-sans text-gray-900 pointer-events-none">
            <div ref={containerRef} className="pointer-events-auto flex flex-col items-center">
                
                {/* Chat History Panel (Appears Above) */}
                {isOpen && (messages.length > 0 || isThinking) && (
                    <div className="w-full mb-2 bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl overflow-hidden ring-1 ring-black/5 animate-in slide-in-from-bottom-2 fade-in duration-200">
                        <div 
                            ref={scrollRef}
                            className="max-h-[40vh] overflow-y-auto p-4 scroll-smooth"
                        >
                            {messages.map(msg => (
                                <MessageItem key={msg.id} message={msg} />
                            ))}
                            
                            {isThinking && (
                                <div className="flex items-center gap-2 text-gray-400 text-sm px-1 py-2">
                                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                    <span>Thinking...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Input Bar */}
                <div 
                    className={`
                        w-full bg-gray-50/40 backdrop-blur-md shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)]
                        border-b border-white/30 ring-1 ring-black/10 rounded-full 
                        flex items-center gap-2.5 px-3 py-2 transition-all duration-300
                        ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-90 hover:scale-100 hover:opacity-100'}
                    `}
                >
                    <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                        {isThinking ? (
                            <div className="w-3 h-3 border-2 border-gray-400 border-t-black rounded-full animate-spin" />
                        ) : (
                            <Sparkles className="w-3 h-3 text-gray-600" />
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onFocus={handleFocus}
                        onKeyDown={handleKeyDown}
                        placeholder={`Ask ${aiName}...`}
                        className="flex-1 bg-transparent border-none text-[13px] text-gray-900 placeholder:text-gray-400 focus:ring-0 focus:outline-none h-full font-medium"
                    />

                    <div className="flex items-center gap-2">
                        {inputValue.trim() ? (
                            <button 
                                onClick={handleSend}
                                className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                            >
                                <ArrowUp className="w-3 h-3" />
                            </button>
                        ) : (
                            <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/5 text-[9px] font-bold text-gray-400">
                                K
                            </div>
                        )}
                    </div>
                </div>

                {/* Optional "Close" hit area when open but empty, to make it feel dismissible */}
                {isOpen && messages.length > 0 && (
                    <div className="absolute -bottom-8">
                        <button 
                            onClick={() => { setIsOpen(false); setMessages([]); }} 
                            className="text-[10px] text-gray-400 hover:text-gray-600 font-medium bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm"
                        >
                            Close Chat
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}