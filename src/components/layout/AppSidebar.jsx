import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  GraduationCap, 
  CreditCard, 
  Settings, 
  Sparkles,
  LogOut,
  Briefcase,
  Search,
  CheckSquare
} from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Notifications from './Notifications';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";

export default function AppSidebar({ className = "", onSearchClick }) {
  const { data: currentUser } = useQuery({
      queryKey: ['me'],
      queryFn: () => base44.auth.me().catch(() => null),
      retry: false
  });
  const location = useLocation();
  
  // Helper to check active state
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { path: '/Home', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/Tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/ClassManager', icon: Calendar, label: 'Schedule' },
    { path: '/Students', icon: GraduationCap, label: 'Students' },
    { path: '/Teachers', icon: Users, label: 'Staff' },
    { path: '/Billing', icon: CreditCard, label: 'Billing' },
    { path: '/Features', icon: Sparkles, label: 'Features' },
    { path: '/Settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className={`bg-[#333333] text-white flex flex-col items-center py-8 rounded-[20px] m-4 h-[calc(100dvh-32px)] sticky top-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] ${className}`}>
      {/* Logo */}
      <div className="mb-12 flex-shrink-0">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          <span className="font-serif text-[#333333] text-xl font-bold">S</span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-6 w-full px-4 items-center">
        <TooltipProvider delayDuration={0}>
          
          {/* Global Search Trigger */}
          <Tooltip>
             <TooltipTrigger asChild>
                <button
                   onClick={onSearchClick}
                   className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group relative text-gray-400 hover:bg-white/10 hover:text-white"
                >
                   <div className="flex flex-col items-center">
                      <Search className="w-5 h-5" />
                      <span className="text-[9px] mt-0.5 font-mono opacity-50">⌘K</span>
                   </div>
                </button>
             </TooltipTrigger>
             <TooltipContent side="right" className="bg-[#333333] text-white border-gray-700 ml-2 font-sans">
                <p>Search & Commands</p>
             </TooltipContent>
          </Tooltip>

          <div className="w-8 h-px bg-white/10" />

          <div className="mb-2">
             <Notifications currentUser={currentUser} />
          </div>

          <div className="w-8 h-px bg-white/10" />

          {navItems.map((item) => (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <Link to={item.path}>
                  <button
                    className={`
                      w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group relative
                      ${isActive(item.path)
                        ? 'bg-white text-[#333333] shadow-lg scale-105' 
                        : 'text-gray-400 hover:bg-white/10 hover:text-white'}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {isActive(item.path) && (
                      <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/50 rounded-l-full blur-[2px]" />
                    )}
                  </button>
                </Link>
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
        
        {/* Quick Link to Teacher Studio (for demo/convenience) */}
        <TooltipProvider>
           <Tooltip>
             <TooltipTrigger asChild>
                <Link to="/TeacherStudio">
                   <button className="w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200 transition-all">
                      <Briefcase className="w-5 h-5" />
                   </button>
                </Link>
             </TooltipTrigger>
             <TooltipContent side="right" className="bg-indigo-900 text-indigo-100 border-indigo-800 ml-2">
                Teacher View
             </TooltipContent>
           </Tooltip>
        </TooltipProvider>

        <div className="w-full h-px bg-white/10 w-8" />

        <Avatar className="w-10 h-10 border-2 border-white/10 cursor-pointer hover:border-white hover:scale-105 transition-all">
          <AvatarFallback className="bg-[#F2DCDD] text-[#333333] font-serif font-medium">
            S
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}