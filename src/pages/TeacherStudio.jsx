import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Mic, Clock, Users, CheckCircle2, XCircle, AlertCircle, ChevronLeft, MoreVertical, Sparkles, Play, Square, CalendarX, CalendarCheck, FileText, Menu, LayoutGrid, List, Calendar as CalendarIcon, Music, Disc, UserCheck, User, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInMinutes } from 'date-fns';
import VoiceNoteIntake from '../components/teacher/VoiceNoteIntake';
import ClassRosterView from '../components/teacher/ClassRosterView';
import StudentProfileView from '../components/teacher/StudentProfileView';
import SubRequestFlow from '../components/teachers/SubRequestFlow';
import AdminSubAssignment from '../components/teachers/AdminSubAssignment';
import { analyzeAttendance } from '../components/teacher/useNoteAI';
import { WeekView, MonthView } from '../components/teacher/ScheduleViews';
import TrialDossier from '../components/teacher/TrialDossier';
import TrialNoteGate from '../components/teacher/TrialNoteGate';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- HELPER: Get today's date string (YYYY-MM-DD) ---
const getTodayDateString = () => {
  return format(new Date(), 'yyyy-MM-dd');
};

// --- HELPER: Get day code from date ---
const getDayCodeFromDate = (dateStr) => {
  const date = new Date(dateStr + 'T12:00:00');
  const dayMap = { 0: 'U', 1: 'M', 2: 'T', 3: 'W', 4: 'R', 5: 'F', 6: 'S' };
  return dayMap[date.getDay()];
};

// --- HELPER: Generate date options (past and future) ---
const generateDateOptions = (centerDate, range = 30) => {
  const dates = [];
  const center = new Date(centerDate + 'T12:00:00');
  
  for (let i = -range; i <= range; i++) {
    const date = new Date(center);
    date.setDate(center.getDate() + i);
    dates.push({
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE, MMM do'),
      isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
      isPast: date < new Date(new Date().setHours(0,0,0,0))
    });
  }
  return dates;
};

