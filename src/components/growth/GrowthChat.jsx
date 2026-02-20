import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

const AGENT_META = {
  growth_orchestrator: { label: 'Growth Engine', emoji: '🧠', color: '#8a7070' },
  connector: { label: 'Connector', emoji: '🤝', color: '#7eb89a' },
  attender: { label: 'Attender', emoji: '🎪', color: '#d4a574' },
  accessor: { label: 'Accessor', emoji: '🚪', color: '#a48bc4' },
  offerer: { label: 'Offerer', emoji: '🎁', color: '#e08080' },
  converter: { label: 'Converter', emoji: '✨', color: '#c9a99c' },
  retainer: { label: 'Retainer', emoji: '💜', color: '#9a8aad' },
  referrer: { label: 'Referrer', emoji: '📣', color: '#6aadad' },
};

export default function GrowthChat({ agentName = 'growth_orchestrator', studioId, onConversationChange }) {
  const [conversationId, setConversationId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const meta = AGENT_META[agentName] || AGENT_META.growth_orchestrator;

  // Load or create conversation
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setMessages([]);
      setConversationId(null);
      setConversation(null);
      
      // Check for existing conversations with this agent
      const existing = await base44.agents.listConversations({ agent_name: agentName });
      
      if (existing && existing.length > 0) {
        // Use most recent
        const latest = existing[0];
        setConversationId(latest.id);
        setConversation(latest);
        setMessages(latest.messages || []);
        onConversationChange?.(latest.id);
      }
      // Don't auto-create — let user send first message to create
      setIsLoading(false);
    };
    init();
  }, [agentName]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversationId) return;
    const unsub = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsub();
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const text = input.trim();
    setInput('');
    setIsSending(true);

    let conv = conversation;

    // Create conversation if none exists
    if (!conv) {
      conv = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: {
          name: `${meta.label} — ${new Date().toLocaleDateString()}`,
          studio_id: studioId,
        }
      });
      setConversationId(conv.id);
      setConversation(conv);
      onConversationChange?.(conv.id);
      
      // Subscribe
      base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
      });
    }

    // Optimistic UI
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    await base44.agents.addMessage(conv, { role: 'user', content: text });
    setIsSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const etchedText = {
    color: 'transparent',
    backgroundImage: 'linear-gradient(180deg, #8a7070 0%, #6A5A56 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
  };

  const isStreaming = messages.length > 0 && messages[messages.length - 1]?.role === 'user';

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#c4b5ab' }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">{meta.emoji}</div>
            <h3 className="text-lg font-semibold mb-2" style={etchedText}>{meta.label}</h3>
            <p className="text-sm max-w-md mx-auto" style={{ color: '#b5a599' }}>
              {agentName === 'growth_orchestrator' 
                ? "Ask me to assess your growth situation, identify priorities, or surface what needs attention right now."
                : `Ask me about ${meta.label.toLowerCase()} strategy — I'll look at your data and reason about what to do next.`}
            </p>
            {/* Quick prompts */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {agentName === 'growth_orchestrator' ? (
                <>
                  <QuickPrompt text="What should I focus on today?" onSelect={text => { setInput(text); inputRef.current?.focus(); }} />
                  <QuickPrompt text="How are we doing this week?" onSelect={text => { setInput(text); inputRef.current?.focus(); }} />
                  <QuickPrompt text="What's falling behind?" onSelect={text => { setInput(text); inputRef.current?.focus(); }} />
                </>
              ) : agentName === 'connector' ? (
                <>
                  <QuickPrompt text="Find new businesses to connect with" onSelect={text => { setInput(text); inputRef.current?.focus(); }} />
                  <QuickPrompt text="Who should I reach out to this week?" onSelect={text => { setInput(text); inputRef.current?.focus(); }} />
                  <QuickPrompt text="Draft outreach for my top prospects" onSelect={text => { setInput(text); inputRef.current?.focus(); }} />
                </>
              ) : agentName === 'retainer' ? (
                <>
                  <QuickPrompt text="Any families at risk of leaving?" onSelect={text => { setInput(text); inputRef.current?.focus(); }} />
                  <QuickPrompt text="Who should I celebrate this week?" onSelect={text => { setInput(text); inputRef.current?.focus(); }} />
                </>
              ) : agentName === 'converter' ? (
                <>
                  <QuickPrompt text="Who needs a follow-up?" onSelect={text => { setInput(text); inputRef.current?.focus(); }} />
                  <QuickPrompt text="Where are families dropping off?" onSelect={text => { setInput(text); inputRef.current?.focus(); }} />
                </>
              ) : (
                <>
                  <QuickPrompt text="What should I do next?" onSelect={text => { setInput(text); inputRef.current?.focus(); }} />
                  <QuickPrompt text="Give me a strategy update" onSelect={text => { setInput(text); inputRef.current?.focus(); }} />
                </>
              )}
            </div>
          </div>
        ) : (
          messages.filter(m => m.role !== 'system').map((msg, i) => (
            <MessageBubble key={i} message={msg} meta={meta} />
          ))
        )}
        
        {(isSending || isStreaming) && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex items-start gap-3">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${meta.color}15` }}
            >
              <span className="text-sm">{meta.emoji}</span>
            </div>
            <div 
              className="rounded-2xl rounded-bl-lg px-5 py-3"
              style={{ background: 'rgba(255,255,255,0.6)' }}
            >
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full"
                    style={{ background: meta.color }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div 
        className="px-4 md:px-6 py-4"
        style={{ 
          background: 'linear-gradient(to top, rgba(255,255,255,1) 70%, rgba(255,255,255,0))',
        }}
      >
        <div 
          className="rounded-2xl flex items-center gap-2"
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(220, 200, 196, 0.3)',
            boxShadow: 'inset 0 1px 3px rgba(180,140,135,0.05), 0 4px 16px -8px rgba(180,140,135,0.1)',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Talk to ${meta.label}...`}
            disabled={isSending}
            className="flex-1 py-4 pl-5 pr-2 text-[15px] bg-transparent border-none outline-none placeholder:text-[#c4b5ab]"
            style={{ color: '#5A4A46' }}
          />
          {(input.trim() || isSending) && (
            <button
              onClick={handleSend}
              disabled={isSending || !input.trim()}
              className="mr-3 p-2.5 rounded-xl transition-all active:scale-95"
              style={{ 
                background: input.trim() ? `${meta.color}20` : 'transparent',
                color: isSending ? '#c4b5ab' : meta.color,
              }}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickPrompt({ text, onSelect }) {
  return (
    <button
      onClick={() => onSelect(text)}
      className="px-4 py-2 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: 'rgba(255,255,255,0.6)',
        color: '#8b7d72',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.08)',
        border: '1px solid rgba(220, 200, 196, 0.2)',
      }}
    >
      {text}
    </button>
  );
}

function MessageBubble({ message, meta }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div 
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${meta.color}15` }}
        >
          <span className="text-sm">{meta.emoji}</span>
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        {message.content && (
          <div 
            className={`rounded-2xl px-5 py-3 ${isUser ? 'rounded-br-lg' : 'rounded-bl-lg'}`}
            style={{
              background: isUser 
                ? 'linear-gradient(145deg, rgba(200,170,156,0.25) 0%, rgba(185,155,140,0.2) 100%)'
                : 'rgba(255,255,255,0.6)',
              boxShadow: isUser ? 'none' : 'inset 0 1px 1px rgba(255,255,255,0.7)',
            }}
          >
            {isUser ? (
              <p className="text-[15px] leading-relaxed" style={{ color: '#5A4A46' }}>{message.content}</p>
            ) : (
              <ReactMarkdown 
                className="text-[15px] prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1.5 leading-relaxed" style={{ color: '#5A4A46' }}>{children}</p>,
                  strong: ({ children }) => <strong style={{ color: '#6A5A56' }}>{children}</strong>,
                  ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc" style={{ color: '#5A4A46' }}>{children}</ul>,
                  ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal" style={{ color: '#5A4A46' }}>{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  h1: ({ children }) => <h1 className="text-lg font-semibold my-2" style={{ color: '#6A5A56' }}>{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold my-2" style={{ color: '#6A5A56' }}>{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold my-2" style={{ color: '#6A5A56' }}>{children}</h3>,
                  a: ({ children, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: '#7eb89a' }}>{children}</a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* Tool calls */}
        {message.tool_calls?.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.tool_calls.map((tc, idx) => (
              <ToolCallBubble key={idx} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallBubble({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'action';
  const status = toolCall?.status || 'pending';
  
  const isRunning = status === 'running' || status === 'in_progress' || status === 'pending';
  const isDone = status === 'completed' || status === 'success';

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/50"
      style={{ color: '#a8998e' }}
    >
      {isRunning ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isDone ? (
        <Sparkles className="w-3 h-3" style={{ color: '#7eb89a' }} />
      ) : (
        <span className="w-3 h-3 rounded-full bg-red-200" />
      )}
      <span>{name.split('.').pop()?.replace(/_/g, ' ')}</span>
    </button>
  );
}