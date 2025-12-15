import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, Sparkles, AlertTriangle, Music, ArrowRight, Save, Wand2, X, 
    ChevronLeft, Calendar, PenTool, MapPin, Trophy, Star, Users, LayoutTemplate
} from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProducerWorkspace({ onCancel, onPlanCreated }) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Manual Event Details State
    const [eventDetails, setEventDetails] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        type: 'recital',
        venue: ''
    });

    // Fetch context data
    const { data: studioSettings } = useQuery({
        queryKey: ['studioSettings'],
        queryFn: () => base44.entities.StudioSettings.list().then(res => res[0])
    });

    const { data: classes = [] } = useQuery({
        queryKey: ['allClasses'],
        queryFn: () => base44.entities.DanceClass.list()
    });

    const generatePlanMutation = useMutation({
        mutationFn: async (userPrompt) => {
            const context = {
                studio: { studio_name: studioSettings?.name || "My Dance Studio" },
                event_details: eventDetails, // Pass manual details to AI context
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
            };

            const response = await base44.functions.invoke('producePerformance', {
                producer_prompt: userPrompt,
                context: context
            });

            return response.data;
        },
        onSuccess: (data) => {
            setGeneratedPlan(data);
            setIsGenerating(false);
            // Auto-fill title if AI suggests a better one and user didn't set a strong one?
            // For now, let's respect user input but fallback to AI if empty
            if (!eventDetails.title && data.extracted_intake.theme_or_story_seed) {
                setEventDetails(prev => ({ ...prev, title: data.extracted_intake.theme_or_story_seed }));
            }
        },
        onError: (err) => {
            console.error(err);
            toast.error("Failed to generate plan. Please try again.");
            setIsGenerating(false);
        }
    });

    const createEventMutation = useMutation({
        mutationFn: async (plan) => {
            // Determine final data sources
            const finalTitle = eventDetails.title || (plan?.extracted_intake?.theme_or_story_seed) || "New Production";
            
            const performanceData = {
                title: finalTitle,
                date: eventDetails.date,
                status: 'planning',
                type: eventDetails.type,
                venue: eventDetails.venue,
                description: plan?.producer_writeup || "Manually created event."
            };
            
            const newPerf = await base44.entities.Performance.create(performanceData);

            // Create routines only if we have a generated plan
            if (plan && plan.show_plan && plan.show_plan.run_of_show) {
                const routines = plan.show_plan.run_of_show
                    .filter(segment => segment.segment_type === 'performance')
                    .map((segment) => ({
                        performance_id: newPerf.id,
                        title: segment.title,
                        order_index: segment.order,
                        duration_seconds: Math.round(segment.estimated_minutes * 60),
                        class_id: segment.class_id,
                        notes: segment.stage_notes
                    }));

                if (routines.length > 0) {
                    await base44.entities.PerformanceRoutine.bulkCreate(routines);
                }
            }

            return newPerf;
        },
        onSuccess: (newPerf) => {
            toast.success("Event created successfully!");
            onPlanCreated(newPerf.id);
            // Reset state
            setGeneratedPlan(null);
            setPrompt('');
            setEventDetails({ title: '', date: '', type: 'recital', venue: '' });
        },
        onError: (err) => {
            toast.error("Failed to save event.");
            console.error(err);
        }
    });

    const handleGenerate = () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        generatePlanMutation.mutate(prompt);
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
                {generatedPlan && (
                    <Button variant="ghost" onClick={() => setGeneratedPlan(null)} className="text-gray-400 hover:text-[#333333]">
                        Back to Brief
                    </Button>
                )}
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
                            {isGenerating ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-12">
                                    <div className="text-center space-y-8 max-w-md">
                                        <div className="relative w-24 h-24 mx-auto">
                                            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping opacity-20" />
                                            <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center shadow-xl border border-indigo-50">
                                                <Wand2 className="w-10 h-10 text-indigo-600 animate-pulse" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-serif text-[#333333] mb-3">Designing your show...</h3>
                                            <div className="h-6 overflow-hidden relative">
                                                <motion.div 
                                                    animate={{ y: [-24, 0, 0, -24, -48, -48, -72] }}
                                                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                                    className="text-gray-400 font-medium"
                                                >
                                                    <p className="h-6">Analyzing class roster...</p>
                                                    <p className="h-6">Balancing energy curves...</p>
                                                    <p className="h-6">Curating music selections...</p>
                                                    <p className="h-6">Structuring run of show...</p>
                                                </motion.div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
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
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <Input 
                                                        value={eventDetails.venue}
                                                        onChange={(e) => setEventDetails({...eventDetails, venue: e.target.value})}
                                                        placeholder="Venue Name"
                                                        className="h-10 pl-9 bg-[#F9F9FB] border-gray-100"
                                                    />
                                                </div>
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

                                    {/* Right: AI Creative Brief */}
                                    <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center bg-[#FDFBF7]">
                                        <div className="max-w-2xl mx-auto w-full space-y-8">
                                            <div className="text-center space-y-3">
                                                <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                                                    <Sparkles className="w-3 h-3" /> AI Assistant Available
                                                </div>
                                                <h1 className="text-4xl font-serif text-[#333333]">Creative Brief</h1>
                                                <p className="text-gray-500">
                                                    Describe your vision, and we'll draft a complete run sheet, select music, and organize the logistics for you.
                                                </p>
                                            </div>

                                            <div className="bg-white p-2 rounded-[32px] shadow-xl shadow-indigo-100/50 border border-gray-100 relative group transition-all hover:shadow-2xl hover:shadow-indigo-100/80">
                                                <Textarea 
                                                    value={prompt}
                                                    onChange={(e) => setPrompt(e.target.value)}
                                                    placeholder="e.g. A 2-hour 'Winter Wonderland' show. Start with the youngest dancers (3-5yo) to get them home early. End with the Senior Company production number. We need smooth transitions."
                                                    className="min-h-[240px] text-lg p-8 border-none focus-visible:ring-0 resize-none font-light placeholder:text-gray-300 rounded-[28px] bg-transparent leading-relaxed"
                                                />
                                                <div className="px-6 pb-6 flex items-center justify-between border-t border-gray-50 pt-4 mt-2">
                                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded-full">
                                                        <Users className="w-3 h-3 text-indigo-400" />
                                                        {classes.length} Classes Loaded
                                                    </div>
                                                    <Button 
                                                        onClick={handleGenerate} 
                                                        disabled={!prompt.trim()}
                                                        className="bg-[#333333] hover:bg-black text-white rounded-full px-8 h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all"
                                                    >
                                                        Generate Full Plan <ArrowRight className="w-4 h-4 ml-2" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap justify-center gap-3">
                                                {["Story-driven Recital", "Holiday Showcase", "Competition Lineup"].map(tag => (
                                                    <button 
                                                        key={tag}
                                                        onClick={() => setPrompt(prev => prev ? prev + " " + tag : tag)}
                                                        className="px-4 py-2 bg-white rounded-full text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-100 transition-colors shadow-sm"
                                                    >
                                                        + {tag}
                                                    </button>
                                                ))}
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
                            {/* Left Sidebar - Producer Notes */}
                            <div className="w-full md:w-80 border-r border-gray-100 bg-white p-6 overflow-y-auto shrink-0 z-10">
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="font-serif text-2xl text-[#333333] mb-4">Producer's Note</h3>
                                        <div className="prose prose-sm prose-gray leading-relaxed text-gray-600">
                                            {generatedPlan.producer_writeup}
                                        </div>
                                    </div>

                                    {/* Risk Flags */}
                                    {generatedPlan.show_plan.producer_notes.risk_flags.length > 0 && (
                                        <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                                            <h4 className="font-bold text-amber-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" /> Watch Outs
                                            </h4>
                                            <ul className="space-y-2">
                                                {generatedPlan.show_plan.producer_notes.risk_flags.map((risk, i) => (
                                                    <li key={i} className="text-sm text-amber-800 flex items-start gap-2 leading-snug">
                                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                                                        {risk}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Questions */}
                                    {generatedPlan.questions && generatedPlan.questions.length > 0 && (
                                        <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                                            <h4 className="font-bold text-indigo-900 text-sm uppercase tracking-wider mb-3">
                                                Clarifications
                                            </h4>
                                            <ul className="space-y-2">
                                                {generatedPlan.questions.map((q, i) => (
                                                    <li key={i} className="text-sm text-indigo-800 flex items-start gap-2 leading-snug">
                                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                                                        {q}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Main Content - Run Sheet & Music */}
                            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30">
                                <div className="p-4 md:p-8 flex-1 overflow-y-auto">
                                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
                                        <div className="flex items-center justify-between mb-6">
                                            <TabsList className="bg-white p-1 rounded-full border border-gray-200 shadow-sm h-12">
                                                <TabsTrigger value="overview" className="rounded-full px-6 h-10 text-sm font-medium data-[state=active]:bg-[#333333] data-[state=active]:text-white transition-all">Run of Show</TabsTrigger>
                                                <TabsTrigger value="music" className="rounded-full px-6 h-10 text-sm font-medium data-[state=active]:bg-[#333333] data-[state=active]:text-white transition-all">Music & Vibes</TabsTrigger>
                                            </TabsList>
                                            
                                            <div className="text-sm font-serif text-gray-500 italic flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                Est. Runtime: {generatedPlan.show_plan.run_of_show.reduce((acc, s) => acc + s.estimated_minutes, 0).toFixed(0)} mins
                                            </div>
                                        </div>

                                        <TabsContent value="overview" className="mt-0 space-y-4 focus-visible:ring-0">
                                            {generatedPlan.show_plan.run_of_show.map((segment, idx) => (
                                                <motion.div 
                                                    key={idx}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm font-bold text-gray-400 font-mono shrink-0">
                                                            {segment.order}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <h4 className="text-lg font-bold text-[#333333]">{segment.title}</h4>
                                                                {segment.segment_type !== 'performance' && (
                                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-500 font-normal border-none">
                                                                        {segment.segment_type}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-gray-500 text-sm">{segment.stage_notes}</p>
                                                            
                                                            {segment.transition_notes && (
                                                                <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50/50 p-2 rounded-lg inline-flex">
                                                                    <ArrowRight className="w-3 h-3" />
                                                                    Transition: {segment.transition_notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-sm font-bold text-[#333333]">{segment.estimated_minutes}m</div>
                                                            <div className="text-xs text-gray-400">est.</div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </TabsContent>

                                        <TabsContent value="music" className="mt-0 grid grid-cols-1 gap-4">
                                            {generatedPlan.show_plan.music_recommendations.map((rec, i) => (
                                                <motion.div 
                                                    key={i} 
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-6"
                                                >
                                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center shrink-0 border border-white shadow-inner">
                                                        <Music className="w-8 h-8 text-indigo-400" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-xl text-[#333333] mb-1">{rec.primary_song.title}</h4>
                                                        <p className="text-sm text-gray-500 font-medium mb-4">{rec.primary_song.artist}</p>
                                                        
                                                        <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-600 italic border border-gray-100">
                                                            "{rec.primary_song.why_this_fits}"
                                                        </div>

                                                        {rec.primary_song.content_cautions && (
                                                            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wide">
                                                                <AlertTriangle className="w-3 h-3" /> Content Caution: {rec.primary_song.content_cautions}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
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