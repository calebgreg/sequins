import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '../utils';
import { ArrowLeft, Plus, Calendar, User, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import ImportScheduleModal from '../components/manager/ImportScheduleModal';
import StudentRecommender from '../components/manager/StudentRecommender';
import AttendanceModal from '../components/manager/AttendanceModal';
import AutoAssignModal from '../components/manager/AutoAssignModal';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm
const DAYS = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];
const DAY_NAMES = { M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri', S: 'Sat', U: 'Sun' };

const formatTime = (hour) => {
  const period = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}${period}`;
};

export default function ClassManager() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isRecommenderOpen, setIsRecommenderOpen] = useState(false);
  const [isAutoAssignOpen, setIsAutoAssignOpen] = useState(false);
  const [attendanceClass, setAttendanceClass] = useState(null);
  const [selectedDay, setSelectedDay] = useState('M');
  const scrollContainerRef = useRef(null);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  // Auto-scroll to current time
  useEffect(() => {
    if (scrollContainerRef.current && classes.length > 0) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      
      // Calculate scroll position: each hour is 80px tall
      const scrollPosition = ((currentHour - 6) * 80) + ((currentMinutes / 60) * 80);
      
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, [selectedDay, classes.length]);

  const dayClasses = classes.filter(c => c.day === selectedDay);

  const getClassStyle = (cls) => {
    const startHour = cls.start_time;
    const duration = cls.duration;
    const top = ((startHour - 6) * 80) + 'px';
    const height = (duration * 80) + 'px';
    return { top, height };
  };

  return (
    <div className="fixed inset-0 bg-[#F4F4F6] flex flex-col">
      {/* Compact Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-3 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('Home')} className="p-1.5 hover:bg-gray-50 rounded-full transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div className="flex gap-2">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedDay === day
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {DAY_NAMES[day]}
              </button>
            ))}
          </div>
        </div>

        <Button 
          onClick={() => setIsImportOpen(true)}
          size="sm"
          className="bg-[#333333] hover:bg-black text-white rounded-full px-4 gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Import
        </Button>
      </div>

      {/* Schedule Grid */}
      {classes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center bg-white rounded-[32px] border border-dashed border-gray-200 py-16 px-12 max-w-md">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No classes yet</h3>
            <p className="text-gray-500 mb-6">Import your schedule to get started</p>
            <Button onClick={() => setIsImportOpen(true)} variant="outline">Import Now</Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Sticky Header Row - Rooms */}
            <div className="flex-shrink-0 bg-[#F4F4F6] px-6 py-3 border-b border-gray-200">
              <div className="flex">
                <div className="w-20 flex-shrink-0" />
                {rooms.length === 0 ? (
                  <div className="flex-1 text-center py-6 bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500 text-sm">No rooms configured. Set up rooms in Settings.</p>
                  </div>
                ) : (
                  rooms.map(room => (
                    <div key={room.id} className="flex-1 px-2">
                      <div className="bg-white rounded-xl px-4 py-2.5 text-center shadow-sm border border-gray-100">
                        <div className="font-medium text-sm text-[#333333]">{room.name}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Scrollable Time Grid */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6">
              <div className="relative">
                {HOURS.map((hour) => (
                  <div key={hour} className="flex border-t border-gray-200" style={{ height: '80px' }}>
                    {/* Time Label */}
                    <div className="w-20 flex-shrink-0 pr-4 pt-1 text-right">
                      <span className="text-sm text-gray-500 font-medium">{formatTime(hour)}</span>
                    </div>

                    {/* Room Columns */}
                    {rooms.map(room => (
                      <div key={room.id} className="flex-1 px-2 relative border-l border-gray-100">
                        {/* Empty cell for grid structure */}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Classes Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="flex h-full">
                    <div className="w-20 flex-shrink-0" />
                    {rooms.map((room, roomIndex) => (
                      <div key={room.id} className="flex-1 px-2 relative pointer-events-auto">
                        {dayClasses
                          .filter(cls => cls.room === room.name)
                          .map(cls => {
                            const style = getClassStyle(cls);
                            return (
                              <button
                                key={cls.id}
                                onClick={() => setAttendanceClass(cls)}
                                className="absolute left-2 right-2 bg-white rounded-xl shadow-md border-l-4 border-black p-3 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                                style={style}
                              >
                                <div className="font-medium text-sm text-[#333333] mb-1 truncate">{cls.title}</div>
                                <div className="text-xs text-gray-500 truncate">{cls.teacher}</div>
                                <div className="text-xs text-gray-400 mt-1">{cls.student_names?.length || 0} students</div>
                              </button>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
  );
}