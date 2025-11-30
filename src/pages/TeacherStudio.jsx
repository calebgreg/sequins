import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Mic, Clock, Users, CheckCircle2, XCircle, AlertCircle, ChevronLeft, MoreVertical, Sparkles, Play, Square, CalendarX, CalendarCheck, FileText, Menu, LayoutGrid, List, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInMinutes } from 'date-fns';
import VoiceNoteIntake from '../components/teacher/VoiceNoteIntake';
import SubRequestModal from '../components/teacher/SubRequestModal';
import TimeSheetReviewModal from '../components/teacher/TimeSheetReviewModal';
import SubRequestHistoryModal from '../components/teacher/SubRequestHistoryModal';
import TeacherSidebar from '../components/teacher/TeacherSidebar';
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

// --- SUB-COMPONENT: Class Detail View ---
const ClassDetailView = ({ classData, students, onBack, currentTeacherName }) => {
  const [hasStarted, setHasStarted] = useState(false);
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

  if (!hasStarted) {
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Status Card */}
            <div className="bg-white p-8 rounded-[32px] shadow-sm col-span-1 md:col-span-2 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
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
                  onClick={() => setHasStarted(true)}
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
              onClick={() => setIsVoiceOpen(true)}
            >
              <div className="w-12 h-12 rounded-full bg-[#F4F4F6] flex items-center justify-center group-hover:bg-[#F2DCDD] transition-colors">
                 <Mic className="w-6 h-6 text-[#333333]" />
              </div>
              <span className="font-sans text-xl text-[#333333] font-light">log note</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-40 rounded-[32px] flex flex-col items-center justify-center gap-4 border-transparent bg-white shadow-sm hover:bg-gray-50 hover:border-gray-200 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-[#F4F4F6] flex items-center justify-center group-hover:bg-[#F2DCDD] transition-colors">
                 <Users className="w-6 h-6 text-[#333333]" />
              </div>
              <span className="font-sans text-xl text-[#333333] font-light">view roster</span>
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
        </div>
        );
        }

  return (
    <div className="flex flex-col h-screen bg-[#F4F4F6]">
      {/* Header */}
      <div className="px-8 py-8 flex items-center justify-between sticky top-0 z-10 bg-[#F4F4F6]">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={() => setHasStarted(false)} className="bg-white rounded-full w-12 h-12 shadow-sm text-[#333333] hover:bg-white/80">
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
        availableClasses={[]} 
      />
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function TeacherStudio() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [isTimeSheetOpen, setIsTimeSheetOpen] = useState(false);
  const [isSubHistoryOpen, setIsSubHistoryOpen] = useState(false);
  const [isSubRequestOpen, setIsSubRequestOpen] = useState(false); // Global sub request state
  const [viewMode, setViewMode] = useState('list'); // 'list', 'week', 'month'
  const [activeTab, setActiveTab] = useState('classes'); // 'classes', 'admin'
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentTeacherName = "Sarah Miller"; // Mock

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
    if (view === 'timecard') setIsTimeSheetOpen(true);
    if (view === 'subs') setIsSubHistoryOpen(true);
    // 'schedule' is default
  };

  return (
    <div className="min-h-screen bg-[#F4F4F6] flex">
      
      {/* Sidebar - Desktop */}
      <TeacherSidebar 
        className="hidden md:flex w-24 flex-shrink-0 h-screen sticky top-0 z-20"
        activeView="schedule"
        onNavigate={handleNav}
        teacherName={currentTeacherName}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative max-w-[100vw] overflow-x-hidden">
        
        {/* Mobile Header / Toggle */}
        <div className="md:hidden absolute top-6 left-6 z-50">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="bg-[#333333] shadow-lg rounded-full text-white hover:bg-black">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-24 border-none bg-transparent shadow-none">
              <TeacherSidebar 
                className="h-full rounded-r-[32px] shadow-2xl"
                activeView="schedule"
                onNavigate={handleNav}
                teacherName={currentTeacherName}
              />
            </SheetContent>
          </Sheet>
        </div>

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
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                 {/* Classes / Admin Toggle */}
                 <div className="flex items-center gap-3">
                   <div className="bg-[#333333] p-1.5 rounded-full inline-flex relative shadow-lg">
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
                           relative px-8 py-2.5 rounded-full text-sm font-serif transition-all duration-300 z-10
                           ${isActive ? 'text-[#333333]' : 'text-gray-400 hover:text-white'}
                         `}
                       >
                         {isActive && (
                           <motion.div
                             layoutId="activeMainTab"
                             className="absolute inset-0 bg-[#F2DCDD] rounded-full shadow-sm"
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
                   
                   <Button 
                     onClick={() => setIsSubRequestOpen(true)}
                     className="bg-[#F2DCDD] text-[#333333] hover:bg-[#eec8ca] border border-[#E5C0C2] rounded-full gap-2 shadow-md h-12 px-6 transition-all font-serif font-medium hover:scale-105 active:scale-95"
                   >
                     <CalendarX className="w-4 h-4" />
                     Request Coverage
                   </Button>
                 </div>

                 {/* View Modes (List/Week/Month) */}
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
                         relative px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors duration-200 z-10
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
                       <span>{view.label}</span>
                     </button>
                   ))}
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

      {/* Modals managed by Sidebar Actions */}
      <TimeSheetReviewModal 
        isOpen={isTimeSheetOpen}
        onOpenChange={setIsTimeSheetOpen}
        teacherName={currentTeacherName}
        classes={classes.filter(c => c.teacher === currentTeacherName)}
        subRequests={subRequests}
      />

      <SubRequestHistoryModal
        isOpen={isSubHistoryOpen}
        onOpenChange={setIsSubHistoryOpen}
        teacherName={currentTeacherName}
        onNewRequest={() => {
          setSelectedClass(null); // Ensure no specific class is selected to trigger generic mode
          setIsSubRequestOpen(true);
        }}
      />
      
      {/* Global Sub Request Modal (for when accessing via sidebar/history) */}
      <SubRequestModal 
        isOpen={isSubRequestOpen && !selectedClass} // Only show this one if not in detail view
        onOpenChange={setIsSubRequestOpen}
        classData={null} // No pre-selected class
        teacherName={currentTeacherName}
        availableClasses={classes.filter(c => c.teacher === currentTeacherName)}
      />
    </div>
  );
}