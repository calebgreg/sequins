import React from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function PerformanceTimeline({ tasks }) {
    // Sort tasks by due date
    const sortedTasks = [...tasks].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
    });

    if (tasks.length === 0) return (
        <div className="h-full flex items-center justify-center p-8 bg-gray-50/50 rounded-[32px] border border-dashed border-gray-200">
            <div className="text-center text-gray-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No timeline tasks yet.</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 h-full max-h-[400px] overflow-y-auto">
            <h3 className="font-serif text-xl text-[#333333] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Production Timeline
            </h3>
            
            <div className="relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                {sortedTasks.map((task) => {
                    const date = task.due_date ? parseISO(task.due_date) : null;
                    const isOverdue = date && isPast(date) && !isToday(date) && task.status !== 'completed';
                    const isDone = task.status === 'completed';
                    
                    return (
                        <div key={task.id} className="relative flex items-start gap-4">
                            {/* Dot */}
                            <div className={`absolute -left-[21px] mt-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                                isDone ? 'bg-green-500 border-green-500' :
                                isOverdue ? 'bg-white border-red-400' :
                                'bg-white border-indigo-400'
                            }`} />
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${
                                        isOverdue ? 'text-red-500' : 'text-gray-400'
                                    }`}>
                                        {date ? format(date, 'MMM d, yyyy') : 'No Date'}
                                    </span>
                                    {isOverdue && <Badge variant="destructive" className="text-[10px] h-4 px-1">Overdue</Badge>}
                                </div>
                                
                                <h4 className={`text-sm font-medium ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {task.title}
                                </h4>
                                
                                <div className="flex gap-2 mt-1">
                                    <Badge variant="outline" className="text-[10px] h-4 px-1 text-gray-500 border-gray-200">
                                        {task.department || 'General'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}