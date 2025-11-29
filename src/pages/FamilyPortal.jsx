import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import StudentSelector from '../components/portal/StudentSelector';
import BillingWidget from '../components/portal/BillingWidget';
import ScheduleTimeline from '../components/portal/ScheduleTimeline';
import AIChatWidget from '../components/portal/AIChatWidget';

export default function FamilyPortal() {
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Fetch Students
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  // Fetch Classes
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  // Fetch Messages
  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list(),
  });

  // Filter Logic
  const filteredClasses = selectedStudent
    ? classes.filter(c => c.student_names?.includes(selectedStudent))
    : classes;

  const activeStudentData = students.find(s => s.name === selectedStudent);

  return (
    <div className="bg-[#FAFAFA] rounded-[40px] p-8 md:p-12 shadow-xl min-h-[800px] flex flex-col relative overflow-hidden">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
        <StudentSelector 
          students={students} 
          selectedStudent={selectedStudent} 
          onSelect={setSelectedStudent} 
        />
        
        <BillingWidget balance={243.79} />
      </div>

      {/* Main Content Grid */}
      <div className="flex flex-col lg:flex-row gap-12 flex-1">

        {/* Left Column: Schedule & Alerts */}
        <div className="flex-1 space-y-6">
          <AnimatePresence>
            {activeStudentData?.attendance_alert && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-900">Attendance Alert</h4>
                  <p className="text-sm text-red-700 mt-1">{activeStudentData.attendance_summary || "Please review recent attendance."}</p>
                </div>
              </motion.div>
            )}
            {activeStudentData && !activeStudentData.attendance_alert && activeStudentData.attendance_summary && (
               <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               exit={{ opacity: 0, height: 0 }}
               className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3"
             >
               <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
               <div>
                 <h4 className="font-medium text-green-900">Attendance On Track</h4>
                 <p className="text-sm text-green-700 mt-1">{activeStudentData.attendance_summary}</p>
               </div>
             </motion.div>
            )}
          </AnimatePresence>

          <ScheduleTimeline classes={filteredClasses} />
        </div>

        {/* Right Column: AI Chat */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col justify-end pb-4">
          <div className="h-[600px]">
             <AIChatWidget messages={messages} />
          </div>
        </div>

      </div>
    </div>
  );
}