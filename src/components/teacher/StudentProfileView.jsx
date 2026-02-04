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
import StudentMeasurementsTab from './StudentMeasurementsTab';
import MakeupClassModal from './MakeupClassModal';

export default function StudentProfileView({ student, teacherName, onBack, onViewFamily }) {
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');
  const [makeupModalOpen, setMakeupModalOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);

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

  // Quick Insights - AI-synthesized from real data
  const quickInsights = useMemo(() => {
    const insights = [];
    
    // Attendance trend (compare last 4 weeks to previous 4 weeks)
    const sortedAttendance = [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentFour = sortedAttendance.slice(0, 4);
    const previousFour = sortedAttendance.slice(4, 8);
    
    if (recentFour.length >= 2) {
      const recentPresent = recentFour.filter(a => a.status === 'present').length;
      const previousPresent = previousFour.filter(a => a.status === 'present').length;
      
      if (previousFour.length >= 2) {
        const recentRate = recentPresent / recentFour.length;
        const previousRate = previousPresent / previousFour.length;
        
        if (recentRate < previousRate - 0.2) {
          insights.push({ label: 'Attendance Trend', value: 'Declining', color: '#c87070' });
        } else if (recentRate > previousRate + 0.2) {
          insights.push({ label: 'Attendance Trend', value: 'Improving', color: '#7eb89a' });
        }
      }
      
      // Check for consecutive absences
      const consecutiveAbsences = recentFour.filter(a => a.status === 'absent' || a.status === 'excused').length;
      if (consecutiveAbsences >= 3) {
        insights.push({ label: 'Recent Pattern', value: `${consecutiveAbsences} absences`, color: '#c87070' });
      }
    }
    
    // Pending makeups
    const pendingMakeups = attendance.filter(a => 
      (a.status === 'absent' || a.status === 'excused') && !a.makeup_class_id
    ).length;
    if (pendingMakeups > 0) {
      insights.push({ label: 'Makeups Needed', value: `${pendingMakeups} pending`, color: '#d4a574' });
    }
    
    // Completed makeups
    const completedMakeups = attendance.filter(a => a.status === 'made_up').length;
    if (completedMakeups > 0) {
      insights.push({ label: 'Makeups Done', value: `${completedMakeups} completed`, color: '#7eb89a' });
    }
    
    // Teacher feedback themes from notes
    const positiveNotes = notes.filter(n => n.sentiment === 'positive').length;
    const constructiveNotes = notes.filter(n => n.sentiment === 'constructive').length;
    
    if (positiveNotes >= 3) {
      insights.push({ label: 'Teacher Feedback', value: 'Very positive', color: '#7eb89a' });
    } else if (constructiveNotes >= 2) {
      insights.push({ label: 'Teacher Feedback', value: 'Areas to work on', color: '#d4a574' });
    }
    
    // Risk flag from student data
    if (student.attendance_alert) {
      insights.push({ label: 'Status', value: 'Needs attention', color: '#c87070' });
    }
    
    return insights.slice(0, 3); // Show max 3 insights
  }, [attendance, notes, student.attendance_alert]);

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
    <div 
      className="flex flex-col h-full overflow-hidden relative"
      style={{ 
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: '#ffffff',
      }}
    >
      {/* Ambient background shapes */}
      <div 
        className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
      />
      <div 
        className="fixed bottom-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
      />

      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4 pt-4 relative">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Hero Profile Card - Frosted Glass */}
          <div 
            className="relative rounded-3xl p-6"
            style={{
              background: 'linear-gradient(145deg, rgba(253,238,236,0.85) 0%, rgba(250,232,228,0.7) 30%, rgba(248,235,230,0.6) 70%, rgba(252,243,240,0.75) 100%)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(200,180,170,0.15), 0 20px 60px -20px rgba(180,150,140,0.2)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Inner glow */}
            <div 
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)',
              }}
            />
            
            {/* Back button and actions */}
            <div className="relative z-10 flex items-center justify-between mb-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack} 
                className="rounded-full w-8 h-8 transition-all hover:scale-105"
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  color: '#8b7d72',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                }}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                {onViewFamily && (
                  <Button 
                    onClick={onViewFamily}
                    variant="ghost"
                    size="sm"
                    className="rounded-full gap-1.5 h-8 px-3 text-xs transition-all hover:scale-105"
                    style={{
                      background: 'rgba(255,255,255,0.5)',
                      color: '#9a8b80',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                    }}
                  >
                    <Users className="w-3.5 h-3.5" /> Family
                  </Button>
                )}
                <Button 
                  onClick={() => setIsNewEntryOpen(true)} 
                  size="sm"
                  className="rounded-full gap-1.5 h-8 px-3 text-xs font-medium transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
                    boxShadow: '0 4px 12px -2px rgba(180,150,140,0.25), inset 0 1px 2px rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255, 220, 210, 0.5)',
                    color: '#8a7070',
                  }}
                >
                  <Quote className="w-3.5 h-3.5" /> Log Journal
                </Button>
              </div>
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar */}
              <div 
                className="w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                  boxShadow: '0 8px 32px -8px rgba(180,150,140,0.25), inset 0 1px 1px rgba(255,255,255,1)',
                }}
              >
                <span 
                  className="text-3xl font-medium"
                  style={{ color: '#c9a99c' }}
                >
                  {student.name.charAt(0)}
                </span>
              </div>
              
              <div className="flex-1 w-full pt-1">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h1 
                      className="text-3xl font-bold tracking-tight mb-1"
                      style={{ 
                        color: 'transparent',
                        backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
                        filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                      }}
                    >
                      {student.name}
                    </h1>
                    <div className="flex flex-wrap gap-2 items-center mt-3">
                      <span 
                        className="px-3 py-1 rounded-full text-xs"
                        style={{
                          background: 'rgba(255,255,255,0.5)',
                          color: '#9a8b80',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                        }}
                      >
                        {student.level}
                      </span>
                      <span 
                        className="px-3 py-1 rounded-full text-xs"
                        style={{
                          background: 'rgba(255,255,255,0.5)',
                          color: '#9a8b80',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                        }}
                      >
                        {student.age} Years Old
                      </span>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="text-right">
                    <div className="mb-2">
                      <p className="text-3xl font-light" style={{ color: '#8b7d72' }}>
                        {attendanceRate}
                        <span className="text-lg ml-1" style={{ color: '#c4b5ab' }}>%</span>
                      </p>
                      <p className="text-xs" style={{ color: '#b5a599' }}>Attendance</p>
                    </div>
                    <p className="text-sm" style={{ color: '#b5a599' }}>{streak} day streak</p>
                  </div>
                </div>

                {/* Contact & Engagement */}
                <div 
                  className="relative flex flex-wrap items-center justify-between gap-4 mt-5 pt-4"
                  style={{ borderTop: '1px solid rgba(200,180,170,0.2)' }}
                >
                  <span className="text-sm" style={{ color: '#a8998e' }}>
                    {student.parent_email || 'No email'}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span 
                          className="text-xs px-3 py-1 rounded-full cursor-help"
                          style={{
                            background: engagementScore >= 75 ? 'rgba(126,184,154,0.15)' : engagementScore >= 50 ? 'rgba(212,165,116,0.15)' : 'rgba(200,100,100,0.15)',
                            color: engagementScore >= 75 ? '#7eb89a' : engagementScore >= 50 ? '#d4a574' : '#c87070',
                          }}
                        >
                          {engagementLabel} ({engagementScore}%)
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
                </div>
              </div>
            </div>
          </div>

          {/* Pill-Style Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList 
                className="inline-flex items-center gap-1 p-1.5 rounded-2xl h-auto bg-transparent"
                style={{
                  background: 'rgba(240,230,225,0.5)',
                  boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.1)',
                }}
              >
                 {[
                   { id: 'activity', label: 'Activity' },
                   { id: 'classes', label: 'Classes' },
                   { id: 'notes', label: 'Journal' },
                   { id: 'measurements', label: 'Measurements' },
                   { id: 'communication', label: 'Messages' }
                 ].map(tab => (
                   <TabsTrigger 
                     key={tab.id} 
                     value={tab.id}
                     className="px-5 py-2 rounded-xl text-sm font-medium transition-all data-[state=active]:shadow-md"
                     style={{
                       background: activeTab === tab.id 
                         ? 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)'
                         : 'transparent',
                       color: activeTab === tab.id ? '#8b7d72' : '#b5a599',
                       boxShadow: activeTab === tab.id 
                         ? '0 2px 8px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,0.8)'
                         : 'none',
                     }}
                   >
                     {tab.label}
                   </TabsTrigger>
                 ))}
              </TabsList>
            </div>

            {/* ACTIVITY TAB */}
            <TabsContent value="activity" className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Visual Stats Block */}
                  <div className="md:col-span-1 space-y-4">
                     <div 
                        className="rounded-2xl p-5 relative overflow-hidden"
                        style={{
                          background: 'linear-gradient(145deg, rgba(164,139,196,0.15) 0%, rgba(180,160,200,0.1) 100%)',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)',
                        }}
                     >
                        <span className="absolute top-4 right-4 text-2xl">✦</span>
                        <h3 className="text-lg mb-0.5 font-medium" style={{ color: '#8b7d9a' }}>Current Streak</h3>
                        <div className="text-4xl font-light mb-2" style={{ color: '#8b7d72' }}>
                          {streak} <span className="text-sm" style={{ color: '#b5a599' }}>days</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: '#a8a0b5' }}>
                           {student.name} has been consistent lately!
                        </p>
                     </div>
                     
                     {quickInsights.length > 0 && (
                       <div 
                          className="rounded-2xl p-4"
                          style={{
                            background: 'rgba(255,255,255,0.4)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                          }}
                       >
                          <h4 className="text-sm mb-3 font-medium" style={{ color: '#8b7d72' }}>Quick Insights</h4>
                          <div className="space-y-2">
                             {quickInsights.map((insight, i) => (
                               <React.Fragment key={i}>
                                 {i > 0 && <div className="w-full h-px" style={{ background: 'rgba(200,180,170,0.2)' }} />}
                                 <div className="flex items-center justify-between text-xs">
                                    <span style={{ color: '#b5a599' }}>{insight.label}</span>
                                    <span className="font-medium" style={{ color: insight.color }}>{insight.value}</span>
                                 </div>
                               </React.Fragment>
                             ))}
                          </div>
                       </div>
                     )}
                  </div>

                  {/* Timeline */}
                  <div 
                     className="md:col-span-2 rounded-2xl p-5 max-h-[320px] overflow-y-auto"
                     style={{
                       background: 'linear-gradient(145deg, rgba(253,238,236,0.6) 0%, rgba(250,232,228,0.4) 100%)',
                       boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                     }}
                  >
                     <h3 className="text-lg font-medium mb-4" style={{ color: '#8b7d72' }}>Attendance Timeline</h3>
                     <div className="space-y-3">
                        {attendance.slice(0, 6).map((record, i) => {
                           const isMadeUp = record.status === 'made_up';
                           const isAbsent = record.status === 'absent' || record.status === 'excused';
                           const hasMakeupScheduled = isAbsent && record.makeup_class_id;
                           
                           const getStatusColor = () => {
                             if (record.status === 'present') return { bg: 'rgba(126,184,154,0.15)', color: '#7eb89a' };
                             if (isMadeUp) return { bg: 'rgba(164,139,196,0.15)', color: '#8b7d9a' };
                             if (hasMakeupScheduled) return { bg: 'rgba(212,165,116,0.15)', color: '#d4a574' };
                             if (isAbsent) return { bg: 'rgba(200,100,100,0.15)', color: '#c87070' };
                             return { bg: 'rgba(212,165,116,0.15)', color: '#d4a574' };
                           };
                           
                           const statusStyle = getStatusColor();
                           
                           return (
                             <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex gap-4 p-4 rounded-xl transition-all hover:scale-[1.01]"
                                style={{ background: 'rgba(255,255,255,0.5)' }}
                             >
                                <div 
                                   className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                   style={{ background: statusStyle.bg }}
                                >
                                   <span style={{ color: statusStyle.color, fontSize: '14px' }}>
                                     {record.status === 'present' ? '✓' : isMadeUp ? '↻' : isAbsent ? '✗' : '◐'}
                                   </span>
                                </div>
                                
                                <div className="flex-1">
                                   <div className="flex justify-between items-center mb-1">
                                      <span className="font-medium" style={{ color: '#8b7d72' }}>{record.class_name}</span>
                                      <span className="text-xs" style={{ color: '#b5a599' }}>
                                         {format(new Date(record.date), 'MMM d')}
                                      </span>
                                   </div>
                                   <div className="flex items-center gap-2 flex-wrap">
                                     <span 
                                        className="text-xs capitalize px-2 py-0.5 rounded-full"
                                        style={{ background: statusStyle.bg, color: statusStyle.color }}
                                     >
                                        {isMadeUp ? 'Made Up' : hasMakeupScheduled ? 'Makeup Scheduled' : record.status}
                                     </span>
                                     
                                     {/* Makeup button for absences without scheduled makeup */}
                                     {isAbsent && !hasMakeupScheduled && !isMadeUp && (
                                       <button
                                         onClick={() => {
                                           setSelectedAbsence(record);
                                           setMakeupModalOpen(true);
                                         }}
                                         className="text-xs px-2 py-0.5 rounded-full transition-all hover:scale-105"
                                         style={{
                                           background: 'linear-gradient(145deg, rgba(164,139,196,0.2) 0%, rgba(180,160,200,0.15) 100%)',
                                           color: '#8b7d9a',
                                         }}
                                       >
                                         + Schedule Makeup
                                       </button>
                                     )}
                                     
                                     {/* Show makeup info if scheduled */}
                                     {hasMakeupScheduled && (
                                       <span className="text-xs" style={{ color: '#b5a599' }}>
                                         → {record.makeup_class_name} ({format(new Date(record.makeup_date), 'MMM d')})
                                       </span>
                                     )}
                                   </div>
                                </div>
                             </motion.div>
                           );
                        })}
                     </div>
                  </div>
               </div>
            </TabsContent>

            {/* CLASSES TAB */}
            <TabsContent value="classes" className="space-y-6">
               {/* Weekly Visualizer */}
               <div 
                  className="rounded-3xl p-6"
                  style={{
                    background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 15px 50px -15px rgba(180,150,140,0.15)',
                  }}
               >
                  <h3 className="text-xl font-medium mb-5" style={{ color: '#8b7d72' }}>Weekly Rhythm</h3>
                  <div className="grid grid-cols-7 gap-2">
                     {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                        const dayMap = { 0: 'U', 1: 'M', 2: 'T', 3: 'W', 4: 'R', 5: 'F', 6: 'S' };
                        const dayKey = dayMap[index];
                        const dayClasses = studentClasses.filter(c => c.day === dayKey);
                        
                        return (
                           <div key={day} className="flex flex-col gap-2">
                              <div className="text-center text-xs font-medium uppercase" style={{ color: '#c4b5ab' }}>{day}</div>
                              <div 
                                 className="h-28 rounded-xl p-1 space-y-1"
                                 style={{
                                   background: dayClasses.length > 0 ? 'rgba(255,255,255,0.4)' : 'transparent',
                                   border: '1px dashed rgba(200,180,170,0.3)',
                                 }}
                              >
                                 {dayClasses.map(c => (
                                    <div 
                                       key={c.id} 
                                       className="text-[10px] p-1.5 rounded-lg text-center leading-tight truncate"
                                       style={{
                                         background: 'linear-gradient(145deg, rgba(200,170,156,0.3) 0%, rgba(180,150,140,0.2) 100%)',
                                         color: '#8b7d72',
                                       }}
                                    >
                                       {c.title}
                                    </div>
                                 ))}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               <div className="space-y-3">
                 {studentClasses.map((cls, i) => (
                   <motion.div 
                     key={cls.id}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.1 }}
                     className="flex items-center justify-between p-4 rounded-2xl transition-all hover:scale-[1.01] cursor-pointer"
                     style={{
                       background: 'rgba(255,255,255,0.4)',
                       boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                     }}
                   >
                     <div className="flex items-center gap-4">
                        <span 
                           className="text-sm w-12"
                           style={{ color: '#b5a599' }}
                        >
                           {cls.day === 'M' ? 'Mon' : cls.day === 'T' ? 'Tue' : cls.day === 'W' ? 'Wed' : cls.day === 'R' ? 'Thu' : cls.day === 'F' ? 'Fri' : cls.day === 'S' ? 'Sat' : 'Sun'}
                        </span>
                        <span 
                           className="w-2 h-2 rounded-full"
                           style={{ background: '#c4b5ab' }}
                        />
                        <div>
                           <p className="font-medium" style={{ color: '#8b7d72' }}>{cls.title}</p>
                           <p className="text-sm" style={{ color: '#b5a599' }}>
                              {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mma')} · {cls.teacher || 'Staff'} · {cls.room || 'Main'}
                           </p>
                        </div>
                     </div>
                     <svg 
                       className="w-4 h-4 flex-shrink-0"
                       fill="none" 
                       stroke="currentColor" 
                       viewBox="0 0 24 24"
                       style={{ color: '#d4c4ba' }}
                     >
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                     </svg>
                   </motion.div>
                 ))}
               </div>
            </TabsContent>

            {/* NOTES TAB - Timeline Style */}
            <TabsContent value="notes" className="space-y-4">
              <div className="space-y-4">
                 {notes.length === 0 ? (
                   <div 
                      className="py-12 text-center rounded-2xl"
                      style={{
                        background: 'rgba(255,255,255,0.4)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                      }}
                   >
                      <span className="text-2xl mb-3 block">✎</span>
                      <p style={{ color: '#b5a599' }}>No journal entries yet</p>
                   </div>
                 ) : (
                   notes.map((note, i) => (
                     <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex gap-4 p-5 rounded-2xl"
                        style={{
                          background: 'rgba(255,255,255,0.4)',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                        }}
                     >
                        <div 
                           className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                           style={{
                             background: note.sentiment === 'positive' ? 'rgba(200,180,80,0.15)'
                               : note.sentiment === 'constructive' ? 'rgba(100,150,200,0.15)'
                               : 'rgba(200,170,156,0.15)',
                           }}
                        >
                           <span style={{ 
                             color: note.sentiment === 'positive' ? '#b5a060'
                               : note.sentiment === 'constructive' ? '#6090b5'
                               : '#c8aa9c',
                             fontSize: '14px',
                           }}>
                             ✎
                           </span>
                        </div>
                        <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm" style={{ color: '#b5a599' }}>{format(new Date(note.date), 'MMM d')}</span>
                              {note.teacher_name && (
                                 <span className="text-sm" style={{ color: '#c4b5ab' }}>· {note.teacher_name}</span>
                              )}
                           </div>
                           <p style={{ color: '#8b7d72' }}>{note.content}</p>
                           {note.tags && note.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                 {note.tags.map((tag, t) => (
                                    <span 
                                       key={t} 
                                       className="text-[10px] px-2 py-0.5 rounded-md"
                                       style={{
                                         background: 'rgba(255,255,255,0.5)',
                                         color: '#b5a599',
                                       }}
                                    >
                                       #{tag}
                                    </span>
                                 ))}
                              </div>
                           )}
                        </div>
                     </motion.div>
                   ))
                 )}

                 {/* Add Note Button */}
                 <div className="flex justify-center pt-4">
                   <button 
                     onClick={() => setIsNewEntryOpen(true)}
                     className="px-8 py-3 rounded-2xl text-sm font-bold tracking-tight transition-all hover:scale-[1.02]"
                     style={{
                       background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
                       boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
                       border: '1px solid rgba(255, 220, 210, 0.5)',
                       backdropFilter: 'blur(8px)',
                     }}
                   >
                     <span
                       style={{
                         backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                         backgroundClip: 'text',
                         WebkitBackgroundClip: 'text',
                         color: 'transparent',
                         textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
                         filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                       }}
                     >
                       Add Note
                     </span>
                   </button>
                 </div>
              </div>
            </TabsContent>

            {/* MEASUREMENTS TAB */}
            <TabsContent value="measurements" className="space-y-6">
               <div 
                  className="rounded-2xl p-5"
                  style={{
                    background: 'rgba(255,255,255,0.4)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                  }}
               >
                  <StudentMeasurementsTab student={student} />
               </div>
            </TabsContent>

            {/* COMMUNICATION TAB */}
            <TabsContent value="communication" className="space-y-6">
               <div 
                  className="rounded-2xl p-5"
                  style={{
                    background: 'rgba(255,255,255,0.4)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                  }}
               >
                  <StudentCommunicationTab student={student} />
               </div>
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

      <MakeupClassModal
        isOpen={makeupModalOpen}
        onOpenChange={setMakeupModalOpen}
        absenceRecord={selectedAbsence}
        studentName={student.name}
      />
    </div>
  );
}