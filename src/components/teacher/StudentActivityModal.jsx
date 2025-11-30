import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { format } from 'date-fns';
import { Activity, Calendar, FileText, AlertCircle } from 'lucide-react';

export default function StudentActivityModal({ isOpen, onOpenChange, student }) {
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

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-[32px] max-w-2xl p-0 overflow-hidden border-none shadow-2xl h-[600px] flex flex-col">
        <div className="bg-[#F4F4F6] p-8 flex items-center gap-6 border-b border-gray-100">
          <Avatar className="w-16 h-16 bg-white border-2 border-white shadow-sm">
            <AvatarFallback className="text-xl font-serif text-[#333333]">{student.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-serif text-2xl text-[#333333]">{student.name}</h2>
            <div className="flex items-center gap-2 mt-1">
               <Badge variant="outline" className="bg-white/50 border-transparent text-gray-500">
                 {student.age} years old
               </Badge>
               <Badge variant="outline" className="bg-white/50 border-transparent text-gray-500 capitalize">
                 {student.level} Level
               </Badge>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white p-6 overflow-hidden flex flex-col">
          <Tabs defaultValue="attendance" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-50 p-1 rounded-full">
              <TabsTrigger value="attendance" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Attendance</TabsTrigger>
              <TabsTrigger value="notes" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Notes & Feedback</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-3">
                  {attendance.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No attendance records found.</div>
                  ) : (
                    attendance.map((record, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#F4F4F6] flex items-center justify-center text-[#333333]">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-[#333333]">{record.class_name || 'Class'}</div>
                            <div className="text-xs text-gray-400">{format(new Date(record.date), 'MMM do, yyyy')}</div>
                          </div>
                        </div>
                        <Badge 
                          className={`
                            ${record.status === 'present' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                            ${record.status === 'absent' ? 'bg-red-100 text-red-700 hover:bg-red-100' : ''}
                            ${record.status === 'late' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : ''}
                            ${record.status === 'excused' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : ''}
                            capitalize shadow-none border-transparent
                          `}
                        >
                          {record.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="notes" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                   {notes.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No notes recorded yet.</div>
                  ) : (
                    notes.map((note, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2">
                             <Badge variant="outline" className="bg-white text-gray-500 border-gray-200 text-[10px] uppercase tracking-wider">
                               {note.category || 'General'}
                             </Badge>
                             <span className="text-xs text-gray-400">{format(new Date(note.date), 'MMM do')}</span>
                           </div>
                           {note.sentiment === 'positive' && <span className="text-lg">🌟</span>}
                           {note.sentiment === 'constructive' && <span className="text-lg">🔧</span>}
                        </div>
                        <p className="text-[#333333] text-sm leading-relaxed">{note.content}</p>
                        <div className="mt-3 pt-3 border-t border-gray-200/50 text-xs text-gray-400 font-medium">
                          By {note.teacher_name}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}