
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, Star, MoreHorizontal, Mail, Calendar, User, Loader2, Pencil, MessageSquare } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import SmartTeacherIntake from '../components/manager/SmartTeacherIntake';
import TeacherEditModal from '../components/manager/TeacherEditModal';
import TeacherDetailSheet from '../components/manager/TeacherDetailSheet';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


const calculateTeacherMetrics = (teacher, allClasses, allAttendance) => {
  const teacherClasses = allClasses.filter(c => c.teacher === teacher.name);
  const classIds = new Set(teacherClasses.map(c => c.id));
  const teacherAttendance = allAttendance.filter(a => classIds.has(a.class_id));

  const totalClasses = teacherClasses.length;
  const totalEnrollment = teacherClasses.reduce((sum, c) => sum + (c.student_names?.length || 0), 0);
  
  // Calculate attendance rate
  const totalRecords = teacherAttendance.length;
  const presentCount = teacherAttendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : null;

  return {
    totalClasses,
    totalEnrollment,
    attendanceRate,
    dataPoints: totalRecords
  };
};

export default function Teachers() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [newTeacher, setNewTeacher] = useState({ name: '', styles: '', availability: '', bio: '' });
  const [selectedTeacher, setSelectedTeacher] = useState(null); // For AI review context
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

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const createTeacherMutation = useMutation({
    mutationFn: (data) => base44.entities.Teacher.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsAddOpen(false);
    }
  });

  const updateTeacherMutation = useMutation({
    mutationFn: ({id, data}) => base44.entities.Teacher.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsEditOpen(false);
    }
  });

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setIsEditOpen(true);
  };

  const handleViewDetails = (teacher) => {
    setViewingTeacher(teacher);
    setIsDetailOpen(true);
  };

  const handleGenerateReview = async (teacher) => {
    setSelectedTeacher(teacher);
    setIsGeneratingReview(true);
    try {
      const metrics = calculateTeacherMetrics(teacher, classes, attendance);
      const hasData = metrics.dataPoints > 0;

      const prompt = `
        You are a supportive but data-focused Dance Studio Director. Write a brief professional coaching insight for "${teacher.name}".
        
        HARD METRICS:
        - Teaching Load: ${metrics.totalClasses} classes/week
        - Total Students: ${metrics.totalEnrollment}
        - Attendance Health: ${hasData ? metrics.attendanceRate + '%' : 'No attendance data yet'}
        - Expertise: ${teacher.styles?.join(', ') || 'General'}
        
        INSTRUCTIONS:
        1. If NO attendance data exists (${!hasData}), write a warm "Welcome Aboard" message focusing on their potential with ${metrics.totalEnrollment} students.
        2. If attendance is high (>90%), praise their engagement skills.
        3. If attendance is low (<80%), suggest specific engagement techniques (gamification, themes).
        4. Tone: Inspiring, Professional, Actionable.
        5. Format: Use Markdown. Bold key strengths. Bullet points for actions. Max 100 words.
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

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'T';
  };

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-6 md:p-12 font-sans text-[#333333]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link to={createPageUrl('Home')} className="hover:text-[#333333]">Dashboard</Link>
                <span>/</span>
                <span className="text-[#333333]">Staff</span>
            </div>
            <h1 className="text-4xl font-serif text-[#333333]">Staff Directory</h1>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-auto bg-[#333333] text-white rounded-2xl px-6 hover:bg-black shadow-lg transition-transform hover:scale-105">
                <div className="flex flex-col items-center gap-1 py-2">
                  <Plus className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Add Staff</span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Add New Teacher</DialogTitle>
              </DialogHeader>
              <SmartTeacherIntake 
                onSave={(data) => createTeacherMutation.mutate(data)}
                isSaving={createTeacherMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Teacher Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher, i) => {
            const metrics = calculateTeacherMetrics(teacher, classes, attendance);
            
            return (
            <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
            >
                <Card className="border-none shadow-sm rounded-[32px] overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col h-full">
                <CardHeader className="bg-white p-6 pb-2">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-4 items-center">
                            <Avatar className="w-16 h-16 border-4 border-[#F4F4F6] shadow-sm">
                                <AvatarFallback className="bg-[#333333] text-white font-serif text-xl">
                                    {getInitials(teacher.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-xl font-serif text-[#333333]">{teacher.name}</CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs font-normal text-gray-400 border-gray-200">
                                        {metrics.totalClasses} Classes
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-300 hover:text-[#333333] hover:bg-gray-50 rounded-full"
                            onClick={() => handleEdit(teacher)}
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {teacher.styles?.slice(0, 3).map(style => (
                        <Badge key={style} className="bg-[#F4F4F6] hover:bg-gray-200 text-gray-600 font-normal border-none px-3 py-1 rounded-full text-xs transition-colors">
                        {style}
                        </Badge>
                    ))}
                    </div>
                </CardHeader>

                <CardContent className="p-6 pt-2 space-y-6 flex-1 flex flex-col">
                    {/* Live Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="bg-[#F9FAFB] p-3 rounded-2xl text-center">
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Students</div>
                            <div className="text-lg font-serif text-[#333333]">{metrics.totalEnrollment}</div>
                        </div>
                        <div className={`p-3 rounded-2xl text-center ${metrics.attendanceRate >= 90 ? 'bg-green-50' : metrics.attendanceRate < 80 && metrics.attendanceRate !== null ? 'bg-amber-50' : 'bg-[#F9FAFB]'}`}>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Attend %</div>
                            <div className={`text-lg font-serif ${metrics.attendanceRate >= 90 ? 'text-green-700' : 'text-[#333333]'}`}>
                                {metrics.attendanceRate !== null ? `${metrics.attendanceRate}%` : '-'}
                            </div>
                        </div>
                        <div className="bg-[#F9FAFB] p-3 rounded-2xl text-center">
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Load</div>
                            <div className="text-lg font-serif text-[#333333]">{metrics.totalClasses}</div>
                        </div>
                    </div>

                    {/* AI Coach Section (Compact) */}
                    {teacher.performance_summary ? (
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Coach's Insight</h4>
                        </div>
                        <div className="text-xs text-indigo-900/80 leading-relaxed line-clamp-3">
                            <ReactMarkdown
                                components={{
                                    p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                                    strong: ({node, ...props}) => <span className="font-bold text-indigo-900" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc pl-3 mb-1" {...props} />,
                                    li: ({node, ...props}) => <li className="mb-0.5" {...props} />
                                }}
                            >
                                {teacher.performance_summary}
                            </ReactMarkdown>
                        </div>
                        <button 
                            onClick={() => handleGenerateReview(teacher)}
                            className="text-[10px] font-medium text-indigo-500 mt-2 hover:text-indigo-700 flex items-center gap-1"
                        >
                            Refresh Analysis
                        </button>
                    </div>
                    ) : (
                        <div className="flex items-center justify-center p-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs text-gray-400 hover:text-[#333333]"
                                onClick={() => handleGenerateReview(teacher)}
                                disabled={isGeneratingReview}
                             >
                                <Sparkles className="w-3 h-3 mr-2" />
                                {isGeneratingReview && selectedTeacher?.id === teacher.id ? "Analyzing..." : "Generate Coaching Insight"}
                             </Button>
                        </div>
                    )}

                    <div className="mt-auto grid grid-cols-2 gap-3">
                        <Button 
                            variant="outline" 
                            className="w-full rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#333333]"
                            onClick={() => handleViewDetails(teacher)}
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#333333]"
                        >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                        </Button>
                    </div>
                </CardContent>
                </Card>
            </motion.div>
            );
          })}
          
          {teachers.length === 0 && (
            <div className="col-span-full text-center py-24">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <User className="w-8 h-8 text-gray-300" />
                </div>
              <h3 className="font-serif text-2xl text-[#333333] mb-2">No Staff Members Yet</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-8">Start building your team by adding your first teacher to the directory.</p>
              <Button onClick={() => setIsAddOpen(true)} className="bg-[#333333] text-white rounded-full px-8 h-12 shadow-lg hover:scale-105 transition-transform">
                Add First Teacher
              </Button>
            </div>
          )}
        </div>

      </div>

      <TeacherEditModal 
        isOpen={isEditOpen} 
        onOpenChange={setIsEditOpen}
        teacher={editingTeacher}
        onSave={(data) => updateTeacherMutation.mutate(data)}
        isSaving={updateTeacherMutation.isPending}
      />

      <TeacherDetailSheet
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        teacher={viewingTeacher}
        classes={classes}
        attendance={attendance}
      />
    </div>
  );
}
