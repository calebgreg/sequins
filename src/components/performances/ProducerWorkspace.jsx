import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, Sparkles, AlertTriangle, Music, ArrowRight, Save, Wand2, X, 
    ChevronLeft, Calendar, PenTool, MapPin, Trophy, Star, Users, LayoutTemplate, Clock,
    CheckSquare, ShieldAlert, FileText, Shirt, Lightbulb, Speaker, Footprints, Plus, ExternalLink
} from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import ProducerTaskItem from './ProducerTaskItem';
import ProducerCostumeEnricher from './ProducerCostumeEnricher';
import VenueSearch from './VenueSearch';

export default function ProducerWorkspace({ performanceId, onCancel, onPlanCreated }) {
    // State
    const [chatHistory, setChatHistory] = useState([{ role: 'assistant', content: "I'm ready. What are we working on?" }]);
    const [currentInput, setCurrentInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState(null);

    // --- DB SYNC MODE (If performanceId provided) ---
    const { data: dbPerformance } = useQuery({
        queryKey: ['performance', performanceId],
        queryFn: () => base44.entities.Performance.list().then(list => list.find(p => p.id === performanceId)),
        enabled: !!performanceId
    });

    const { data: dbChatHistory } = useQuery({
        queryKey: ['performance_chat', performanceId],
        queryFn: async () => {
             const chats = await base44.entities.PerformanceChat.list(); // Should filter by performance_id if possible, doing client side for now as list() fetches all? Or use filter()
             // Assuming filter is supported or we filter client side. 
             // Ideally: base44.entities.PerformanceChat.filter({ performance_id: performanceId })
             // Checking context, SDK supports filter.
             return base44.entities.PerformanceChat.filter({ performance_id: performanceId });
        },
        enabled: !!performanceId
    });

    // Initialize/Sync State
    useEffect(() => {
        if (performanceId) {
            // DB Mode: Sync from DB
            if (dbPerformance) {
                setEventDetails(prev => ({
                    ...prev,
                    title: dbPerformance.title,
                    date: dbPerformance.date,
                    type: dbPerformance.type || 'recital',
                    venue: dbPerformance.venue?.venue_name || (typeof dbPerformance.venue === 'string' ? dbPerformance.venue : ''),
                    venueData: typeof dbPerformance.venue === 'object' ? dbPerformance.venue : null
                }));
            }
            if (dbChatHistory && dbChatHistory.length > 0) {
                // Sort by timestamp
                const sorted = [...dbChatHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                // Add system intro if empty? Or just use DB.
                // If it's the very first load and only 1 user msg exists (from Gene), we might want to append the assistant intro locally if not in DB.
                // But let's just map DB to chat format
                const mapped = sorted.map(c => ({ role: c.role, content: c.content }));
                // If the last message is from user, we might want to trigger a reply? 
                // But Gene coordinator creates the draft AND the user message. 
                // The assistant reply "I've opened the drafting table" is in the main chat, not here.
                // So here we should probably start with an intro if only user msg exists.
                // Let's just set it.
                
                // If the chat history from DB doesn't have a welcome message, add one visually?
                // Actually, let's just use what's in DB.
                setChatHistory(mapped);
            }
        } else {
            // LocalStorage Mode (Legacy/Manual)
            try {
                const savedChat = localStorage.getItem('sequins_draft_chat');
                if (savedChat) setChatHistory(JSON.parse(savedChat));
                
                const savedPlan = localStorage.getItem('sequins_draft_plan');
                if (savedPlan) setGeneratedPlan(JSON.parse(savedPlan));

                const savedDetails = localStorage.getItem('sequins_draft_details');
                if (savedDetails) setEventDetails(JSON.parse(savedDetails));
            } catch (e) { }
        }
    }, [performanceId, dbPerformance, dbChatHistory]);

    // Auto-save (Local Mode Only)
    useEffect(() => {
        if (!performanceId) {
            localStorage.setItem('sequins_draft_chat', JSON.stringify(chatHistory));
        }
    }, [chatHistory, performanceId]);

    useEffect(() => {
        if (!performanceId) {
            if (generatedPlan) localStorage.setItem('sequins_draft_plan', JSON.stringify(generatedPlan));
            else localStorage.removeItem('sequins_draft_plan');
        }
    }, [generatedPlan, performanceId]);
            const scrollRef = useRef(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory, isGenerating]);
    const [activeTab, setActiveTab] = useState('tasks');
    const queryClient = useQueryClient();

    // Event Details State
    const [eventDetails, setEventDetails] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        type: 'recital',
        venue: '',
        venueData: null
    });

    // Auto-save details locally only if no performanceId
    useEffect(() => {
        if (!performanceId) {
            localStorage.setItem('sequins_draft_details', JSON.stringify(eventDetails));
        }
    }, [eventDetails, performanceId]);

    // Fetch context data
    const { data: studioSettings } = useQuery({
        queryKey: ['studioSettings'],
        queryFn: () => base44.entities.StudioSettings.list().then(res => res[0]),
        enabled: !generatedPlan,
        refetchOnWindowFocus: false,
        refetchInterval: false
    });

    const { data: classes = [] } = useQuery({
        queryKey: ['allClasses'],
        queryFn: () => base44.entities.DanceClass.list(),
        enabled: !generatedPlan,
        refetchOnWindowFocus: false,
        refetchInterval: false
    });

    const getContext = () => ({
        studio: { 
            studio_name: studioSettings?.name || "My Dance Studio",
            costume_vendors: studioSettings?.costume_vendors || []
        },
        event_details: eventDetails,
        classes: classes
            .filter(c => c.type !== 'admin')
            .map(c => ({
                class_id: c.id,
                name: c.title,
                style: c.style || c.title,
                dancer_count: c.student_names?.length || 5,
                approx_length_minutes: (c.duration || 1) * 60,
                notes: `Taught by ${c.teacher || 'Staff'}`
            }))
    });

    // Phase 1: Chat Interaction
    const chatMutation = useMutation({
        mutationFn: async (newMessage) => {
            // 1. Optimistic Update
            const optimisticHistory = [...chatHistory, { role: 'user', content: newMessage }];
            setChatHistory(optimisticHistory); 

            // 2. Persist User Message if DB Mode
            if (performanceId) {
                await base44.entities.PerformanceChat.create({
                    performance_id: performanceId,
                    role: 'user',
                    content: newMessage,
                    timestamp: new Date().toISOString()
                });
            }
            
            // 3. Invoke AI
            const response = await base44.functions.invoke('producePerformance', {
                action: 'chat',
                chatHistory: optimisticHistory,
                context: getContext()
            });
            
            // 4. Persist AI Response if DB Mode
            if (performanceId && response.data) {
                await base44.entities.PerformanceChat.create({
                    performance_id: performanceId,
                    role: 'assistant',
                    content: response.data.content, // ensure content is extracted
                    timestamp: new Date().toISOString()
                });
            }

            return response.data;
        },
        onSuccess: (aiMessage) => {
            // Update state with the returned AI message
            setChatHistory(prev => [...prev, aiMessage]);
            setIsGenerating(false);
        },
        onError: () => {
            toast.error("Connection failed. Please try again.");
            setIsGenerating(false);
        }
    });

    // Phase 2: Finalize Plan (JSON)
    const finalizePlanMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('producePerformance', {
                action: 'generate_plan',
                chatHistory: chatHistory,
                context: getContext()
            });
            return response.data;
        },
        onSuccess: (data) => {
            if (!data || data.error || !data.show_plan) {
                console.error("Invalid plan data received:", data);
                const errorMsg = data?.error || "Failed to generate a valid plan. Please try again.";
                toast.error(errorMsg);
                setIsFinalizing(false);
                return;
            }
            setGeneratedPlan(data);
            setIsFinalizing(false);
            if (!eventDetails.title && data?.extracted_intake?.theme_or_story_seed) {
                setEventDetails(prev => ({ ...prev, title: data.extracted_intake.theme_or_story_seed }));
            }
        },
        onError: (err) => {
            console.error(err);
            toast.error("Failed to compile the plan.");
            setIsFinalizing(false);
        }
    });

    const createEventMutation = useMutation({
        mutationFn: async (plan) => {
            // Determine final data sources
            const finalTitle = eventDetails.title || (plan?.extracted_intake?.theme_or_story_seed) || "New Production";
            
            // Use full venue data if available, otherwise fallback to just the name string
            let venueObj = null;
            if (eventDetails.venueData) {
                venueObj = eventDetails.venueData;
            } else if (eventDetails.venue) {
                venueObj = { venue_name: eventDetails.venue };
            }

            const performanceData = {
                title: finalTitle,
                date: eventDetails.date,
                status: 'planning',
                type: eventDetails.type,
                venue: venueObj,
                description: plan?.producer_writeup || "Event plan updated."
            };
            
            let targetPerformanceId = performanceId;

            if (performanceId) {
                // UPDATE existing
                await base44.entities.Performance.update(performanceId, performanceData);
            } else {
                // CREATE new
                const newPerf = await base44.entities.Performance.create(performanceData);
                targetPerformanceId = newPerf.id;
            }

            // Create routines only if we have a generated plan
            // Note: If updating, we might duplicate routines if we run this multiple times. 
            // For now, assuming this is a "Save/Finalize" action.
            // Ideally should clear old routines if re-generating, but that's risky.
            // Let's assume this is a one-time "Publish Plan" action for now or append.
            // Since this runs when clicking "Save", checking if routines exist is smart.
            
            if (plan && plan.show_plan && plan.show_plan.run_of_show) {
                const routines = plan.show_plan.run_of_show
                    .filter(segment => segment.segment_type === 'performance')
                    .map((segment) => ({
                        performance_id: targetPerformanceId,
                        title: segment.title,
                        order_index: segment.order,
                        duration_seconds: Math.round(segment.estimated_minutes * 60),
                        class_id: segment.class_id,
                        notes: segment.stage_action, // Mapped from stage_action
                        costume_details: segment.costume_concept,
                        costume_product_suggestions: segment.costume_product_suggestions,
                        lighting_notes: segment.visual_concept,
                        song_title: segment.music_selection?.title,
                        artist: segment.music_selection?.artist
                    }));

                if (routines.length > 0) {
                    await base44.entities.PerformanceRoutine.bulkCreate(routines);
                }
                
                // Automatically create tasks
                if (plan && plan.show_plan && plan.show_plan.production_tasks?.length > 0) {
                    const tasksToCreate = plan.show_plan.production_tasks.map(task => ({
                        title: task.task,
                        description: `${task.detail || ''}\n\nGenerated by Sequins Producer.\nDepartment: ${task.department}\nDue Milestone: ${task.due_milestone}`,
                        status: 'pending',
                        category: 'event',
                        priority: task.priority === 'critical' ? 'high' : (task.priority === 'high' ? 'medium' : 'low'),
                        is_shared: true,
                        due_date: task.due_date || undefined,
                        performance_id: targetPerformanceId
                    }));

                    if (tasksToCreate.length > 0) {
                         await base44.entities.FamilyTask.bulkCreate(tasksToCreate);
                    }
                }
            }

            return { id: targetPerformanceId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['performances']);
            toast.success(performanceId ? "Event updated successfully!" : "Event created successfully!");
            onPlanCreated(data.id);
            // Reset state and clear storage
            setGeneratedPlan(null);
            setCurrentInput('');
            if (!performanceId) {
                setEventDetails({ title: '', date: '', type: 'recital', venue: '', venueData: null });
                localStorage.removeItem('sequins_draft_chat');
                localStorage.removeItem('sequins_draft_plan');
                localStorage.removeItem('sequins_draft_details');
            }
        },
        onError: (err) => {
            toast.error("Failed to save event.");
            console.error(err);
        }
    });

    const handleSendMessage = () => {
        if (!currentInput.trim()) return;
        const msg = currentInput;
        setCurrentInput('');
        setIsGenerating(true);
        chatMutation.mutate(msg);
    };

    const handleFinalize = () => {
        if (chatHistory.length === 0) {
            toast.error("Please discuss the event with Sequins first!");
            return;
        }
        setIsFinalizing(true);
        finalizePlanMutation.mutate();
    };

    const handleManualCreate = () => {
        if (!eventDetails.title) {
            toast.error("Please enter an event title");
            return;
        }
        createEventMutation.mutate(null); // Pass null plan to indicate manual creation
    };

    return (
        <div className="h-[calc(100vh-120px)] bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col relative">
            
            {/* Workspace Header */}
            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-8 bg-white shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full hover:bg-gray-100 -ml-2">
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#333333] rounded-lg flex items-center justify-center text-white shadow-sm">
                            <PenTool className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="font-serif text-lg text-[#333333]">Drafting Table</h2>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {chatHistory.length > 1 && !generatedPlan && (
                        <Button 
                            variant="ghost" 
                            onClick={() => {
                                if(confirm("Start fresh? This will clear your current draft.")) {
                                    setChatHistory([{ role: 'assistant', content: "I'm ready. What are we working on?" }]);
                                    setEventDetails({ title: '', date: new Date().toISOString().split('T')[0], type: 'recital', venue: '', venueData: null });
                                    localStorage.removeItem('sequins_draft_chat');
                                    localStorage.removeItem('sequins_draft_details');
                                }
                            }} 
                            className="text-gray-400 hover:text-red-500 text-xs"
                        >
                            Clear Draft
                        </Button>
                    )}
                    {generatedPlan && (
                        <Button variant="ghost" onClick={() => setGeneratedPlan(null)} className="text-gray-400 hover:text-[#333333]">
                            Back to Brief
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative bg-[#FDFBF7]">
                <AnimatePresence mode="wait">
                    {!generatedPlan ? (
                        <motion.div 
                            key="input-state"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="h-full flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden"
                        >
                            {isFinalizing ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-white/90 backdrop-blur-sm z-50 absolute inset-0">
                                    <div className="text-center space-y-8 max-w-md">
                                        <div className="relative w-24 h-24 mx-auto">
                                            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping opacity-20" />
                                            <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center shadow-xl border border-indigo-50">
                                                <Wand2 className="w-10 h-10 text-indigo-600 animate-pulse" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-serif text-[#333333] mb-3">Drafting your blueprints...</h3>
                                            <div className="h-6 overflow-hidden relative">
                                                <motion.div 
                                                    animate={{ y: [-24, 0, 0, -24, -48, -48, -72] }}
                                                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                                    className="text-gray-400 font-medium"
                                                >
                                                    <p className="h-6">Structuring run of show...</p>
                                                    <p className="h-6">Assigning costumes & lighting...</p>
                                                    <p className="h-6">Finalizing rehearsal schedules...</p>
                                                    <p className="h-6">Calculating runtimes...</p>
                                                </motion.div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                            
                            {!isFinalizing && (
                                <>
                                    {/* Left: Event Logistics */}
                                    <div className="w-full lg:w-1/3 bg-white border-r border-gray-100 p-8 lg:p-10 flex flex-col overflow-y-auto">
                                        <div className="mb-8">
                                            <h3 className="font-serif text-2xl text-[#333333] mb-2">Production Basics</h3>
                                            <p className="text-gray-500 text-sm">Define the core logistics for your event.</p>
                                        </div>

                                        <div className="space-y-6 flex-1">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Title</label>
                                                <Input 
                                                    value={eventDetails.title}
                                                    onChange={(e) => setEventDetails({...eventDetails, title: e.target.value})}
                                                    placeholder="e.g. Winter Showcase 2025"
                                                    className="h-12 text-lg bg-[#F9F9FB] border-gray-100"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</label>
                                                    <Input 
                                                        type="date"
                                                        value={eventDetails.date}
                                                        onChange={(e) => setEventDetails({...eventDetails, date: e.target.value})}
                                                        className="h-10 bg-[#F9F9FB] border-gray-100"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type</label>
                                                    <Select 
                                                        value={eventDetails.type}
                                                        onValueChange={(val) => setEventDetails({...eventDetails, type: val})}
                                                    >
                                                        <SelectTrigger className="h-10 bg-[#F9F9FB] border-gray-100">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="recital">Recital</SelectItem>
                                                            <SelectItem value="competition">Competition</SelectItem>
                                                            <SelectItem value="showcase">Showcase</SelectItem>
                                                            <SelectItem value="community_event">Community</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Venue</label>
                                                <VenueSearch 
                                                    value={eventDetails.venue}
                                                    onChange={(val) => setEventDetails(prev => ({...prev, venue: val}))}
                                                    onSelect={(data) => setEventDetails(prev => ({
                                                        ...prev, 
                                                        venue: data?.venue_name || prev.venue,
                                                        venueData: data 
                                                    }))}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-8 border-t border-gray-100">
                                            <Button 
                                                variant="outline" 
                                                onClick={handleManualCreate}
                                                disabled={!eventDetails.title}
                                                className="w-full h-12 rounded-xl text-gray-600 hover:text-[#333333] border-gray-200"
                                            >
                                                Skip AI & Create Blank Event
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Right: AI Creative Producer Chat */}
                                    <div className="flex-1 flex flex-col bg-[#FDFBF7] h-full overflow-hidden">
                                        {/* Chat Header */}
                                        <div className="p-6 pb-2 shrink-0">
                                             <div className="flex items-center justify-between">
                                                 <div>
                                                     <h2 className="font-serif text-2xl text-[#333333]">Producer Session</h2>
                                                     <p className="text-gray-500 text-sm">Brainstorm themes, music, and flow with Sequins.</p>
                                                 </div>
                                                 {chatHistory.length > 2 && (
                                                     <Button 
                                                         onClick={handleFinalize}
                                                         className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full"
                                                         disabled={isFinalizing}
                                                     >
                                                         {isFinalizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                                         Generate Final Plan
                                                     </Button>
                                                 )}
                                             </div>
                                        </div>

                                        {/* Chat Messages */}
                                        <div 
                                            ref={scrollRef}
                                            className="flex-1 overflow-y-auto p-6 space-y-6"
                                        >


                                            {chatHistory.map((msg, i) => (
                                                <motion.div 
                                                    key={i}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                                >
                                                    {msg.role === 'assistant' && (
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">
                                                            <Sparkles className="w-4 h-4 text-indigo-600" />
                                                        </div>
                                                    )}
                                                    
                                                    <div className={`max-w-[80%] rounded-2xl p-5 shadow-sm leading-relaxed ${
                                                        msg.role === 'user' 
                                                            ? 'bg-[#1a1a1a] text-white rounded-tr-none' 
                                                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                                    }`}>
                                                        <div className="text-sm leading-relaxed">
                                                            <ReactMarkdown 
                                                                components={{
                                                                    ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                                                                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                                                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                                                    strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                                                                }}
                                                            >
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                            
                                            {isGenerating && (
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">
                                                        <Sparkles className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                                                        <div className="flex space-x-1">
                                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Input Area */}
                                        <div className="p-6 pt-2 shrink-0">
                                            <div className="bg-white p-2 rounded-[24px] shadow-lg shadow-gray-100 border border-gray-200 flex items-end gap-2 relative z-20">
                                                <Textarea 
                                                    value={currentInput}
                                                    onChange={(e) => setCurrentInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleSendMessage();
                                                        }
                                                    }}
                                                    placeholder="Describe your vision, or ask me to pitch a theme..."
                                                    className="min-h-[50px] max-h-[150px] border-none focus-visible:ring-0 resize-none bg-transparent py-3 px-4 text-base"
                                                />
                                                <Button 
                                                    onClick={handleSendMessage} 
                                                    disabled={!currentInput.trim() || isGenerating}
                                                    size="icon"
                                                    className="h-10 w-10 rounded-full bg-[#333333] hover:bg-black text-white shrink-0 mb-1 mr-1"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </Button>
                                            </div>

                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="result-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col md:flex-row"
                        >
                            {/* Left Sidebar - Action Items */}
                            <div className="w-full md:w-96 border-r border-gray-200 bg-gray-50/50 flex flex-col shrink-0 z-10 h-full">
                                <div className="p-6 bg-white border-b border-gray-200 shadow-sm z-20">
                                    <h3 className="font-serif text-xl text-[#333333] flex items-center gap-2">
                                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                                        Task Drafts
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">Review and convert to system tasks</p>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-8">
                                    {/* Tasks */}
                                    {generatedPlan.show_plan?.production_tasks?.length > 0 ? (
                                        <div>
                                            <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3 px-2">Suggested Action Items</h4>
                                            <div className="space-y-3">
                                                {generatedPlan.show_plan.production_tasks.map((task, i) => (
                                                    <ProducerTaskItem key={i} task={task} />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 px-6 text-gray-400">
                                            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">No tasks generated yet. Chat with Sequins to build your plan.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Main Content - Run Sheet */}
                            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30">
                                <div className="p-4 md:p-8 flex-1 overflow-y-auto">
                                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
                                        <div className="flex items-center justify-between mb-6">
                                            <TabsList className="bg-white p-1 rounded-full border border-gray-200 shadow-sm h-12">
                                                <TabsTrigger value="tasks" className="rounded-full px-6 h-10 text-sm font-medium data-[state=active]:bg-[#333333] data-[state=active]:text-white transition-all">Run of Show</TabsTrigger>
                                                <TabsTrigger value="details" className="rounded-full px-6 h-10 text-sm font-medium data-[state=active]:bg-[#333333] data-[state=active]:text-white transition-all">Full Details</TabsTrigger>
                                            </TabsList>
                                            
                                            <div className="text-sm font-serif text-gray-500 italic flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                Est. Runtime: {(generatedPlan.show_plan?.run_of_show || []).reduce((acc, s) => acc + s.estimated_minutes, 0).toFixed(0)} mins
                                            </div>
                                        </div>

                                        <TabsContent value="tasks" className="mt-0 space-y-4 focus-visible:ring-0">
                                            {(generatedPlan.show_plan?.run_of_show || []).map((segment, idx) => (
                                                <motion.div 
                                                    key={idx}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group"
                                                >
                                                    <div className="flex items-start gap-5">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg font-bold text-gray-400 font-mono shrink-0 border border-gray-200">
                                                            {segment.order}
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-3">
                                                                    <h4 className="text-xl font-bold text-[#333333]">{segment.title}</h4>
                                                                    {segment.segment_type !== 'performance' && (
                                                                              <Badge variant={segment.segment_type === 'quick_change' ? "destructive" : "outline"} className={segment.segment_type === 'quick_change' ? "bg-red-50 text-red-600 border-red-100" : "text-gray-500 font-normal"}>
                                                                                  {segment.segment_type === 'quick_change' ? 'Quick Change' : segment.segment_type}
                                                                              </Badge>
                                                                          )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-mono font-bold text-[#333333]">{segment.estimated_minutes}m</div>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                                {/* Stage Action */}
                                                                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">
                                                                        <Footprints className="w-3 h-3" /> Stage Action
                                                                    </div>
                                                                    <p className="text-sm text-indigo-900 leading-snug">{segment.stage_action}</p>
                                                                </div>

                                                                {/* Tech / Visuals */}
                                                                <div className="bg-violet-50/50 p-3 rounded-lg border border-violet-100">
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-violet-800 uppercase tracking-wider mb-1">
                                                                        <Lightbulb className="w-3 h-3" /> Visuals & Lighting
                                                                    </div>
                                                                    <p className="text-sm text-violet-900 leading-snug">{segment.visual_concept}</p>
                                                                </div>

                                                                {/* Costumes */}
                                                                <div className="bg-pink-50/50 p-3 rounded-lg border border-pink-100">
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-pink-800 uppercase tracking-wider mb-1">
                                                                        <Shirt className="w-3 h-3" /> Costumes
                                                                    </div>
                                                                    <p className="text-sm text-pink-900 leading-snug">{segment.costume_concept}</p>
                                                                    <ProducerCostumeEnricher 
                                                                        segment={segment} 
                                                                        onUpdate={(newSuggestions) => {
                                                                            const newPlan = { ...generatedPlan };
                                                                            newPlan.show_plan.run_of_show[idx].costume_product_suggestions = newSuggestions;
                                                                            setGeneratedPlan(newPlan);
                                                                        }}
                                                                        context={getContext()}
                                                                    />
                                                                    </div>

                                                                {/* Music */}
                                                                {segment.music_selection && (
                                                                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                                                        <div className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">
                                                                            <Music className="w-3 h-3" /> Music
                                                                        </div>
                                                                        <p className="text-sm text-blue-900 leading-snug font-medium">
                                                                            {segment.music_selection.title} <span className="text-blue-900/60 font-normal">- {segment.music_selection.artist}</span>
                                                                        </p>
                                                                        {segment.music_selection.edit_notes && (
                                                                             <div className="text-xs text-blue-700 mt-1 italic">
                                                                                 Note: {segment.music_selection.edit_notes}
                                                                             </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </TabsContent>

                                        <TabsContent value="details" className="mt-0">
                                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                                                <h3 className="font-serif text-2xl text-[#333333] mb-6">Producer's Full Writeup</h3>
                                                <div className="prose prose-gray max-w-none leading-loose text-lg">
                                                    {generatedPlan.producer_writeup}
                                                </div>
                                                
                                                {generatedPlan.questions?.length > 0 && (
                                                    <div className="mt-8 pt-8 border-t border-gray-100">
                                                        <h4 className="font-bold text-[#333333] mb-4">Pending Clarifications</h4>
                                                        <ul className="list-disc pl-5 space-y-2 text-gray-600">
                                                            {generatedPlan.questions.map((q, i) => (
                                                                <li key={i}>{q}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                                
                                {/* Action Footer */}
                                <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-end shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] gap-3">
                                    <Button variant="outline" onClick={onCancel} className="rounded-full px-6 h-12">
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={() => createEventMutation.mutate(generatedPlan)} 
                                        disabled={createEventMutation.isPending}
                                        className="bg-[#333333] hover:bg-black text-white rounded-full px-8 h-12 shadow-lg hover:shadow-xl transition-all"
                                    >
                                        {createEventMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        {eventDetails.title || "Create Event"}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}