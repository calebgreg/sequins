import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Plus, Save, ArrowLeft, Wand2, Music, PlayCircle, ChevronRight, Upload, Image, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function LessonPlanner({ classData, onBack }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePlan, setActivePlan] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]); // Array of {url, name, type}
  const [isUploading, setIsUploading] = useState(false);
  
  const queryClient = useQueryClient();

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setIsUploading(true);
    try {
      const newFiles = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newFiles.push({
          url: file_url,
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'document'
        });
      }
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (err) {
      console.error('File upload failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

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
      // Build context about uploaded files
      const fileContext = uploadedFiles.length > 0 
        ? `\n\nThe teacher has uploaded ${uploadedFiles.length} reference file(s) for inspiration. Analyze these carefully and incorporate any exercises, drills, combinations, music ideas, or teaching concepts you can extract from them into the lesson plan. Be specific about what you see and how you're using it.`
        : '';

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `
          Create a practical, scannable dance lesson plan for a ${Math.round((classData.duration || 1) * 60)}-minute ${classData.style || 'Dance'} class.
          Level: ${classData.level || 'Mixed Level'}.
          Focus/Theme: ${prompt || 'Technique and Artistry'}.
          ${fileContext}

          ${uploadedFiles.length > 0 ? `
IMPORTANT: The teacher has shared reference images/documents. Study them carefully and incorporate what you see.
          ` : ''}
          
          CRITICAL FORMAT RULES:
          - Each segment description MUST be a bullet-point list, NOT paragraphs
          - Use short, actionable items (e.g. "• Plié sequence: 2 demi, 1 grand each position")
          - Include counts/reps (e.g. "• 8-count grapevine x4 each direction")
          - Keep each bullet under 15 words
          - 4-8 bullets per segment max
          
          Structure the response as a JSON object with:
          - theme: A catchy 3-5 word title
          - level_adjustments: One short sentence about modifications
          - inspiration_notes: null (unless files uploaded, then brief note)
          - timeline: Array of segments (Warmup, Center, Across Floor, Combo, Cool Down). 
            Each segment should have: 
            - section (name)
            - duration_minutes (number)
            - description (BULLET LIST as a string with • symbols and line breaks, NOT paragraphs)
            - music_suggestion (specific song name or 2-3 word vibe)
        `,
        file_urls: uploadedFiles.length > 0 ? uploadedFiles.map(f => f.url) : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            theme: { type: "string" },
            level_adjustments: { type: "string" },
            inspiration_notes: { type: "string" },
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

      console.log("LLM Response:", res);
      if (res && res.theme && res.timeline) {
        const newPlan = {
          theme: res.theme,
          level_adjustments: res.level_adjustments || '',
          inspiration_notes: res.inspiration_notes || null,
          timeline: res.timeline,
          class_id: classData.id,
          date: new Date().toISOString().split('T')[0],
          notes: ''
        };
        console.log("Setting active plan:", newPlan);
        setUploadedFiles([]); // Clear files after successful generation
        setActivePlan(newPlan);
      } else {
        console.error("Invalid response structure:", res);
        alert("Generation failed - please try again");
      }
    } catch (e) {
      console.error("Plan generation failed", e);
      alert("Generation failed: " + (e.message || "Unknown error"));
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

  // Frosted glass styles
  const cardStyle = {
    background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 15px 50px -15px rgba(180,150,140,0.15)',
  };

  const buttonStyle = {
    background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
    boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
    border: '1px solid rgba(255, 220, 210, 0.5)',
  };

  const textGradient = {
    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
  };

  return (
    <div 
      className="h-full w-full overflow-y-auto"
      style={{ 
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: '#ffffff',
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 flex items-center justify-between bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.6)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
              color: '#b5a599',
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 
              className="text-xl font-bold tracking-tight truncate"
              style={textGradient}
            >
              Lesson Planner
            </h2>
            <p className="text-xs truncate" style={{ color: '#b5a599' }}>{classData.title}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 pt-4">
        <div className="flex flex-col gap-6">
          
          {/* Generator Card */}
          <div className="flex flex-col gap-6">
            
            {/* AI Generator Card - Compact for mobile */}
            <div className="rounded-2xl p-4" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(145deg, rgba(180,160,190,0.2) 0%, rgba(160,140,170,0.15) 100%)',
                  }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: '#9a8aad' }} />
                </div>
                <h3 className="font-semibold text-base" style={{ color: '#8b7d72' }}>Generate New Plan</h3>
              </div>
              
              <div className="space-y-3">
                <input 
                  placeholder="Focus: e.g. Pirouettes, Musicality..." 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.08)',
                    color: '#6b5d52',
                  }}
                />

                {/* File Upload - Compact */}
                <label 
                  className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl cursor-pointer active:scale-[0.98]"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    border: '2px dashed rgba(200,180,170,0.3)',
                    color: '#a8998e',
                  }}
                >
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <span className="text-sm">Uploading...</span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Add inspiration files</span>
                    </>
                  )}
                </label>
                
                {/* Uploaded Files Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="relative">
                        {file.type === 'image' ? (
                          <div 
                            className="w-12 h-12 rounded-lg bg-cover bg-center"
                            style={{ backgroundImage: `url(${file.url})` }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/70">
                            <FileText className="w-5 h-5" style={{ color: '#b5a599' }} />
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(idx)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center bg-red-400 text-white"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-3 rounded-xl text-sm font-semibold active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                  style={buttonStyle}
                >
                  {isGenerating ? (
                    <span style={textGradient}>Generating...</span>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" style={{ color: '#c9a99c' }} />
                      <span style={textGradient}>Generate Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Generated/Active Plan Display */}
          {currentDisplayPlan && (
            <div className="rounded-2xl p-4" style={cardStyle}>
              {/* Plan Header */}
              <div className="text-center pb-4 mb-4" style={{ borderBottom: '1px solid rgba(200,180,170,0.2)' }}>
                <span 
                  className="inline-block px-3 py-1 rounded-full text-[10px] font-medium mb-2"
                  style={{
                    background: 'linear-gradient(145deg, rgba(180,160,190,0.15) 0%, rgba(160,140,170,0.1) 100%)',
                    color: '#9a8aad',
                  }}
                >
                  {Math.round((classData.duration || 1) * 60)} min • {classData.level || 'All Levels'}
                </span>
                <h2 
                  className="text-xl font-bold tracking-tight"
                  style={textGradient}
                >
                  {currentDisplayPlan.theme}
                </h2>
                {currentDisplayPlan.level_adjustments && (
                  <p className="italic text-xs mt-1" style={{ color: '#a8998e' }}>
                    {currentDisplayPlan.level_adjustments}
                  </p>
                )}
              </div>

              {/* Timeline - Mobile optimized */}
              <div className="space-y-4">
                {currentDisplayPlan.timeline?.map((segment, idx) => (
                  <div 
                    key={idx}
                    className="relative pl-5 pb-4 last:pb-0"
                    style={{ borderLeft: '2px solid rgba(244,206,206,0.6)' }}
                  >
                    <div 
                      className="absolute -left-[5px] top-0 w-2 h-2 rounded-full"
                      style={{ 
                        background: 'rgba(244,180,180,0.8)',
                        boxShadow: '0 0 0 2px white',
                      }}
                    />
                    
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-sm font-semibold" style={{ color: '#8b7d72' }}>{segment.section}</h4>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/50" style={{ color: '#b5a599' }}>
                        {segment.duration_minutes} min
                      </span>
                    </div>
                    
                    <div 
                      className="rounded-lg p-3 mb-2"
                      style={{ background: 'rgba(255,255,255,0.5)' }}
                    >
                      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#6b5d52' }}>
                        {segment.description}
                      </p>
                    </div>

                    {segment.music_suggestion && (
                      <div 
                        className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.6)', color: '#a8998e' }}
                      >
                        <Music className="w-3 h-3" style={{ color: '#9a8aad' }} />
                        <span className="truncate max-w-[200px]">{segment.music_suggestion}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Save button - only for unsaved plans */}
              {!currentDisplayPlan.id && (
                <button 
                  onClick={handleSave} 
                  className="w-full mt-4 py-3 rounded-xl text-sm font-semibold active:scale-[0.98] flex items-center justify-center gap-2"
                  style={buttonStyle}
                >
                  <Save className="w-4 h-4" style={{ color: '#c9a99c' }} />
                  <span style={textGradient}>Save This Plan</span>
                </button>
              )}

              {/* Close/Back button for viewing saved plans */}
              {currentDisplayPlan.id && (
                <button 
                  onClick={() => setActivePlan(null)} 
                  className="w-full mt-4 py-2.5 rounded-xl text-xs font-medium active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.5)', color: '#a8998e' }}
                >
                  Close Plan
                </button>
              )}
            </div>
          )}

          {/* Previous Plans - Always show section */}
          <div className="rounded-2xl p-4" style={cardStyle}>
            <h3 className="font-semibold mb-3 text-base" style={{ color: '#8b7d72' }}>Saved Plans</h3>
            {plans.length > 0 ? (
              <div className="space-y-2">
                {plans.map(plan => (
                  <div 
                    key={plan.id}
                    onClick={() => setActivePlan(plan)}
                    className="p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] flex items-center justify-between"
                    style={{
                      background: activePlan?.id === plan.id 
                        ? 'linear-gradient(145deg, rgba(244,206,206,0.5) 0%, rgba(232,180,180,0.4) 100%)'
                        : 'rgba(255,255,255,0.6)',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-sm" style={{ color: '#8b7d72' }}>{plan.theme}</div>
                      <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#b5a599' }}>
                        <Clock className="w-3 h-3" />
                        {format(new Date(plan.created_date), 'MMM d')}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#c4b5ab' }} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: '#b5a599' }}>
                No saved plans yet. Generate one above!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}