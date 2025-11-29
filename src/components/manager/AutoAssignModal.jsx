import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';

export default function AutoAssignModal({ isOpen, onOpenChange, classes, teachers }) {
  const [assignments, setAssignments] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const updateClassMutation = useMutation({
    mutationFn: ({ id, teacher }) => base44.entities.DanceClass.update(id, { teacher }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    }
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const unassignedClasses = classes.filter(c => !c.teacher);
      
      // If no unassigned classes, maybe re-optimize all? For now let's focus on filling gaps.
      // If the user wants to re-assign, they can clear teachers first.
      // Let's send ALL classes to give context, but ask to fill only empty ones or suggest swaps?
      // Simpler: Just fill empty ones.
      
      const targetClasses = unassignedClasses.length > 0 ? unassignedClasses : classes;
      
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `
          You are a dance studio scheduling assistant.
          Match the following TEACHERS to the CLASSES based on their styles and availability.
          
          TEACHERS:
          ${JSON.stringify(teachers.map(t => ({ name: t.name, styles: t.styles, availability: t.availability })))}
          
          CLASSES TO ASSIGN:
          ${JSON.stringify(targetClasses.map(c => ({ id: c.id, title: c.title, day: c.day, time: c.start_time })))}
          
          RULES:
          1. Only assign a teacher if they teach the style (inferred from class title) and are available.
          2. Don't double book a teacher.
          3. Return a JSON object with "assignments": array of { class_id, teacher_name, reason }.
        `,
        response_json_schema: {
          type: "object",
          properties: {
            assignments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  class_id: { type: "string" },
                  teacher_name: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (res?.assignments) {
        setAssignments(res.assignments);
      }
    } catch (error) {
      console.error("Assignment failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = async () => {
    if (!assignments) return;
    
    const promises = assignments.map(a => 
      updateClassMutation.mutateAsync({ id: a.class_id, teacher: a.teacher_name })
    );
    
    await Promise.all(promises);
    onOpenChange(false);
    setAssignments(null);
  };

  const getClassDetails = (id) => classes.find(c => c.id === id);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#FAFAFA]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">AI Staffing Assistant</DialogTitle>
          <DialogDescription>
            Automatically match teachers to classes based on skills and availability.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[300px] py-4">
          {!assignments ? (
             <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
               <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                 <Sparkles className="w-8 h-8 text-indigo-600" />
               </div>
               <div className="max-w-sm">
                 <h3 className="font-medium text-gray-900">Ready to optimize?</h3>
                 <p className="text-sm text-gray-500 mt-2">
                   I'll analyze {classes.filter(c => !c.teacher).length} unassigned classes against {teachers.length} teacher profiles to find the best fit.
                 </p>
               </div>
               <Button 
                 onClick={handleAnalyze} 
                 disabled={isAnalyzing}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white w-full max-w-xs mt-4"
               >
                 {isAnalyzing ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Finding matches...
                   </>
                 ) : "Generate Assignments"}
               </Button>
             </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {assignments.map((assignment, idx) => {
                  const cls = getClassDetails(assignment.class_id);
                  if (!cls) return null;
                  return (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{cls.title}</span>
                          <span className="text-xs text-gray-400">({cls.day} @ {cls.start_time})</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-indigo-600 font-medium">
                          <ArrowRight className="w-3 h-3" />
                          {assignment.teacher_name}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 italic">"{assignment.reason}"</p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100">
                        Match
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {assignments && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignments(null)}>Reset</Button>
            <Button onClick={handleApply} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Check className="w-4 h-4 mr-2" />
              Apply Assignments
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}