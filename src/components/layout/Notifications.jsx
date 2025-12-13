import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Bell } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Notifications({ currentUser }) {
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

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white hover:bg-white/10">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#111111]" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4 bg-white/95 backdrop-blur-xl border-gray-200 shadow-2xl rounded-xl overflow-hidden" align="end">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h4 className="font-semibold text-sm text-gray-900">Notifications</h4>
                    {unreadCount > 0 && (
                        <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
                            {unreadCount} new
                        </span>
                    )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">
                            No new notifications
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div 
                                key={notif.id}
                                onClick={() => handleClick(notif)}
                                className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${
                                        notif.type === 'assignment' ? 'text-orange-600' : 
                                        notif.type === 'ai_suggestion' ? 'text-indigo-600' : 'text-blue-600'
                                    }`}>
                                        {notif.title}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 leading-snug group-hover:text-gray-900">
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