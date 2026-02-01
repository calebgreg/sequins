import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Bell } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const colors = {
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
  muted: '#8a8478',
};

export default function Notifications({ currentUser, collapsed = false }) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications', currentUser?.email],
        queryFn: async () => {
            if (!currentUser) return [];
            return await base44.entities.Notification.filter({ 
                recipient_email: currentUser.email,
                is_read: false
            });
        },
        enabled: !!currentUser,
        refetchInterval: 30000 // Poll every 30s
    });

    const markAsReadMutation = useMutation({
        mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
        onSuccess: () => queryClient.invalidateQueries(['notifications'])
    });

    const handleClick = (notif) => {
        markAsReadMutation.mutate(notif.id);
        if (notif.link) {
            navigate(notif.link);
        }
    };

    const unreadCount = notifications.length;

    if (!currentUser) return null;

    const triggerButton = (
        <button
            className={`relative rounded-xl flex items-center transition-all duration-200 group ${collapsed ? 'justify-center w-12 h-12' : 'w-full px-4 py-3'}`}
            style={{
                background: unreadCount > 0 ? 'rgba(212,165,116,0.1)' : 'transparent',
            }}
        >
            <Bell className="w-[18px] h-[18px] flex-shrink-0" style={{ color: unreadCount > 0 ? '#d4a574' : colors.muted }} />
            {unreadCount > 0 && (
                <span 
                    className="absolute w-2 h-2 rounded-full"
                    style={{ 
                        background: '#d4a574',
                        top: collapsed ? '10px' : '12px',
                        left: collapsed ? '26px' : '24px',
                    }}
                />
            )}
            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex items-center justify-between flex-1 ml-3"
                    >
                        <span className="text-sm" style={{ color: unreadCount > 0 ? '#d4a574' : colors.muted }}>Notifications</span>
                        {unreadCount > 0 && (
                            <span 
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={{ background: 'rgba(212,165,116,0.15)', color: '#d4a574' }}
                            >
                                {unreadCount}
                            </span>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
    );

    return (
        <Popover>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        {triggerButton}
                    </PopoverTrigger>
                </TooltipTrigger>
                {collapsed && (
                    <TooltipContent 
                        side="right" 
                        className="rounded-xl border-none ml-2" 
                        style={{ background: 'linear-gradient(145deg, rgba(253,238,236,0.98) 0%, rgba(252,243,240,0.98) 100%)', color: '#8b7d72' }}
                    >
                        <p>Notifications {unreadCount > 0 && `(${unreadCount})`}</p>
                    </TooltipContent>
                )}
            </Tooltip>
            <PopoverContent 
                className="w-80 p-0 ml-4 overflow-hidden rounded-2xl border-none" 
                align="start"
                side="right"
                style={{
                    background: 'linear-gradient(145deg, rgba(253,248,246,0.98) 0%, rgba(252,243,240,0.98) 100%)',
                    boxShadow: '0 20px 60px -20px rgba(180,150,140,0.4)',
                }}
            >
                <div 
                    className="px-4 py-3 flex justify-between items-center"
                    style={{ borderBottom: '1px solid rgba(200,180,170,0.15)' }}
                >
                    <h4 className="font-semibold text-sm" style={{ color: '#8b7d72' }}>Notifications</h4>
                    {unreadCount > 0 && (
                        <span 
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'rgba(212,165,116,0.15)', color: '#d4a574' }}
                        >
                            {unreadCount} new
                        </span>
                    )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="py-8 text-center text-sm" style={{ color: colors.muted }}>
                            No new notifications
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div 
                                key={notif.id}
                                onClick={() => handleClick(notif)}
                                className="p-4 cursor-pointer transition-colors hover:bg-white/50"
                                style={{ borderBottom: '1px solid rgba(200,180,170,0.1)' }}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span 
                                        className="text-xs font-bold uppercase tracking-wider"
                                        style={{
                                            color: notif.type === 'assignment' ? '#d4a574' : 
                                                   notif.type === 'ai_suggestion' ? '#a48bc4' : colors.etchLight
                                        }}
                                    >
                                        {notif.title}
                                    </span>
                                    <span className="text-[10px]" style={{ color: colors.muted }}>
                                        {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-sm leading-snug" style={{ color: '#8b7d72' }}>
                                    {notif.message}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}