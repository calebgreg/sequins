import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Calendar, Star, TrendingUp, Clock, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { format } from 'date-fns';

export default function StudentProfileView({ student, onBack }) {
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

  const studentClasses = classes.filter(c => c.student_names?.includes(student.name));

  // Stats
  const totalClasses = attendance.length;
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 100;

  return (
    <div className="flex flex-col h-full bg-[#F4F4F6]">
      {/* Header */}
      <div className="px-8 py-8 flex items-center justify-between sticky top-0 z-10 bg-[#F4F4F6]">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className="bg-white rounded-full w-12 h-12 shadow-sm text-[#333333] hover:bg-white/80 transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-serif text-3xl text-[#333333]">Student Profile</h2>
          </div>
        </div>
        <Button variant="outline" className="rounded-full border-gray-200 bg-white text-[#333333] gap-2">
          <Mail className="w-4 h-4" /> Message Parent
        </Button>
      </div>

      <ScrollArea className="flex-1 px-8 pb-8">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0">
              <Avatar className="w-32 h-32 bg-[#F4F4F6] border-4 border-white shadow-lg">
                <AvatarFallback className="text-4xl font-serif text-[#333333]">{student.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-serif text-4xl text-[#333333]">{student.name}</h1>
                  <Badge variant="secondary" className="bg-[#F2DCDD] text-[#333333] hover:bg-[#F2DCDD] px-3 py-1 text-sm">
                    {student.level}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-6 text-gray-400 font-serif text-lg">
                  <span className="flex items-center gap-2"><Star className="w-4 h-4" /> {student.age} Years Old</span>
                  <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> {student.parent_email || 'No email'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="bg-[#F4F4F6] rounded-2xl p-4">
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Attendance</div>
                  <div className="text-2xl font-serif text-[#333333]">{attendanceRate}%</div>
                </div>
                <div className="bg-[#F4F4F6] rounded-2xl p-4">
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Classes</div>
                  <div className="text-2xl font-serif text-[#333333]">{studentClasses.length}</div>
                </div>
                <div className="bg-[#F4F4F6] rounded-2xl p-4">
                  <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Notes</div>
                  <div className="text-2xl font-serif text-[#333333]">{notes.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="bg-transparent p-0 gap-6 mb-6 h-auto justify-start">
               {['activity', 'classes', 'notes'].map(tab => (
                 <TabsTrigger 
                   key={tab} 
                   value={tab}
                   className="rounded-full bg-white px-6 py-3 text-base data-[state=active]:bg-[#333333] data-[state=active]:text-white shadow-sm border border-transparent hover:border-gray-200 transition-all capitalize font-serif"
                 >
                   {tab}
                 </TabsTrigger>
               ))}
            </TabsList>

            <TabsContent value="activity" className="space-y-4">
              <h3 className="font-serif text-xl text-[#333333] mb-4">Recent Attendance</h3>
              {attendance.length === 0 ? (
                <div className="bg-white p-10 rounded-[32px] text-center text-gray-400">No attendance history.</div>
              ) : (
                attendance.map((record, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white p-5 rounded-[24px] flex items-center justify-between shadow-sm border border-transparent hover:border-gray-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        record.status === 'present' ? 'bg-green-100 text-green-600' :
                        record.status === 'absent' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {record.status === 'present' ? <CheckCircle2 className="w-6 h-6" /> :
                         record.status === 'absent' ? <AlertCircle className="w-6 h-6" /> :
                         <Clock className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="font-medium text-[#333333] text-lg">{record.class_name}</div>
                        <div className="text-gray-400 text-sm">{format(new Date(record.date), 'EEEE, MMMM do')}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize bg-[#F4F4F6] text-gray-600 px-3 py-1">
                      {record.status}
                    </Badge>
                  </motion.div>
                ))
              )}
            </TabsContent>

            <TabsContent value="classes" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentClasses.map(cls => (
                <div key={cls.id} className="bg-white p-6 rounded-[32px] shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-serif text-xl text-[#333333]">{cls.title}</h3>
                      <div className="flex items-center gap-2 text-gray-400 mt-2 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{cls.day} • {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mma')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 mt-1 text-sm">
                         <MapPin className="w-4 h-4" />
                         <span>Studio {cls.room || 'A'}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-[#F4F4F6] rounded-full flex items-center justify-center text-[#333333] font-serif">
                      {cls.title.charAt(0)}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              {notes.length === 0 ? (
                <div className="bg-white p-10 rounded-[32px] text-center text-gray-400">No notes recorded.</div>
              ) : (
                notes.map((note, i) => (
                  <div key={i} className="bg-white p-6 rounded-[32px] shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                        {note.category}
                      </Badge>
                      <span className="text-gray-300 text-xs">•</span>
                      <span className="text-gray-400 text-xs">{format(new Date(note.date), 'MMM do, yyyy')}</span>
                    </div>
                    <p className="text-[#333333] leading-relaxed">{note.content}</p>
                    <div className="mt-4 text-xs text-gray-400 font-medium">
                      Recorded by {note.teacher_name}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>

        </div>
      </ScrollArea>
    </div>
  );
}