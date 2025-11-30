import React from 'react';
import { motion } from "framer-motion";

const DAYS = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

const formatTime = (val) => {
  const hours = Math.floor(val);
  const minutes = Math.round((val - hours) * 60);
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes}${period}`;
};

export default function ScheduleTimeline({ classes }) {
  
  const getPosition = (start, duration) => {
    // 9am is start (0%)
    // 9pm (21) is end (100%)
    // Total 12 hours
    const startOffset = start - 9;
    const left = (startOffset / 12) * 100;
    const width = (duration / 12) * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <div className="w-full">
      {/* Time Header */}
      <div className="flex items-center w-full mb-4">
        <div className="w-12 flex-shrink-0" /> {/* Spacer to match day label width */}
        <div className="flex-1 relative h-6 text-[10px] text-gray-400 uppercase tracking-widest font-medium">
          {HOURS.map((h, i) => {
            const left = (i / 12) * 100;
            // Don't render past 100% if 9pm is the end line
            if (left > 100) return null; 
            
            return (
              <React.Fragment key={h}>
                 <div 
                  className="absolute top-0 -translate-x-1/2 text-center w-8 font-serif"
                  style={{ left: `${left}%` }}
                >
                  {h > 12 ? h - 12 : h}{h >= 12 && h < 24 ? 'pm' : 'am'}
                </div>
                {i < HOURS.length - 1 && (
                  <div 
                     className="absolute top-1.5 -translate-x-1/2 text-center text-gray-300 text-[8px]"
                     style={{ left: `${left + (100/12/2)}%` }}
                  >
                    •
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {DAYS.map(day => {
          const dayClasses = classes.filter(c => c.day === day);
          
          return (
            <div key={day} className="flex items-center group">
              <div className="w-12 text-xl font-serif text-[#555555] opacity-80">{day}</div>
              <div className="flex-1 h-14 bg-white rounded-full shadow-sm border border-gray-50 relative overflow-hidden transition-all hover:shadow-md">
                {dayClasses.map((cls, i) => {
                  const { left, width } = getPosition(cls.start_time, cls.duration);
                  const isPink = cls.color === 'pink';
                  
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      className={`absolute top-3 h-8 rounded-full cursor-pointer flex items-center justify-center
                        ${isPink ? 'bg-[#F2DCDD]' : 'bg-[#555555]'}
                      `}
                      style={{ left, width }}
                      title={`${cls.title} (${formatTime(cls.start_time)} - ${formatTime(cls.start_time + cls.duration)})`}
                    >
                      {/* Tooltip or Label could go here, but mockup shows clean pills */}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}