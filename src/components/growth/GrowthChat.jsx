import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Sparkles, ChevronRight, RotateCw } from 'lucide-react';
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
  const contentEndRef = useRef(null);
  const inputRef = useRef(null);

  const meta = AGENT_META[agentName] || AGENT_META.growth_orchestrator;

  // Load or create conversation
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setMessages([]);
      setConversationId(null);
      setConversation(null);
      
      const existing = await base44.agents.listConversations({ agent_name: agentName });
      
      if (existing && existing.length > 0) {
        const latest = existing[0];
        setConversationId(latest.id);
        setConversation(latest);
        setMessages(latest.messages || []);
        onConversationChange?.(latest.id);
      }
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
    contentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const msgText = text || input.trim();
    if (!msgText || isSending) return;
    setInput('');
    setIsSending(true);

    let conv = conversation;

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
      
      base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
      });
    }

    // Don't add optimistic user message — we don't show them
    await base44.agents.addMessage(conv, { role: 'user', content: msgText });
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

  // Extract only assistant messages and their tool calls for display
  const briefings = messages.filter(m => m.role === 'assistant');
  const isWaitingForResponse = isSending || (messages.length > 0 && messages[messages.length - 1]?.role === 'user');

  return (
    <div className="flex flex-col h-full">
      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#c4b5ab' }} />
          </div>
        ) : briefings.length === 0 && !isWaitingForResponse ? (
          /* Empty state — prompt cards */
          <EmptyState meta={meta} agentName={agentName} onPrompt={handleSend} />
        ) : (
          <div className="space-y-6 max-w-3xl">
            {briefings.map((msg, i) => (
              <BriefingCard key={i} message={msg} meta={meta} isLatest={i === briefings.length - 1} />
            ))}
          </div>
        )}

        {/* Thinking indicator */}
        <AnimatePresence>
          {isWaitingForResponse && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 max-w-3xl"
            >
              <ThinkingIndicator meta={meta} />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={contentEndRef} />
      </div>

      {/* Input — feels like a command bar, not a chat */}
      <div 
        className="px-4 md:px-8 py-4"
        style={{ 
          background: 'linear-gradient(to top, rgba(255,255,255,1) 70%, rgba(255,255,255,0))',
        }}
      >
        <div 
          className="rounded-2xl flex items-center gap-2 max-w-3xl"
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
            placeholder={`Ask ${meta.label} anything...`}
            disabled={isSending}
            className="flex-1 py-4 pl-5 pr-2 text-[15px] bg-transparent border-none outline-none placeholder:text-[#c4b5ab]"
            style={{ color: '#5A4A46' }}
          />
          {(input.trim() || isSending) && (
            <button
              onClick={() => handleSend()}
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

function EmptyState({ meta, agentName, onPrompt }) {
  const prompts = agentName === 'growth_orchestrator' ? [
    { text: "What should I focus on today?", icon: '🎯' },
    { text: "How are we doing this week?", icon: '📊' },
    { text: "What's falling behind?", icon: '⚠️' },
  ] : agentName === 'connector' ? [
    { text: "Find new businesses to connect with", icon: '🔍' },
    { text: "Who should I reach out to this week?", icon: '📬' },
    { text: "Draft outreach for my top prospects", icon: '✍️' },
  ] : agentName === 'retainer' ? [
    { text: "Any families at risk of leaving?", icon: '⚠️' },
    { text: "Who should I celebrate this week?", icon: '🎉' },
    { text: "Check attendance health", icon: '📋' },
  ] : agentName === 'converter' ? [
    { text: "Who needs a follow-up?", icon: '📞' },
    { text: "Where are families dropping off?", icon: '📉' },
    { text: "Help me close this month's trials", icon: '🎯' },
  ] : [
    { text: "What should I do next?", icon: '🎯' },
    { text: "Give me a strategy update", icon: '📊' },
    { text: "What opportunities am I missing?", icon: '💡' },
  ];

  return (
    <div className="max-w-3xl py-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{meta.emoji}</span>
        <div>
          <h3 
            className="text-xl font-bold"
            style={{
              color: 'transparent',
              backgroundImage: 'linear-gradient(180deg, #8a7070 0%, #6A5A56 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
            }}
          >{meta.label}</h3>
          <p className="text-sm" style={{ color: '#b5a599' }}>Ready to think with you</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {prompts.map((p) => (
          <button
            key={p.text}
            onClick={() => onPrompt(p.text)}
            className="text-left rounded-2xl p-5 transition-all hover:scale-[1.02] active:scale-[0.98] group"
            style={{
              background: 'rgba(255,255,255,0.6)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 12px rgba(180,150,140,0.08)',
              border: '1px solid rgba(220, 200, 196, 0.15)',
            }}
          >
            <span className="text-xl mb-3 block">{p.icon}</span>
            <span className="text-sm font-medium" style={{ color: '#6A5A56' }}>{p.text}</span>
            <ChevronRight 
              className="w-4 h-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" 
              style={{ color: '#b5a599' }} 
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator({ meta }) {
  return (
    <div 
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.5)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
      }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${meta.color}15` }}
        >
          <span className="text-sm">{meta.emoji}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: '#8b7d72' }}>Thinking</span>
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <motion.div 
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: meta.color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BriefingCard({ message, meta, isLatest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Thinking steps — collapsed, subtle */}
      {message.tool_calls?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {message.tool_calls.map((tc, idx) => (
            <ToolCallPill key={idx} toolCall={tc} meta={meta} />
          ))}
        </div>
      )}

      {/* Main content — rendered as a briefing, not a bubble */}
      {message.content && (
        <div 
          className="rounded-2xl p-6"
          style={{
            background: isLatest 
              ? 'rgba(255,255,255,0.7)'
              : 'rgba(255,255,255,0.4)',
            boxShadow: isLatest 
              ? 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 20px -8px rgba(180,140,135,0.1)'
              : 'inset 0 1px 1px rgba(255,255,255,0.5)',
          }}
        >
          <ReactMarkdown 
            className="text-[15px] prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-2 leading-relaxed" style={{ color: '#5A4A46' }}>{children}</p>,
              strong: ({ children }) => <strong style={{ color: '#6A5A56' }}>{children}</strong>,
              ul: ({ children }) => <ul className="my-2 ml-4 list-disc" style={{ color: '#5A4A46' }}>{children}</ul>,
              ol: ({ children }) => <ol className="my-2 ml-4 list-decimal" style={{ color: '#5A4A46' }}>{children}</ol>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              h1: ({ children }) => <h1 className="text-lg font-semibold mt-4 mb-2" style={{ color: '#6A5A56' }}>{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-semibold mt-4 mb-2" style={{ color: '#6A5A56' }}>{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1.5" style={{ color: '#6A5A56' }}>{children}</h3>,
              a: ({ children, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: '#7eb89a' }}>{children}</a>
              ),
              blockquote: ({ children }) => (
                <blockquote 
                  className="border-l-2 pl-4 my-3 text-sm italic"
                  style={{ borderColor: `${meta.color}40`, color: '#8b7d72' }}
                >
                  {children}
                </blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      )}
    </motion.div>
  );
}

function ToolCallPill({ toolCall, meta }) {
  const name = toolCall?.name || 'action';
  const status = toolCall?.status || 'pending';
  const isRunning = status === 'running' || status === 'in_progress' || status === 'pending';
  const isDone = status === 'completed' || status === 'success';

  // Clean up the name for display
  const displayName = name.split('.').pop()?.replace(/_/g, ' ') || name;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
      style={{ 
        background: isDone ? `${meta.color}08` : 'rgba(200,190,180,0.1)',
        color: isDone ? meta.color : '#b5a599',
      }}
    >
      {isRunning ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
      ) : isDone ? (
        <Sparkles className="w-2.5 h-2.5" />
      ) : (
        <span className="w-2 h-2 rounded-full bg-red-200" />
      )}
      {displayName}
    </span>
  );
}