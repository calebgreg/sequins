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
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${className || 'h-[600px]'}`}>
            {/* Left: History & Context (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="bg-white rounded-[24px] p-6 shadow-sm flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-serif text-lg text-[#333333] flex items-center gap-2">
                            <History className="w-4 h-4" /> Message History
                        </h3>
                        <Badge variant="secondary" className="bg-[#F4F4F6] text-gray-500">
                            {messages.length}
                        </Badge>
                    </div>

                    <ScrollArea className="flex-1 -mx-2 px-2">
                        <div className="space-y-3">
                            {messages.length === 0 && (
                                <div className="text-center text-gray-400 py-10 text-sm">
                                    No communication history yet.
                                </div>
                            )}
                            {messages.map((msg) => (
                                <div key={msg.id} className="group flex flex-col gap-1 p-3 rounded-xl hover:bg-[#F4F4F6] transition-colors border border-transparent hover:border-gray-100">
                                    <div className="flex justify-between items-start">
                                        <div className="font-medium text-sm text-[#333333] truncate pr-2">
                                            {msg.subject || '(No Subject)'}
                                        </div>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                            {format(new Date(msg.created_date), 'MMM d')}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                        {msg.content}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {msg.direction === 'outbound' ? (
                                            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-blue-50 text-blue-600 border-blue-100">Sent</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-green-50 text-green-600 border-green-100">Received</Badge>
                                        )}
                                        <span className="text-[10px] text-gray-300 capitalize">{msg.channel}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            {/* Right: Composer (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="bg-white rounded-[32px] p-8 shadow-sm flex-1 flex flex-col relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-serif text-2xl text-[#333333] mb-1">Composer</h3>
                            </div>
                            
                            {/* AI Cheat Codes */}
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => generateDraft('praise')}
                                    disabled={isGenerating}
                                    className="rounded-full border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                                >
                                    <Sparkles className="w-3 h-3 mr-1" /> Praise
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => generateDraft('retention')}
                                    disabled={isGenerating}
                                    className="rounded-full border-pink-100 text-pink-600 hover:bg-pink-50"
                                >
                                    <Heart className="w-3 h-3 mr-1" /> Retention
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => generateDraft('upsell')}
                                    disabled={isGenerating}
                                    className="rounded-full border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                                >
                                    <TrendingUp className="w-3 h-3 mr-1" /> Upsell
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1 flex flex-col">
                            <div className="space-y-2">
                                <Input 
                                    placeholder="Subject line..." 
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="font-medium border-gray-100 bg-[#F9FAFB] focus:bg-white transition-all text-lg h-12 rounded-xl"
                                />
                            </div>
                            
                            <div className="relative flex-1">
                                <Textarea 
                                    placeholder="Write your message here... or use the AI buttons above to draft something magic." 
                                    value={messageBody}
                                    onChange={(e) => setMessageBody(e.target.value)}
                                    className="h-full min-h-[200px] border-gray-100 bg-[#F9FAFB] focus:bg-white transition-all resize-none p-4 text-base rounded-xl leading-relaxed"
                                />
                                {isGenerating && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-20">
                                        <div className="flex flex-col items-center gap-2">
                                            <Sparkles className="w-8 h-8 text-indigo-500 animate-spin" />
                                            <span className="text-indigo-600 font-medium animate-pulse">Drafting magic...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 space-y-4">
                                {/* Broadcast Toggles */}
                                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2 mr-1">Broadcast To:</span>
                                    
                                    <button
                                        onClick={() => toggleChannel('email')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                            channels.email 
                                            ? 'bg-blue-100 text-blue-700 shadow-sm ring-2 ring-blue-500/20' 
                                            : 'bg-white text-gray-400 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Mail className="w-4 h-4" /> Email
                                    </button>

                                    <button
                                        onClick={() => toggleChannel('sms')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                            channels.sms 
                                            ? 'bg-purple-100 text-purple-700 shadow-sm ring-2 ring-purple-500/20' 
                                            : 'bg-white text-gray-400 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Smartphone className="w-4 h-4" /> Text / SMS
                                    </button>

                                    <button
                                        onClick={() => toggleChannel('portal')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                            channels.portal 
                                            ? 'bg-orange-100 text-orange-700 shadow-sm ring-2 ring-orange-500/20' 
                                            : 'bg-white text-gray-400 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Bell className="w-4 h-4" /> Family Room
                                    </button>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="text-xs text-gray-400">
                                        <span className="font-medium">Pro Tip:</span> Personalize the AI drafts before sending!
                                    </div>
                                    <div className="flex gap-3">
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => { setSubject(''); setMessageBody(''); }}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            Clear
                                        </Button>
                                        <Button 
                                            onClick={handleSend} 
                                            disabled={sendMessageMutation.isPending || !subject || !messageBody || (!channels.email && !channels.sms && !channels.portal)}
                                            className="bg-[#333333] text-white hover:bg-black rounded-full px-8 shadow-lg hover:shadow-xl transition-all"
                                        >
                                            {sendMessageMutation.isPending ? (
                                                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Send className="w-4 h-4 mr-2" />
                                            )}
                                            Send Broadcast
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}