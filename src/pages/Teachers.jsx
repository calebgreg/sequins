import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, Star, MoreHorizontal, Mail, Calendar, User, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import SmartTeacherIntake from '../components/manager/SmartTeacherIntake';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    }
  });

  const handleGenerateReview = async (teacher) => {
    setSelectedTeacher(teacher);
    setIsGeneratingReview(true);
    try {
      const teacherClasses = classes.filter(c => c.teacher === teacher.name);
      const teacherAttendance = attendance.filter(a => teacherClasses.some(c => c.id === a.class_id));
      
      const totalClasses = teacherClasses.length;
      const totalEnrollment = teacherClasses.reduce((sum, c) => sum + (c.student_names?.length || 0), 0);
      const uniqueStudents = new Set(teacherClasses.flatMap(c => c.student_names || [])).size;
      
      const totalRecords = teacherAttendance.length;
      const presentCount = teacherAttendance.filter(a => a.status === 'present').length;
      const lateCount = teacherAttendance.filter(a => a.status === 'late').length;
      
      const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
      const lateRate = totalRecords > 0 ? Math.round((lateCount / totalRecords) * 100) : 0;
      
      const classStats = teacherClasses.map(c => {
        const records = teacherAttendance.filter(a => a.class_id === c.id);
        if (records.length === 0) return null;
        const rate = Math.round((records.filter(r => r.status === 'present').length / records.length) * 100);
        return { title: c.title, rate };
      }).filter(Boolean).sort((a, b) => b.rate - a.rate);

      const bestClass = classStats[0];
      const worstClass = classStats[classStats.length - 1];

      const prompt = `
        You are a strict, data-driven studio manager. Write a performance review for "${teacher.name}" based ONLY on the following HARD DATA.
        
        METRICS:
        - Class Load: ${totalClasses} classes.
        - Total Enrollment: ${totalEnrollment} students (${uniqueStudents} unique).
        - Overall Attendance Rate: ${totalRecords > 0 ? attendanceRate + '%' : 'NO DATA'}.
        - Punctuality Issue Rate (Late Students): ${totalRecords > 0 ? lateRate + '%' : 'N/A'}.
        ${bestClass ? `- Best Performing Class: ${bestClass.title} (${bestClass.rate}% attendance)` : ''}
        ${worstClass && worstClass !== bestClass ? `- Needs Improvement: ${worstClass.title} (${worstClass.rate}% attendance)` : ''}
        - Expertise: ${teacher.styles.join(', ')}
        
        INSTRUCTIONS:
        1. If "NO DATA" for attendance, write a "New Teacher Onboarding" note. Do NOT invent performance metrics.
        2. If attendance is < 80%, express concern about student engagement.
        3. If late rate is > 10%, mention need for better class discipline.
        4. Be specific—cite the class names and numbers provided.
        5. Keep it professional, concise (max 150 words), and actionable.
        6. Use markdown for formatting (bolding key metrics, lists).
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
          {teachers.map((teacher, i) => (
            <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
            >
                <Card className="border-none shadow-sm rounded-[32px] overflow-hidden group hover:shadow-md transition-all duration-300">
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
                                        {teacher.styles?.length || 0} Styles
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-[#333333] hover:bg-gray-50 rounded-full">
                            <MoreHorizontal className="w-5 h-5" />
                        </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {teacher.styles?.slice(0, 3).map(style => (
                        <Badge key={style} className="bg-[#F4F4F6] hover:bg-gray-200 text-gray-600 font-normal border-none px-3 py-1 rounded-full text-xs transition-colors">
                        {style}
                        </Badge>
                    ))}
                    {teacher.styles?.length > 3 && (
                        <Badge className="bg-[#F4F4F6] text-gray-400 font-normal border-none px-2 rounded-full text-xs">+{teacher.styles.length - 3}</Badge>
                    )}
                    </div>
                </CardHeader>

                <CardContent className="p-6 pt-2 space-y-6">
                    {/* Quick Stats Row (Placeholder until real data linked) */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="bg-[#F9FAFB] p-3 rounded-xl">
                            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Classes</div>
                            <div className="text-lg font-serif text-[#333333]">
                                {classes.filter(c => c.teacher === teacher.name).length}
                            </div>
                        </div>
                        <div className="bg-[#F9FAFB] p-3 rounded-xl">
                            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Availability</div>
                            <div className="text-sm font-medium text-[#333333] truncate">
                                {teacher.availability || "Not Set"}
                            </div>
                        </div>
                    </div>

                    {teacher.performance_summary ? (
                    <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-[24px] border border-indigo-100 relative group/insight">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">AI Insight</h4>
                            </div>
                            <span className="text-[10px] text-indigo-300 font-medium bg-white/50 px-2 py-1 rounded-full">
                                {new Date(teacher.last_review_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                            </span>
                        </div>
                        
                        <div className="text-sm text-indigo-900/80 leading-relaxed prose prose-indigo prose-sm max-w-none">
                            <ReactMarkdown
                                components={{
                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                    strong: ({node, ...props}) => <span className="font-bold text-indigo-900" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                    li: ({node, ...props}) => <li className="mb-1" {...props} />
                                }}
                            >
                                {teacher.performance_summary}
                            </ReactMarkdown>
                        </div>
                    </div>
                    ) : (
                    <div className="text-center py-8 bg-[#F4F4F6]/50 rounded-[24px] border-2 border-dashed border-gray-200 group-hover:border-gray-300 transition-colors">
                        <p className="text-sm text-gray-400 font-medium">No performance data yet</p>
                    </div>
                    )}

                    <Button 
                    variant="outline" 
                    className={`w-full h-12 rounded-xl border-2 font-medium transition-all duration-300 ${
                        teacher.performance_summary 
                            ? 'border-gray-100 text-gray-500 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50' 
                            : 'border-indigo-100 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-200'
                    }`}
                    onClick={() => handleGenerateReview(teacher)}
                    disabled={isGeneratingReview}
                    >
                    {isGeneratingReview && selectedTeacher?.id === teacher.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <Star className={`w-4 h-4 mr-2 ${teacher.performance_summary ? '' : 'fill-current'}`} />
                    )}
                    {teacher.performance_summary ? "Regenerate Insight" : "Generate Review"}
                    </Button>
                </CardContent>
                </Card>
            </motion.div>
          ))}
          
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
    </div>
  );
}