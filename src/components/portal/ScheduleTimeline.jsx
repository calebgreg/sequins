import React from 'react';
import { motion } from "framer-motion";

const DAYS = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

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
      <div className="relative h-6 mb-4 text-[10px] text-gray-400 uppercase tracking-widest font-medium w-full">
        {HOURS.map((h, i) => {
          const left = (i / 12) * 100;
          // Don't render past 100% if 9pm is the end line
          if (left > 100) return null; 
          
          return (
            <div 
              key={h} 
              className="absolute top-0 -translate-x-1/2 text-center w-8"
              style={{ left: `${left}%` }}
            >
              {h > 12 ? h - 12 : h}{h >= 12 && h < 24 ? 'pm' : 'am'}
            </div>
          );
        })}
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
                      className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-full cursor-pointer flex items-center justify-center
                        ${isPink ? 'bg-[#F2DCDD]' : 'bg-[#555555]'}
                      `}
                      style={{ left, width }}
                      title={`${cls.title} (${cls.start_time}:00 - ${cls.start_time + cls.duration}:00)`}
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