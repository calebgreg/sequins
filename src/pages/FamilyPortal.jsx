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
        
        {/* Left Column: Schedule */}
        <div className="flex-1">
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