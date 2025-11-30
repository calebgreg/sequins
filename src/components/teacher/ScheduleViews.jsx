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
          const hasClasses = dayClasses.length > 0;

          return (
            <motion.div 
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 ${!hasClasses ? 'bg-gray-50/50' : ''}`}
            >
              <h3 className={`font-serif text-lg mb-4 flex items-center gap-2 ${!hasClasses ? 'text-gray-400' : 'text-[#333333]'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-sans font-medium ${!hasClasses ? 'bg-gray-100 text-gray-400' : 'bg-[#F4F4F6] text-[#333333]'}`}>
                  {day}
                </span>
                {dayNames[dayMap[day]]}
              </h3>
              
              <div className="space-y-3">
                {hasClasses ? (
                  dayClasses.map(cls => (
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
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-sm text-gray-300 italic">No classes</p>
                  </div>
                )}
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

export const MonthView = ({ classes, currentTeacherName, onDateSelect }) => {
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
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-xs font-bold text-gray-300 uppercase tracking-wider py-2">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 border-t border-l border-gray-100">
          {days.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const dayClasses = getClassesForDate(day);
            
            return (
              <div 
                key={i} 
                onClick={() => onDateSelect && onDateSelect(day)}
                className={`
                  min-h-[100px] border-b border-r border-gray-100 p-2 cursor-pointer transition-colors hover:bg-gray-50
                  ${!isCurrentMonth ? 'bg-gray-50/30' : ''}
                `}
              >
                <div className={`
                  w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-2
                  ${isToday ? 'bg-[#333333] text-white' : 'text-gray-500'}
                  ${!isCurrentMonth ? 'text-gray-300' : ''}
                `}>
                  {format(day, 'd')}
                </div>
                
                <div className="flex flex-col gap-1">
                  {dayClasses.slice(0, 3).map((cls, idx) => (
                    <div 
                      key={idx} 
                      className="text-[10px] font-medium truncate bg-[#F2DCDD]/30 text-[#333333] px-1.5 py-0.5 rounded-sm border border-[#F2DCDD]" 
                      title={cls.title}
                    >
                      {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mma')} {cls.title}
                    </div>
                  ))}
                  {dayClasses.length > 3 && (
                    <div className="text-[9px] text-gray-400 pl-1">
                      +{dayClasses.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};