import React from 'react';
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import { Calendar, CheckCircle2, Clock, AlertCircle, Sparkles, Milestone } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function PerformanceTimeline({ tasks }) {
    // Sort tasks by due date
    const sortedTasks = [...tasks].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
    });

    // Find the next upcoming task index
    const now = new Date();
    const nextTaskIndex = sortedTasks.findIndex(t => {
        if (!t.due_date) return false;
        const d = parseISO(t.due_date);
        return d >= now && t.status !== 'completed';
    });

    if (tasks.length === 0) return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group"
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]" />
            
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform duration-500">
                <Milestone className="w-10 h-10 text-indigo-400" />
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-2 border-dashed border-indigo-200 rounded-full"
                />
            </div>
            
            <h3 className="text-xl font-serif text-[#333333] mb-2 relative z-10">Production Roadmap</h3>
            <p className="text-gray-400 text-center max-w-xs text-sm relative z-10 mb-6">
                Your show's timeline is currently empty. 
                Use the Drafting Table to generate a schedule or add tasks manually.
            </p>
        </motion.div>
    );

    return (
        <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-indigo-100/20 border border-gray-100 h-full max-h-[500px] overflow-hidden flex flex-col relative">
            <div className="flex items-center justify-between mb-8 shrink-0">
                <h3 className="font-serif text-2xl text-[#333333] flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    Roadmap
                </h3>
                <Badge variant="outline" className="rounded-full px-3 py-1 bg-gray-50 border-gray-200 text-gray-500">
                    {tasks.filter(t => t.status === 'completed').length} / {tasks.length} Done
                </Badge>
            </div>
            
            <div className="overflow-y-auto pr-2 -mr-2 flex-1 relative custom-scrollbar">
                {/* Connecting Line */}
                <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-100 via-indigo-50 to-transparent" />

                <div className="space-y-8 relative">
                    {sortedTasks.map((task, idx) => {
                        const date = task.due_date ? parseISO(task.due_date) : null;
                        const isOverdue = date && isPast(date) && !isToday(date) && task.status !== 'completed';
                        const isDone = task.status === 'completed';
                        const isNext = idx === nextTaskIndex;
                        const daysLeft = date ? differenceInDays(date, now) : null;

                        return (
                            <motion.div 
                                key={task.id} 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`relative flex gap-6 group ${isDone ? 'opacity-60 grayscale-[0.5] hover:grayscale-0 transition-all' : ''}`}
                            >
                                {/* Timeline Node */}
                                <div className="relative z-10 flex flex-col items-center shrink-0">
                                    <div className={`
                                        w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-300 shadow-sm
                                        ${isDone 
                                            ? 'bg-green-50 border-green-200 text-green-700' 
                                            : isOverdue 
                                                ? 'bg-red-50 border-red-200 text-red-700 animate-pulse' 
                                                : isNext
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200 shadow-lg scale-110'
                                                    : 'bg-white border-gray-100 text-gray-400'
                                        }
                                    `}>
                                        {date ? (
                                            <>
                                                <span className="text-[10px] font-bold uppercase tracking-wider leading-none mb-0.5">{format(date, 'MMM')}</span>
                                                <span className="text-xl font-bold leading-none">{format(date, 'd')}</span>
                                            </>
                                        ) : (
                                            <Calendar className="w-5 h-5" />
                                        )}
                                    </div>
                                    {isNext && (
                                        <div className="absolute -bottom-6 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                            Up Next
                                        </div>
                                    )}
                                </div>
                                
                                {/* Content Card */}
                                <div className={`
                                    flex-1 p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden
                                    ${isNext 
                                        ? 'bg-gradient-to-br from-indigo-50/80 to-white border-indigo-100 shadow-md ring-1 ring-indigo-50' 
                                        : 'bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-200'
                                    }
                                `}>
                                    <div className="flex items-start justify-between gap-4 relative z-10">
                                        <div>
                                            <h4 className={`font-bold text-sm mb-1 ${isDone ? 'line-through text-gray-400' : 'text-[#333333]'}`}>
                                                {task.title}
                                            </h4>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <Badge variant="secondary" className="bg-white/50 border-gray-100 text-gray-500 font-normal">
                                                    {task.department || 'General'}
                                                </Badge>
                                                {daysLeft !== null && !isDone && (
                                                    <span className={`flex items-center gap-1 ${daysLeft < 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                                        <Clock className="w-3 h-3" />
                                                        {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft} days left`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isDone && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}