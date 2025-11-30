import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Mic, Calendar, Users, Clock, ChevronRight, Sparkles, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import VoiceNoteIntake from '../components/teacher/VoiceNoteIntake';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function TeacherStudio() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [processedNotes, setProcessedNotes] = useState(null);
  
  // Mock current teacher for now - in real app would come from auth
  const currentTeacherName = "Sarah Miller"; 

  const queryClient = useQueryClient();

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const createNotesMutation = useMutation({
    mutationFn: (notes) => base44.entities.StudentNote.bulkCreate(notes),
    onSuccess: () => {
      setIsIntakeOpen(false);
      setProcessedNotes(null);
      // In a real app, we might show a toast here
    }
  });

  const handleNotesProcessed = (notes) => {
    setProcessedNotes(notes);
  };

  const handleSaveNotes = () => {
    if (!processedNotes || !selectedClass) return;
    
    const records = processedNotes.map(note => ({
      ...note,
      teacher_name: currentTeacherName,
      class_name: selectedClass.title,
      date: new Date().toISOString().split('T')[0]
    }));
    
    createNotesMutation.mutate(records);
  };

  // Filter for "My Classes" (mocked)
  // If no classes match the mock name, just show all for demo purposes so the UI isn't empty
  const myClasses = classes.filter(c => c.teacher === currentTeacherName || !c.teacher);
  const displayClasses = myClasses.length > 0 ? myClasses : classes.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-Optimized Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-serif font-bold text-lg">
              {currentTeacherName.charAt(0)}
            </div>
            <div>
              <h1 className="font-serif text-lg text-[#333333] leading-tight">Teacher Studio</h1>
              <p className="text-xs text-gray-500">{format(new Date(), 'EEEE, MMM d')}</p>
            </div>
         </div>
         <Link to={createPageUrl('Home')}>
           <Button variant="ghost" size="icon">
             <ArrowLeft className="w-5 h-5 text-gray-400" />
           </Button>
         </Link>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* Quick Action Card */}
        <Card className="bg-indigo-600 text-white border-none shadow-lg overflow-hidden relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none" />
           <CardContent className="p-6 flex items-center justify-between relative z-0">
             <div>
               <h2 className="text-xl font-semibold mb-1">Class Assistant</h2>
               <p className="text-indigo-100 text-sm opacity-90">Capture moments as they happen.</p>
             </div>
             <Button 
               onClick={() => {
                 // Default to first available class if none selected, or prompt
                 if (displayClasses[0]) {
                   setSelectedClass(displayClasses[0]);
                   setIsIntakeOpen(true);
                 }
               }}
               className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-full px-5 shadow-sm font-medium"
             >
               <Mic className="w-4 h-4 mr-2" /> Start Dictation
             </Button>
           </CardContent>
        </Card>

        {/* Today's Classes */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-500 text-sm uppercase tracking-wider ml-1">Today's Schedule</h3>
          
          {displayClasses.map(cls => (
            <motion.div 
              key={cls.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-[0.99] transition-transform"
              onClick={() => {
                setSelectedClass(cls);
                setIsIntakeOpen(true);
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-bold text-[#333333]">{cls.title}</h4>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mm a')}
                  </div>
                </div>
                <Badge variant="secondary" className="bg-gray-50 text-gray-600">
                  {cls.room || 'Studio A'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-3">
                 <div className="flex items-center gap-2">
                   <Users className="w-4 h-4 text-indigo-400" />
                   <span className="text-sm font-medium text-gray-700">{cls.student_names?.length || 0} Students</span>
                 </div>
                 <div className="flex -space-x-2">
                   {cls.student_names?.slice(0, 4).map((name, i) => (
                     <div key={i} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-500">
                       {name.charAt(0)}
                     </div>
                   ))}
                   {(cls.student_names?.length > 4) && (
                     <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-xs text-gray-400">
                       +{cls.student_names.length - 4}
                     </div>
                   )}
                 </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Voice Intake Modal */}
      <Dialog open={isIntakeOpen} onOpenChange={setIsIntakeOpen}>
        <DialogContent className="max-w-lg bg-[#FAFAFA] p-0 overflow-hidden border-none">
          {processedNotes ? (
             <div className="flex flex-col h-full max-h-[80vh]">
               <div className="p-6 bg-white border-b border-gray-100">
                 <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                     <BrainCircuit className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="font-semibold text-lg">Analysis Complete</h3>
                     <p className="text-sm text-gray-500">I found {processedNotes.length} key observations.</p>
                   </div>
                 </div>
               </div>
               
               <ScrollArea className="flex-1 p-6">
                 <div className="space-y-4">
                   {processedNotes.map((note, i) => (
                     <motion.div 
                       key={i}
                       initial={{ opacity: 0, x: -10 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: i * 0.1 }}
                       className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
                     >
                       <div className="flex justify-between items-start mb-2">
                         <span className="font-bold text-[#333333]">{note.student_name}</span>
                         <Badge variant="outline" className={`
                           ${note.sentiment === 'positive' ? 'bg-green-50 text-green-700 border-green-200' : 
                             note.sentiment === 'constructive' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                             'bg-gray-50 text-gray-600'}
                         `}>
                           {note.category}
                         </Badge>
                       </div>
                       <p className="text-gray-700 text-sm leading-relaxed">"{note.content}"</p>
                     </motion.div>
                   ))}
                 </div>
               </ScrollArea>

               <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                 <Button variant="ghost" onClick={() => setProcessedNotes(null)} className="flex-1">
                   Discard
                 </Button>
                 <Button 
                   onClick={handleSaveNotes} 
                   disabled={createNotesMutation.isPending}
                   className="flex-1 bg-[#333333] hover:bg-black text-white"
                 >
                   {createNotesMutation.isPending ? "Saving..." : "Save to Student Records"}
                 </Button>
               </div>
             </div>
          ) : (
            <div className="p-6">
              <DialogHeader className="mb-6">
                <DialogTitle className="font-serif text-2xl">Class Dictation</DialogTitle>
                <DialogDescription>
                  Recording notes for <span className="font-medium text-indigo-600">{selectedClass?.title}</span>.
                  Speak naturally about student performance, behavior, or class progress.
                </DialogDescription>
              </DialogHeader>
              
              <VoiceNoteIntake 
                classData={selectedClass} 
                students={students}
                teacherName={currentTeacherName}
                onNotesProcessed={handleNotesProcessed}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}