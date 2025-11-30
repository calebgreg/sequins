import React, { useState } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay } from 'date-fns';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Helper to map API day format to date-fns day index (0=Sunday, 1=Monday...)
const dayMap = { 'U': 0, 'M': 1, 'T': 2, 'W': 3, 'R': 4, 'F': 5, 'S': 6 };
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const WeekView = ({ classes, currentTeacherName }) => {
  const myClasses = classes.filter(c => c.teacher === currentTeacherName || !c.teacher);
  
  // Group classes by day
  const classesByDay = { 'M': [], 'T': [], 'W': [], 'R': [], 'F': [], 'S': [], 'U': [] };
  myClasses.forEach(cls => {
    if (classesByDay[cls.day]) {
      classesByDay[cls.day].push(cls);
    }
  });

  // Sort classes by time
  Object.keys(classesByDay).forEach(day => {
    classesByDay[day].sort((a, b) => a.start_time - b.start_time);
  });

  const weekDays = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2 mb-6">
        <h2 className="text-2xl font-serif text-[#333333]">Weekly Schedule</h2>
        <p className="text-gray-400">Your recurring weekly classes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {weekDays.map((day, i) => {
          const dayClasses = classesByDay[day];
          if (dayClasses.length === 0) return null;

          return (
            <motion.div 
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100"
            >
              <h3 className="font-serif text-lg text-[#333333] mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#F4F4F6] flex items-center justify-center text-sm font-sans font-medium">
                  {day}
                </span>
                {dayNames[dayMap[day]]}
              </h3>
              
              <div className="space-y-3">
                {dayClasses.map(cls => (
                  <div key={cls.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#F4F4F6] transition-colors">
                    <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-[#333333]" />
                    </div>
                    <div>
                      <div className="font-medium text-[#333333] leading-tight">{cls.title}</div>
                      <div className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
        
        {myClasses.length === 0 && (
           <div className="col-span-full text-center py-12 text-gray-400">
             No classes scheduled for this week.
           </div>
        )}
      </div>
    </div>
  );
};

export const MonthView = ({ classes, currentTeacherName }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const myClasses = classes.filter(c => c.teacher === currentTeacherName || !c.teacher);

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: startOfWeek(start), end: addDays(end, 6 - getDay(end)) }); // Full weeks

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const getClassesForDate = (date) => {
    // Map date day (0-6) to our day enum (U, M, T...)
    const dayIndex = getDay(date);
    const dayEnum = Object.keys(dayMap).find(key => dayMap[key] === dayIndex);
    
    return myClasses.filter(c => c.day === dayEnum).sort((a, b) => a.start_time - b.start_time);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif text-[#333333]">{format(currentDate, 'MMMM yyyy')}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="rounded-full h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="rounded-full h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-7 mb-4 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} className="text-xs font-medium text-gray-400 py-2">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-y-4">
          {days.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const dayClasses = getClassesForDate(day);
            
            return (
              <div key={i} className={`min-h-[80px] flex flex-col items-center gap-1 ${!isCurrentMonth ? 'opacity-30' : ''}`}>
                <div className={`
                  w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium mb-1
                  ${isToday ? 'bg-[#333333] text-white' : 'text-gray-700'}
                `}>
                  {format(day, 'd')}
                </div>
                
                <div className="flex flex-col gap-1 w-full px-1">
                  {dayClasses.slice(0, 2).map((cls, idx) => (
                    <div key={idx} className="h-1.5 rounded-full w-full bg-[#F2DCDD]" title={cls.title} />
                  ))}
                  {dayClasses.length > 2 && (
                    <div className="h-1.5 rounded-full w-1.5 bg-gray-300 self-center" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex items-center gap-4 justify-center text-xs text-gray-400">
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-[#F2DCDD]" /> Class
        </div>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-[#333333]" /> Today
        </div>
      </div>
    </div>
  );
};