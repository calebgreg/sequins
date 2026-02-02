import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
    Sparkles, ArrowUp, X, Globe, Calendar, ExternalLink, 
    Command, Bot, Search, CornerDownLeft, CheckCircle2,
    ArrowRightCircle, LayoutTemplate
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import useAiAssistant from './useAiAssistant';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

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
    const navigate = useNavigate();

    const handleLinkClick = (e, href) => {
        if (href && href.startsWith('/')) {
            e.preventDefault();
            navigate(href);
        }
    };

    // Special rendering for specific actions
    const renderActionFeedback = () => {
        if (!message.action || message.action.type !== 'action_executed') return null;
        
        const { entity, action, result } = message.action.details;

        // Custom UI for Performance Drafts
        if (entity === 'Performance' && action === 'create_draft') {
            return (
                <div className="mt-3 bg-white border border-indigo-100 rounded-xl p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#333333] flex items-center justify-center text-white shrink-0">
                            <LayoutTemplate className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Draft Started</div>
                            <h4 className="font-serif text-gray-900 font-medium truncate">{result?.title || 'New Performance'}</h4>
                        </div>
                    </div>
                    <Button 
                        onClick={() => navigate(`/performances?mode=producer&id=${result?.id}`)}
                        className="w-full mt-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 h-8 text-xs font-semibold shadow-none justify-between group"
                    >
                        Enter Backstage
                        <ArrowRightCircle className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
                    </Button>
                </div>
            );
        }

        // Generic friendly feedback
        let userFriendlyText = `${action} ${entity}`;
        if (action === 'create') userFriendlyText = `Created new ${entity.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`;
        if (action === 'update') userFriendlyText = `Updated ${entity.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`;
        if (action === 'read') userFriendlyText = `Checked ${entity.replace(/([A-Z])/g, ' $1').trim().toLowerCase()} records`;

        return (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50/80 p-2 rounded-lg border border-emerald-100/50">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                    {userFriendlyText}
                    {result?.title && <span className="text-emerald-600/80 font-normal"> — "{result.title}"</span>}
                </span>
            </div>
        );
    };

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
                        <ReactMarkdown 
                            components={{
                                p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                                a: ({node, ...props}) => {
                                    const href = props.href;
                                    if (href && href.startsWith('/')) {
                                        return (
                                            <span
                                                onClick={(e) => handleLinkClick(e, href)}
                                                className="underline font-semibold hover:opacity-80 cursor-pointer text-indigo-600"
                                                role="link"
                                            >
                                                {props.children}
                                            </span>
                                        );
                                    }
                                    return (
                                        <a 
                                            {...props} 
                                            className="underline font-semibold hover:opacity-80" 
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        />
                                    );
                                },
                                ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>

                        {/* Action Feedback */}
                        {renderActionFeedback()}
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

// Create a context to share bulk selection state
export const BulkSelectionContext = React.createContext({
    selectedStudents: [],
    setSelectedStudents: () => {},
    clearSelection: () => {},
});

export function useBulkSelection() {
    return React.useContext(BulkSelectionContext);
}

export default function GlobalAiChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [messages, setMessages] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const navigate = useNavigate();

    const clearSelection = () => setSelectedStudents([]);
    const hasBulkSelection = selectedStudents.length > 0;
    
    // Get Current User
    const { data: currentUser } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me().catch(() => null),
        retry: false
    });

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
            // If bulk selection is active, use bulkStudentAction
            if (hasBulkSelection) {
                const { data } = await base44.functions.invoke('bulkStudentAction', {
                    instruction: userText,
                    studentIds: selectedStudents.map(s => s.id)
                });
                
                setMessages(prev => [...prev, { 
                    id: Date.now() + 1, 
                    role: 'assistant', 
                    content: data.explanation || (data.success ? 'Done!' : 'Something went wrong.')
                }]);

                if (data.success) {
                    clearSelection();
                }
                
                setIsThinking(false);
                return;
            }

            // Call the backend Coordinator "Agent"
            const { data } = await base44.functions.invoke('geneCoordinator', { 
                prompt: userText, 
                chatHistory: messages.map(({ role, content }) => ({ role, content }))
            });
            
            // Handle navigation action
            if (data.navigation) {
                navigate(data.navigation.path);
                toast.success(`Navigating to ${data.navigation.page_name}`);
            }

            if (data.action_result) {
                if (data.action_result.type === 'success') {
                    const { entity, action, result } = data.action_result;
                    let actionDesc = `${action} ${entity}`;
                    if (entity === 'FamilyTask' && result.title) actionDesc = `Created task: "${result.title}"`;
                    if (entity === 'FamilyNote') actionDesc = `Added note to family`;

                    toast.success(`Action Executed: ${actionDesc}`);
                } else {
                    toast.error(`Action Failed: ${data.action_result.message}`);
                }
            }

            setMessages(prev => [...prev, { 
                id: Date.now() + 1, 
                role: 'assistant', 
                content: data.response_text,
                action: data.action_result ? { 
                    type: 'action_executed', 
                    details: data.action_result 
                } : null
            }]);

            } catch (err) {
            console.error("GlobalAiChat Error:", err);
            setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: "I encountered an error processing that request." }]);
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
            <svg width="0" height="0" className="absolute">
                <filter id="liquid-glass">
                    <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="1" result="turbulence" />
                    <feDisplacementMap in2="turbulence" in="SourceGraphic" scale="2" xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </svg>
            <div ref={containerRef} className="pointer-events-auto flex flex-col items-center">
                
                {/* Chat History Panel (Appears Above) */}
                {isOpen && (messages.length > 0 || isThinking) && (
                    <div className="w-full mb-2 bg-white/10 backdrop-blur-[20px] border border-white/40 shadow-xl rounded-2xl overflow-hidden ring-1 ring-black/5 animate-in slide-in-from-bottom-2 fade-in duration-200" style={{filter: 'url(#liquid-glass)'}}>
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
                        w-full bg-pink-50/30 backdrop-blur-[20px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)]
                        border-b border-pink-100/40 ring-1 ring-pink-200/20 
                        flex flex-col transition-all duration-300
                        ${hasBulkSelection ? 'rounded-2xl p-3 gap-2' : 'rounded-full px-3 py-2'}
                        ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-90 hover:scale-100 hover:opacity-100'}
                    `}
                    style={{filter: 'url(#liquid-glass)'}}
                >
                    {/* Bulk Selection Header */}
                    {hasBulkSelection && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span 
                                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black text-white"
                                >
                                    {selectedStudents.length}
                                </span>
                                <span className="text-sm text-gray-600">
                                    {selectedStudents.slice(0, 3).map(s => s.name).join(', ')}
                                    {selectedStudents.length > 3 && `, +${selectedStudents.length - 3} more`}
                                </span>
                            </div>
                            <button 
                                onClick={clearSelection}
                                className="p-1 rounded-full hover:bg-black/5 transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    )}

                    {/* Input Row */}
                    <div className="flex items-center gap-2.5">
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
                            placeholder={hasBulkSelection ? "What do you want to do?" : ""}
                            className="flex-1 bg-transparent border-none text-[13px] text-gray-900 placeholder:text-gray-400 focus:ring-0 focus:outline-none h-full font-medium"
                        />

                        <div className="flex items-center gap-2">
                            {inputValue.trim() && (
                                <button 
                                    onClick={handleSend}
                                    className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                                >
                                    <ArrowUp className="w-3 h-3" />
                                </button>
                            )}
                        </div>
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
            
            {/* Expose context for bulk selection */}
            <BulkSelectionContext.Provider value={{ selectedStudents, setSelectedStudents, clearSelection }}>
                {/* This is intentionally empty - we're using a portal pattern */}
            </BulkSelectionContext.Provider>
        </div>
    );
}

// Export a wrapper that provides the context properly
export function GlobalAiChatProvider({ children }) {
    const [selectedStudents, setSelectedStudents] = React.useState([]);
    const clearSelection = () => setSelectedStudents([]);

    return (
        <BulkSelectionContext.Provider value={{ selectedStudents, setSelectedStudents, clearSelection }}>
            {children}
        </BulkSelectionContext.Provider>
    );
}