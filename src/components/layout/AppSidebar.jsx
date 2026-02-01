import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  GraduationCap, 
  CreditCard, 
  Settings, 
  Sparkles,
  Briefcase,
  Search,
  CheckSquare,
  Mic2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Notifications from './Notifications';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from 'framer-motion';

// Design tokens matching our aesthetic
const colors = {
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
  muted: '#b5a599',
};

export default function AppSidebar({ className = "", onSearchClick }) {
  const [collapsed, setCollapsed] = useState(false);
  
  const { data: currentUser } = useQuery({
      queryKey: ['me'],
      queryFn: () => base44.auth.me().catch(() => null),
      retry: false
  });
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { path: '/Home', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/TeacherStudio', icon: Briefcase, label: 'Studio' },
    { path: '/Tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/ClassManager', icon: Calendar, label: 'Schedule' },
    { path: '/Students', icon: GraduationCap, label: 'Students' },
    { path: '/Teachers', icon: Users, label: 'Staff' },
    { path: '/Performances', icon: Mic2, label: 'Shows' },
    { path: '/Billing', icon: CreditCard, label: 'Billing' },
    { path: '/Features', icon: Sparkles, label: 'Features' },
    { path: '/Settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <motion.div 
      initial={false}
      animate={{ width: collapsed ? 80 : 200 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`relative flex flex-col py-6 m-4 h-[calc(100dvh-32px)] sticky top-4 overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(253,238,236,0.95) 0%, rgba(250,232,228,0.9) 50%, rgba(252,243,240,0.95) 100%)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(200,180,170,0.1), 0 20px 60px -20px rgba(180,150,140,0.25)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255,220,210,0.3)',
      }}
    >
      {/* Inner glow */}
      <div 
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 10%, rgba(255,255,255,0.4) 0%, transparent 50%)',
        }}
      />

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
          boxShadow: '0 4px 12px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
          border: '1px solid rgba(200,180,170,0.2)',
        }}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" style={{ color: colors.etchDark }} />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" style={{ color: colors.etchDark }} />
        )}
      </button>

      {/* Logo */}
      <div className={`mb-8 flex-shrink-0 flex items-center ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
        <div 
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
            boxShadow: '0 8px 24px -8px rgba(180,150,140,0.25), inset 0 1px 1px rgba(255,255,255,1)',
          }}
        >
          <span 
            className="text-xl font-bold"
            style={{ 
              color: 'transparent',
              backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
            }}
          >
            S
          </span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="ml-3 text-lg font-semibold tracking-tight"
              style={{ 
                color: 'transparent',
                backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
              }}
            >
              Studio
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1.5 w-full px-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <TooltipProvider delayDuration={0}>
          
          {/* Search */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onSearchClick}
                className={`relative rounded-xl flex items-center transition-all duration-200 group ${collapsed ? 'justify-center w-12 h-12 mx-auto' : 'w-full px-4 py-3'}`}
                style={{
                  background: 'rgba(255,255,255,0.4)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                }}
              >
                <Search className="w-[18px] h-[18px] flex-shrink-0" style={{ color: colors.muted, filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))' }} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center justify-between flex-1 ml-3"
                    >
                      <span 
                        className="text-sm font-bold tracking-tight"
                        style={{ 
                          color: 'transparent',
                          backgroundImage: 'linear-gradient(180deg, #c4b5ab 0%, #a89585 100%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          textShadow: '0 2px 3px rgba(255,255,255,0.7)',
                          filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                        }}
                      >
                        Search
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: '#a89585', background: 'rgba(200,180,170,0.15)' }}>⌘K</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="rounded-xl border-none ml-2" style={{ background: 'linear-gradient(145deg, rgba(253,238,236,0.98) 0%, rgba(252,243,240,0.98) 100%)', color: '#8b7d72' }}>
                <p>Search ⌘K</p>
              </TooltipContent>
            )}
          </Tooltip>

          {/* Notifications */}
          <div className={`my-2 ${collapsed ? 'flex justify-center' : ''}`}>
            <Notifications currentUser={currentUser} collapsed={collapsed} />
          </div>

          <div className="w-full h-px my-2" style={{ background: 'rgba(200,180,170,0.15)' }} />

          {/* Nav Links */}
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Link to={item.path}>
                    <button
                      className={`
                        relative rounded-xl flex items-center transition-all duration-200 group
                        ${collapsed ? 'justify-center w-12 h-12 mx-auto' : 'w-full px-4 py-3'}
                        ${active ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
                      `}
                      style={{
                        background: active 
                          ? 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)'
                          : 'transparent',
                        boxShadow: active 
                          ? '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)'
                          : 'none',
                      }}
                    >
                      <item.icon 
                        className="w-[18px] h-[18px] flex-shrink-0 transition-colors" 
                        style={{ 
                          color: active ? colors.etchDark : colors.muted,
                          filter: active ? 'drop-shadow(0 1px 0 rgba(255,255,255,0.7))' : 'none',
                        }} 
                      />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className="ml-3 text-sm font-bold tracking-tight"
                            style={{ 
                              color: 'transparent',
                              backgroundImage: active 
                                ? `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`
                                : `linear-gradient(180deg, #c4b5ab 0%, #a89585 100%)`,
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              textShadow: '0 2px 3px rgba(255,255,255,0.7)',
                              filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                            }}
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      
                      {/* Active indicator */}
                      {active && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                          style={{ background: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)` }}
                        />
                      )}
                    </button>
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="rounded-xl border-none ml-2" style={{ background: 'linear-gradient(145deg, rgba(253,238,236,0.98) 0%, rgba(252,243,240,0.98) 100%)', color: '#8b7d72' }}>
                    <p>{item.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* Bottom - Avatar */}
      <div className={`flex items-center gap-3 mt-4 pt-4 ${collapsed ? 'justify-center px-3' : 'px-5'}`} style={{ borderTop: '1px solid rgba(200,180,170,0.15)' }}>
        <Avatar 
          className="w-10 h-10 cursor-pointer hover:scale-105 transition-all flex-shrink-0"
          style={{
            boxShadow: '0 4px 12px -4px rgba(180,150,140,0.2)',
            border: '2px solid rgba(255,255,255,0.8)',
          }}
        >
          <AvatarFallback 
            className="font-medium"
            style={{ 
              background: 'linear-gradient(145deg, #f4e8e4 0%, #ecdad4 100%)',
              color: colors.etchDark,
            }}
          >
            {currentUser?.full_name?.charAt(0) || 'S'}
          </AvatarFallback>
        </Avatar>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 min-w-0"
            >
              <p className="text-sm font-medium truncate" style={{ color: '#8b7d72' }}>
                {currentUser?.full_name || 'Studio'}
              </p>
              <p className="text-xs truncate" style={{ color: colors.muted }}>
                {currentUser?.role || 'Owner'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}