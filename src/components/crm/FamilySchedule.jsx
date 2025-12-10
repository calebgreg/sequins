import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

export default function FamilySchedule({ family }) {
    const { data: classes = [] } = useQuery({
        queryKey: ['classes'],
        queryFn: () => base44.entities.DanceClass.list(),
    });

    const familyClasses = useMemo(() => {
        const studentNames = family.students.map(s => s.name);
        return classes.filter(c => 
            c.student_names?.some(name => studentNames.includes(name))
        );
    }, [classes, family.students]);

    // Group by Day
    const weekSchedule = useMemo(() => {
        const days = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];
        const dayNames = { 'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 'R': 'Thursday', 'F': 'Friday', 'S': 'Saturday', 'U': 'Sunday' };
        
        return days.map(dayKey => ({
            key: dayKey,
            name: dayNames[dayKey],
            classes: familyClasses
                .filter(c => c.day === dayKey)
                .sort((a, b) => a.start_time - b.start_time)
        })).filter(day => day.classes.length > 0);
    }, [familyClasses]);

    return (
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col h-full">
            <h3 className="font-serif text-lg text-[#333333] mb-6 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                Family Schedule
            </h3>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {weekSchedule.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        No active enrollments found.
                    </div>
                ) : (
                    weekSchedule.map(day => (
                        <div key={day.key}>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 sticky top-0 bg-white z-10 py-1">
                                {day.name}
                            </div>
                            <div className="space-y-3">
                                {day.classes.map(cls => (
                                    <div key={cls.id} className="flex gap-3 relative group">
                                        {/* Timeline Dot */}
                                        <div className="absolute left-[5px] top-8 bottom-[-12px] w-0.5 bg-gray-100 group-last:hidden" />
                                        <div className="w-3 h-3 rounded-full bg-indigo-100 border-2 border-white shadow-sm mt-1.5 flex-shrink-0 z-10" />
                                        
                                        <div className="flex-1 bg-[#F4F4F6] rounded-xl p-3 hover:bg-[#F2DCDD]/30 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="font-bold text-sm text-[#333333]">{cls.title}</div>
                                                <Badge variant="secondary" className="bg-white text-[10px] h-5 px-1.5 shadow-sm text-gray-500">
                                                    {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mm a')}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                {/* Find which student is in this class */}
                                                {family.students.filter(s => cls.student_names?.includes(s.name)).map(s => (
                                                    <span key={s.id} className="bg-white px-1.5 py-0.5 rounded text-[10px] border border-gray-100 font-medium text-[#333333]">
                                                        {s.name}
                                                    </span>
                                                ))}
                                                <span className="text-gray-300">•</span>
                                                <span>{cls.teacher || 'Staff'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}