import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { motion } from 'framer-motion';
import { ChevronLeft, Mail, AlertCircle } from 'lucide-react';

import MessageParentModal from './MessageParentModal';
import StudentActivityModal from './StudentActivityModal';

export default function ClassRosterView({ classData, students, onBack, onSelectStudent }) {
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState(null);
  const [selectedStudentForActivity, setSelectedStudentForActivity] = useState(null);

  // Fetch attendance records for this class
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['classAttendance', classData.id],
    queryFn: async () => {
      const records = await base44.entities.Attendance.filter({ class_id: classData.id }, '-date', 500);
      return records;
    },
  });

  // Filter students that ACTUALLY EXIST in the database AND are in this class's student_names
  const classStudents = students.filter(s => classData.student_names?.includes(s.name));
  const actualStudentCount = classStudents.length;

  const textGradient = {
    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.5)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 16px -8px rgba(180,150,140,0.15)',
  };

  return (
    <div 
      className="flex flex-col h-screen relative"
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
      <div className="relative px-4 md:px-8 py-6 md:py-8 flex items-center gap-3 md:gap-4">
        <button 
          onClick={onBack} 
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.6)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
            color: '#b5a599',
          }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h2 
            className="text-xl md:text-2xl font-bold tracking-tight"
            style={textGradient}
          >
            Class Roster
          </h2>
          <p className="text-xs md:text-sm truncate" style={{ color: '#b5a599' }}>
            {classData.title} · {actualStudentCount} Students
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 px-4 md:px-8 overflow-y-auto">
        <div className="space-y-3 pb-8 max-w-2xl mx-auto">
          {classStudents.map((student, i) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl md:rounded-2xl p-4 md:p-5 cursor-pointer transition-all active:scale-[0.98] md:hover:scale-[1.01]"
              style={cardStyle}
              onClick={() => onSelectStudent && onSelectStudent(student)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                  <div 
                    className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
                      boxShadow: '0 4px 12px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                    }}
                  >
                    <span className="text-base md:text-lg font-medium" style={{ color: '#c9a99c' }}>
                      {student.name.charAt(0)}
                    </span>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate" style={{ color: '#8b7d72' }}>{student.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span 
                        className="px-2.5 py-0.5 rounded-full text-xs"
                        style={{
                          background: 'rgba(255,255,255,0.5)',
                          color: '#9a8b80',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                        }}
                      >
                        {student.age} yrs
                      </span>
                      <span 
                        className="px-2.5 py-0.5 rounded-full text-xs capitalize"
                        style={{
                          background: 'rgba(255,255,255,0.5)',
                          color: '#9a8b80',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                        }}
                      >
                        {student.level}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Attendance Percentage & Message */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(() => {
                    const studentAttendance = attendanceRecords.filter(r => r.student_name === student.name);
                    const total = studentAttendance.length;
                    const present = studentAttendance.filter(r => ['present', 'late', 'made_up'].includes(r.status)).length;
                    const pct = total > 0 ? Math.round((present / total) * 100) : 100;
                    
                    const color = pct >= 90 ? '#22c55e' : pct >= 75 ? '#f59e0b' : '#ef4444';
                    return (
                      <span className="text-sm font-semibold" style={{ color }}>{pct}%</span>
                    );
                  })()}
                  
                  <button 
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-95"
                    style={{
                      background: 'rgba(255,255,255,0.5)',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                      color: '#c9a99c',
                    }}
                    onClick={(e) => { e.stopPropagation(); setSelectedStudentForMessage(student); }}
                    title="Message Parent"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Attendance Alert */}
              {(student.attendance_alert || student.attendance_summary) && (
                <div 
                  className="mt-4 rounded-xl p-3 flex gap-3 items-start"
                  style={{
                    background: 'linear-gradient(145deg, rgba(212,165,116,0.15) 0%, rgba(212,165,116,0.08) 100%)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)',
                  }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#d4a574' }} />
                  <div>
                    <div className="text-xs font-medium" style={{ color: '#c9956a' }}>Attendance Watch</div>
                    <div className="text-xs mt-0.5 leading-relaxed" style={{ color: '#b5956a' }}>
                      {student.attendance_summary || "Frequent absences detected recently."}
                    </div>
                  </div>
                </div>
              )}

              {/* Parent Info */}
              <div 
                className="mt-4 pt-3 flex items-center justify-between text-xs"
                style={{ 
                  borderTop: '1px solid rgba(180,150,140,0.1)',
                  color: '#b5a599',
                }}
              >
                <span className="truncate">Parent: {student.parent_email || 'N/A'}</span>
              </div>
            </motion.div>
          ))}

          {classStudents.length === 0 && (
            <div className="text-center py-12" style={{ color: '#b5a599' }}>
              No students enrolled in this class
            </div>
          )}
        </div>
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