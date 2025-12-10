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
import { cn } from "@/utils"; // Assuming you have a cn utility
import useAiAssistant from './useAiAssistant';

// --- Components ---

const MessageBubble = ({ message, aiName }) => {
    const isAi = message.role === 'assistant';
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex gap-3 mb-6 ${isAi ? 'flex-row' : 'flex-row-reverse'}`}
        >
            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm
                ${isAi ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white' : 'bg-gray-100 text-gray-500'}
            `}>
                {isAi ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            
            <div className={`flex flex-col max-w-[80%] ${isAi ? 'items-start' : 'items-end'}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {isAi ? aiName : 'You'}
                    </span>
                    <span className="text-[10px] text-gray-300">
                        {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
                
                <div className={`
                    p-4 rounded-2xl text-sm leading-relaxed shadow-sm backdrop-blur-md
                    ${isAi 
                        ? 'bg-white/80 border border-white/50 text-gray-700 rounded-tl-none' 
                        : 'bg-[#333333] text-white rounded-tr-none'}
                `}>
                    {message.content}
                </div>

                {/* Action Card (if AI performed an action) */}
                {message.action && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 w-full bg-white border border-indigo-100 rounded-xl p-3 shadow-sm flex items-center gap-3 overflow-hidden"
                    >
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-500 uppercase">Action Completed</div>
                            <div className="text-sm font-medium text-gray-900 truncate">{message.action}</div>
                        </div>
                    </motion.div>
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
            content: "Hello! I'm your studio assistant. How can I help you manage your day?", 
            timestamp: new Date() 
        }
    ]);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    // Use our hook to get the AI name (and potential shared logic later)
    const { aiName } = useAiAssistant();

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    // Focus input on open
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
        
        // --- AI LOGIC START ---
        // This simulates the "Omnipotent" backend processing
        // In a real implementation, you'd keep chat history context
        
        const loadingId = 'loading-' + Date.now();
        setMessages(prev => [...prev, { 
            id: loadingId, 
            role: 'assistant', 
            content: 'Thinking...', 
            isLoading: true, 
            timestamp: new Date() 
        }]);

        try {
            // We use the same generic invoke logic but tailored for chat
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `
                    You are ${aiName}, a highly capable and friendly studio assistant.
                    User just said: "${userMsg.content}"
                    
                    Respond conversationally. If the user asks for an action you can't strictly perform yet via this chat (like "refund this"), 
                    pretend you can or explain the steps concisely.
                    
                    Keep responses short, elegant, and helpful. Use emojis sparingly but effectively.
                `,
                // We're just getting text back for the chat bubble for now
                // Complex actions would be handled by structured output in a more advanced version
            });

            const aiResponseText = typeof response === 'string' ? response : (response.content || "I'm not sure how to respond to that.");

            setMessages(prev => prev.map(m => 
                m.id === loadingId 
                    ? { ...m, content: aiResponseText, isLoading: false } 
                    : m
            ));

        } catch (err) {
            setMessages(prev => prev.map(m => 
                m.id === loadingId 
                    ? { ...m, content: "I'm having trouble connecting right now. Please try again.", isLoading: false } 
                    : m
            ));
        }
        // --- AI LOGIC END ---
    };

    return (
        <>
            {/* Trigger Button (Floating) */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-[#333333] text-white shadow-2xl flex items-center justify-center hover:bg-black transition-colors group"
                    >
                        <div className="absolute inset-0 rounded-full border border-white/10" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Sparkles className="w-7 h-7" />
                        
                        {/* Notification Badge (Optional) */}
                        {/* <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-[#F4F4F6]" /> */}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ 
                            opacity: 1, 
                            y: 0, 
                            scale: 1,
                            width: isExpanded ? '600px' : '400px',
                            height: isExpanded ? '800px' : '600px'
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className={`
                            fixed bottom-6 right-6 z-50 bg-[#Fdfdfd]/95 backdrop-blur-xl rounded-[32px] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] 
                            border border-white/50 flex flex-col overflow-hidden max-w-[calc(100vw-48px)] max-h-[calc(100vh-48px)]
                        `}
                    >
                        {/* Header */}
                        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100 flex-shrink-0 bg-gradient-to-b from-white/50 to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#333333] to-[#555] flex items-center justify-center text-white shadow-lg">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-serif text-lg text-[#333333] leading-none">{aiName}</h3>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Online</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="text-gray-400 hover:text-[#333333] hover:bg-gray-100 rounded-full h-8 w-8"
                                >
                                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full h-8 w-8"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div 
                            className="flex-1 overflow-y-auto p-6 scroll-smooth bg-gray-50/30"
                            ref={scrollRef}
                        >
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} aiName={aiName} />
                            ))}
                            
                            {/* Typing Indicator if last message is loading */}
                            {messages[messages.length - 1]?.isLoading && (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }}
                                    className="flex gap-2 ml-11 mb-4"
                                >
                                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                                </motion.div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white/80 border-t border-gray-100 flex-shrink-0">
                            {/* Suggestions / Context Pills (Static for now, could be dynamic) */}
                            {messages.length === 1 && (
                                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                                    {['Check revenue', 'Draft an email', 'Find a student'].map(suggestion => (
                                        <button 
                                            key={suggestion}
                                            onClick={() => setInputValue(suggestion)}
                                            className="whitespace-nowrap px-3 py-1.5 bg-gray-50 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 rounded-full text-xs font-medium border border-gray-200 transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="relative flex items-end gap-2 bg-gray-100/50 p-2 rounded-[24px] border border-transparent focus-within:border-indigo-100 focus-within:bg-white focus-within:shadow-md transition-all duration-300">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="rounded-full text-gray-400 hover:text-[#333333] h-10 w-10 flex-shrink-0"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </Button>
                                
                                <Input
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder={`Message ${aiName}...`}
                                    className="border-none bg-transparent shadow-none focus-visible:ring-0 px-2 py-3 h-auto max-h-32 min-h-[44px] text-sm"
                                />

                                <Button 
                                    onClick={handleSend}
                                    disabled={!inputValue.trim()}
                                    className={`
                                        rounded-full h-10 w-10 flex-shrink-0 transition-all duration-300
                                        ${inputValue.trim() 
                                            ? 'bg-[#333333] hover:bg-black text-white shadow-lg rotate-0 scale-100' 
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed rotate-90 scale-90 opacity-0 hidden'}
                                    `}
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </Button>
                                {!inputValue.trim() && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="rounded-full text-gray-400 hover:text-[#333333] h-10 w-10 flex-shrink-0"
                                    >
                                        <Mic className="w-5 h-5" />
                                    </Button>
                                )}
                            </div>
                            <div className="text-center mt-2">
                                <span className="text-[10px] text-gray-300 font-medium tracking-wide">
                                    AI can make mistakes. Check important info.
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}