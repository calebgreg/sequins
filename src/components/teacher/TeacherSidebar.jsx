import React from 'react';
import { Calendar, Clock, CalendarX, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function TeacherSidebar({ 
  activeView, 
  onNavigate, 
  teacherName, 
  className = "" 
}) {
  const navItems = [
    { id: 'schedule', icon: Calendar, label: 'Schedule' },
    { id: 'timecard', icon: Clock, label: 'Time Card' },
    { id: 'subs', icon: CalendarX, label: 'Sub Requests' },
  ];

  return (
    <div className={`bg-[#333333] text-white flex flex-col items-center py-8 rounded-[20px] ${className}`}>
      {/* Logo */}
      <div className="mb-12 flex-shrink-0">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          <span className="font-serif text-[#333333] text-xl font-bold">S</span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-6 w-full px-4 items-center">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group relative
                    ${activeView === item.id 
                      ? 'bg-white text-[#333333] shadow-lg scale-105' 
                      : 'text-gray-400 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {activeView === item.id && (
                    <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/50 rounded-l-full blur-[2px]" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#333333] text-white border-gray-700 ml-2 font-sans">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-6 items-center w-full px-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to={createPageUrl('Home')}>
                <button className="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all">
                  <LogOut className="w-5 h-5" />
                </button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-red-50 text-red-600 border-red-100 ml-2">
              Exit Studio
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-full h-px bg-white/10 w-8" />

        <Avatar className="w-10 h-10 border-2 border-white/10 cursor-pointer hover:border-white hover:scale-105 transition-all">
          <AvatarFallback className="bg-[#F2DCDD] text-[#333333] font-serif font-medium">
            {teacherName.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}