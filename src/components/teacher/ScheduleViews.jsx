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
  const weekDays = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];
  
  // Configuration for the timeline
  const startHour = 9; // 9am
  const endHour = 21; // 9pm
  const totalHours = endHour - startHour;

  const getPosition = (start, duration) => {
    // Clamp start time
    const effectiveStart = Math.max(start, startHour);
    // Calculate relative start from the beginning of the timeline
    const relativeStart = effectiveStart - startHour;
    
    const left = (relativeStart / totalHours) * 100;
    // Max width should not exceed the timeline
    const width = (duration / totalHours) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <div className="space-y-4 pb-10 w-full max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-2 mb-8">
        <h2 className="text-2xl font-serif text-[#333333]">Weekly Schedule</h2>
      </div>

      {/* Time Scale Header */}
      <div className="flex items-center px-6 mb-2 text-xs text-gray-400 font-serif select-none">
        <div className="w-10 flex-shrink-0" /> {/* Spacer for day letter */}
        <div className="flex-1 flex justify-between relative mx-4">
          {Array.from({ length: totalHours + 1 }, (_, i) => startHour + i).map((h, i) => (
            <div key={h} className="flex items-center justify-center relative" style={{ width: 0 }}>
               {/* Render label mostly for every hour or every 2 hours if cramped */}
               <span className="whitespace-nowrap transform -translate-x-1/2">
                 {h > 12 ? h - 12 : h}{h >= 12 && h < 24 ? 'pm' : 'am'}
               </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {weekDays.map((day, i) => {
          const dayClasses = myClasses.filter(c => c.day === day);
          
          return (
            <motion.div 
              key={day}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-full h-16 flex items-center px-6 shadow-sm border border-gray-100 relative overflow-hidden"
            >
              {/* Day Label */}
              <div className="w-10 flex-shrink-0 font-serif text-xl text-[#333333]">
                {day}
              </div>
              
              {/* Timeline Area */}
              <div className="flex-1 h-full relative mx-4">
                {/* Grid lines (optional, subtle) */}
                <div className="absolute inset-0 flex justify-between opacity-10 pointer-events-none">
                   {Array.from({ length: totalHours + 1 }).map((_, idx) => (
                       <div key={idx} className="h-full w-px bg-gray-400" />
                   ))}
                </div>

                {dayClasses.map(cls => {
                  const { left, width } = getPosition(cls.start_time, cls.duration || 1);
                  return (
                    <div 
                      key={cls.id}
                      className="absolute top-1/2 -translate-y-1/2 h-10 rounded-full bg-[#333333] hover:bg-gray-800 transition-all cursor-pointer group shadow-sm border-2 border-white"
                      style={{ left, width, minWidth: '24px' }}
                      title={`${cls.title} (${format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mm a')})`}
                    >
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 text-white text-xs py-1.5 px-3 rounded-lg whitespace-nowrap pointer-events-none z-10 transition-opacity shadow-xl">
                            <div className="font-medium">{cls.title}</div>
                            <div className="text-gray-300 text-[10px]">
                                {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mm a')}
                            </div>
                            {/* Triangle arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90" />
                        </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
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