import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { 
    Sparkles, ArrowUp, X, Globe, Calendar, ExternalLink, 
    CheckCircle2, Command, Bot, MessageSquare
} from 'lucide-react';
import useAiAssistant from './useAiAssistant';

// --- Apple-Style Components ---

const LinkPreview = ({ data }) => (
    <div className="flex items-center gap-3 p-3 bg-gray-50/50 hover:bg-gray-100 border border-gray-200/60 rounded-lg transition-colors cursor-pointer group">
        <div className="w-8 h-8 rounded-md bg-white border border-gray-100 flex items-center justify-center text-blue-500 shadow-sm">
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
        <div className={`flex flex-col mb-4 ${isAi ? 'items-start' : 'items-end'}`}>
            <div className={`max-w-[280px] ${isAi ? 'items-start' : 'items-end'}`}>
                {message.content && (
                    <div className={`
                        px-3.5 py-2 text-[13px] leading-relaxed shadow-sm border
                        ${isAi 
                            ? 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border-gray-200' 
                            : 'bg-black text-white rounded-2xl rounded-tr-sm border-black'}
                    `}>
                        {message.content}
                    </div>
                )}

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

    // Auto-scroll without animation
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, isThinking]);

    // Click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target) && isOpen) {
                if (!inputValue.trim()) setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, inputValue]);

    // Focus input instantly
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
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
            // Real Data Context
            const [students, classes] = await Promise.all([
                base44.entities.Student.list(),
                base44.entities.DanceClass.list()
            ]);
            
            const activeStudents = students.filter(s => s.status === 'active');
            const studentRoster = activeStudents.map(s => `${s.name} (${s.age})`).join(', ');
            
            const context = `
                DATA:
                - Total Enrolled: ${students.length}
                - Active: ${activeStudents.length}
                - Classes: ${classes.length}
                - Roster: ${studentRoster}
            `;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `
                    System: You are ${aiName}. Use studio data to answer.
                    Context: ${context}
                    User: "${userText}"
                    Response (Short, plain text):
                `
            });

            const text = typeof response === 'string' ? response : (response.content || "Done.");

            setMessages(prev => [...prev, { 
                id: Date.now() + 1, 
                role: 'assistant', 
                content: text
            }]);

        } catch (err) {
            setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: "Connection error." }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans antialiased text-[#111]">
            
            {/* Main Window */}
            {isOpen && (
                <div
                    ref={containerRef}
                    className="mb-4 w-[340px] bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl flex flex-col overflow-hidden ring-1 ring-black/5"
                    style={{ maxHeight: '600px', minHeight: '400px' }}
                >
                    {/* Header */}
                    <div className="h-12 border-b border-gray-200/50 flex items-center justify-between px-4 bg-white/50">
                        <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-900">{aiName}</span>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div 
                        className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent"
                        ref={scrollRef}
                    >
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                                <Sparkles className="w-6 h-6 mb-3 text-gray-400" />
                                <p className="text-sm font-medium text-gray-500">How can I help?</p>
                            </div>
                        )}

                        {messages.map(msg => (
                            <MessageItem key={msg.id} message={msg} />
                        ))}

                        {isThinking && (
                            <div className="flex items-center gap-2 pl-1">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-100">
                        <div className="relative flex items-center">
                            <input
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSend();
                                    if (e.key === 'Escape') setIsOpen(false);
                                }}
                                placeholder="Ask..."
                                className="w-full bg-gray-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none placeholder:text-gray-400"
                            />
                            {inputValue.trim() && (
                                <button 
                                    onClick={handleSend}
                                    className="absolute right-2 p-1.5 bg-black text-white rounded-lg hover:opacity-80 transition-opacity"
                                >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Trigger Button - Static, simple, elegant */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-12 h-12 bg-black text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
                >
                    <MessageSquare className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}