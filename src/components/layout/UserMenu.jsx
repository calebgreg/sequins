import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, User, ArrowLeftRight, ChevronDown, Building2 } from 'lucide-react';

export default function UserMenu() {
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: currentStudio } = useQuery({
    queryKey: ['currentStudio', currentUser?.studio_id],
    queryFn: async () => {
      if (!currentUser?.studio_id) return null;
      const studios = await base44.entities.Studio.filter({ id: currentUser.studio_id });
      return studios[0] || null;
    },
    enabled: !!currentUser?.studio_id,
  });

  const isAdmin = currentUser?.role === 'admin';
  const isImpersonating = isAdmin && currentUser?.studio_id;

  const handleSwitchProfiles = () => {
    navigate(createPageUrl('SuperAdmin'));
  };

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/50 transition-colors outline-none">
            <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-[#f4e8e4] to-[#ecdad4] text-[#8a7070] font-medium text-sm">
                {currentUser?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-sm font-medium text-gray-700">
              {currentUser?.full_name || 'User'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-3 py-2 border-b">
            <p className="text-sm font-medium text-gray-900">{currentUser?.full_name}</p>
            <p className="text-xs text-gray-500">{currentUser?.email}</p>
            {isAdmin && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                Super Admin
              </span>
            )}
            {isImpersonating && currentStudio && (
              <p className="text-xs text-gray-400 mt-1">Viewing: {currentStudio.name}</p>
            )}
          </div>
          
          <DropdownMenuItem className="cursor-pointer gap-2 mt-1">
            <MessageSquare className="w-4 h-4" />
            Share Feedback
          </DropdownMenuItem>
          
          <DropdownMenuItem className="cursor-pointer gap-2">
            <User className="w-4 h-4" />
            My Profile
          </DropdownMenuItem>

          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer gap-2 text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50"
                onClick={handleSwitchProfiles}
              >
                <ArrowLeftRight className="w-4 h-4" />
                {isImpersonating ? 'Switch Studios' : 'Admin Portal'}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}