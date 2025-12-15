import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check, AlertTriangle, Music, ArrowRight, Save } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ProducerAIModal({ open, onOpenChange, onPlanCreated }) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Fetch context data
    const { data: studioSettings } = useQuery({
        queryKey: ['studioSettings'],
        queryFn: () => base44.entities.StudioSettings.list().then(res => res[0]),
        enabled: open
    });

    const { data: classes = [] } = useQuery({
        queryKey: ['allClasses'],
        queryFn: () => base44.entities.DanceClass.list(),
        enabled: open
    });

    const generatePlanMutation = useMutation({
        mutationFn: async (userPrompt) => {
            // Build Context
            const context = {
                studio: {
                    studio_name: studioSettings?.name || "My Dance Studio"
                },
                venue: {
                    theater_size: null, // Let AI infer or ask
                    stage_width_ft: null,
                    stage_depth_ft: null,
                    wings: null,
                    backstage_notes: null
                },
                show_config: {
                    num_shows: null,
                    target_runtime_minutes: null,
                    intermission: true,
                    announcements_style: "brief"
                },
                classes: classes
                    .filter(c => c.type !== 'admin') // Exclude admin blocks
                    .map(c => ({
                        class_id: c.id,
                        name: c.title,
                        style: c.style || c.title, // Fallback to title if style missing
                        age_range: "Mixed", // Default as we don't have strict age data on class
                        dancer_count: c.student_names?.length || 5, // Default to 5 if empty/unknown
                        skill_level: "Mixed",
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
        },
        onError: (err) => {
            console.error(err);
            toast.error("Failed to generate plan. Please try again.");
            setIsGenerating(false);
        }
    });

    const createEventMutation = useMutation({
        mutationFn: async (plan) => {
            // 1. Create Performance
            const performanceData = {
                title: plan.extracted_intake.theme_or_story_seed || "New Recital",
                date: new Date().toISOString().split('T')[0], // Default to today, user can change
                status: 'planning',
                type: 'recital',
                description: plan.producer_writeup
            };
            
            const newPerf = await base44.entities.Performance.create(performanceData);

            // 2. Create Routines
            const routines = plan.show_plan.run_of_show
                .filter(segment => segment.segment_type === 'performance')
                .map((segment, index) => ({
                    performance_id: newPerf.id,
                    title: segment.title,
                    order_index: segment.order,
                    duration_seconds: Math.round(segment.estimated_minutes * 60),
                    class_id: segment.class_id,
                    notes: segment.stage_notes
                }));

            // Bulk create isn't available for all entities in standard SDK sometimes, strictly use create loop if needed or bulkCreate if supported.
            // Documentation says bulkCreate exists.
            if (routines.length > 0) {
                await base44.entities.PerformanceRoutine.bulkCreate(routines);
            }

            return newPerf;
        },
        onSuccess: (newPerf) => {
            toast.success("Event created successfully!");
            onPlanCreated(newPerf.id);
            onOpenChange(false);
            // Reset state
            setGeneratedPlan(null);
            setPrompt('');
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-[#F4F4F6]">
                {/* Header */}
                <div className="p-6 bg-[#333333] text-white flex justify-between items-start shrink-0">
                    <div>
                        <DialogTitle className="text-2xl font-serif flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-300" />
                            Sequins Producer
                        </DialogTitle>
                        <DialogDescription className="text-white/60 mt-1">
                            Your AI show director. Describe your vision, and we'll build the plan.
                        </DialogDescription>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {!generatedPlan ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto w-full">
                            {isGenerating ? (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-[#333333]">Designing your show...</h3>
                                        <p className="text-gray-500 mt-2">Sequins is analyzing your classes, balancing energy levels, and curating music.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full space-y-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-left">
                                        <label className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2 block">
                                            Tell Sequins about your show
                                        </label>
                                        <Textarea 
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="e.g. We're doing a 'Time Travel' theme. We have a lot of little kids so put them early. I want a big finale with the seniors. About 2 hours long."
                                            className="min-h-[150px] text-lg p-4 border-gray-200 focus:border-indigo-500 transition-all resize-none"
                                        />
                                        <div className="mt-4 flex justify-between items-center">
                                            <p className="text-xs text-gray-400">
                                                Sequins knows about your {classes.length} active classes.
                                            </p>
                                            <Button 
                                                onClick={handleGenerate} 
                                                disabled={!prompt.trim()}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 h-12 shadow-lg hover:shadow-indigo-200 transition-all"
                                            >
                                                <Sparkles className="w-4 h-4 mr-2" /> Generate Plan
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4 text-left">
                                        <div className="p-4 bg-white rounded-xl border border-gray-100">
                                            <span className="block text-xl mb-2">🎭</span>
                                            <h4 className="font-bold text-sm text-[#333333]">Smart Flow</h4>
                                            <p className="text-xs text-gray-400 mt-1">Optimizes for costume changes and energy curves.</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-gray-100">
                                            <span className="block text-xl mb-2">🎵</span>
                                            <h4 className="font-bold text-sm text-[#333333]">Music Ideas</h4>
                                            <p className="text-xs text-gray-400 mt-1">Gets specific song recs that fit your theme.</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-gray-100">
                                            <span className="block text-xl mb-2">📋</span>
                                            <h4 className="font-bold text-sm text-[#333333]">Run Sheet</h4>
                                            <p className="text-xs text-gray-400 mt-1">Builds a complete, editable run of show.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-8 max-w-5xl mx-auto space-y-8">
                                    {/* Producer Writeup */}
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
                                                <Sparkles className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-serif text-xl text-[#333333] mb-2">Producer's Note</h3>
                                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                                    {generatedPlan.producer_writeup}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                        <TabsList className="bg-white p-1 rounded-xl border border-gray-100 mb-6">
                                            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Run of Show</TabsTrigger>
                                            <TabsTrigger value="music" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Music & Notes</TabsTrigger>
                                            <TabsTrigger value="risks" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Risks & Fixes</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="overview" className="mt-0">
                                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 text-gray-400 font-medium text-xs uppercase tracking-wider text-left">
                                                        <tr>
                                                            <th className="px-6 py-3 w-16 text-center">#</th>
                                                            <th className="px-6 py-3">Segment</th>
                                                            <th className="px-6 py-3">Notes</th>
                                                            <th className="px-6 py-3 text-right">Time</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {generatedPlan.show_plan.run_of_show.map((segment, idx) => (
                                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                                <td className="px-6 py-4 text-center text-gray-400 font-mono">{segment.order}</td>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-bold text-[#333333]">{segment.title}</div>
                                                                    {segment.segment_type !== 'performance' && (
                                                                        <Badge variant="secondary" className="mt-1 text-[10px] uppercase">{segment.segment_type}</Badge>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-gray-500">
                                                                    {segment.stage_notes}
                                                                    {segment.transition_notes && (
                                                                        <div className="text-xs text-indigo-500 mt-1 italic">
                                                                            Transition: {segment.transition_notes}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-right font-mono text-gray-400">
                                                                    {segment.estimated_minutes}m
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="music" className="mt-0 space-y-4">
                                            {generatedPlan.show_plan.music_recommendations.map((rec, i) => (
                                                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 flex gap-4">
                                                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                                                        <Music className="w-5 h-5 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-[#333333]">{rec.primary_song.title}</h4>
                                                        <p className="text-sm text-gray-500">by {rec.primary_song.artist}</p>
                                                        <p className="text-sm mt-2 text-gray-600 bg-gray-50 p-2 rounded-lg inline-block">
                                                            💡 {rec.primary_song.why_this_fits}
                                                        </p>
                                                        {rec.primary_song.content_cautions && (
                                                            <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                {rec.primary_song.content_cautions}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </TabsContent>

                                        <TabsContent value="risks" className="mt-0">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                                                    <h4 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
                                                        <AlertTriangle className="w-4 h-4" /> Risk Flags
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {generatedPlan.show_plan.producer_notes.risk_flags.map((risk, i) => (
                                                            <li key={i} className="text-sm text-amber-900 flex items-start gap-2">
                                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                                                {risk}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                                    <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                                                        <Check className="w-4 h-4" /> Recommended Fixes
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {generatedPlan.show_plan.producer_notes.fixes.map((fix, i) => (
                                                            <li key={i} className="text-sm text-green-900 flex items-start gap-2">
                                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                                                                {fix}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>

                                    {/* Clarifying Questions */}
                                    {generatedPlan.questions && generatedPlan.questions.length > 0 && (
                                        <div className="bg-indigo-900 text-white p-6 rounded-2xl">
                                            <h4 className="font-serif text-lg mb-3">Sequins needs to know:</h4>
                                            <ul className="space-y-2 mb-4">
                                                {generatedPlan.questions.map((q, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-indigo-100">
                                                        <span className="font-bold text-indigo-400">?</span>
                                                        {q}
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="text-xs text-indigo-300">
                                                (You can Accept this plan now and refine details later, or close and try a more specific prompt)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
                                <Button variant="ghost" onClick={() => setGeneratedPlan(null)}>
                                    Back to Prompt
                                </Button>
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={() => createEventMutation.mutate(generatedPlan)} 
                                        disabled={createEventMutation.isPending}
                                        className="bg-[#333333] hover:bg-black text-white rounded-full px-6"
                                    >
                                        {createEventMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        Create Event from Plan
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}