import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Phone, AlertCircle, Star, Activity } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import MessageParentModal from './MessageParentModal';
import StudentActivityModal from './StudentActivityModal';

export default function ClassRosterView({ classData, students, onBack, onSelectStudent }) {
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState(null);
  const [selectedStudentForActivity, setSelectedStudentForActivity] = useState(null);

  // Filter students that are in this class
  const classStudents = students.filter(s => classData.student_names?.includes(s.name));

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
            <h2 className="font-serif text-3xl text-[#333333]">Class Roster</h2>
            <p className="text-gray-400 font-serif text-lg">{classData.title} • {classStudents.length} Students</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 pb-8 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto pb-20">
            {classStudents.map((student, i) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all border border-transparent hover:border-[#F2DCDD] group cursor-pointer"
                onClick={() => onSelectStudent && onSelectStudent(student)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 bg-[#F4F4F6] border-2 border-white shadow-sm">
                      <AvatarFallback className="text-xl font-serif text-[#333333]">{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-serif text-xl text-[#333333] group-hover:text-black transition-colors">{student.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary" className="bg-[#F4F4F6] text-gray-500 hover:bg-[#F2DCDD] hover:text-[#333333] transition-colors">
                          {student.age} yrs
                        </Badge>
                        <Badge variant="secondary" className="bg-[#F4F4F6] text-gray-500 hover:bg-[#F2DCDD] hover:text-[#333333] transition-colors capitalize">
                          {student.level}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button 
                        size="icon" 
                        variant="ghost" 
                        className="rounded-full hover:bg-[#F2DCDD] hover:text-[#333333]"
                        onClick={(e) => { e.stopPropagation(); setSelectedStudentForMessage(student); }}
                        title="Message Parent"
                     >
                        <Mail className="w-4 h-4" />
                     </Button>
                     <Button 
                        size="icon" 
                        variant="ghost" 
                        className="rounded-full hover:bg-[#F2DCDD] hover:text-[#333333]"
                        onClick={(e) => { e.stopPropagation(); setSelectedStudentForActivity(student); }}
                        title="View Activity"
                     >
                        <Activity className="w-4 h-4" />
                     </Button>
                  </div>
                </div>

                {/* Alerts / Info */}
                {(student.attendance_alert || student.attendance_summary) && (
                   <div className="mt-5 bg-amber-50 rounded-2xl p-4 flex gap-3 items-start">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-amber-800">Attendance Watch</div>
                        <div className="text-xs text-amber-600 mt-1 leading-relaxed">
                          {student.attendance_summary || "Frequent absences detected recently."}
                        </div>
                      </div>
                   </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-400 font-medium">
                   <span>Parent: {student.parent_email || 'N/A'}</span>
                   <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-gray-300 text-gray-300" /> 
                      Level {student.level === 'beginner' ? 'I' : student.level === 'intermediate' ? 'II' : 'III'}
                   </span>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <MessageParentModal 
        isOpen={!!selectedStudentForMessage}
        onOpenChange={(open) => !open && setSelectedStudentForMessage(null)}
        student={selectedStudentForMessage}
      />

      <StudentActivityModal
        isOpen={!!selectedStudentForActivity}
        onOpenChange={(open) => !open && setSelectedStudentForActivity(null)}
        student={selectedStudentForActivity}
      />
    </div>
  );
}