import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Calendar, Star, TrendingUp, Clock, CheckCircle2, AlertCircle, MapPin, Sparkles, Quote, MoreHorizontal, Zap, MessageCircle, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";
import { format, getDay } from 'date-fns';
import NewJournalEntryModal from './NewJournalEntryModal';
import StudentCommunicationTab from '../crm/StudentCommunicationTab';

export default function StudentProfileView({ student, teacherName, onBack, onViewFamily }) {
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', student?.name],
    enabled: !!student,
    queryFn: async () => {
      const all = await base44.entities.Attendance.list();
      return all.filter(a => a.student_name === student?.name).sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', student?.name],
    enabled: !!student,
    queryFn: async () => {
      const all = await base44.entities.StudentNote.list();
      return all.filter(n => n.student_name === student?.name).sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list()
  });

  const studentClasses = useMemo(() => 
    classes.filter(c => c.student_names?.includes(student.name)),
  [classes, student.name]);

  // Stats Calculation
  const totalClasses = attendance.length;
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 100;
  
  // Streak Calculation
  const streak = useMemo(() => {
    let count = 0;
    for (const record of attendance) {
      if (record.status === 'present') count++;
      else break;
    }
    return count;
  }, [attendance]);

  // Engagement Score Calculation
  const { score: engagementScore, label: engagementLabel } = useMemo(() => {
    let score = attendanceRate * 0.7; // Base 70% from attendance
    
    // Streak bonus (max 15%)
    score += Math.min(streak * 3, 15);
    
    // Sentiment adjustment (max 15%)
    const recentNotes = notes.slice(0, 5);
    const sentimentScore = recentNotes.reduce((acc, note) => {
      if (note.sentiment === 'positive') return acc + 5;
      if (note.sentiment === 'constructive') return acc + 2;
      return acc;
    }, 0);
    score += Math.min(sentimentScore, 15);
    
    const finalScore = Math.min(Math.round(score), 100);
    
    let label = "Needs Support";
    if (finalScore >= 90) label = "High Performing";
    else if (finalScore >= 75) label = "Consistent";
    else if (finalScore >= 50) label = "Growing";
    
    return { score: finalScore, label };
  }, [attendanceRate, streak, notes]);

  return (
    <div className="flex flex-col h-full bg-[#F4F4F6] overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4 pt-4">
        <div className="max-w-6xl mx-auto space-y-4">
          
          {/* Hero Profile Card - Compact */}
          <div className="bg-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#F2DCDD]/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            
            {/* Back button and actions */}
            <div className="relative z-10 flex items-center justify-between mb-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack} 
                className="bg-[#F4F4F6] rounded-full w-8 h-8 text-[#333333] hover:bg-gray-200 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                {onViewFamily && (
                  <Button 
                    onClick={onViewFamily}
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-gray-500 hover:text-[#333333] hover:bg-[#F4F4F6] gap-1.5 h-8 px-3 text-xs"
                  >
                    <Users className="w-3.5 h-3.5" /> Family
                  </Button>
                )}
                <Button 
                  onClick={() => setIsNewEntryOpen(true)} 
                  variant="outline" 
                  size="sm"
                  className="rounded-full border-gray-200 bg-white text-[#333333] gap-1.5 font-serif hover:bg-[#F2DCDD] hover:border-[#F2DCDD] transition-colors h-8 px-3 text-xs"
                >
                  <Quote className="w-3.5 h-3.5" /> Log Journal
                </Button>
              </div>
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row gap-5 items-center">
              <div className="flex-shrink-0 relative">
                 <Avatar className="w-20 h-20 bg-white border-4 border-white shadow-lg relative">
                  <AvatarFallback className="text-2xl font-serif text-[#333333]">{student.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-[#333333] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-sm">
                   {student.level}
                </div>
              </div>
              
              <div className="flex-1 w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h1 className="font-serif text-3xl text-[#333333] mb-1">{student.name}</h1>
                    <div className="flex flex-wrap gap-2 text-gray-400 items-center">
                      <span className="flex items-center gap-1.5 bg-[#F4F4F6] px-2.5 py-0.5 rounded-full text-xs"><Star className="w-3 h-3" /> {student.age} Years Old</span>
                      <span className="flex items-center gap-1.5 bg-[#F4F4F6] px-2.5 py-0.5 rounded-full text-xs"><Mail className="w-3 h-3" /> {student.parent_email || 'No email'}</span>
                    </div>
                  </div>
                  
                  {/* Quick Stats Mini-Grid */}
                  <div className="flex gap-3">
                    <div className="text-center px-3 py-1.5 bg-[#F4F4F6] rounded-xl">
                       <div className="text-2xl font-serif text-[#333333]">{attendanceRate}%</div>
                       <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Attendance</div>
                    </div>
                    <div className="text-center px-3 py-1.5 bg-[#F4F4F6] rounded-xl">
                       <div className="text-2xl font-serif text-[#333333]">{streak}</div>
                       <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Day Streak</div>
                    </div>
                  </div>
                </div>

                {/* Engagement Bar */}
                <div className="mt-3 space-y-1">
                   <div className="flex justify-between text-xs font-medium">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-gray-400 flex items-center gap-1 cursor-help">
                              Engagement Score <AlertCircle className="w-3 h-3" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-black/90 text-white border-none shadow-xl">
                             <div className="font-bold mb-1">Score Breakdown:</div>
                             <ul className="space-y-1 text-gray-300 w-48 text-xs">
                               <li className="flex justify-between"><span>Attendance</span> <span>70%</span></li>
                               <li className="flex justify-between"><span>Consistency Streak</span> <span>15%</span></li>
                               <li className="flex justify-between"><span>Teacher Feedback</span> <span>15%</span></li>
                             </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="text-[#333333]">{engagementLabel} ({engagementScore}%)</span>
                   </div>
                   <Progress value={engagementScore} className="h-1.5 bg-[#F4F4F6]" indicatorClassName="bg-gradient-to-r from-[#F2DCDD] to-[#E5C0C2]" />
                </div>
              </div>
            </div>
          </div>

          {/* Compact Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent p-0 gap-2 mb-4 h-auto w-full flex overflow-x-auto">
               {[
                 { id: 'activity', label: 'Activity & Stats', icon: TrendingUp },
                 { id: 'classes', label: 'Class Schedule', icon: Calendar },
                 { id: 'notes', label: 'Teacher Journal', icon: Quote },
                 { id: 'communication', label: 'Messaging', icon: MessageCircle }
               ].map(tab => (
                 <TabsTrigger 
                   key={tab.id} 
                   value={tab.id}
                   className="flex-1 min-w-[120px] rounded-xl bg-white p-2.5 h-auto data-[state=active]:bg-[#333333] data-[state=active]:text-white shadow-sm border border-transparent hover:border-gray-200 transition-all group"
                 >
                   <div className="flex flex-col items-center gap-1.5 w-full">
                      <tab.icon className="w-5 h-5 group-data-[state=active]:text-[#F2DCDD] transition-colors" />
                      <span className="font-serif text-sm">{tab.label}</span>
                   </div>
                 </TabsTrigger>
               ))}
            </TabsList>

            {/* ACTIVITY TAB */}
            <TabsContent value="activity" className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Visual Stats Block */}
                  <div className="md:col-span-1 space-y-4">
                     <div className="bg-gradient-to-br from-[#333333] to-black rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                        <Sparkles className="absolute top-4 right-4 text-[#F2DCDD] opacity-20 w-8 h-8" />
                        <h3 className="font-serif text-lg mb-0.5">Current Streak</h3>
                        <div className="text-4xl font-serif font-light mb-2">{streak} <span className="text-sm opacity-50">days</span></div>
                        <p className="text-white/60 text-xs leading-relaxed">
                           {student.name} has been consistent lately! Keep up the momentum.
                        </p>
                     </div>
                     
                     <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h4 className="font-serif text-sm mb-3">Quick Insights</h4>
                        <div className="space-y-2">
                           <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">On-Time Arrival</span>
                              <span className="font-medium text-green-600">92%</span>
                           </div>
                           <div className="w-full h-px bg-gray-100" />
                           <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Style Versatility</span>
                              <span className="font-medium text-[#333333]">Medium</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Timeline */}
                  <div className="md:col-span-2 bg-white rounded-2xl p-5 shadow-sm max-h-[320px] overflow-y-auto">
                     <h3 className="font-serif text-lg text-[#333333] mb-4">Attendance Timeline</h3>
                     <div className="space-y-0 relative pl-3">
                        {/* Connector Line */}
                        <div className="absolute top-3 bottom-3 left-[15px] w-0.5 bg-gray-100" />
                        
                        {attendance.slice(0, 6).map((record, i) => (
                           <motion.div 
                              key={i}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="relative flex gap-4 py-2 group"
                           >
                              <div className={`
                                 relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0 transition-transform group-hover:scale-110
                                 ${record.status === 'present' ? 'bg-[#E5F9F0] text-green-600' : 
                                   record.status === 'absent' ? 'bg-[#FFF0F0] text-red-500' : 'bg-gray-100 text-gray-500'}
                              `}>
                                 {record.status === 'present' ? <CheckCircle2 className="w-4 h-4" /> : 
                                  record.status === 'absent' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              </div>
                              
                              <div className="flex-1 bg-[#F4F4F6] rounded-xl p-3 hover:bg-[#F2DCDD]/20 transition-colors">
                                 <div className="flex justify-between items-center mb-0.5">
                                    <span className="font-serif text-sm text-[#333333]">{record.class_name}</span>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                       {format(new Date(record.date), 'MMM d')}
                                    </span>
                                 </div>
                                 <Badge variant="secondary" className={`capitalize text-[10px] h-4 px-1.5 font-normal ${
                                    record.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                 }`}>
                                    {record.status}
                                 </Badge>
                              </div>
                           </motion.div>
                        ))}
                     </div>
                  </div>
               </div>
            </TabsContent>

            {/* CLASSES TAB */}
            <TabsContent value="classes" className="space-y-8">
               {/* Weekly Visualizer */}
               <div className="bg-white rounded-[32px] p-8 shadow-sm">
                  <h3 className="font-serif text-2xl text-[#333333] mb-6">Weekly Rhythm</h3>
                  <div className="grid grid-cols-7 gap-2">
                     {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                        const dayMap = { 0: 'U', 1: 'M', 2: 'T', 3: 'W', 4: 'R', 5: 'F', 6: 'S' };
                        const dayKey = dayMap[index];
                        const dayClasses = studentClasses.filter(c => c.day === dayKey);
                        
                        return (
                           <div key={day} className="flex flex-col gap-2">
                              <div className="text-center text-xs font-bold text-gray-300 uppercase">{day}</div>
                              <div className={`
                                 h-32 rounded-2xl border border-dashed border-gray-200 p-1 space-y-1
                                 ${dayClasses.length > 0 ? 'bg-[#F4F4F6]/50' : 'bg-transparent'}
                              `}>
                                 {dayClasses.map(c => (
                                    <div key={c.id} className="bg-[#333333] text-white text-[10px] p-1.5 rounded-xl text-center leading-tight shadow-sm truncate">
                                       {c.title}
                                    </div>
                                 ))}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {studentClasses.map((cls, i) => (
                   <motion.div 
                     key={cls.id}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.1 }}
                     className="bg-white p-0 rounded-[32px] shadow-sm overflow-hidden group border border-transparent hover:border-[#F2DCDD] transition-all"
                   >
                     <div className="h-24 bg-[#F4F4F6] p-6 flex items-start justify-between relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#F4F4F6] to-white opacity-50" />
                        <Badge className="bg-white text-[#333333] hover:bg-white shadow-sm relative z-10">
                           {cls.style || 'Dance'}
                        </Badge>
                        <div className="w-12 h-12 bg-[#333333] rounded-full flex items-center justify-center text-white font-serif text-xl shadow-lg relative z-10 group-hover:scale-110 transition-transform">
                           {cls.title.charAt(0)}
                        </div>
                     </div>
                     
                     <div className="p-8 pt-2">
                        <h3 className="font-serif text-2xl text-[#333333] mb-1">{cls.title}</h3>
                        <p className="text-gray-400 text-sm mb-6">with {cls.teacher || 'Staff'}</p>
                        
                        <div className="space-y-3">
                           <div className="flex items-center gap-3 text-[#333333]">
                              <div className="w-8 h-8 rounded-full bg-[#F4F4F6] flex items-center justify-center text-gray-500">
                                 <Clock className="w-4 h-4" />
                              </div>
                              <span className="font-medium">
                                 {cls.day === 'M' ? 'Mondays' : cls.day === 'T' ? 'Tuesdays' : cls.day === 'W' ? 'Wednesdays' : cls.day === 'R' ? 'Thursdays' : cls.day === 'F' ? 'Fridays' : 'Weekends'} at {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mma')}
                              </span>
                           </div>
                           <div className="flex items-center gap-3 text-[#333333]">
                              <div className="w-8 h-8 rounded-full bg-[#F4F4F6] flex items-center justify-center text-gray-500">
                                 <MapPin className="w-4 h-4" />
                              </div>
                              <span className="font-medium">Studio {cls.room || 'Main'}</span>
                           </div>
                        </div>
                     </div>
                   </motion.div>
                 ))}
               </div>
            </TabsContent>

            {/* NOTES TAB */}
            <TabsContent value="notes" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="md:col-span-1">
                    <div className="bg-[#F2DCDD] rounded-[32px] p-8 text-[#333333]">
                       <h3 className="font-serif text-2xl mb-4">Teacher Journal</h3>
                       <p className="text-sm opacity-80 mb-6">
                          Private notes about {student.name}'s progress, behavior, and milestones. visible only to staff.
                       </p>
                       <Button 
                          onClick={() => setIsNewEntryOpen(true)}
                          className="w-full bg-[#333333] text-white hover:bg-black rounded-full font-serif h-12"
                       >
                          + New Entry
                       </Button>
                    </div>
                 </div>
                 
                 <div className="md:col-span-2 space-y-4">
                   {notes.length === 0 ? (
                     <div className="bg-white p-12 rounded-[32px] text-center border-2 border-dashed border-gray-100">
                        <Quote className="w-8 h-8 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-serif text-lg">No journal entries yet.</p>
                     </div>
                   ) : (
                     notes.map((note, i) => (
                       <motion.div 
                          key={i} 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-white p-8 rounded-[32px] shadow-sm relative group"
                       >
                          <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-50">
                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                             </Button>
                          </div>
                          
                          <div className="flex items-center gap-3 mb-4">
                             <Badge variant="outline" className={`
                                uppercase text-[10px] tracking-wider border px-2 py-0.5
                                ${note.sentiment === 'positive' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 
                                  note.sentiment === 'constructive' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-100'}
                             `}>
                                {note.category || 'General'}
                             </Badge>
                             <span className="text-gray-300 text-xs">•</span>
                             <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">{format(new Date(note.date), 'MMMM do, yyyy')}</span>
                          </div>
                          
                          <div className="font-serif text-xl text-[#333333] leading-relaxed italic mb-4 opacity-90">
                             "{note.content}"
                          </div>

                          {note.tags && note.tags.length > 0 && (
                             <div className="flex flex-wrap gap-2 mb-6">
                                {note.tags.map((tag, t) => (
                                   <span key={t} className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-md border border-gray-100">
                                      #{tag}
                                   </span>
                                ))}
                             </div>
                          )}
                          
                          <div className="flex items-center gap-3 border-t border-gray-50 pt-4">
                             <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-[10px] bg-[#333333] text-white">{note.teacher_name?.charAt(0)}</AvatarFallback>
                             </Avatar>
                             <span className="text-xs text-gray-400 font-medium">Logged by {note.teacher_name}</span>
                          </div>
                       </motion.div>
                     ))
                   )}
                 </div>
              </div>
            </TabsContent>

            {/* COMMUNICATION TAB */}
            <TabsContent value="communication" className="space-y-6">
               <StudentCommunicationTab student={student} />
            </TabsContent>
          </Tabs>

        </div>
      </div>

      <NewJournalEntryModal
        isOpen={isNewEntryOpen}
        onOpenChange={setIsNewEntryOpen}
        student={student}
        teacherName={teacherName}
        classes={studentClasses}
      />
    </div>
  );
}