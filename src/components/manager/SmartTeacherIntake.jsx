import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Upload, FileText } from 'lucide-react';
import TagInput from "@/components/ui/TagInput";
import { motion, AnimatePresence } from 'framer-motion';

export default function SmartTeacherIntake({ onSave, isSaving }) {
  const [mode, setMode] = useState('smart'); // 'smart' | 'form'
  const [rawInput, setRawInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    styles: [],
    availability: '',
    bio: ''
  });

  const handleAnalyze = async () => {
    if (!rawInput.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `
          Extract teacher information from the following text (resume, email, or notes).
          Return a JSON object with:
          - name: Full name
          - email: Email address if found.
          - phone: Phone number if found.
          - styles: Array of strings (e.g. "Ballet", "Jazz"). Normalize to standard dance styles.
          - availability: A summary string of when they can teach.
          - bio: A polished, professional biography suitable for parents to read (rewrite if necessary).
          
          TEXT:
          "${rawInput}"
        `,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            styles: { type: "array", items: { type: "string" } },
            availability: { type: "string" },
            bio: { type: "string" }
          }
        }
      });
      
      if (res) {
        setFormData(res);
        setMode('form');
      }
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {mode === 'smart' ? (
          <motion.div 
            key="smart"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-600 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-4 w-full">
                  <div>
                    <h3 className="font-medium text-indigo-900">Smart Intake</h3>
                    <p className="text-sm text-indigo-700/80">
                      Paste a resume, bio, or email notes. I'll extract the details and tag their expertise automatically.
                    </p>
                  </div>
                  <Textarea 
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="e.g. 'Sarah is a Ballet expert with 10 years experience. She can teach Mon/Wed nights...'"
                    className="min-h-[150px] bg-white border-indigo-200 focus:border-indigo-400 resize-none"
                  />
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleAnalyze} 
                      disabled={isAnalyzing || !rawInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isAnalyzing ? "Analyzing..." : "Process & Auto-Tag"}
                    </Button>
                    <Button variant="ghost" onClick={() => setMode('form')}>
                      Skip to Manual Entry
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Full Name" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    placeholder="staff@studio.com" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone (AI Texting)</Label>
                  <Input 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    placeholder="+1234567890" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Expertise Tags</Label>
                <TagInput 
                  value={formData.styles} 
                  onChange={tags => setFormData({...formData, styles: tags})} 
                  placeholder="Type style & hit enter (e.g. 'Tap')" 
                />
                <p className="text-xs text-gray-500">These tags help with auto-scheduling and filtering.</p>
              </div>
              
              <div className="space-y-2">
                <Label>Availability</Label>
                <Input 
                  value={formData.availability} 
                  onChange={e => setFormData({...formData, availability: e.target.value})} 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Professional Bio</Label>
                <Textarea 
                  value={formData.bio} 
                  onChange={e => setFormData({...formData, bio: e.target.value})} 
                  className="h-32"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
               <Button variant="ghost" onClick={() => setMode('smart')}>
                 <ArrowLeft className="w-4 h-4 mr-2" /> Back to Smart Import
               </Button>
               <Button onClick={() => onSave(formData)} disabled={isSaving} className="bg-[#333333] text-white">
                 {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Teacher Profile"}
               </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper icon for back button (was missing in imports in file content above, adding it here to be safe if I write to file)
import { ArrowLeft } from 'lucide-react';