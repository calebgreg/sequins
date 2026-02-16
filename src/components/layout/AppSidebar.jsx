import React, { useState } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Users, 
  GraduationCap, 
  CreditCard, 
  Settings, 
  Briefcase,
  CheckSquare,
  Mic2
} from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";

const colors = {
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
  muted: '#b5a599',
};

// Etched text style
const etchedTextStyle = {
  color: 'transparent',
  backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

const mutedTextStyle = {
  color: 'transparent',
  backgroundImage: 'linear-gradient(180deg, #c4b5ab 0%, #a89585 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  textShadow: '0 2px 3px rgba(255,255,255,0.7)',
  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
};

export default function AppSidebar({ className = "", onSearchClick }) {
  const [collapsed, setCollapsed] = useState(true);
  
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
    retry: false
  });

  const location = useLocation();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { path: '/Growth', icon: TrendingUp, label: 'Growth' },
    { path: '/TeacherStudio', icon: Briefcase, label: 'Studio' },
    { path: '/Tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/ClassManager', icon: Calendar, label: 'Schedule' },
    { path: '/Students', icon: GraduationCap, label: 'Students' },
    { path: '/Teachers', icon: Users, label: 'Staff' },
    { path: '/Performances', icon: Mic2, label: 'Shows' },
    { path: '/Billing', icon: CreditCard, label: 'Billing' },
    { path: '/Settings', icon: Settings, label: 'Settings' },
  ].filter(item => {
    // Hide all nav items if user has no studio_id (show only SuperAdmin)
    if (!currentUser?.studio_id && currentUser?.role === 'admin') {
      return false;
    }
    return true;
  });

  const NavItem = ({ item, active }) => {
    const content = (
      <Link to={item.path} className="block">
        <div
          className={`
            flex items-center gap-3 rounded-xl transition-all duration-200
            ${collapsed ? 'justify-center w-12 h-12 mx-auto' : 'px-4 py-3'}
            ${active ? 'scale-[1.02]' : 'hover:bg-white/30'}
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
            className="w-[18px] h-[18px] flex-shrink-0" 
            style={{ 
              color: active ? colors.etchDark : colors.muted,
              filter: active ? 'drop-shadow(0 1px 0 rgba(255,255,255,0.7))' : 'none',
            }} 
          />
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight" style={active ? etchedTextStyle : mutedTextStyle}>
              {item.label}
            </span>
          )}
        </div>
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent 
            side="right" 
            className="rounded-xl border-none ml-2" 
            style={{ 
              background: 'linear-gradient(145deg, rgba(253,238,236,0.98) 0%, rgba(252,243,240,0.98) 100%)', 
              color: '#8b7d72',
              boxShadow: '0 8px 24px -8px rgba(180,150,140,0.3)',
            }}
          >
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div 
        className={`group relative flex flex-col py-6 m-4 h-[calc(100dvh-32px)] sticky top-4 overflow-hidden transition-all duration-200 ${className}`}
        style={{
          width: collapsed ? 80 : 220,
          background: 'linear-gradient(180deg, rgba(254,247,247,0.95) 0%, rgba(253,244,244,0.9) 50%, rgba(254,248,248,0.95) 100%)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(200,180,170,0.1), 0 20px 60px -20px rgba(180,150,140,0.25)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255,230,230,0.3)',
        }}
      >
        {/* Inner glow */}
        <div 
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 30% 10%, rgba(255,255,255,0.4) 0%, transparent 50%)' }}
        />

        {/* Logo */}
        <div className={`mb-6 flex-shrink-0 flex items-center relative ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
          <div 
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
              boxShadow: '0 8px 24px -8px rgba(180,150,140,0.25), inset 0 1px 1px rgba(255,255,255,1)',
            }}
          >
            <span className="text-xl font-bold" style={etchedTextStyle}>S</span>
          </div>
          {!collapsed && (
            <span className="ml-3 text-lg font-bold tracking-tight" style={etchedTextStyle}>
              Studio
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col gap-1 w-full px-3 relative">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} active={isActive(item.path)} />
          ))}
        </nav>



        {/* Bottom - Avatar with collapse toggle */}
        <div 
          className={`flex items-center gap-3 mt-4 pt-4 relative ${collapsed ? 'justify-center px-3' : 'px-5'}`} 
          style={{ borderTop: '1px solid rgba(200,180,170,0.15)' }}
        >
          <Avatar 
            onClick={() => setCollapsed(!collapsed)}
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
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#8b7d72' }}>
                {currentUser?.full_name || 'Studio'}
              </p>
              <p className="text-xs truncate" style={{ color: colors.muted }}>
                {currentUser?.role || 'Owner'}
              </p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}