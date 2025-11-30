import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Hash, Quote, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function NewJournalEntryModal({ isOpen, onOpenChange, student, teacherName, classes = [] }) {
  const [content, setContent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [category, setCategory] = useState('general');
  const [sentiment, setSentiment] = useState('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-detect tags from content
  const detectedTags = useMemo(() => {
    if (!content) return [];
    // Extract hashtags (e.g. #technique)
    const hashtags = (content.match(/#[a-z0-9_]+/gi) || []).map(t => t.slice(1));
    
    // Extract class names mentioned in text (case-insensitive)
    const classTags = classes
        .filter(cls => content.toLowerCase().includes(cls.title.toLowerCase()))
        .map(cls => cls.title);
        
    return [...new Set([...hashtags, ...classTags])];
  }, [content, classes]);

  const handleSubmit = async () => {
    if (!content || !student) return;
    setIsSubmitting(true);

    try {
      await base44.entities.StudentNote.create({
        student_name: student.name,
        class_name: selectedClass || 'General Note',
        teacher_name: teacherName,
        content: content,
        category: category,
        sentiment: sentiment,
        tags: detectedTags,
        date: new Date().toISOString().split('T')[0]
      });

      // Reset and close
      setContent('');
      setSelectedClass('');
      setCategory('general');
      setSentiment('neutral');
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create note", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-[32px] max-w-xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-[#F4F4F6] px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div>
             <DialogTitle className="font-serif text-2xl text-[#333333]">New Journal Entry</DialogTitle>
             <p className="text-gray-400 text-sm mt-1">Recording for {student?.name}</p>
          </div>
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-300">
             <Quote className="w-5 h-5" />
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Context / Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="bg-gray-50 border-transparent rounded-xl h-11">
                    <SelectValue placeholder="General Note" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>General Note</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.title}>{cls.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>

             <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-gray-50 border-transparent rounded-xl h-11 capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="technique">Technique</SelectItem>
                    <SelectItem value="behavior">Behavior</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>

          <div className="space-y-2">
             <Label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Observations</Label>
             <div className="relative">
               <Textarea 
                 placeholder="Write notes here... Use #hashtags or mention class names like 'Jazz' to tag them automatically."
                 value={content}
                 onChange={(e) => setContent(e.target.value)}
                 className="min-h-[120px] bg-gray-50 border-transparent rounded-xl resize-none focus:bg-white focus:border-[#F2DCDD] transition-all p-4 text-base mb-2"
               />
               {detectedTags.length > 0 && (
                 <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center text-xs text-[#333333] font-medium mr-1">
                      <Sparkles className="w-3 h-3 mr-1 text-purple-500" /> Auto-tagged:
                    </div>
                    {detectedTags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                        <Hash className="w-3 h-3 mr-1 opacity-50" />
                        {tag}
                      </span>
                    ))}
                 </div>
               )}
             </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
             <div className="flex gap-2">
                {['positive', 'neutral', 'constructive'].map(s => (
                   <button
                     key={s}
                     onClick={() => setSentiment(s)}
                     className={`
                       px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                       ${sentiment === s 
                         ? (s === 'positive' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 
                            s === 'constructive' ? 'bg-blue-50 border-blue-200 text-blue-700' : 
                            'bg-gray-100 border-gray-300 text-gray-700')
                         : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}
                     `}
                   >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                   </button>
                ))}
             </div>

             <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !content}
                className="bg-[#333333] text-white hover:bg-black rounded-full px-8 h-12 font-serif shadow-lg shadow-gray-200"
             >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Entry</>}
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}