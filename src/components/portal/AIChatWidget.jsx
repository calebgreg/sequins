import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function AIChatWidget({ messages: initialMessages }) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { content: input, sender: 'user', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Use AI integration
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `
          You are 'Sequins', an AI assistant for a dance studio.
          The user (parent) just said: "${input}".
          
          Context:
          - Studio Name: Sequins
          - Tone: Helpful, magical, precise, warm.
          - Current visual context: They are looking at the family schedule.
          
          Reply concisely (max 2 sentences).
        `,
        add_context_from_internet: false
      });
      
      const aiMsg = { 
        content: res, 
        sender: 'ai', 
        timestamp: new Date().toISOString() 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`
              max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed
              ${msg.is_alert 
                ? 'bg-[#F2DCDD] text-[#5A4A4B] rounded-tr-sm' 
                : msg.sender === 'user'
                  ? 'bg-white text-gray-600 rounded-br-sm shadow-sm border border-gray-100'
                  : 'bg-white text-gray-600 rounded-tl-sm shadow-sm border border-gray-100'
              }
            `}>
              {msg.content}
            </div>
          </motion.div>
        ))}
        {loading && (
           <div className="flex justify-start">
             <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
               <div className="flex gap-1">
                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75" />
                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-150" />
               </div>
             </div>
           </div>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="w-full bg-white rounded-full py-3 pl-6 pr-12 shadow-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F2DCDD] transition-all"
          placeholder="Ask Sequins..."
        />
        <button 
          onClick={handleSend}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-[#555555] transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}