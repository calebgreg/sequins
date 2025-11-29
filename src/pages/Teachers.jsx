import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, Star, MoreHorizontal, Mail, Calendar, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function Teachers() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: '', styles: '', availability: '', bio: '' });
  const [selectedTeacher, setSelectedTeacher] = useState(null); // For details/review
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  // Mock fetching attendance stats for review context
  // In a real app we'd fetch this properly, here we'll pass what we have or let AI hallucinate plausible data based on "attendance rate" prompts if we had the data calculated.
  // I'll fetch attendance just to have it.
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const createTeacherMutation = useMutation({
    mutationFn: (data) => base44.entities.Teacher.create({
      ...data,
      styles: data.styles.split(',').map(s => s.trim())
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsAddOpen(false);
      setNewTeacher({ name: '', styles: '', availability: '', bio: '' });
    }
  });

  const updateTeacherMutation = useMutation({
    mutationFn: ({id, data}) => base44.entities.Teacher.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    }
  });

  const handleGenerateReview = async (teacher) => {
    setIsGeneratingReview(true);
    try {
      const teacherClasses = classes.filter(c => c.teacher === teacher.name);
      const teacherAttendance = attendance.filter(a => teacherClasses.some(c => c.id === a.class_id));
      
      // Calculate some basic stats to feed the AI
      const totalClasses = teacherClasses.length;
      const totalAttendanceRecords = teacherAttendance.length;
      const presentCount = teacherAttendance.filter(a => a.status === 'present').length;
      const attendanceRate = totalAttendanceRecords > 0 ? Math.round((presentCount / totalAttendanceRecords) * 100) : 0;
      
      const prompt = `
        Write a professional performance review for dance teacher "${teacher.name}".
        
        Data Points:
        - Teaches: ${teacher.styles.join(', ')}
        - Active Classes: ${totalClasses}
        - Student Attendance Rate in their classes: ${attendanceRate}%
        - Availability: ${teacher.availability}
        
        Tone: Constructive, encouraging, but professional. Highlight reliability and class engagement.
        Keep it under 150 words.
      `;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      if (res) {
        updateTeacherMutation.mutate({
          id: teacher.id,
          data: {
            performance_summary: res,
            last_review_date: new Date().toISOString()
          }
        });
      }
    } catch (e) {
      console.error("Review gen failed", e);
    } finally {
      setIsGeneratingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('ClassManager')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-serif text-[#333333]">Teachers</h1>
              <p className="text-gray-500">Manage staff and performance</p>
            </div>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#333333] hover:bg-black text-white rounded-full px-6 gap-2">
                <Plus className="w-4 h-4" /> Add Teacher
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Teacher</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={newTeacher.name} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} placeholder="e.g. Sarah Miller" />
                </div>
                <div className="space-y-2">
                  <Label>Styles (comma separated)</Label>
                  <Input value={newTeacher.styles} onChange={e => setNewTeacher({...newTeacher, styles: e.target.value})} placeholder="e.g. Ballet, Jazz, Tap" />
                </div>
                <div className="space-y-2">
                  <Label>Availability</Label>
                  <Input value={newTeacher.availability} onChange={e => setNewTeacher({...newTeacher, availability: e.target.value})} placeholder="e.g. Weekday evenings" />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea value={newTeacher.bio} onChange={e => setNewTeacher({...newTeacher, bio: e.target.value})} />
                </div>
                <Button onClick={() => createTeacherMutation.mutate(newTeacher)} disabled={createTeacherMutation.isPending} className="w-full">
                  {createTeacherMutation.isPending ? "Creating..." : "Create Teacher"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Teacher List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map(teacher => (
            <Card key={teacher.id} className="border-gray-100 hover:shadow-lg transition-shadow overflow-hidden group">
              <CardHeader className="bg-white border-b border-gray-50 pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-[#333333]">{teacher.name}</CardTitle>
                      <p className="text-xs text-gray-400">{teacher.availability || "No availability set"}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-gray-300">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {teacher.styles?.map(style => (
                    <Badge key={style} variant="secondary" className="bg-gray-50 text-gray-600 font-normal">
                      {style}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {teacher.performance_summary ? (
                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-sm font-semibold text-indigo-900">Performance Insight</h4>
                    </div>
                    <p className="text-sm text-indigo-800/80 leading-relaxed">
                      {teacher.performance_summary}
                    </p>
                    <p className="text-[10px] text-indigo-400 mt-2">
                      Generated {new Date(teacher.last_review_date).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">No review generated yet</p>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
                  onClick={() => handleGenerateReview(teacher)}
                  disabled={isGeneratingReview}
                >
                  {isGeneratingReview && selectedTeacher?.id === teacher.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Star className="w-4 h-4" />
                  )}
                  {teacher.performance_summary ? "Regenerate Review" : "Generate AI Review"}
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {teachers.length === 0 && (
            <div className="col-span-full text-center py-20">
              <p className="text-gray-400">No teachers found. Add one to get started!</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}