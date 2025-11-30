import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Mic, Clock, Users, CheckCircle2, XCircle, AlertCircle, ChevronLeft, MoreVertical, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import VoiceNoteIntake from '../components/teacher/VoiceNoteIntake';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

// --- SUB-COMPONENT: Class List View ---
const ClassListView = ({ classes, onSelectClass, currentTeacherName }) => {
  // Filter logic could be improved with real auth, keeping simple for now
  const myClasses = classes.filter(c => c.teacher === currentTeacherName || !c.teacher);
  const displayClasses = myClasses.length > 0 ? myClasses : classes;

  return (
    <div className="space-y-6 p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#333333]">Today's Classes</h1>
          <p className="text-gray-500 text-sm">{format(new Date(), 'EEEE, MMMM do')}</p>
        </div>
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-serif font-bold text-lg">
          {currentTeacherName.charAt(0)}
        </div>
      </div>

      <div className="space-y-4">
        {displayClasses.map((cls, idx) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onSelectClass(cls)}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden group"
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${cls.color === 'charcoal' ? 'bg-gray-600' : 'bg-pink-300'}`} />
            <div className="flex justify-between items-start mb-3 pl-2">
              <div>
                <h3 className="text-lg font-bold text-[#333333] group-hover:text-indigo-600 transition-colors">{cls.title}</h3>
                <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mm a')}
                </div>
              </div>
              <Badge variant="secondary" className="bg-gray-50 text-gray-600 font-normal">
                {cls.room || 'Studio A'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 pl-2 mt-4">
              <div className="flex -space-x-2">
                {cls.student_names?.slice(0, 3).map((name, i) => (
                  <Avatar key={i} className="w-8 h-8 border-2 border-white bg-gray-100">
                    <AvatarFallback className="text-[10px] text-gray-500">{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
                {(cls.student_names?.length > 3) && (
                  <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[10px] text-gray-400 font-medium">
                    +{cls.student_names.length - 3}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-400 ml-1">{cls.student_names?.length || 0} Students</span>
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
      // 1. Save Records
      const records = Object.entries(attendance).map(([name, status]) => ({
        class_id: classData.id,
        class_name: classData.title,
        student_name: name,
        date: new Date().toISOString().split('T')[0],
        status: status
      }));
      
      await base44.entities.Attendance.bulkCreate(records);

      // 2. AI Analysis (The "Wired In" Part)
      const issues = Object.entries(attendance).filter(([_, s]) => s === 'absent' || s === 'late');
      
      if (issues.length > 0) {
        // Trigger AI analysis for alerts
        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `
            Analyze attendance for ${classData.title}.
            Issues: ${issues.map(([n, s]) => `${n}: ${s}`).join(', ')}.
            
            Task: Return JSON of students to flag.
            { "updates": [{ "student_name": "Name", "flag": true, "summary": "Absent from Ballet" }] }
          `,
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
              // Update Student Record
              await base44.entities.Student.update(student.id, {
                attendance_alert: true,
                attendance_summary: update.summary
              });
              // Notify Parent Portal
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
    // Save voice notes logic (reused from previous, simplified for this context)
    const records = notes.map(note => ({
      ...note,
      teacher_name: currentTeacherName,
      class_name: classData.title,
      date: new Date().toISOString().split('T')[0]
    }));
    base44.entities.StudentNote.bulkCreate(records);
    setIsVoiceOpen(false);
    // Could show toast here
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
            <ChevronLeft className="w-6 h-6 text-[#333333]" />
          </Button>
          <div>
            <h2 className="font-bold text-lg leading-tight">{classData.title}</h2>
            <p className="text-xs text-gray-500">{classData.student_names?.length || 0} Students • {classData.room || 'Studio A'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full border-indigo-100 text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
            onClick={() => setIsVoiceOpen(true)}
          >
            <Mic className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Lesson Plan</DropdownMenuItem>
              <DropdownMenuItem>Email Class</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Student List */}
      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-4 space-y-3 pb-24">
          {classData.student_names?.map((name, i) => {
             const status = attendance[name] || 'present';
             const student = students.find(s => s.name === name);
             
             return (
               <motion.div 
                 key={name}
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: i * 0.03 }}
                 className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between"
               >
                 <div className="flex items-center gap-3">
                   <Avatar className="h-10 w-10 border border-gray-100">
                     <AvatarFallback className={`text-sm font-medium ${status === 'absent' ? 'bg-red-50 text-red-400' : 'bg-gray-100 text-gray-600'}`}>
                       {name.charAt(0)}
                     </AvatarFallback>
                   </Avatar>
                   <div>
                     <div className={`font-medium ${status === 'absent' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{name}</div>
                     {student?.attendance_alert && status === 'present' && (
                       <div className="text-[10px] text-red-500 flex items-center gap-1">
                         <AlertCircle className="w-3 h-3" /> Watch Attendance
                       </div>
                     )}
                   </div>
                 </div>

                 <Button
                   variant="ghost"
                   className={`
                     h-9 px-3 rounded-full text-xs font-medium transition-all
                     ${status === 'present' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 
                       status === 'absent' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 
                       'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}
                   `}
                   onClick={() => toggleStatus(name)}
                 >
                   {status === 'present' && <><CheckCircle2 className="w-3 h-3 mr-1.5" /> Present</>}
                   {status === 'absent' && <><XCircle className="w-3 h-3 mr-1.5" /> Absent</>}
                   {status === 'late' && <><Clock className="w-3 h-3 mr-1.5" /> Late</>}
                 </Button>
               </motion.div>
             );
          })}
        </div>
      </ScrollArea>

      {/* Floating Action Button / Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pb-6">
        <Button 
          size="lg" 
          className={`w-full shadow-lg text-white transition-all ${submitSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-[#333333] hover:bg-black'}`}
          onClick={handleSubmitAttendance}
          disabled={isSubmitting || submitSuccess}
        >
          {isSubmitting ? <Sparkles className="w-4 h-4 animate-spin mr-2" /> : 
           submitSuccess ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null}
          {isSubmitting ? "Analyzing..." : submitSuccess ? "Attendance Saved" : "Submit Attendance"}
        </Button>
      </div>

      {/* Voice Modal */}
      <Dialog open={isVoiceOpen} onOpenChange={setIsVoiceOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
             <DialogTitle>Class Notes</DialogTitle>
             <DialogDescription>Dictate notes for {classData.title}</DialogDescription>
          </DialogHeader>
          <VoiceNoteIntake 
            classData={classData} 
            students={students}
            teacherName={currentTeacherName}
            onNotesProcessed={handleNotesProcessed}
          />
        </DialogContent>
      </Dialog>
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
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence mode="wait">
        {!selectedClass ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Header Navigation for List View */}
            <div className="p-4 flex justify-between items-center">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="sm" className="text-gray-400">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Home
                </Button>
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="h-screen overflow-hidden" // Lock scroll for detail view
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