// --- HELPER: Day code to full name (kept for compatibility) ---
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
const ClassListView = ({ classes, onSelectClass, selectedTeacher, selectedDate, students = [], filterType = 'class', subAssignments = [], trialLeads = [] }) => {
  // Etched text style - EXACT copy from Billing page line 298-305
  const etchedTextStyle = {
    color: 'transparent',
    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
    filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
  };

  // Get selected day code from the date
  const selectedDay = getDayCodeFromDate(selectedDate);
  
  // Helper to get effective teacher for a class on a given date
  const getEffectiveTeacher = (cls) => {
    const subAssignment = subAssignments.find(
      sa => sa.class_id === cls.id && sa.date === selectedDate && sa.status === 'scheduled'
    );
    return subAssignment ? subAssignment.sub_teacher : cls.teacher;
  };
  
  // Filter by selected day
  const dayFilteredClasses = classes.filter(c => c.day === selectedDay);
  
  // Filter by type (class vs admin)
  const typeFilteredClasses = dayFilteredClasses.filter(c => {
    if (filterType === 'admin') return c.type === 'admin';
    return c.type !== 'admin'; // Default to regular classes
  });
  
  // Filter by teacher - considering sub assignments for today
  const filteredClasses = typeFilteredClasses.filter(c => {
    if (selectedTeacher === 'all') return true;
    if (!selectedTeacher) return false;
    
    const effectiveTeacher = getEffectiveTeacher(c);
    if (!effectiveTeacher) return true; // Show unassigned classes
    
    // Check if the selected teacher is the effective teacher (original or sub)
    return effectiveTeacher.toLowerCase().includes(selectedTeacher.toLowerCase());
  }).sort((a, b) => a.start_time - b.start_time);
  
  // Helper to check if class has a sub on selected date
  const hasSubOnDate = (cls) => {
    return subAssignments.some(
      sa => sa.class_id === cls.id && sa.date === selectedDate && sa.status === 'scheduled'
    );
  };

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
  const selectedDateObj = new Date(selectedDate + 'T12:00:00');

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="mb-6 md:mb-8">
        <h1 
          className="text-2xl md:text-3xl font-bold tracking-tight"
          style={etchedTextStyle}
        >
          {isToday ? "Today's Classes" : `${dayCodeToName[selectedDay]} Classes`}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#b5a599' }}>
          {format(selectedDateObj, 'EEEE, MMMM do, yyyy')}
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
                <h3 
                  className="font-semibold truncate"
                  style={{ color: '#8b7d72' }}
                >{cls.title}</h3>
                <p className="text-xs md:text-sm mt-0.5 truncate" style={{ color: '#b5a599' }}>
                {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mm a')} · {Math.round((cls.duration || 1) * 60)} min · {getActualStudentCount(cls, students)} students
                {(cls.trial_student_names?.length > 0 || trialLeads.some(l => l.trial_class_id === cls.id)) && (
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fff' }}>
                    {cls.trial_student_names?.length || trialLeads.filter(l => l.trial_class_id === cls.id).length} Trial
                  </span>
                )}
                {hasSubOnDate(cls) && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(126,184,154,0.2)', color: '#7eb89a' }}>
                    Sub: {getEffectiveTeacher(cls)?.split(' ')[0]}
                  </span>
                )}
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
const ClassDetailView = ({ classData, students, onBack, currentTeacherName, studioId, selectedDate, trialLeads = [] }) => {
  const [mode, setMode] = useState('dashboard'); // Start at dashboard with action cards
  const [showPostClassNotes, setShowPostClassNotes] = useState(false);
  const [notePromptDismissed, setNotePromptDismissed] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubRequestOpen, setIsSubRequestOpen] = useState(false);
  const [studentsToPrompt, setStudentsToPrompt] = useState([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [selectedTrialLead, setSelectedTrialLead] = useState(null);
  const [trialNoteGate, setTrialNoteGate] = useState(null); // { childName, leadId }
  const [trialNotes, setTrialNotes] = useState({}); // { childName: noteText }

  // Get trial student names for this class
  const trialStudentNames = classData.trial_student_names || [];
  const classTrialLeads = trialLeads.filter(l =>
    l.trial_class_id === classData.id &&
    (l.funnel_status === 'trial_scheduled' || l.funnel_status === 'trial_completed')
  );
  const isTrialStudent = (name) => trialStudentNames.includes(name) || classTrialLeads.some(l => l.child_name === name);

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
  
  // Etched text style - EXACT copy from Billing page line 298-305
  const etchedText = {
    color: 'transparent',
    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
    filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
  };

  // Fetch existing attendance for this class/date
  const { data: existingAttendance = [] } = useQuery({
    queryKey: ['attendance', classData?.id, selectedDate],
    queryFn: () => base44.entities.Attendance.filter({ 
      class_id: classData.id, 
      date: selectedDate 
    }),
    enabled: !!classData?.id && !!selectedDate,
  });

  // Initialize attendance - use existing records if available
  useEffect(() => {
    if (classData?.student_names) {
      const initial = {};
      classData.student_names.forEach(name => {
        // Check if we have a saved record for this student
        const existingRecord = existingAttendance.find(a => a.student_name === name);
        initial[name] = existingRecord?.status || 'present';
      });
      setAttendance(initial);
    }
  }, [classData, existingAttendance]);

  // Check if class ends while viewing - use localStorage to ensure it only shows ONCE ever per class/date
  useEffect(() => {
    const storageKey = `note_prompt_${classData.id}_${selectedDate}`;
    
    // If already shown for this class today, don't show again
    if (localStorage.getItem(storageKey)) {
      return;
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    if (selectedDate !== today) return; // Only for today's classes
    
    const classEndHour = classData.start_time + (classData.duration || 1);
    
    const checkClassEnd = () => {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      
      // Only trigger when time crosses the end threshold
      if (currentHour >= classEndHour && !localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, 'shown');
        setShowPostClassNotes(true);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkClassEnd, 30000);
    
    return () => clearInterval(interval);
  }, [classData.id, classData.start_time, classData.duration, selectedDate]);

  const toggleStatus = (studentName) => {
    setAttendance(prev => {
      const current = prev[studentName];
      const next = current === 'present' ? 'absent' : current === 'absent' ? 'late' : current === 'late' ? 'excused' : 'present';
      return { ...prev, [studentName]: next };
    });
  };

  const handleSubmitAttendance = async () => {
    // Check if any trial students are marked present without notes
    const trialStudentsPresent = classData.student_names?.filter(name => 
      isTrialStudent(name) && (attendance[name] === 'present' || attendance[name] === 'late') && !trialNotes[name]
    ) || [];

    if (trialStudentsPresent.length > 0) {
      // Gate: require note for the first trial student without one
      setTrialNoteGate({ childName: trialStudentsPresent[0], leadId: classTrialLeads.find(l => l.child_name === trialStudentsPresent[0])?.id });
      return;
    }

    setIsSubmitting(true);
    try {
      const dateToSave = selectedDate || new Date().toISOString().split('T')[0];
      const records = Object.entries(attendance).map(([name, status]) => ({
        studio_id: studioId,
        class_id: classData.id,
        class_name: classData.title,
        student_name: name,
        date: dateToSave,
        status: status
      }));
      await base44.entities.Attendance.bulkCreate(records);

      // Save trial notes as StudentNotes and update Lead records
      for (const [childName, noteText] of Object.entries(trialNotes)) {
        if (!noteText) continue;
        await base44.entities.StudentNote.create({
          studio_id: studioId,
          student_name: childName,
          class_name: classData.title,
          teacher_name: currentTeacherName,
          content: noteText,
          category: 'general',
          sentiment: 'positive',
          tags: ['trial'],
          date: dateToSave,
        });
        // Update Lead with teacher notes and mark trial completed
        const lead = classTrialLeads.find(l => l.child_name === childName);
        if (lead) {
          await base44.entities.Lead.update(lead.id, {
            teacher_notes: noteText,
            trial_outcome: 'attended',
            funnel_status: 'trial_completed',
          });
        }
      }
      
      // Mark trial no-shows
      for (const lead of classTrialLeads) {
        if (attendance[lead.child_name] === 'absent' && !trialNotes[lead.child_name]) {
          await base44.entities.Lead.update(lead.id, {
            trial_outcome: 'no_show',
            funnel_status: 'trial_completed',
          });
        }
      }

      // Check for students who are attending as a makeup
      const allAttendance = await base44.entities.Attendance.list();
      const makeupRecords = allAttendance.filter(a => 
        a.makeup_class_id === classData.id && 
        a.makeup_date === dateToSave &&
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

      // Use the AI attendance analyzer (runs in background)
      analyzeAttendance({ attendance, classData, students }).then(analysis => {
        if (analysis?.updates) {
          analysis.updates.forEach(async (update) => {
            const student = students.find(s => s.name === update.student_name);
            if (student && update.flag) {
              await base44.entities.Student.update(student.id, {
                attendance_alert: true,
                attendance_summary: update.summary
              });
            }
          });
        }
      });
      
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setMode('dashboard'); // Go back to class dashboard after saving
      }, 1500);
    } catch (error) {
      console.error("Attendance save failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle starting the note prompt flow (triggered by time or manually)
  const handleStartNotePrompt = () => {
    const classStudents = students.filter(s => classData.student_names?.includes(s.name));
    const presentStudents = classStudents.filter(s => attendance[s.name] === 'present');
    const shuffled = [...presentStudents].sort(() => Math.random() - 0.5);
    const selectedForNotes = shuffled.slice(0, Math.min(3, shuffled.length));
    
    if (selectedForNotes.length > 0) {
      setStudentsToPrompt(selectedForNotes);
      setCurrentPromptIndex(0);
      setMode('student_note_prompt');
    }
    setShowPostClassNotes(false);
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
    return (
      <div className="min-h-screen overflow-auto" style={{ background: '#ffffff' }}>
        <LessonPlanner classData={classData} onBack={() => setMode('dashboard')} />
      </div>
    );
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
        studioId={studioId}
        onNext={() => setCurrentPromptIndex(prev => prev + 1)}
        onComplete={() => {
          setMode('dashboard');
          setStudentsToPrompt([]);
          setCurrentPromptIndex(0);
        }}
      />
    );
  }

  // Attendance View
  if (mode === 'attendance') {
    return (
      <div 
        className="flex flex-col h-screen relative"
        style={{ 
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          background: '#ffffff',
        }}
      >
        <div 
          className="fixed top-[-20%] right-[-10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
        />
        <div 
          className="fixed bottom-[-30%] left-[-15%] w-[500px] md:w-[800px] h-[500px] md:h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
        />

        <div className="relative px-4 md:px-8 py-6 md:py-8 flex flex-col items-center flex-shrink-0">
          <button 
            onClick={() => setMode('dashboard')} 
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 mb-3"
            style={{
              background: 'rgba(255,255,255,0.7)',
              boxShadow: '0 4px 12px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
              color: '#c4a0a0',
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight" style={etchedText}>
            Attendance
          </h2>
        </div>

        <div className="flex-1 px-4 md:px-8 overflow-y-auto pb-32">
          <div className="space-y-2 md:space-y-3 max-w-2xl mx-auto">
            {classData.student_names?.map((name, i) => {
               const status = attendance[name] || 'present';
               const isTrial = isTrialStudent(name);
               return (
                 <motion.div 
                   key={name}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.03 }}
                   className="rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center justify-between gap-3"
                   style={{
                     background: isTrial 
                       ? 'linear-gradient(145deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.04) 100%)'
                       : 'rgba(255,255,255,0.5)',
                     boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                     border: isTrial ? '1px solid rgba(251,191,36,0.2)' : 'none',
                   }}
                 >
                   <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                      <div 
                        className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isTrial
                            ? 'linear-gradient(145deg, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.15) 100%)'
                            : 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,1)',
                        }}
                      >
                        <span className="text-sm font-medium" style={{ color: isTrial ? '#d97706' : '#c9a99c' }}>{name.charAt(0)}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span 
                          className={`font-medium text-sm md:text-base truncate ${status === 'absent' ? 'line-through' : ''}`}
                          style={{ color: status === 'absent' ? '#d4c4ba' : '#8b7d72' }}
                        >
                          {name}
                        </span>
                        {isTrial && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#fff' }}
                          >
                            Trial
                          </span>
                        )}
                      </div>
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
        </div>

        <div 
          className="absolute bottom-0 left-0 right-0 p-4 pb-6 z-20"
          style={{ background: 'linear-gradient(to top, rgba(255,255,255,1) 60%, rgba(255,255,255,0))' }}
        >
          <div className="flex justify-center max-w-2xl mx-auto">
          <button 
            onClick={handleSubmitAttendance}
            disabled={isSubmitting || submitSuccess}
            className="w-full max-w-sm md:w-auto px-8 md:px-10 py-4 rounded-2xl text-base font-bold tracking-tight transition-all active:scale-[0.98] md:hover:scale-[1.02] disabled:opacity-70"
            style={buttonStyle}
          >
            <span style={etchedText}>
              {isSubmitting ? "Saving..." : submitSuccess ? "Saved ✓" : "Save Attendance"}
            </span>
          </button>
          </div>
        </div>
      </div>
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



  // Class Dashboard View (default mode) - 6 card grid layout
  const gridCards = [
    { id: 'attendance', label: 'ATTENDANCE', icon: CheckCircle2, mode: 'attendance' },
    { id: 'roster', label: 'ROSTER', icon: Users, mode: 'roster' },
    { id: 'lesson', label: 'LESSON PLAN', icon: FileText, mode: 'lesson_plan' },
    { id: 'music', label: 'MUSIC', icon: Music, mode: 'music' },
    { id: 'notes', label: 'NOTES', icon: Mic, mode: 'notes' },
    { id: 'sub', label: 'REQUEST SUB', icon: CalendarX, action: () => setIsSubRequestOpen(true) },
  ];

  return (
    <div 
      className="flex flex-col min-h-screen relative overflow-hidden"
      style={{ 
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: '#ffffff',
      }}
    >
      {/* Main Card Container */}
      <div className="flex-1 px-4 md:px-8 py-6 md:py-8">
        <div 
          className="rounded-3xl p-6 md:p-10 max-w-3xl mx-auto"
          style={{
            background: 'linear-gradient(145deg, rgba(254,240,240,0.95) 0%, rgba(252,235,235,0.9) 50%, rgba(250,242,240,0.85) 100%)',
            boxShadow: 'inset 0 2px 12px rgba(180, 120, 120, 0.08), inset 0 1px 3px rgba(180, 120, 120, 0.05)',
          }}
        >
          {/* Back button inside card */}
          <div className="flex justify-center mb-4">
            <button 
              onClick={onBack} 
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.7)',
                boxShadow: '0 4px 12px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                color: '#c4a0a0',
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Class Info Header */}
          <div className="text-center mb-8">
            <p className="text-sm mb-2" style={{ color: '#b5a599' }}>
              {format(new Date().setHours(Math.floor(classData.start_time), (classData.start_time % 1) * 60), 'h:mm a')} · {Math.round((classData.duration || 1) * 60)} min
            </p>
            <h1 
              className="text-3xl md:text-4xl font-bold tracking-tight"
              style={etchedText}
            >
              {classData.title}
            </h1>
            <p className="text-sm mt-2" style={{ color: '#b5a599' }}>
              {classData.student_names?.length || 0} students enrolled
            </p>
          </div>

          {/* Trial Student Alert Banner */}
          {classTrialLeads.length > 0 && (
            <div 
              className="rounded-2xl p-4 mb-6 space-y-3"
              style={{
                background: 'linear-gradient(145deg, rgba(251,191,36,0.1) 0%, rgba(245,158,11,0.06) 100%)',
                border: '1px solid rgba(251,191,36,0.2)',
              }}
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" style={{ color: '#d97706' }} />
                <span className="text-sm font-semibold" style={{ color: '#92400e' }}>
                  {classTrialLeads.length} Trial Student{classTrialLeads.length > 1 ? 's' : ''} Today
                </span>
              </div>
              <div className="space-y-2">
                {classTrialLeads.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedTrialLead(lead)}
                    className="w-full text-left rounded-xl p-3 flex items-center justify-between transition-all active:scale-[0.98]"
                    style={{ background: 'rgba(255,255,255,0.7)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
                        style={{ background: 'rgba(251,191,36,0.15)', color: '#d97706' }}
                      >
                        {lead.child_name?.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#5a4a42' }}>{lead.child_name}</div>
                        <div className="text-xs" style={{ color: '#9a8b80' }}>
                          {lead.child_age ? `Age ${lead.child_age}` : ''}{lead.dance_experience === 'none' ? ' · First time' : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium" style={{ color: '#d97706' }}>View Dossier →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 6 Card Grid - 2 cols on mobile, 3 on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {gridCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  onClick={() => card.action ? card.action() : setMode(card.mode)}
                  className="rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 hover:scale-[1.02]"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    boxShadow: '0 4px 16px -4px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)',
                  }}
                >
                  <Icon className="w-7 h-7 md:w-8 md:h-8" style={{ color: '#c4a0a0' }} />
                  <span 
                    className="text-xs md:text-sm font-semibold tracking-wider text-center"
                    style={{ color: '#a89890' }}
                  >
                    {card.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isSubRequestOpen && (
        <SubRequestFlow 
          onClose={() => setIsSubRequestOpen(false)}
          classes={[classData]}
          teacherName={currentTeacherName}
        />
      )}

      {/* Post-class notes prompt dialog */}
      {showPostClassNotes && (
        <Dialog open={showPostClassNotes} onOpenChange={setShowPostClassNotes}>
          <DialogContent className="sm:max-w-md" style={{ background: '#fffaf9' }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#8b7d72' }}>Class Ended</DialogTitle>
              <DialogDescription style={{ color: '#b5a599' }}>
                {classData.title} has finished. Would you like to add quick notes about a few students?
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPostClassNotes(false);
                  setNotePromptDismissed(true);
                }}
                className="flex-1"
              >
                Skip
              </Button>
              <Button 
                onClick={handleStartNotePrompt}
                className="flex-1"
                style={{
                  background: 'linear-gradient(145deg, rgba(180,160,190,0.9) 0%, rgba(160,140,170,0.85) 100%)',
                  color: '#fff',
                }}
              >
                Add Notes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Trial Dossier Popup */}
      <AnimatePresence>
        {selectedTrialLead && (
          <TrialDossier lead={selectedTrialLead} onClose={() => setSelectedTrialLead(null)} />
        )}
      </AnimatePresence>

      {/* Trial Note Gate */}
      <AnimatePresence>
        {trialNoteGate && (
          <TrialNoteGate
            childName={trialNoteGate.childName}
            onSubmit={(noteText) => {
              setTrialNotes(prev => ({ ...prev, [trialNoteGate.childName]: noteText }));
              setTrialNoteGate(null);
              // Re-trigger submit after saving the note (will check for more trial students)
              setTimeout(() => handleSubmitAttendance(), 100);
            }}
            onCancel={() => setTrialNoteGate(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
      };

// --- MAIN PAGE COMPONENT ---
// Force redeploy v2
export default function TeacherStudio() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'week', 'month'
  const [activeTab, setActiveTab] = useState('classes'); // 'classes', 'admin'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSubRequestOpen, setIsSubRequestOpen] = useState(false);
  const [isAdminSubOpen, setIsAdminSubOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [dateOptions, setDateOptions] = useState(() => generateDateOptions(getTodayDateString()));
  const [selectedTeacher, setSelectedTeacher] = useState(null); // null = current user, 'all' = all teachers
  
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  // studioId comes directly from the User record
  const studioId = currentUser?.studio_id || currentUser?.data?.studio_id || currentUser?.data?.data?.studio_id;
  const currentTeacherName = currentUser?.full_name;

  // Find the teacher name for the current user (for display purposes)
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', studioId],
    queryFn: () => base44.entities.Teacher.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });
  
  // Get teacher name from Teacher record if exists, otherwise use full_name
  const matchedTeacher = teachers.find(t => t.email?.toLowerCase() === currentUser?.email?.toLowerCase());
  const teacherName = matchedTeacher?.name || currentTeacherName;

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

  const { data: subAssignments = [] } = useQuery({
    queryKey: ['subAssignments', studioId],
    queryFn: () => base44.entities.SubAssignment.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  // Fetch trial leads for today
  const { data: trialLeads = [] } = useQuery({
    queryKey: ['trialLeads', studioId],
    queryFn: async () => {
      const leads = await base44.entities.Lead.filter({ studio_id: studioId, funnel_status: 'trial_scheduled' });
      return leads;
    },
    enabled: !!studioId,
  });

  // Set default selected teacher to current user on first load
  useEffect(() => {
    if (teacherName && selectedTeacher === null) {
      setSelectedTeacher(teacherName);
    }
  }, [teacherName, selectedTeacher]);

  // Loading state - simplified, no teacher query needed
  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#c9a99c] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p style={{ color: '#b5a599' }}>Loading your studio...</p>
        </div>
      </div>
    );
  }
  
  // No teacher record found for this user
  if (!studioId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#8b7d72' }}>Studio Not Found</h2>
          <p className="text-sm mb-4" style={{ color: '#b5a599' }}>
            Your account isn't linked to a studio yet. Please contact your studio administrator.
          </p>
          <p className="text-xs" style={{ color: '#d4c4ba' }}>
            Logged in as: {currentUser?.email}
          </p>
        </div>
      </div>
    );
  }



  return (
    <div 
      className="min-h-screen relative"
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
      <div className="relative flex-1 flex flex-col">

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
                   {/* Date Selector */}
                   <Select value={selectedDate} onValueChange={setSelectedDate}>
                     <SelectTrigger 
                       className="w-[180px] border-none"
                       style={{
                         background: 'rgba(255,255,255,0.6)',
                         boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
                         color: '#8b7d72',
                       }}
                     >
                       <SelectValue placeholder="Select date" />
                     </SelectTrigger>
                     <SelectContent className="max-h-[300px]">
                       {dateOptions.map((opt) => (
                         <SelectItem 
                           key={opt.value} 
                           value={opt.value}
                           className={opt.isPast ? 'opacity-60' : ''}
                         >
                           {opt.label}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>

                   {/* Teacher Selector - Only visible to super admins */}
                   {currentUser?.role === 'admin' && (
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
                   )}
                 </div>

                 {/* Right: Quick Actions */}
                 <div className="flex items-center gap-2">
                   {/* Admin: Assign Sub Button */}
                   {currentUser?.role === 'admin' && (
                     <button 
                       onClick={() => setIsAdminSubOpen(true)}
                       className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all active:scale-95"
                       style={{
                         background: 'linear-gradient(145deg, rgba(126,184,154,0.15) 0%, rgba(140,190,165,0.1) 100%)',
                         boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(126,184,154,0.1)',
                         color: '#5a7d6a',
                         border: '1px solid rgba(126,184,154,0.2)',
                       }}
                     >
                       <UserCheck className="w-4 h-4" />
                       <span className="hidden sm:inline">Assign Sub</span>
                     </button>
                   )}
                   {/* Teacher: Sub Request Button */}
                   <button 
                     onClick={() => setIsSubRequestOpen(true)}
                     className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-all active:scale-95"
                     style={{
                       background: 'rgba(255,255,255,0.6)',
                       boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
                       color: '#b5a599',
                     }}
                     title="Request Coverage"
                   >
                     <Clock className="w-4 h-4" />
                   </button>
                 </div>
              </div>

              <div 
                className="rounded-2xl md:rounded-3xl p-4 md:p-8"
                style={{
                  backgroundColor: '#fef7f7',
                  boxShadow: 'inset 0 2px 12px rgba(180, 120, 120, 0.08), inset 0 1px 3px rgba(180, 120, 120, 0.05)',
                }}
              >
                <ClassListView 
                  classes={classes} 
                  students={students}
                  subAssignments={subAssignments}
                  trialLeads={trialLeads}
                  onSelectClass={setSelectedClass}
                  selectedTeacher={selectedTeacher}
                  selectedDate={selectedDate}
                  filterType="class"
                />
              </div>

              {isSubRequestOpen && (
                <SubRequestFlow 
                  onClose={() => setIsSubRequestOpen(false)}
                  classes={classes.filter(c => {
                    if (!c.teacher) return true;
                    if (!teacherName) return false;
                    return c.teacher.trim().toLowerCase() === teacherName.trim().toLowerCase();
                  })}
                  teacherName={teacherName}
                />
              )}

              {isAdminSubOpen && (
                <AdminSubAssignment 
                  onClose={() => setIsAdminSubOpen(false)}
                  studioId={studioId}
                />
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="min-h-screen" 
            >
              <ClassDetailView 
                classData={selectedClass} 
                students={students}
                trialLeads={trialLeads}
                onBack={() => setSelectedClass(null)}
                currentTeacherName={teacherName}
                studioId={studioId}
                selectedDate={selectedDate}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}