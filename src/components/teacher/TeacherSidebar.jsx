import React from 'react';
import { Calendar, Clock, CalendarX, Settings, LogOut, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

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
    <div className={`bg-[#333333] text-white flex flex-col justify-between py-8 px-4 ${className}`}>
      <div className="space-y-8">
        {/* Logo / Brand */}
        <div className="px-2 mb-12">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="font-serif text-[#333333] text-xl font-bold">S</span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group
                ${activeView === item.id 
                  ? 'bg-white/10 text-white font-medium' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'}
              `}
            >
              <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-[#F2DCDD]' : 'group-hover:text-[#F2DCDD]'}`} />
              <span className="hidden md:block">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="space-y-4">
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-2">
            <Avatar className="w-8 h-8 border border-white/20">
              <AvatarFallback className="bg-[#F2DCDD] text-[#333333] text-xs">
                {teacherName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block overflow-hidden">
              <p className="text-sm font-medium truncate">{teacherName}</p>
              <p className="text-xs text-gray-400 truncate">Instructor</p>
            </div>
          </div>
        </div>
        
        <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="w-full justify-start gap-4 text-gray-400 hover:text-white hover:bg-white/5 p-3">
                <LogOut className="w-5 h-5" />
                <span className="hidden md:block">Exit Studio</span>
            </Button>
        </Link>
      </div>
    </div>
  );
}