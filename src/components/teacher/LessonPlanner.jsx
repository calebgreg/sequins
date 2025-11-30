import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Plus, Save, RotateCcw, Wand2, Music, PlayCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function LessonPlanner({ classData, onBack }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePlan, setActivePlan] = useState(null);
  const [prompt, setPrompt] = useState('');
  
  const queryClient = useQueryClient();

  // Fetch today's plan if exists
  const { data: plans = [] } = useQuery({
    queryKey: ['lessonPlans', classData.id],
    queryFn: async () => {
      const all = await base44.entities.LessonPlan.list();
      return all.filter(p => p.class_id === classData.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const savePlanMutation = useMutation({
    mutationFn: (planData) => base44.entities.LessonPlan.create(planData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lessonPlans'] })
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `
          Create a detailed, professional dance lesson plan for a ${classData.duration}-hour ${classData.style || 'Dance'} class.
          Level: ${classData.level || 'Mixed Level'}.
          Focus/Theme: ${prompt || 'Technique and Artistry'}.
          
          Structure the response as a JSON object with:
          - theme: A catchy title for the lesson focus
          - level_adjustments: Tips for modifying for different abilities
          - timeline: Array of segments (Warmup, Center, Across Floor, Combo, Cool Down). 
            Each segment should have: 
            - section (name)
            - duration_minutes (number)
            - description (detailed exercises)
            - music_suggestion (vibe or song type)
        `,
        response_json_schema: {
          type: "object",
          properties: {
            theme: { type: "string" },
            level_adjustments: { type: "string" },
            timeline: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section: { type: "string" },
                  duration_minutes: { type: "number" },
                  description: { type: "string" },
                  music_suggestion: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (res) {
        const newPlan = {
          ...res,
          class_id: classData.id,
          date: new Date().toISOString().split('T')[0],
          notes: ''
        };
        setActivePlan(newPlan);
        // Don't auto-save yet, let them review
      }
    } catch (e) {
      console.error("Plan generation failed", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (activePlan) {
      savePlanMutation.mutate(activePlan);
      setActivePlan(null); // Go back to list or view mode?
    }
  };

  // If we have an active plan (either generated or selected from list)
  const currentDisplayPlan = activePlan || plans[0]; 

  return (
    <div className="h-full flex flex-col bg-[#F4F4F6]">
      {/* Header */}
      <div className="px-8 py-8 flex items-center justify-between sticky top-0 z-10 bg-[#F4F4F6]">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={onBack} className="bg-white rounded-full w-12 h-12 shadow-sm text-[#333333] hover:bg-white/80">
            <RotateCcw className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-serif text-3xl text-[#333333]">Lesson Planner</h2>
            <p className="text-gray-400 font-serif">Plan your {classData.title} class</p>
          </div>
        </div>
        
        {currentDisplayPlan && !currentDisplayPlan.id && (
          <Button onClick={handleSave} className="bg-[#333333] text-white rounded-full px-6 gap-2 hover:bg-black shadow-lg">
            <Save className="w-4 h-4" /> Save Plan
          </Button>
        )}
      </div>

      <div className="flex-1 px-8 pb-8 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Col: Generator & History */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* AI Generator Card */}
            <div className="bg-white p-6 rounded-[32px] shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-[#333333]">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="font-serif text-xl">AI Assistant</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs uppercase text-gray-400 font-bold tracking-wider mb-2 block">Focus / Theme</Label>
                  <Input 
                    placeholder="e.g. Pirouettes, Musicality, Softness..." 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="bg-[#F4F4F6] border-transparent rounded-xl"
                  />
                </div>
                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl h-12 shadow-md transition-all hover:scale-[1.02] active:scale-95"
                >
                  {isGenerating ? (
                    <>Generating...</>
                  ) : (
                    <><Wand2 className="w-4 h-4 mr-2" /> Generate Plan</>
                  )}
                </Button>
              </div>
            </div>

            {/* Past Plans List */}
            <div className="flex-1 bg-white p-6 rounded-[32px] shadow-sm flex flex-col min-h-0">
              <h3 className="font-serif text-xl text-[#333333] mb-4">Previous Plans</h3>
              <ScrollArea className="flex-1 -mr-4 pr-4">
                <div className="space-y-3">
                  {plans.map(plan => (
                    <div 
                      key={plan.id}
                      onClick={() => setActivePlan(plan)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${activePlan?.id === plan.id ? 'bg-[#F2DCDD] border-[#E5C0C2]' : 'bg-[#F4F4F6] border-transparent hover:bg-gray-100'}`}
                    >
                      <div className="font-medium text-[#333333] truncate">{plan.theme}</div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {format(new Date(plan.created_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  ))}
                  {plans.length === 0 && (
                    <div className="text-center text-gray-400 py-8 text-sm">No saved plans yet.</div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Right Col: Plan Detail View */}
          <div className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-sm overflow-hidden flex flex-col">
            {currentDisplayPlan ? (
              <ScrollArea className="flex-1 -mr-6 pr-6">
                <div className="max-w-3xl mx-auto space-y-8 pb-8">
                  
                  <div className="text-center space-y-2 border-b border-gray-100 pb-8">
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-100 mb-2">
                      {classData.duration} Minutes • {classData.level || 'All Levels'}
                    </Badge>
                    <h1 className="font-serif text-4xl text-[#333333] leading-tight">
                      {currentDisplayPlan.theme}
                    </h1>
                    {currentDisplayPlan.level_adjustments && (
                      <p className="text-gray-500 italic max-w-lg mx-auto">
                        "{currentDisplayPlan.level_adjustments}"
                      </p>
                    )}
                  </div>

                  <div className="space-y-6">
                    {currentDisplayPlan.timeline?.map((segment, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative pl-8 border-l-2 border-[#F2DCDD] pb-8 last:border-0 last:pb-0"
                      >
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#F2DCDD] ring-4 ring-white" />
                        
                        <div className="flex items-baseline justify-between mb-2">
                          <h3 className="text-xl font-medium text-[#333333]">{segment.section}</h3>
                          <span className="text-sm font-bold text-gray-400">{segment.duration_minutes} min</span>
                        </div>
                        
                        <div className="bg-[#F4F4F6] rounded-2xl p-6 mb-3">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {segment.description}
                          </p>
                        </div>

                        {segment.music_suggestion && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-100 rounded-full px-4 py-2 inline-flex shadow-sm">
                            <Music className="w-4 h-4 text-purple-500" />
                            <span>Vibe: {segment.music_suggestion}</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 text-gray-400">
                <div className="w-24 h-24 bg-[#F4F4F6] rounded-full flex items-center justify-center mb-6">
                  <Wand2 className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-serif text-[#333333] mb-2">Ready to Plan?</h3>
                <p className="max-w-xs">
                  Select a past plan from the left or use the AI assistant to generate a fresh structure for today's class.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}