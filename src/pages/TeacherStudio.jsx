import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Mic, Clock, Users, CheckCircle2, XCircle, AlertCircle, ChevronLeft, MoreVertical, Sparkles, Play, Square, CalendarX, CalendarCheck, FileText, Menu, LayoutGrid, List, Calendar as CalendarIcon, Music, Disc } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInMinutes } from 'date-fns';
import VoiceNoteIntake from '../components/teacher/VoiceNoteIntake';
import ClassRosterView from '../components/teacher/ClassRosterView';
import StudentProfileView from '../components/teacher/StudentProfileView';
import SubRequestFlow from '../components/teachers/SubRequestFlow';
import { analyzeAttendance } from '../components/teacher/useNoteAI';
import { WeekView, MonthView } from '../components/teacher/ScheduleViews';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- HELPER: Get today's day code ---
const getTodayDayCode = () => {
  const dayMap = { 0: 'U', 1: 'M', 2: 'T', 3: 'W', 4: 'R', 5: 'F', 6: 'S' };
  return dayMap[new Date().getDay()];
};

// --- HELPER: Day code to full name ---
const dayCodeToName = {
  'M': 'Monday',
  'T': 'Tuesday',
  'W': 'Wednesday',
  'R': 'Thursday',
  'F': 'Friday',
  'S': 'Saturday',
  'U': 'Sunday'
};

// --- HELPER: Count actual students that exist in database ---
const getActualStudentCount = (cls, students) => {
  if (!cls.student_names || !students) return 0;
  return students.filter(s => cls.student_names.includes(s.name)).length;
};

// --- SUB-COMPONENT: Class List View ---
const ClassListView = ({ classes, onSelectClass, selectedTeacher, selectedDay, students = [], filterType = 'class' }) => {
  // Filter by selected day
  const dayFilteredClasses = classes.filter(c => c.day === selectedDay);
  
  // Filter by type (class vs admin)
  const typeFilteredClasses = dayFilteredClasses.filter(c => {
    if (filterType === 'admin') return c.type === 'admin';
    return c.type !== 'admin'; // Default to regular classes
  });
  
  // Filter by teacher - "all" shows all, otherwise check if teacher name is included (handles multiple teachers)
  const filteredClasses = typeFilteredClasses.filter(c => {
    if (selectedTeacher === 'all') return true;
    if (!c.teacher) return true; // Show unassigned classes
    if (!selectedTeacher) return false;
    // Check if the selected teacher's name appears in the teacher field (handles "Teacher A, Teacher B" format)
    return c.teacher.toLowerCase().includes(selectedTeacher.toLowerCase());
  }).sort((a, b) => a.start_time - b.start_time);

  const isToday = selectedDay === getTodayDayCode();

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="mb-6 md:mb-8">
        <h1 
          className="text-2xl md:text-3xl font-bold tracking-tight"
          style={{ 
            color: 'transparent',
            backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
          }}
        >
          {isToday ? "Today's Classes" : `${dayCodeToName[selectedDay]} Classes`}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#b5a599' }}>
          {isToday ? format(new Date(), 'EEEE, MMMM do, yyyy') : dayCodeToName[selectedDay]}
        </p>
      </div>
      
      <div className="space-y-3">
        {filteredClasses.map((cls, idx) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onSelectClass(cls)}
            className="rounded-2xl p-4 md:p-5 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] md:hover:scale-[1.01]"
            style={{
              background: 'rgba(255,255,255,0.5)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 16px -8px rgba(180,150,140,0.15)',
            }}
          >
            <div className="flex items-center gap-3 md:gap-5 flex-1 min-w-0">
              <div 
                className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
                  boxShadow: '0 4px 12px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                }}
              >
                <span className="text-base md:text-lg font-medium" style={{ color: '#c9a99c' }}>
                  {cls.title.charAt(0)}
                </span>
              </div>
              
              <div className="min-w-0 flex-1">
                <h3 className="font-medium truncate" style={{ color: '#8b7d72' }}>{cls.title}</h3>
                <p className="text-xs md:text-sm mt-0.5 truncate" style={{ color: '#b5a599' }}>
                  {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mm a')} · {cls.duration || 1}hr · {getActualStudentCount(cls, students)} students
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <div className="hidden sm:flex -space-x-2">
                {cls.student_names?.slice(0, 3).map((name, i) => (
                  <div 
                    key={i} 
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 border-white"
                    style={{ background: 'rgba(244,206,206,0.4)' }}
                  >
                    <span className="text-xs" style={{ color: '#a8998e' }}>{name.charAt(0)}</span>
                  </div>
                ))}
              </div>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#d4c4ba' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.div>
        ))}
        
        {filteredClasses.length === 0 && (
          <div className="text-center py-12" style={{ color: '#b5a599' }}>
            No classes scheduled {selectedTeacher !== 'all' ? 'for this teacher ' : ''}on {dayCodeToName[selectedDay]}
          </div>
        )}
      </div>
    </div>
  );
};

