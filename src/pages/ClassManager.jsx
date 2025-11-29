import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '../utils';
import { ArrowLeft, Plus, Calendar, MoreHorizontal, Search, Clock, MapPin, User, CheckSquare, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ImportScheduleModal from '../components/manager/ImportScheduleModal';
import StudentRecommender from '../components/manager/StudentRecommender';
import AttendanceModal from '../components/manager/AttendanceModal';
import AutoAssignModal from '../components/manager/AutoAssignModal';
import { motion } from 'framer-motion';

const formatTime = (val) => {
  const hours = Math.floor(val);
  const minutes = Math.round((val - hours) * 60);
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes}${period}`;
};

export default function ClassManager() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isRecommenderOpen, setIsRecommenderOpen] = useState(false);
  const [isAutoAssignOpen, setIsAutoAssignOpen] = useState(false);
  const [attendanceClass, setAttendanceClass] = useState(null);
  const [search, setSearch] = useState('');

  // Fetch existing classes
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  // Fetch students for demographics/recommendations
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  const filteredClasses = classes.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by Day for a nicer view
  const days = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];
  const dayNames = { M: 'Monday', T: 'Tuesday', W: 'Wednesday', R: 'Thursday', F: 'Friday', S: 'Saturday', U: 'Sunday' };

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-serif text-[#333333]">Classes</h1>
              <div className="flex gap-4 text-sm mt-1">
                 <span className="font-medium text-gray-900 border-b-2 border-black pb-1">Schedule</span>
                 <Link to={createPageUrl('Teachers')} className="text-gray-500 hover:text-gray-900 transition-colors">Teachers</Link>
              </div>
            </div>
            </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search classes..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white border-gray-200 rounded-full w-full md:w-64"
              />
            </div>
            <Button 
              onClick={() => setIsRecommenderOpen(true)}
              variant="outline"
              className="rounded-full px-4 gap-2 hidden md:flex"
            >
              <User className="w-4 h-4" />
              Student Advisor
            </Button>
             <Button 
              onClick={() => setIsAutoAssignOpen(true)}
              variant="outline"
              className="rounded-full px-4 gap-2 hidden md:flex border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Sparkles className="w-4 h-4" />
              Auto-Assign Staff
            </Button>
            <Button 
              onClick={() => setIsImportOpen(true)}
              className="bg-[#333333] hover:bg-black text-white rounded-full px-6 gap-2"
            >
              <Plus className="w-4 h-4" />
              Import Schedule
            </Button>
          </div>
        </div>

        {/* Active Classes List */}
        <div className="space-y-8">
          {classes.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Calendar className="w-8 h-8 text-gray-300" />
               </div>
               <h3 className="text-lg font-medium text-gray-900">No classes yet</h3>
               <p className="text-gray-500 mb-6">Import your schedule to get started</p>
               <Button onClick={() => setIsImportOpen(true)} variant="outline">Import Now</Button>
             </div>
          ) : (
            days.map(day => {
              const dayClasses = filteredClasses.filter(c => c.day === day).sort((a, b) => a.start_time - b.start_time);
              if (dayClasses.length === 0) return null;

              return (
                <div key={day}>
                  <h3 className="text-lg font-medium text-gray-400 mb-4 ml-2">{dayNames[day]}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dayClasses.map((cls) => (
                      <motion.div 
                        key={cls.id}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium text-lg text-[#333333]">{cls.title}</h4>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-gray-300 hover:text-[#333333] hover:bg-gray-100"
                              onClick={() => setAttendanceClass(cls)}
                              title="Take Attendance"
                            >
                              <CheckSquare className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-gray-300 group-hover:text-gray-500">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-[#F2DCDD]" />
                            <span>{formatTime(cls.start_time)} - {formatTime(cls.start_time + cls.duration)}</span>
                          </div>
                          
                          {cls.teacher && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="w-4 h-4 text-[#F2DCDD]" />
                              <span>{cls.teacher}</span>
                            </div>
                          )}
                          
                          {cls.room && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4 text-[#F2DCDD]" />
                              <span>{cls.room}</span>
                            </div>
                          )}
                          
                          <div className="pt-2 mt-2 border-t border-gray-50 flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                             <span>{cls.student_names?.length || 0} Students Enrolled</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <ImportScheduleModal 
          isOpen={isImportOpen} 
          onOpenChange={setIsImportOpen}
          existingClasses={classes}
          students={students}
        />

        <StudentRecommender 
          isOpen={isRecommenderOpen}
          onOpenChange={setIsRecommenderOpen}
          students={students}
          classes={classes}
        />

        <AttendanceModal 
          isOpen={!!attendanceClass}
          onOpenChange={(open) => !open && setAttendanceClass(null)}
          classData={attendanceClass}
          students={students}
        />

        <AutoAssignModal 
          isOpen={isAutoAssignOpen}
          onOpenChange={setIsAutoAssignOpen}
          classes={classes}
          teachers={teachers}
        />

      </div>
    </div>
  );
}