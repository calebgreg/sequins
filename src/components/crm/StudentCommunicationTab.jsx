import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
    Send, 
    Sparkles, 
    History, 
    Mail, 
    MessageSquare, 
    RefreshCw, 
    CheckCircle2, 
    ChevronRight,
    TrendingUp,
    Heart,
    Smartphone,
    Bell,
    Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentCommunicationTab({ student, className = "" }) {
    const [composeMode, setComposeMode] = useState(true);
    const [subject, setSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [channels, setChannels] = useState({
        email: true,
        sms: false,
        portal: false
    });
    
    const queryClient = useQueryClient();

    // Fetch Message History
    const { data: messages = [] } = useQuery({
        queryKey: ['messages', student.id],
        queryFn: async () => {
            const all = await base44.entities.Message.list();
            return all
                .filter(m => m.student_id === student.id)
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
    });

    const sendMessageMutation = useMutation({
        mutationFn: async (data) => {
            const promises = [];
            const timestamp = new Date().toISOString();

            // 1. Handle Email
            if (channels.email) {
                try {
                    await base44.integrations.Core.SendEmail({
                        to: student.parent_email,
                        subject: data.subject,
                        body: data.content
                    });
                } catch (err) {
                    console.error("Failed to send actual email", err);
                }
                
                promises.push(base44.entities.Message.create({
                    content: data.content,
                    subject: data.subject,
                    student_id: student.id,
                    parent_email: student.parent_email,
                    sender: 'user',
                    direction: 'outbound',
                    channel: 'email',
                    status: 'sent',
                    timestamp
                }));
            }

            // 2. Handle SMS (Simulated Integration)
            if (channels.sms) {
                // In a real app, we would call an SMS integration here
                promises.push(base44.entities.Message.create({
                    content: data.content, // SMS might truncate content in a real scenario
                    subject: 'SMS', // SMS usually doesn't have subject, but schema might require it or use it for reference
                    student_id: student.id,
                    parent_email: student.parent_email, // Using email as identifier for parent
                    sender: 'user',
                    direction: 'outbound',
                    channel: 'sms',
                    status: 'sent',
                    timestamp
                }));
            }

            // 3. Handle Portal Push
            if (channels.portal) {
                promises.push(base44.entities.Message.create({
                    content: data.content,
                    subject: data.subject,
                    student_id: student.id,
                    parent_email: student.parent_email,
                    sender: 'user',
                    direction: 'outbound',
                    channel: 'app', // 'app' = portal
                    status: 'sent',
                    is_alert: true, // Flag as alert/notification
                    timestamp
                }));
            }

            return Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['messages', student.id]);
            setSubject('');
            setMessageBody('');
        }
    });

    const toggleChannel = (channel) => {
        setChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
    };

    const generateDraft = async (type) => {
        setIsGenerating(true);
        let promptContext = "";
        
        const basePrompt = `You are a busy, caring dance studio director writing a quick, personal email to a parent. 
        Student Name: ${student.name}
        
        CRITICAL RULES:
        1. Write exactly like a human: short, direct, casual but polite.
        2. NO FLUFF. No "showcasing strong foundations", no "deepening artistry", no "unwavering commitment".
        3. ABSOLUTELY FORBIDDEN: "I hope this finds you well", "I wanted to reach out", "delve", "tapestry", "testament to".
        4. Max 3-4 sentences total. Keep it under 50 words if possible.
        5. Use contractions (e.g., "I'd" instead of "I would", "can't" instead of "cannot").
        `;

        if (type === 'retention') {
            promptContext = `${basePrompt}
            Task: Check in on the student.
            
            Example of GOOD output:
            Subject: Checking in on ${student.name}
            Body:
            Hi [Parent],
            
            Just wanted to check in and see how ${student.name} is liking class so far? I've noticed they're getting much more confident with the choreography.
            
            Let me know if you have any questions or feedback for us!
            
            Best,
            [Teacher]
            
            Your turn. Write a check-in for a ${student.level} student.`;
        } else if (type === 'upsell') {
            promptContext = `${basePrompt}
            Task: Suggest a new class style.
            
            Example of GOOD output:
            Subject: Idea for ${student.name}
            Body:
            Hi [Parent],
            
            Watching ${student.name} in class lately, I think they'd really do well in a Lyrical class. It uses a lot of the same technique they're already learning but lets them be a bit more expressive.
            
            We have a spot open on Tuesdays if you want to try a free trial class? Let me know!
            
            Best,
            [Teacher]
            
            Your turn. Suggest a complementary style for a ${student.level} student.`;
        } else if (type === 'praise') {
            promptContext = `${basePrompt}
            Task: Send a quick win/shoutout.
            
            Example of GOOD output:
            Subject: ${student.name} was great today!
            Body:
            Hi [Parent],
            
            I just had to send a quick note - ${student.name} worked so hard in class today. They finally nailed that turn we've been practicing and the whole room cheered.
            
            Love seeing that kind of focus. Have a great weekend!
            
            Best,
            [Teacher]
            
            Your turn. Write a quick praise note.`;
        }

        try {
            const res = await base44.integrations.Core.InvokeLLM({
                prompt: promptContext + "\n\nOutput strictly valid JSON with 'subject' and 'body' keys.",
                response_json_schema: {
                    type: "object",
                    properties: {
                        subject: { type: "string" },
                        body: { type: "string" }
                    }
                }
            });
            
            if (res) {
                setSubject(res.subject);
                setMessageBody(res.body);
            }
        } catch (e) {
            console.error("AI Gen failed", e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSend = () => {
        if (!subject || !messageBody) return;
        sendMessageMutation.mutate({ subject, content: messageBody });
    };

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 ${className || 'min-h-[500px]'}`}>
            {/* Left: History (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
                <div 
                    className="rounded-2xl p-5 flex-1 flex flex-col overflow-hidden"
                    style={{
                        background: 'linear-gradient(145deg, rgba(253,238,236,0.6) 0%, rgba(250,232,228,0.4) 100%)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-medium flex items-center gap-2" style={{ color: '#8b7d72' }}>
                            <History className="w-4 h-4" /> History
                        </h3>
                        <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.5)', color: '#b5a599' }}
                        >
                            {messages.length}
                        </span>
                    </div>

                    <ScrollArea className="flex-1 -mx-2 px-2">
                        <div className="space-y-2">
                            {messages.length === 0 && (
                                <div className="text-center py-8" style={{ color: '#b5a599' }}>
                                    <span className="text-xl block mb-2">✉</span>
                                    No messages yet
                                </div>
                            )}
                            {messages.map((msg) => (
                                <div 
                                    key={msg.id} 
                                    className="flex flex-col gap-1 p-3 rounded-xl transition-all hover:scale-[1.01]"
                                    style={{ background: 'rgba(255,255,255,0.5)' }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="font-medium text-sm truncate pr-2" style={{ color: '#8b7d72' }}>
                                            {msg.subject || '(No Subject)'}
                                        </div>
                                        <span className="text-[10px] whitespace-nowrap" style={{ color: '#c4b5ab' }}>
                                            {format(new Date(msg.created_date), 'MMM d')}
                                        </span>
                                    </div>
                                    <div className="text-xs line-clamp-2 leading-relaxed" style={{ color: '#a8998e' }}>
                                        {msg.content}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span 
                                            className="text-[9px] px-1.5 py-0.5 rounded-full"
                                            style={{
                                                background: msg.direction === 'outbound' ? 'rgba(100,150,200,0.15)' : 'rgba(126,184,154,0.15)',
                                                color: msg.direction === 'outbound' ? '#6090b5' : '#7eb89a',
                                            }}
                                        >
                                            {msg.direction === 'outbound' ? 'Sent' : 'Received'}
                                        </span>
                                        <span className="text-[10px] capitalize" style={{ color: '#d4c4ba' }}>{msg.channel}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            {/* Right: Composer (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
                <div 
                    className="rounded-2xl p-6 flex-1 flex flex-col relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 15px 50px -15px rgba(180,150,140,0.15)',
                    }}
                >
                    {/* Inner glow */}
                    <div 
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                        }}
                    />

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-medium" style={{ color: '#8b7d72' }}>Compose Message</h3>
                            
                            {/* AI Buttons */}
                            <div className="flex gap-1.5">
                                <button 
                                    onClick={() => generateDraft('praise')}
                                    disabled={isGenerating}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:scale-105 disabled:opacity-50"
                                    style={{
                                        background: 'rgba(164,139,196,0.15)',
                                        color: '#8b7d9a',
                                    }}
                                >
                                    <Sparkles className="w-3 h-3" /> Praise
                                </button>
                                <button 
                                    onClick={() => generateDraft('retention')}
                                    disabled={isGenerating}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:scale-105 disabled:opacity-50"
                                    style={{
                                        background: 'rgba(200,170,156,0.15)',
                                        color: '#c8aa9c',
                                    }}
                                >
                                    <Heart className="w-3 h-3" /> Check-in
                                </button>
                                <button 
                                    onClick={() => generateDraft('upsell')}
                                    disabled={isGenerating}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:scale-105 disabled:opacity-50"
                                    style={{
                                        background: 'rgba(126,184,154,0.15)',
                                        color: '#7eb89a',
                                    }}
                                >
                                    <TrendingUp className="w-3 h-3" /> Upsell
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 flex-1 flex flex-col">
                            <input 
                                placeholder="Subject line..." 
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl text-base font-medium transition-all focus:outline-none focus:ring-2"
                                style={{
                                    background: 'rgba(255,255,255,0.6)',
                                    border: '1px solid rgba(200,180,170,0.2)',
                                    color: '#8b7d72',
                                }}
                            />
                            
                            <div className="relative flex-1">
                                <textarea 
                                    placeholder="Write your message here..." 
                                    value={messageBody}
                                    onChange={(e) => setMessageBody(e.target.value)}
                                    className="w-full h-full min-h-[160px] px-4 py-3 rounded-xl text-sm transition-all resize-none leading-relaxed focus:outline-none focus:ring-2"
                                    style={{
                                        background: 'rgba(255,255,255,0.6)',
                                        border: '1px solid rgba(200,180,170,0.2)',
                                        color: '#8b7d72',
                                    }}
                                />
                                {isGenerating && (
                                    <div 
                                        className="absolute inset-0 flex items-center justify-center rounded-xl z-20"
                                        style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)' }}
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <Sparkles className="w-6 h-6 animate-spin" style={{ color: '#8b7d9a' }} />
                                            <span className="text-sm font-medium animate-pulse" style={{ color: '#8b7d9a' }}>Drafting...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                {/* Channel Toggles */}
                                <div 
                                    className="flex items-center gap-2 p-2 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.4)' }}
                                >
                                    <span className="text-[10px] font-bold uppercase tracking-wider ml-2 mr-1" style={{ color: '#c4b5ab' }}>Send via:</span>
                                    
                                    <button
                                        onClick={() => toggleChannel('email')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                        style={{
                                            background: channels.email ? 'rgba(100,150,200,0.2)' : 'rgba(255,255,255,0.5)',
                                            color: channels.email ? '#6090b5' : '#b5a599',
                                            boxShadow: channels.email ? 'inset 0 1px 1px rgba(255,255,255,0.8)' : 'none',
                                        }}
                                    >
                                        <Mail className="w-3.5 h-3.5" /> Email
                                    </button>

                                    <button
                                        onClick={() => toggleChannel('sms')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                        style={{
                                            background: channels.sms ? 'rgba(164,139,196,0.2)' : 'rgba(255,255,255,0.5)',
                                            color: channels.sms ? '#8b7d9a' : '#b5a599',
                                            boxShadow: channels.sms ? 'inset 0 1px 1px rgba(255,255,255,0.8)' : 'none',
                                        }}
                                    >
                                        <Smartphone className="w-3.5 h-3.5" /> SMS
                                    </button>

                                    <button
                                        onClick={() => toggleChannel('portal')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                        style={{
                                            background: channels.portal ? 'rgba(212,165,116,0.2)' : 'rgba(255,255,255,0.5)',
                                            color: channels.portal ? '#d4a574' : '#b5a599',
                                            boxShadow: channels.portal ? 'inset 0 1px 1px rgba(255,255,255,0.8)' : 'none',
                                        }}
                                    >
                                        <Bell className="w-3.5 h-3.5" /> Portal
                                    </button>
                                </div>

                                <div className="flex justify-between items-center">
                                    <button 
                                        onClick={() => { setSubject(''); setMessageBody(''); }}
                                        className="text-xs transition-colors hover:opacity-70"
                                        style={{ color: '#c4b5ab' }}
                                    >
                                        Clear
                                    </button>
                                    <button 
                                        onClick={handleSend} 
                                        disabled={sendMessageMutation.isPending || !subject || !messageBody || (!channels.email && !channels.sms && !channels.portal)}
                                        className="px-6 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
                                            boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
                                            border: '1px solid rgba(255, 220, 210, 0.5)',
                                        }}
                                    >
                                        <span
                                            style={{
                                                backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                                                backgroundClip: 'text',
                                                WebkitBackgroundClip: 'text',
                                                color: 'transparent',
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            {sendMessageMutation.isPending ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#8a7070' }} />
                                            ) : (
                                                <Send className="w-4 h-4" style={{ color: '#8a7070' }} />
                                            )}
                                            Send
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}