import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Mic, Clock, Users, CheckCircle2, XCircle, AlertCircle, ChevronLeft, MoreVertical, Sparkles, Play, Square, CalendarX } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInMinutes } from 'date-fns';
import VoiceNoteIntake from '../components/teacher/VoiceNoteIntake';
import SubRequestModal from '../components/teacher/SubRequestModal';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

// --- SUB-COMPONENT: Time Card Widget ---
const TimeCardWidget = ({ currentTeacherName }) => {
  const queryClient = useQueryClient();
  
  // Fetch today's logs
  const { data: logs = [] } = useQuery({
    queryKey: ['time_logs', currentTeacherName],
    queryFn: async () => {
      const all = await base44.entities.TimeLog.list();
      // Filter client-side for simplicity in this context
      return all.filter(l => l.teacher_name === currentTeacherName && l.status === 'active');
    }
  });

  const activeLog = logs[0];
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval;
    if (activeLog) {
      const updateTime = () => {
        const start = new Date(activeLog.clock_in);
        const now = new Date();
        setElapsed(differenceInMinutes(now, start));
      };
      updateTime();
      interval = setInterval(updateTime, 60000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeLog]);

  const handleToggleClock = async () => {
    if (activeLog) {
      // Clock Out
      await base44.entities.TimeLog.update(activeLog.id, {
        clock_out: new Date().toISOString(),
        status: 'completed'
      });
    } else {
      // Clock In
      await base44.entities.TimeLog.create({
        teacher_name: currentTeacherName,
        clock_in: new Date().toISOString(),
        status: 'active'
      });
    }
    queryClient.invalidateQueries(['time_logs']);
  };

  const hours = Math.floor(elapsed / 60);
  const mins = elapsed % 60;

  return (
    <div className="bg-white rounded-[24px] p-6 mb-8 shadow-sm flex items-center justify-between relative overflow-hidden">
       <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#333333]" />
       
       <div className="pl-2">
         <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Time Card</h4>
         <div className="text-3xl font-serif text-[#333333]">
           {activeLog ? (
             <span>{hours}h <span className="text-gray-300">{mins}m</span></span>
           ) : (
             <span className="text-gray-300">Not Clocked In</span>
           )}
         </div>
       </div>

       <Button 
         size="lg"
         onClick={handleToggleClock}
         className={`
           rounded-full h-14 px-6 gap-2 transition-all font-medium
           ${activeLog 
             ? 'bg-[#F2DCDD] text-[#333333] hover:bg-red-100' 
             : 'bg-[#333333] text-white hover:bg-black'}
         `}
       >
         {activeLog ? (
           <><Square className="w-4 h-4 fill-current" /> Clock Out</>
         ) : (
           <><Play className="w-4 h-4 fill-current" /> Clock In</>
         )}
       </Button>
    </div>
  );
};

// --- SUB-COMPONENT: Class List View ---
const ClassListView = ({ classes, onSelectClass, currentTeacherName }) => {
  const myClasses = classes.filter(c => c.teacher === currentTeacherName || !c.teacher);
  const displayClasses = myClasses.length > 0 ? myClasses : classes;

  return (
    <div className="space-y-8 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-serif text-3xl text-[#333333]">Today's Classes</h1>
          <p className="text-[#333333]/60 mt-1 font-serif">{format(new Date(), 'MMMM do')}</p>
        </div>
        <div className="h-12 px-6 bg-white border border-gray-100 rounded-full flex items-center justify-center text-[#333333] font-serif text-lg shadow-sm">
          {currentTeacherName.split(' ')[0]}
        </div>
      </div>
      
      <TimeCardWidget currentTeacherName={currentTeacherName} />

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

// --- SUB-COMPONENT: Class Detail View ---
const ClassDetailView = ({ classData, students, onBack, currentTeacherName }) => {
  const [attendance, setAttendance] = useState({});
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubRequestOpen, setIsSubRequestOpen] = useState(false);

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
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
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
    setIsVoiceOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F4F4F6]">
      {/* Header */}
      <div className="px-8 py-8 flex items-center justify-between sticky top-0 z-10 bg-[#F4F4F6]">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={onBack} className="bg-white rounded-full w-12 h-12 shadow-sm text-[#333333] hover:bg-white/80">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-serif text-3xl text-[#333333]">{classData.title}</h2>
          </div>
        </div>
        <div className="flex gap-3">
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

      <Dialog open={isVoiceOpen} onOpenChange={setIsVoiceOpen}>
        <DialogContent className="max-w-lg bg-white rounded-[32px]">
          <DialogHeader>
             <DialogTitle className="font-serif text-2xl">Class Notes</DialogTitle>
          </DialogHeader>
          <VoiceNoteIntake 
            classData={classData} 
            students={students}
            teacherName={currentTeacherName}
            onNotesProcessed={handleNotesProcessed}
          />
        </DialogContent>
      </Dialog>

      <SubRequestModal 
        isOpen={isSubRequestOpen}
        onOpenChange={setIsSubRequestOpen}
        classData={classData}
        teacherName={currentTeacherName}
      />
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function TeacherStudio() {
  const [selectedClass, setSelectedClass] = useState(null);
  const currentTeacherName = "Sarah Miller"; // Mock

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  return (
    <div className="min-h-screen bg-[#F4F4F6]">
      <AnimatePresence mode="wait">
        {!selectedClass ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
             {/* Minimal Header */}
            <div className="p-6 flex justify-between items-center">
              <Link to={createPageUrl('Home')} className="bg-white p-2 rounded-full shadow-sm text-[#333333]">
                  <ArrowLeft className="w-5 h-5" /> 
              </Link>
            </div>
            <ClassListView 
              classes={classes} 
              onSelectClass={setSelectedClass} 
              currentTeacherName={currentTeacherName}
            />
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
  );
}