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
    CheckSquare, ShieldAlert, FileText, Shirt, Lightbulb, Speaker, Footprints, Plus, ExternalLink,
    RefreshCw
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
    const [activeTab, setActiveTab] = useState('tasks');

    // --- DB SYNC MODE (If performanceId provided) ---
    const { data: dbPerformance } = useQuery({
        queryKey: ['performance', performanceId],
        queryFn: () => base44.entities.Performance.list().then(list => list.find(p => p.id === performanceId)),
        enabled: !!performanceId
    });

    const { data: dbChatHistory } = useQuery({
        queryKey: ['performance_chat', performanceId],
        queryFn: async () => {
             const chats = await base44.entities.PerformanceChat.list(); 
             // Using client-side filter as SDK filter might need specific setup
             return chats.filter(c => c.performance_id === performanceId);
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

                // Load existing plan if available
                if (dbPerformance.description) {
                    try {
                        const parsedPlan = JSON.parse(dbPerformance.description);
                        if (parsedPlan && parsedPlan.show_plan) {
                            setGeneratedPlan(parsedPlan);
                        }
                    } catch (e) {
                        // Not a JSON plan, likely just text description
                    }
                }
            }
            if (dbChatHistory && dbChatHistory.length > 0) {
                // Sort by timestamp
                const sorted = [...dbChatHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                const mapped = sorted.map(c => ({ role: c.role, content: c.content }));
                setChatHistory(mapped);
            } else {
                setChatHistory([{ role: 'assistant', content: "I'm ready. What are we working on?" }]);
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

    // Phase 2: Finalize/Update Plan (JSON)
    const finalizePlanMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('producePerformance', {
                action: 'generate_plan',
                chatHistory: chatHistory,
                context: getContext(),
                existingPlan: generatedPlan // Pass existing plan for updates
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
            toast.success(generatedPlan ? "Plan updated!" : "Plan generated!");
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
                description: plan ? JSON.stringify(plan) : (dbPerformance?.description || "")
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

            // Sync Routines & Tasks (Only if plan provided)
            if (plan && plan.show_plan && plan.show_plan.run_of_show) {
                // Note: Ideally we should sync intelligently (add/remove/update). 
                // For now, this is a "Create/Overwrite" logic which might duplicate if run repeatedly without clearing.
                // In a real app, we'd diff the routines.
                
                const routines = plan.show_plan.run_of_show
                    .filter(segment => segment.segment_type === 'performance')
                    .map((segment) => ({
                        performance_id: targetPerformanceId,
                        title: segment.title,
                        order_index: segment.order,
                        duration_seconds: Math.round(segment.estimated_minutes * 60),
                        class_id: segment.class_id,
                        notes: segment.stage_action, 
                        costume_details: segment.costume_concept,
                        costume_product_suggestions: segment.costume_product_suggestions,
                        lighting_notes: segment.visual_concept,
                        song_title: segment.music_selection?.title,
                        artist: segment.music_selection?.artist
                    }));

                if (routines.length > 0) {
                     // Check existing to avoid duplicates? Or just append?
                     // For MVP, we'll just create. User can delete duplicates in UI if needed.
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
            toast.success(performanceId ? "Event saved successfully!" : "Event created successfully!");
            onPlanCreated(data.id);
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
        createEventMutation.mutate(null); 
    };

    const handleSaveToDb = () => {
         createEventMutation.mutate(generatedPlan);
    }

    return (
        <div className="h-[calc(100vh-120px)] bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col relative">
            
            {/* Header */}
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
                            <h2 className="font-serif text-lg text-[#333333]">Backstage</h2>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Actions */}
                    {generatedPlan && (
                         <Button 
                             onClick={handleSaveToDb}
                             className="bg-green-600 hover:bg-green-700 text-white rounded-full h-9 shadow-sm"
                             disabled={createEventMutation.isPending}
                         >
                             {createEventMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                             Save Changes
                         </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative bg-[#FDFBF7] flex">
                
                {/* Main Content Area (Left/Center) */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {isFinalizing ? (
                             <motion.div 
                                key="loading"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
                             >
                                <div className="text-center space-y-8 max-w-md">
                                    <div className="relative w-24 h-24 mx-auto">
                                        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping opacity-20" />
                                        <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center shadow-xl border border-indigo-50">
                                            <Wand2 className="w-10 h-10 text-indigo-600 animate-pulse" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-serif text-[#333333] mb-3">
                                            {generatedPlan ? "Updating plan..." : "Drafting your blueprints..."}
                                        </h3>
                                        <p className="text-gray-500">Sequins is organizing the run sheet & logistics.</p>
                                    </div>
                                </div>
                             </motion.div>
                        ) : null}

                        {!generatedPlan ? (
                            // --- MODE 1: PRODUCTION BASICS (INPUTS) ---
                            <motion.div 
                                key="basics"
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="h-full overflow-y-auto p-8 lg:p-12 flex flex-col items-center"
                            >
                                <div className="w-full max-w-2xl bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                    <div className="mb-8">
                                        <h3 className="font-serif text-2xl text-[#333333] mb-2">Production Basics</h3>
                                        <p className="text-gray-500 text-sm">Define the core logistics for your event.</p>
                                    </div>

                                    <div className="space-y-6">
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
                            </motion.div>
                        ) : (
                            // --- MODE 2: RUN SHEET VIEW (PLAN) ---
                            <motion.div 
                                key="plan"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="h-full flex flex-col md:flex-row bg-gray-50/30"
                            >
                                {/* Task Sidebar */}
                                <div className="w-80 border-r border-gray-200 bg-white flex flex-col shrink-0 h-full">
                                    <div className="p-4 border-b border-gray-100">
                                        <h3 className="font-serif text-lg text-[#333333] flex items-center gap-2">
                                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                                            Action Items
                                        </h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {generatedPlan.show_plan?.production_tasks?.map((task, i) => (
                                            <ProducerTaskItem key={i} task={task} />
                                        ))}
                                    </div>
                                </div>

                                {/* Main Run Sheet */}
                                <div className="flex-1 overflow-hidden flex flex-col">
                                    <div className="p-6 flex-1 overflow-y-auto">
                                        <div className="max-w-4xl mx-auto">
                                            <div className="flex items-center justify-between mb-6">
                                                <h2 className="text-2xl font-serif text-[#333333]">Run of Show</h2>
                                                <div className="text-sm font-serif text-gray-500 italic flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    Est. Runtime: {(generatedPlan.show_plan?.run_of_show || []).reduce((acc, s) => acc + s.estimated_minutes, 0).toFixed(0)} mins
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {(generatedPlan.show_plan?.run_of_show || []).map((segment, idx) => (
                                                    <motion.div 
                                                        key={idx}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group"
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-sm font-bold text-gray-400 font-mono shrink-0 border border-gray-200">
                                                                {segment.order}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="text-lg font-bold text-[#333333]">{segment.title}</h4>
                                                                        {segment.segment_type !== 'performance' && (
                                                                            <Badge variant="outline" className="text-xs font-normal">
                                                                                {segment.segment_type}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <span className="font-mono text-sm font-bold text-gray-500">{segment.estimated_minutes}m</span>
                                                                </div>
                                                                
                                                                <div className="grid grid-cols-2 gap-3 mt-3">
                                                                    <div className="bg-indigo-50/50 p-2 rounded border border-indigo-100 text-xs">
                                                                        <div className="font-bold text-indigo-800 uppercase mb-1">Stage Action</div>
                                                                        <div className="text-indigo-900 leading-snug">{segment.stage_action}</div>
                                                                    </div>
                                                                    <div className="bg-pink-50/50 p-2 rounded border border-pink-100 text-xs">
                                                                        <div className="font-bold text-pink-800 uppercase mb-1">Costume</div>
                                                                        <div className="text-pink-900 leading-snug">{segment.costume_concept}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right: Chat Sidebar (Always Visible) */}
                <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-20 shadow-xl">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="font-serif text-lg text-[#333333]">Producer Session</h2>
                        <p className="text-gray-500 text-xs">Brainstorm & Refine with Sequins.</p>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FDFBF7]">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">
                                        <Sparkles className="w-4 h-4 text-indigo-600" />
                                    </div>
                                )}
                                <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm ${
                                    msg.role === 'user' ? 'bg-[#333333] text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                }`}>
                                    <ReactMarkdown components={{ p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} /> }}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {isGenerating && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-white space-y-3">
                         {/* Generate/Update Button */}
                         {chatHistory.length > 2 && (
                             <Button 
                                 onClick={handleFinalize}
                                 className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm"
                                 disabled={isFinalizing || isGenerating}
                             >
                                 {isFinalizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                                 {generatedPlan ? "Update Plan" : "Generate Final Plan"}
                             </Button>
                         )}

                        <div className="relative">
                            <Textarea 
                                value={currentInput}
                                onChange={(e) => setCurrentInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Type your message..."
                                className="min-h-[50px] pr-12 resize-none bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            />
                            <Button 
                                onClick={handleSendMessage} 
                                disabled={!currentInput.trim() || isGenerating}
                                size="icon"
                                className="absolute right-2 bottom-2 h-8 w-8 rounded-full bg-[#333333] hover:bg-black text-white"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}