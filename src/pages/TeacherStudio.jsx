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
import SubRequestModal from '../components/teacher/SubRequestModal';
import TimeSheetReviewModal from '../components/teacher/TimeSheetReviewModal';
import SubRequestHistoryModal from '../components/teacher/SubRequestHistoryModal';
import TeacherSidebar from '../components/teacher/TeacherSidebar';
import TimeManagementHub from '../components/teacher/TimeManagementHub';
import { WeekView, MonthView } from '../components/teacher/ScheduleViews';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- SUB-COMPONENT: Class List View ---
const ClassListView = ({ classes, onSelectClass, currentTeacherName }) => {
  // Reverting to showing all classes as requested ("keep the 'today classes' view completely as is")
  // This view acts as a "List" view of all recurring classes for the teacher
  const myClasses = classes.filter(c => c.teacher === currentTeacherName || !c.teacher);
  const displayClasses = myClasses.length > 0 ? myClasses : classes;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-[#333333]">Today's Classes</h1>
          <p className="text-[#333333]/60 mt-1 font-serif">{format(new Date(), 'MMMM do')}</p>
        </div>
      </div>
      
      <div className="space-y-5">
        {displayClasses.map((cls, idx) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onSelectClass(cls)}
            className="bg-white rounded-full h-20 px-8 flex items-center justify-between shadow-sm hover:shadow-md transition-all cursor-pointer group border border-transparent hover:border-[#F2DCDD]"
          >
            <div className="flex items-center gap-6">
              <div className="text-lg font-serif text-[#333333] w-16">
                {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mm')}
                <span className="text-xs ml-0.5 text-gray-400 font-sans">am</span>
              </div>
              
              <div className="h-8 w-px bg-gray-100" />
              
              <div>
                <h3 className="text-lg font-medium text-[#333333] group-hover:text-gray-600 transition-colors">{cls.title}</h3>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="flex -space-x-2">
                {cls.student_names?.slice(0, 3).map((name, i) => (
                  <Avatar key={i} className="w-8 h-8 border-2 border-white bg-[#F4F4F6]">
                    <AvatarFallback className="text-[10px] text-[#333333] font-serif">{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div className={`h-3 w-3 rounded-full ${idx % 2 === 0 ? 'bg-[#333333]' : 'bg-[#F2DCDD]'}`} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

import LessonPlanner from '../components/teacher/LessonPlanner';
import MusicManager from '../components/teacher/MusicManager';
import StudentNotePrompt from '../components/teacher/StudentNotePrompt';

// --- SUB-COMPONENT: Class Detail View ---
const ClassDetailView = ({ classData, students, onBack, currentTeacherName }) => {
  const [mode, setMode] = useState('dashboard'); // 'dashboard', 'roster', 'notes', 'active_class', 'student', 'music', 'lesson_plan', 'student_note_prompt'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubRequestOpen, setIsSubRequestOpen] = useState(false);
  const [studentsToPrompt, setStudentsToPrompt] = useState([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

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
      const records = Object.entries(attendance).map(([name, status]) => ({
        class_id: classData.id,
        class_name: classData.title,
        student_name: name,
        date: new Date().toISOString().split('T')[0],
        status: status
      }));
      await base44.entities.Attendance.bulkCreate(records);

      const issues = Object.entries(attendance).filter(([_, s]) => s === 'absent' || s === 'late');
      if (issues.length > 0) {
        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze attendance for ${classData.title}. Issues: ${issues.map(([n, s]) => `${n}: ${s}`).join(', ')}. Return JSON to flag: { "updates": [{ "student_name": "Name", "flag": true, "summary": "Absent from Ballet" }] }`,
          response_json_schema: {
            type: "object",
            properties: {
              updates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    student_name: { type: "string" },
                    flag: { type: "boolean" },
                    summary: { type: "string" }
                  }
                }
              }
            }
          }
        });

        if (analysis?.updates) {
          await Promise.all(analysis.updates.map(async (update) => {
            const student = students.find(s => s.name === update.student_name);
            if (student && update.flag) {
              await base44.entities.Student.update(student.id, {
                attendance_alert: true,
                attendance_summary: update.summary
              });
              await base44.entities.Message.create({
                content: `Attendance Alert: ${update.summary}`,
                sender: 'ai',
                timestamp: new Date().toISOString(),
                is_alert: true
              });
            }
          }));
        }
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
       <div className="flex flex-col h-full bg-[#F4F4F6]">
         <div className="px-8 py-8 flex items-center justify-between sticky top-0 z-10 bg-[#F4F4F6]">
           <div className="flex items-center gap-6">
             <Button variant="ghost" size="icon" onClick={() => setMode('dashboard')} className="bg-white rounded-full w-12 h-12 shadow-sm text-[#333333] hover:bg-white/80">
               <ArrowLeft className="w-5 h-5" />
             </Button>
             <div>
               <h2 className="font-serif text-3xl text-[#333333]">Class Notes</h2>
               <p className="text-gray-400 font-serif text-lg">Dictate or type notes for {classData.title}</p>
             </div>
           </div>
         </div>
         <div className="flex-1 px-8 pb-8 flex flex-col max-w-4xl mx-auto w-full">
           <div className="bg-white rounded-[32px] p-8 shadow-sm h-full">
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
      <div className="flex flex-col h-screen bg-[#F4F4F6]">
        {/* Dashboard Header */}
        <div className="px-8 py-8 flex items-center justify-between sticky top-0 z-10 bg-[#F4F4F6]">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={onBack} className="bg-white rounded-full w-12 h-12 shadow-sm text-[#333333] hover:bg-white/80">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="font-serif text-3xl text-[#333333]">{classData.title}</h2>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col max-w-4xl mx-auto w-full justify-center">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Main Status Card - Spans full width on mobile, 2 cols on large screens */}
            <div className="bg-white p-8 rounded-[32px] shadow-sm col-span-1 md:col-span-2 lg:col-span-3 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
               <div className="flex items-start gap-6">
                 <div className="w-20 h-20 bg-[#F4F4F6] rounded-full flex items-center justify-center text-[#333333] flex-shrink-0">
                   <span className="font-serif text-3xl">{classData.title.charAt(0)}</span>
                 </div>
                 <div>
                   <h3 className="font-serif text-3xl text-[#333333]">{classData.title}</h3>
                   <p className="text-gray-400 font-serif text-lg mt-1">
                     {format(new Date().setHours(Math.floor(classData.start_time), (classData.start_time % 1) * 60), 'h:mm a')} • {classData.duration} hrs
                   </p>
                   <div className="flex gap-2 mt-4">
                      <Badge variant="secondary" className="bg-[#F2DCDD] text-[#333333] hover:bg-[#F2DCDD]">
                         {classData.student_names?.length || 0} Students
                      </Badge>
                      <Badge variant="outline" className="text-gray-400 border-gray-200">
                         Studio {classData.room || 'A'}
                      </Badge>
                   </div>
                 </div>
               </div>

               <Button 
                  onClick={() => setMode('active_class')}
                  className="w-full md:w-auto rounded-full bg-[#333333] text-white hover:bg-black h-14 px-8 text-lg font-serif shadow-lg transition-all hover:scale-105 active:scale-95 self-center md:self-start"
                >
                  <Play className="w-4 h-4 mr-2 fill-current" /> Start Class
               </Button>
            </div>

            {/* Management Actions Grid */}
            <Button 
              variant="outline" 
              className="h-40 rounded-[32px] flex flex-col items-center justify-center gap-4 border-transparent bg-white shadow-sm hover:bg-gray-50 hover:border-gray-200 transition-all group" 
              onClick={() => setIsSubRequestOpen(true)}
            >
              <div className="w-12 h-12 rounded-full bg-[#F4F4F6] flex items-center justify-center group-hover:bg-[#F2DCDD] transition-colors">
                 <CalendarX className="w-6 h-6 text-[#333333]" />
              </div>
              <span className="font-sans text-xl text-[#333333] font-light">request coverage</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-40 rounded-[32px] flex flex-col items-center justify-center gap-4 border-transparent bg-white shadow-sm hover:bg-gray-50 hover:border-gray-200 transition-all group"
              onClick={() => setMode('notes')}
            >
              <div className="w-12 h-12 rounded-full bg-[#F4F4F6] flex items-center justify-center group-hover:bg-[#F2DCDD] transition-colors">
                 <Mic className="w-6 h-6 text-[#333333]" />
              </div>
              <span className="font-sans text-xl text-[#333333] font-light">log note</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-40 rounded-[32px] flex flex-col items-center justify-center gap-4 border-transparent bg-white shadow-sm hover:bg-gray-50 hover:border-gray-200 transition-all group"
              onClick={() => setMode('roster')}
            >
              <div className="w-12 h-12 rounded-full bg-[#F4F4F6] flex items-center justify-center group-hover:bg-[#F2DCDD] transition-colors">
                 <Users className="w-6 h-6 text-[#333333]" />
              </div>
              <span className="font-sans text-xl text-[#333333] font-light">view roster</span>
            </Button>

            {/* New Buttons */}
            <Button 
              variant="outline" 
              className="h-40 rounded-[32px] flex flex-col items-center justify-center gap-4 border-transparent bg-white shadow-sm hover:bg-gray-50 hover:border-gray-200 transition-all group"
              onClick={() => setMode('lesson_plan')}
            >
              <div className="w-12 h-12 rounded-full bg-[#F4F4F6] flex items-center justify-center group-hover:bg-[#F2DCDD] transition-colors">
                 <Sparkles className="w-6 h-6 text-[#333333]" />
              </div>
              <span className="font-sans text-xl text-[#333333] font-light">lesson plan</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-40 rounded-[32px] flex flex-col items-center justify-center gap-4 border-transparent bg-white shadow-sm hover:bg-gray-50 hover:border-gray-200 transition-all group"
              onClick={() => setMode('music')}
            >
              <div className="w-12 h-12 rounded-full bg-[#F4F4F6] flex items-center justify-center group-hover:bg-[#F2DCDD] transition-colors">
                 <Play className="w-6 h-6 text-[#333333]" />
              </div>
              <span className="font-sans text-xl text-[#333333] font-light">class music</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-40 rounded-[32px] flex flex-col items-center justify-center gap-4 border-transparent bg-white shadow-sm hover:bg-gray-50 hover:border-gray-200 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-[#F4F4F6] flex items-center justify-center group-hover:bg-[#F2DCDD] transition-colors">
                 <MoreVertical className="w-6 h-6 text-[#333333]" />
              </div>
              <span className="font-sans text-xl text-[#333333] font-light">more options</span>
            </Button>
          </div>
        </div>

        <SubRequestModal 
          isOpen={isSubRequestOpen}
          onOpenChange={setIsSubRequestOpen}
          classData={classData}
          teacherName={currentTeacherName}
          availableClasses={[]} 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F4F4F6]">
      {/* Header */}
      <div className="px-8 py-8 flex items-center justify-between sticky top-0 z-10 bg-[#F4F4F6]">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={() => setMode('dashboard')} className="bg-white rounded-full w-12 h-12 shadow-sm text-[#333333] hover:bg-white/80">
                <ChevronLeft className="w-5 h-5" />
              </Button>
          <div>
            <h2 className="font-serif text-3xl text-[#333333]">{classData.title}</h2>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="ghost"
            className="rounded-full bg-white text-[#333333] border border-gray-200 hover:bg-gray-50 w-12 h-12 p-0 shadow-sm"
            onClick={() => setIsSubRequestOpen(true)}
            title="Request Sub"
          >
            <CalendarX className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost"
            className="rounded-full bg-[#333333] text-white hover:bg-black w-12 h-12 p-0 shadow-lg shadow-gray-200"
            onClick={() => setIsVoiceOpen(true)}
          >
            <Mic className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Student List */}
      <ScrollArea className="flex-1 px-4 md:px-8">
        <div className="space-y-4 pb-28 max-w-2xl mx-auto">
          {classData.student_names?.map((name, i) => {
             const status = attendance[name] || 'present';
             
             return (
               <motion.div 
                 key={name}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.03 }}
                 className="bg-white rounded-full h-16 px-6 flex items-center justify-between shadow-sm"
               >
                 <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#F4F4F6] flex items-center justify-center text-sm font-serif text-[#333333]">
                        {name.charAt(0)}
                    </div>
                    <span className={`font-medium text-[#333333] ${status === 'absent' ? 'line-through text-gray-300' : ''}`}>{name}</span>
                 </div>

                 <div className="flex gap-2">
                    {['present', 'absent', 'late'].map(s => (
                        <button
                            key={s}
                            onClick={() => setAttendance(prev => ({...prev, [name]: s}))}
                            className={`
                                h-8 px-4 rounded-full text-xs font-medium transition-all
                                ${status === s 
                                    ? (s === 'present' ? 'bg-[#F2DCDD] text-[#333333]' : 'bg-[#333333] text-white')
                                    : 'text-gray-400 hover:text-gray-600'
                                }
                            `}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                 </div>
               </motion.div>
             );
          })}
        </div>
      </ScrollArea>

      {/* Floating Footer */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
          <Button 
            size="lg" 
            className={`shadow-xl rounded-full px-10 py-6 text-lg font-serif transition-all ${submitSuccess ? 'bg-[#F2DCDD] text-[#333333]' : 'bg-[#333333] text-white hover:bg-black'}`}
            onClick={handleSubmitAttendance}
            disabled={isSubmitting || submitSuccess}
          >
            {isSubmitting ? "Analyzing..." : submitSuccess ? "Saved" : "Complete Class"}
          </Button>
        </div>

        <SubRequestModal 
          isOpen={isSubRequestOpen}
          onOpenChange={setIsSubRequestOpen}
          classData={classData}
          teacherName={currentTeacherName}
          availableClasses={[]} 
        />
      </div>
      );
      };

// --- MAIN PAGE COMPONENT ---
export default function TeacherStudio() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [isTimeManagementOpen, setIsTimeManagementOpen] = useState(false);
  const [isSubRequestOpen, setIsSubRequestOpen] = useState(false); // Global sub request state
  const [viewMode, setViewMode] = useState('list'); // 'list', 'week', 'month'
  const [activeTab, setActiveTab] = useState('classes'); // 'classes', 'admin'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false
  });
  
  const currentTeacherName = currentUser?.full_name || "Sarah Miller";

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: subRequests = [] } = useQuery({
    queryKey: ['sub_requests', currentTeacherName],
    queryFn: async () => {
      const all = await base44.entities.SubRequest.list();
      return all.filter(r => r.teacher_name === currentTeacherName);
    }
  });

  const handleNav = (view) => {
    if (view === 'timecard' || view === 'subs') {
      setIsTimeManagementOpen(true);
    }
    // 'schedule' is default
  };

  return (
    <div className="min-h-screen bg-[#F4F4F6]">

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative max-w-[100vw] overflow-x-hidden">

        <AnimatePresence mode="wait">
          {!selectedClass ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 p-6 pt-20 md:pt-10 max-w-5xl mx-auto w-full"
            >
              {/* Header Controls */}
              <div className="flex justify-between items-center mb-12">
                 {/* Left: Classes / Admin Toggle */}
                 <div className="bg-white p-1 rounded-full inline-flex relative shadow-sm border border-gray-100">
                   {[
                     { id: 'classes', label: 'Classes' },
                     { id: 'admin', label: 'Admin' }
                   ].map((tab) => {
                   const isActive = activeTab === tab.id;
                   return (
                     <button
                       key={tab.id}
                       onClick={() => setActiveTab(tab.id)}
                       className={`
                         relative px-8 py-2.5 rounded-full text-sm font-medium transition-all duration-300 z-10
                         ${isActive ? 'text-[#333333]' : 'text-gray-500 hover:text-gray-700'}
                       `}
                     >
                       {isActive && (
                         <motion.div
                           layoutId="activeMainTab"
                           className="absolute inset-0 bg-[#F2DCDD] rounded-full"
                           initial={false}
                           transition={{ type: "spring", stiffness: 500, damping: 30 }}
                           style={{ zIndex: -1 }}
                         />
                       )}
                       <span>{tab.label}</span>
                     </button>
                   )
                 })}
                 </div>
                   
                 {/* Right: View Modes + Quick Actions */}
                 <div className="flex items-center gap-3">
                   {/* View Mode Toggle */}
                   <div className="bg-white p-1 rounded-full inline-flex relative shadow-sm border border-gray-100">
                     {[
                       { id: 'list', label: 'List', icon: List },
                       { id: 'week', label: 'Week', icon: LayoutGrid },
                       { id: 'month', label: 'Month', icon: CalendarIcon }
                     ].map(view => (
                       <button
                         key={view.id}
                         onClick={() => setViewMode(view.id)}
                         className={`
                           relative px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors duration-200 z-10
                           ${viewMode === view.id ? 'text-[#333333]' : 'text-gray-400 hover:text-gray-700'}
                         `}
                       >
                         {viewMode === view.id && (
                           <motion.div
                             layoutId="activeViewTab"
                             className="absolute inset-0 bg-gray-100 rounded-full"
                             initial={false}
                             transition={{ type: "spring", stiffness: 500, damping: 30 }}
                             style={{ zIndex: -1 }}
                           />
                         )}
                         <view.icon className="w-4 h-4" />
                         <span className="hidden md:inline">{view.label}</span>
                       </button>
                     ))}
                   </div>

                   {/* Time Management Button */}
                   <Button 
                     onClick={() => setIsTimeManagementOpen(true)}
                     variant="outline"
                     className="rounded-full gap-2 h-11 px-5 border-gray-200 hover:bg-gray-50"
                   >
                     <Clock className="w-4 h-4" />
                     <span className="hidden md:inline">Time & Schedule</span>
                   </Button>
                 </div>
              </div>

              <div className="min-h-[600px]">
                {viewMode === 'list' && (
                  <ClassListView 
                    classes={classes} 
                    onSelectClass={setSelectedClass} 
                    currentTeacherName={currentTeacherName}
                    filterType={activeTab === 'classes' ? 'class' : 'admin'}
                  />
                )}
                {viewMode === 'week' && (
                  <WeekView 
                    classes={classes} 
                    currentTeacherName={currentTeacherName}
                    filterType={activeTab === 'classes' ? 'class' : 'admin'}
                  />
                )}
                {viewMode === 'month' && (
                  <MonthView 
                    classes={classes} 
                    currentTeacherName={currentTeacherName} 
                    filterType={activeTab === 'classes' ? 'class' : 'admin'}
                    onDateSelect={(date) => {
                        // Just switch to week view for now as List view is static
                        // or we could implement a specific Day view later
                    }}
                  />
                )}
              </div>
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

      {/* Time Management Hub */}
      <TimeManagementHub
        isOpen={isTimeManagementOpen}
        onOpenChange={setIsTimeManagementOpen}
        teacherName={currentTeacherName}
        classes={classes.filter(c => c.teacher === currentTeacherName)}
        subRequests={subRequests}
      />
      
      {/* Global Sub Request Modal (for when accessing from class detail view) */}
      <SubRequestModal 
        isOpen={isSubRequestOpen && !selectedClass}
        onOpenChange={setIsSubRequestOpen}
        classData={null}
        teacherName={currentTeacherName}
        availableClasses={classes.filter(c => c.teacher === currentTeacherName)}
      />
    </div>
  );
}