import LessonPlanner from '../components/teacher/LessonPlanner';
import MusicManager from '../components/teacher/MusicManager';
import StudentNotePrompt from '../components/teacher/StudentNotePrompt';

// --- SUB-COMPONENT: Class Detail View ---
const ClassDetailView = ({ classData, students, onBack, currentTeacherName }) => {
  const [mode, setMode] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubRequestOpen, setIsSubRequestOpen] = useState(false);
  const [studentsToPrompt, setStudentsToPrompt] = useState([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  // Frosted glass style for cards
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

  // Initialize attendance
  useEffect(() => {
    if (classData?.student_names) {
      const initial = {};
      classData.student_names.forEach(name => {
        initial[name] = 'present';
      });
      setAttendance(initial);
    }
  }, [classData]);

  const toggleStatus = (studentName) => {
    setAttendance(prev => {
      const current = prev[studentName];
      const next = current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
      return { ...prev, [studentName]: next };
    });
  };

  const handleSubmitAttendance = async () => {
    setIsSubmitting(true);
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const records = Object.entries(attendance).map(([name, status]) => ({
        class_id: classData.id,
        class_name: classData.title,
        student_name: name,
        date: todayDate,
        status: status
      }));
      await base44.entities.Attendance.bulkCreate(records);

      // Check for students who are attending as a makeup
      // Find any absence records with this class scheduled as makeup for today
      const allAttendance = await base44.entities.Attendance.list();
      const makeupRecords = allAttendance.filter(a => 
        a.makeup_class_id === classData.id && 
        a.makeup_date === todayDate &&
        (a.status === 'absent' || a.status === 'excused')
      );
      
      // Mark those original absences as "made_up"
      for (const makeupRecord of makeupRecords) {
        if (attendance[makeupRecord.student_name] === 'present') {
          await base44.entities.Attendance.update(makeupRecord.id, {
            status: 'made_up'
          });
        }
      }

      // Use the powerful AI attendance analyzer
      const analysis = await analyzeAttendance({
        attendance,
        classData,
        students,
      });

      if (analysis?.updates) {
        await Promise.all(analysis.updates.map(async (update) => {
          const student = students.find(s => s.name === update.student_name);
          if (student && update.flag) {
            await base44.entities.Student.update(student.id, {
              attendance_alert: true,
              attendance_summary: update.summary
            });
            // Only create high-severity alerts as messages
            if (update.severity === 'high' || update.severity === 'medium') {
              await base44.entities.Message.create({
                content: `Attendance Alert: ${update.summary}${update.suggested_action ? ` — ${update.suggested_action}` : ''}`,
                sender: 'system',
                student_id: student.id,
                timestamp: new Date().toISOString(),
                is_alert: true
              });
            }
          }
        }));
      }
      
      // Only prompt for notes on students who attended (marked present)
      const classStudents = students.filter(s => classData.student_names?.includes(s.name));
      const presentStudents = classStudents.filter(s => attendance[s.name] === 'present');
      const shuffled = [...presentStudents].sort(() => Math.random() - 0.5);
      const selectedForNotes = shuffled.slice(0, Math.min(3, shuffled.length));
      
      if (selectedForNotes.length > 0) {
        setStudentsToPrompt(selectedForNotes);
        setCurrentPromptIndex(0);
        setMode('student_note_prompt');
      } else {
        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitSuccess(false);
          setMode('dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error("Attendance save failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotesProcessed = (notes) => {
    const records = notes.map(note => ({
      ...note,
      teacher_name: currentTeacherName,
      class_name: classData.title,
      date: new Date().toISOString().split('T')[0]
    }));
    base44.entities.StudentNote.bulkCreate(records);
    setMode('dashboard');
  };

  if (mode === 'lesson_plan') {
    return <LessonPlanner classData={classData} onBack={() => setMode('dashboard')} />;
  }

  if (mode === 'music') {
    return <MusicManager classData={classData} onBack={() => setMode('dashboard')} />;
  }

  if (mode === 'student_note_prompt') {
    return (
      <StudentNotePrompt
        classData={classData}
        studentsToPrompt={studentsToPrompt}
        currentIndex={currentPromptIndex}
        teacherName={currentTeacherName}
        onNext={() => setCurrentPromptIndex(prev => prev + 1)}
        onComplete={() => {
          setMode('dashboard');
          setStudentsToPrompt([]);
          setCurrentPromptIndex(0);
        }}
      />
    );
  }

  // Student Profile View
  if (mode === 'student' && selectedStudent) {
      return <StudentProfileView student={selectedStudent} teacherName={currentTeacherName} onBack={() => setMode('roster')} />;
  }

  // Roster View
  if (mode === 'roster') {
     return (
       <ClassRosterView 
         classData={classData} 
         students={students} 
         onBack={() => setMode('dashboard')} 
         onSelectStudent={(student) => {
           setSelectedStudent(student);
           setMode('student');
         }}
       />
     );
  }

  // Notes View
  if (mode === 'notes') {
     return (
       <div 
         className="flex flex-col min-h-screen relative overflow-hidden"
         style={{ 
           fontFamily: "'DM Sans', -apple-system, sans-serif",
           background: '#ffffff',
         }}
       >
         <div 
           className="fixed top-[-20%] right-[-10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
         />
         <div className="relative px-4 md:px-8 py-6 md:py-8 flex items-center gap-3 md:gap-4">
           <button 
             onClick={() => setMode('dashboard')} 
             className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
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
               className="text-xl md:text-2xl font-bold tracking-tight"
               style={{
                 backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                 backgroundClip: 'text',
                 WebkitBackgroundClip: 'text',
                 color: 'transparent',
               }}
             >
               Class Notes
             </h2>
             <p className="text-xs md:text-sm truncate" style={{ color: '#b5a599' }}>Dictate or type notes for {classData.title}</p>
           </div>
         </div>
         <div className="relative flex-1 px-4 md:px-8 pb-6 md:pb-8 flex flex-col max-w-4xl mx-auto w-full">
           <div 
             className="rounded-2xl md:rounded-3xl p-4 md:p-8 h-full"
             style={{
               background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
               boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 15px 50px -15px rgba(180,150,140,0.15)',
             }}
           >
              <VoiceNoteIntake 
                classData={classData} 
                students={students}
                teacherName={currentTeacherName}
                onNotesProcessed={handleNotesProcessed}
              />
           </div>
         </div>
       </div>
     );
  }

  // Dashboard View
  if (mode === 'dashboard') {
    return (
      <div 
        className="flex flex-col min-h-screen relative overflow-hidden"
        style={{ 
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          background: '#ffffff',
        }}
      >
        {/* Ambient background shapes */}
        <div 
          className="fixed top-[-20%] right-[-10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
        />
        <div 
          className="fixed bottom-[-30%] left-[-15%] w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
        />

        {/* Header */}
        <div className="relative px-4 md:px-8 py-6 md:py-8 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={onBack} 
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.6)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
                color: '#b5a599',
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 
              className="text-xl md:text-2xl font-bold tracking-tight truncate"
              style={textGradient}
            >
              {classData.title}
            </h2>
          </div>
        </div>

        <div className="relative flex-1 px-4 md:px-8 pb-8 flex flex-col max-w-4xl mx-auto w-full">
          
          {/* Main Status Card */}
          <div 
            className="rounded-2xl md:rounded-3xl p-5 md:p-8 mb-4 md:mb-6"
            style={cardStyle}
          >
            <div className="flex flex-col gap-5 md:gap-6">
              <div className="flex items-start gap-4 md:gap-6">
                <div 
                  className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                    boxShadow: '0 8px 32px -8px rgba(180,150,140,0.25), inset 0 1px 1px rgba(255,255,255,1)',
                  }}
                >
                  <span className="text-xl md:text-2xl font-medium" style={{ color: '#c9a99c' }}>
                    {classData.title.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 
                    className="text-xl md:text-3xl font-bold tracking-tight truncate"
                    style={textGradient}
                  >
                    {classData.title}
                  </h3>
                  <p className="text-sm md:text-lg mt-1" style={{ color: '#a8998e' }}>
                    {format(new Date().setHours(Math.floor(classData.start_time), (classData.start_time % 1) * 60), 'h:mm a')} · {classData.duration} hrs
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3 md:mt-4">
                    <span 
                      className="px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.5)',
                        color: '#9a8b80',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                      }}
                    >
                      {classData.student_names?.length || 0} Students
                    </span>
                    <span 
                      className="px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.5)',
                        color: '#9a8b80',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                      }}
                    >
                      Studio {classData.room || 'A'}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setMode('active_class')}
                className="w-full px-6 md:px-8 py-4 rounded-2xl text-base font-bold tracking-tight transition-all active:scale-[0.98] md:hover:scale-[1.02]"
                style={buttonStyle}
              >
                <span style={textGradient} className="flex items-center justify-center gap-2">
                  <Play className="w-4 h-4 fill-current" style={{ color: '#c4a0a0' }} /> Start Class
                </span>
              </button>
            </div>
          </div>

          {/* Actions Grid */}
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {[
              { icon: CalendarX, label: 'Coverage', onClick: () => setIsSubRequestOpen(true) },
              { icon: Mic, label: 'Notes', onClick: () => setMode('notes') },
              { icon: Users, label: 'Roster', onClick: () => setMode('roster') },
              { icon: Sparkles, label: 'Lesson', onClick: () => setMode('lesson_plan') },
              { icon: Music, label: 'Music', onClick: () => setMode('music') },
              { icon: MoreVertical, label: 'More', onClick: () => {} },
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="aspect-square md:h-32 md:aspect-auto rounded-xl md:rounded-2xl flex flex-col items-center justify-center gap-2 md:gap-3 transition-all active:scale-[0.95] md:hover:scale-[1.02]"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 16px -8px rgba(180,150,140,0.12)',
                }}
              >
                <div 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
                    boxShadow: '0 4px 12px -4px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)',
                  }}
                >
                  <action.icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#c9a99c' }} />
                </div>
                <span className="text-xs md:text-sm font-medium" style={{ color: '#8b7d72' }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {isSubRequestOpen && (
          <SubRequestFlow 
            onClose={() => setIsSubRequestOpen(false)}
            classes={[classData]}
            teacherName={currentTeacherName}
          />
        )}
      </div>
    );
  }

  // Active class attendance view
  return (
    <div 
      className="flex flex-col min-h-screen relative overflow-hidden"
      style={{ 
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: '#ffffff',
      }}
    >
      {/* Ambient background shapes */}
      <div 
        className="fixed top-[-20%] right-[-10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
      />
      <div 
        className="fixed bottom-[-30%] left-[-15%] w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <div className="relative px-4 md:px-8 py-6 md:py-8 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <button 
            onClick={() => setMode('dashboard')} 
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.6)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
              color: '#b5a599',
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 
            className="text-xl md:text-2xl font-bold tracking-tight truncate"
            style={textGradient}
          >
            {classData.title}
          </h2>
        </div>
        <div className="flex gap-2 md:gap-3 flex-shrink-0">
          <button 
            onClick={() => setIsSubRequestOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.6)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
              color: '#b5a599',
            }}
          >
            <CalendarX className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Student List */}
      <ScrollArea className="relative flex-1 px-4 md:px-8">
        <div className="space-y-2 md:space-y-3 pb-28 md:pb-32 max-w-2xl mx-auto">
          {classData.student_names?.map((name, i) => {
             const status = attendance[name] || 'present';
             
             return (
               <motion.div 
                 key={name}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.03 }}
                 className="rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center justify-between gap-3"
                 style={{
                   background: 'rgba(255,255,255,0.5)',
                   boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                 }}
               >
                 <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div 
                      className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,1)',
                      }}
                    >
                      <span className="text-sm font-medium" style={{ color: '#c9a99c' }}>{name.charAt(0)}</span>
                    </div>
                    <span 
                      className={`font-medium text-sm md:text-base truncate ${status === 'absent' ? 'line-through' : ''}`}
                      style={{ color: status === 'absent' ? '#d4c4ba' : '#8b7d72' }}
                    >
                      {name}
                    </span>
                 </div>

                 <div className="flex gap-1.5 md:gap-2 flex-shrink-0">
                    {['present', 'absent', 'late'].map(s => (
                        <button
                            key={s}
                            onClick={() => setAttendance(prev => ({...prev, [name]: s}))}
                            className="px-2.5 md:px-4 py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-medium transition-all active:scale-95"
                            style={{
                              background: status === s 
                                ? (s === 'present' 
                                  ? 'linear-gradient(145deg, rgba(126,184,154,0.2) 0%, rgba(126,184,154,0.1) 100%)'
                                  : s === 'absent'
                                  ? 'linear-gradient(145deg, rgba(212,165,116,0.2) 0%, rgba(212,165,116,0.1) 100%)'
                                  : 'linear-gradient(145deg, rgba(164,139,196,0.2) 0%, rgba(164,139,196,0.1) 100%)')
                                : 'transparent',
                              color: status === s 
                                ? (s === 'present' ? '#7eb89a' : s === 'absent' ? '#d4a574' : '#a48bc4')
                                : '#c4b5ab',
                              boxShadow: status === s ? 'inset 0 1px 1px rgba(255,255,255,0.5)' : 'none',
                            }}
                        >
                            {s === 'present' ? 'Here' : s === 'absent' ? 'Out' : 'Late'}
                        </button>
                    ))}
                 </div>
               </motion.div>
             );
          })}
        </div>
      </ScrollArea>

      {/* Floating Footer */}
      <div className="fixed bottom-6 md:bottom-8 left-0 right-0 flex justify-center px-4 z-20">
        <button 
          onClick={handleSubmitAttendance}
          disabled={isSubmitting || submitSuccess}
          className="w-full max-w-sm md:w-auto px-8 md:px-10 py-4 rounded-2xl text-base font-bold tracking-tight transition-all active:scale-[0.98] md:hover:scale-[1.02] disabled:opacity-70"
          style={buttonStyle}
        >
          <span style={textGradient}>
            {isSubmitting ? "Analyzing..." : submitSuccess ? "Saved ✓" : "Complete Class"}
          </span>
        </button>
      </div>

      {isSubRequestOpen && (
        <SubRequestFlow 
          onClose={() => setIsSubRequestOpen(false)}
          classes={[classData]}
          teacherName={currentTeacherName}
        />
      )}
    </div>
  );
      };

