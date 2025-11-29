import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, User, Star, PlusCircle, Calendar, AlertCircle, Clock } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";

export default function StudentRecommender({ isOpen, onOpenChange, students, classes }) {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleAnalyze = async () => {
    if (!selectedStudentId) return;
    
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    setIsAnalyzing(true);
    setRecommendations(null);

    try {
      // Prepare context
      const scheduleSummary = classes.map(c => `${c.title} (${c.day} ${c.start_time}:00, ${c.level || 'All Levels'})`).join('\n');
      
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `
          Analyze this student profile and recommend dance classes.
          
          Student: ${student.name}, Age: ${student.age || 'Unknown'}, Level: ${student.level || 'Unknown'}, Interests: ${student.interests?.join(', ') || 'General'}.
          
          Current Schedule:
          ${scheduleSummary}
          
          Task:
          1. Recommend 1-2 best fits from the CURRENT schedule.
          2. Suggest 1 NEW class idea that doesn't exist but would fit this student perfectly.
          
          Return JSON with:
          - existing_recommendations: array of { class_title, reasoning }
          - new_class_suggestion: { title, reasoning, suggested_day }
        `,
        response_json_schema: {
          type: "object",
          properties: {
            existing_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  class_title: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            },
            new_class_suggestion: {
              type: "object",
              properties: {
                title: { type: "string" },
                reasoning: { type: "string" },
                suggested_day: { type: "string" }
              }
            }
          }
        }
      });

      setRecommendations(res);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#F9F9FA] p-0 overflow-hidden">
        <div className="p-6 bg-white border-b border-gray-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-serif text-[#333333]">
              <Sparkles className="w-5 h-5 text-[#F2DCDD]" />
              Student Advisor
            </DialogTitle>
            <DialogDescription>
              AI-powered placement recommendations based on student profile and current schedule.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Selection */}
          <div className="flex gap-3">
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-full bg-white border-gray-200">
                <SelectValue placeholder="Select a student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.level || 'Unspecified'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAnalyze} 
              disabled={!selectedStudentId || isAnalyzing}
              className="bg-[#333333] text-white min-w-[120px]"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
            </Button>
          </div>

          {/* Attendance Context */}
          {selectedStudent?.attendance_summary && (
            <div className={`text-sm px-4 py-3 rounded-lg flex items-center gap-2 ${
              selectedStudent.attendance_alert 
                ? 'bg-red-50 text-red-700 border border-red-100' 
                : 'bg-blue-50 text-blue-700 border border-blue-100'
            }`}>
              {selectedStudent.attendance_alert ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              <span className="font-medium">Attendance Insight:</span>
              {selectedStudent.attendance_summary}
            </div>
          )}

          {/* Results */}
          {recommendations && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Existing Matches */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Matches in Schedule
                </h4>
                <div className="grid gap-3">
                  {recommendations.existing_recommendations?.map((rec, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="font-medium text-[#333333] text-lg mb-1">{rec.class_title}</div>
                      <p className="text-sm text-gray-600 leading-relaxed">{rec.reasoning}</p>
                    </div>
                  ))}
                  {(!recommendations.existing_recommendations || recommendations.existing_recommendations.length === 0) && (
                    <div className="text-sm text-gray-400 italic">No perfect matches found in current schedule.</div>
                  )}
                </div>
              </div>

              {/* New Suggestion */}
              {recommendations.new_class_suggestion && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" /> Recommended New Class
                  </h4>
                  <div className="bg-[#FFF5F6] p-5 rounded-xl border border-[#FFE5E8]">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-[#5A4A4B] text-lg">
                        {recommendations.new_class_suggestion.title}
                      </div>
                      <span className="bg-white text-[#5A4A4B] text-xs px-2 py-1 rounded-md border border-[#FFE5E8]">
                        {recommendations.new_class_suggestion.suggested_day}
                      </span>
                    </div>
                    <p className="text-sm text-[#5A4A4B]/80 leading-relaxed">
                      {recommendations.new_class_suggestion.reasoning}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}