// --- MAIN PAGE COMPONENT ---
export default function TeacherStudio() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'week', 'month'
  const [activeTab, setActiveTab] = useState('classes'); // 'classes', 'admin'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSubRequestOpen, setIsSubRequestOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(getTodayDayCode());
  const [selectedTeacher, setSelectedTeacher] = useState(null); // null = current user, 'all' = all teachers
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  // studio_id might be at top level or in data object depending on how it was set
  const studioId = currentUser?.studio_id || currentUser?.data?.studio_id || currentUser?.data?.data?.studio_id;

  // Find the teacher record that matches this user's email
  const { data: teacherRecord } = useQuery({
    queryKey: ['myTeacherRecord', currentUser?.email, studioId],
    queryFn: async () => {
      if (!currentUser?.email || !studioId) return null;
      const teachers = await base44.entities.Teacher.filter({ 
        email: currentUser.email,
        studio_id: studioId 
      });
      return teachers?.[0] || null;
    },
    enabled: !!currentUser?.email && !!studioId,
  });
  
  // Use teacher name from Teacher entity if found, otherwise fall back to user's full_name
  const currentTeacherName = teacherRecord?.name || currentUser?.full_name;
  
  // Set default selected teacher to current user on first load
  useEffect(() => {
    if (currentTeacherName && selectedTeacher === null) {
      setSelectedTeacher(currentTeacherName);
    }
  }, [currentTeacherName, selectedTeacher]);

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', studioId],
    queryFn: () => base44.entities.Teacher.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', studioId],
    queryFn: () => base44.entities.DanceClass.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students', studioId],
    queryFn: () => base44.entities.Student.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });



  return (
    <div 
      className="min-h-screen relative overflow-hidden"
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

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col max-w-[100vw] overflow-x-hidden">

        <AnimatePresence mode="wait">
          {!selectedClass ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 p-4 md:p-6 pt-16 md:pt-10 max-w-4xl mx-auto w-full"
            >
              {/* Header Controls */}
              <div className="flex flex-wrap justify-between items-center gap-3 mb-6 md:mb-10">
                 {/* Left: Filters */}
                 <div className="flex items-center gap-2 flex-wrap">
                   {/* Day Selector */}
                   <Select value={selectedDay} onValueChange={setSelectedDay}>
                     <SelectTrigger 
                       className="w-[130px] border-none"
                       style={{
                         background: 'rgba(255,255,255,0.6)',
                         boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
                         color: '#8b7d72',
                       }}
                     >
                       <SelectValue placeholder="Select day" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="M">Monday</SelectItem>
                       <SelectItem value="T">Tuesday</SelectItem>
                       <SelectItem value="W">Wednesday</SelectItem>
                       <SelectItem value="R">Thursday</SelectItem>
                       <SelectItem value="F">Friday</SelectItem>
                       <SelectItem value="S">Saturday</SelectItem>
                       <SelectItem value="U">Sunday</SelectItem>
                     </SelectContent>
                   </Select>

                   {/* Teacher Selector */}
                   <Select value={selectedTeacher || ''} onValueChange={setSelectedTeacher}>
                     <SelectTrigger 
                       className="w-[150px] border-none"
                       style={{
                         background: 'rgba(255,255,255,0.6)',
                         boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
                         color: '#8b7d72',
                       }}
                     >
                       <SelectValue placeholder="Select teacher" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">All Teachers</SelectItem>
                       {teachers.map(teacher => (
                         <SelectItem key={teacher.id} value={teacher.name}>
                           {teacher.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>

                 {/* Right: Quick Actions */}
                 <div className="flex items-center gap-2">
                   {/* Sub Request Button */}
                   <button 
                     onClick={() => setIsSubRequestOpen(true)}
                     className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-all active:scale-95"
                     style={{
                       background: 'rgba(255,255,255,0.6)',
                       boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
                       color: '#b5a599',
                     }}
                   >
                     <Clock className="w-4 h-4" />
                   </button>
                 </div>
              </div>

              <div 
                className="rounded-2xl md:rounded-3xl p-4 md:p-8"
                style={{
                  background: 'linear-gradient(145deg, rgba(253,238,236,0.6) 0%, rgba(250,232,228,0.4) 50%, rgba(252,243,240,0.5) 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6), 0 15px 50px -15px rgba(180,150,140,0.12)',
                }}
              >
                <ClassListView 
                  classes={classes} 
                  students={students}
                  onSelectClass={setSelectedClass} 
                  selectedTeacher={selectedTeacher}
                  selectedDay={selectedDay}
                  filterType="class"
                />
              </div>

              {isSubRequestOpen && (
                <SubRequestFlow 
                  onClose={() => setIsSubRequestOpen(false)}
                  classes={classes.filter(c => {
                    if (!c.teacher) return true;
                    if (!currentTeacherName) return false;
                    return c.teacher.trim().toLowerCase() === currentTeacherName.trim().toLowerCase();
                  })}
                  teacherName={currentTeacherName}
                />
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-screen overflow-hidden" 
            >
              <ClassDetailView 
                classData={selectedClass} 
                students={students}
                onBack={() => setSelectedClass(null)}
                currentTeacherName={currentTeacherName}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}