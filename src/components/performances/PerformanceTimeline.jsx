import React from 'react';
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import { Calendar, CheckCircle2, Clock, AlertCircle, Sparkles, Milestone } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function PerformanceTimeline({ tasks, milestones }) {
    // If we have auto-generated milestones, render them differently (grouped by milestone)
    // Otherwise fallback to the flat task list (legacy behavior)
    
    // Sort items by due date
    const items = milestones && milestones.length > 0 ? milestones : tasks;
    const isMilestoneView = milestones && milestones.length > 0;

    const sortedItems = [...items].sort((a, b) => {
        const dateA = isMilestoneView ? a.due_date : a.due_date;
        const dateB = isMilestoneView ? b.due_date : b.due_date;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateA) - new Date(dateB);
    });

    const now = new Date();
    
    if (items.length === 0) return (
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
                Use the <span className="text-indigo-600 font-medium">Backstage</span> to generate a schedule or add tasks manually.
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
                {/* Status Badge */}
            </div>
            
            <div className="overflow-y-auto pr-2 -mr-2 flex-1 relative custom-scrollbar">
                {/* Connecting Line */}
                <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-100 via-indigo-50 to-transparent" />

                <div className="space-y-8 relative">
                    {sortedItems.map((item, idx) => {
                        const date = item.due_date ? parseISO(item.due_date) : null;
                        const isDone = item.status === 'completed'; // Tasks
                        const daysLeft = date ? differenceInDays(date, now) : null;
                        
                        // For milestones, check if date is past
                        const isPastMilestone = date && isPast(date) && !isToday(date);
                        
                        return (
                            <motion.div 
                                key={item.id || idx} 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`relative flex gap-6 group ${isDone || isPastMilestone ? 'opacity-80' : ''}`}
                            >
                                {/* Timeline Node */}
                                <div className="relative z-10 flex flex-col items-center shrink-0">
                                    <div className={`
                                        w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-300 shadow-sm
                                        ${isPastMilestone
                                            ? 'bg-gray-50 border-gray-200 text-gray-400' 
                                            : daysLeft <= 7 && daysLeft >= 0
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
                                </div>
                                
                                {/* Content Card */}
                                <div className={`
                                    flex-1 p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden
                                    ${daysLeft <= 7 && daysLeft >= 0
                                        ? 'bg-gradient-to-br from-indigo-50/80 to-white border-indigo-100 shadow-md ring-1 ring-indigo-50' 
                                        : 'bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-200'
                                    }
                                `}>
                                    <div className="flex flex-col gap-2 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <h4 className={`font-bold text-sm ${isPastMilestone ? 'text-gray-500' : 'text-[#333333]'}`}>
                                                {isMilestoneView ? item.name : item.title}
                                            </h4>
                                            {daysLeft !== null && (
                                                <span className={`text-xs font-medium ${daysLeft < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                    {daysLeft < 0 ? `${Math.abs(daysLeft)} days ago` : daysLeft === 0 ? 'Today' : `${daysLeft} days away`}
                                                </span>
                                            )}
                                        </div>

                                        {/* Milestone Tasks Preview */}
                                        {isMilestoneView && item.tasks && item.tasks.length > 0 && (
                                            <div className="space-y-1 mt-1">
                                                {item.tasks.map((t, tIdx) => (
                                                    <div key={tIdx} className="flex items-center gap-2 text-xs text-gray-600">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${t.priority === 'critical' ? 'bg-red-400' : 'bg-indigo-300'}`} />
                                                        <span>{t.task}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {!isMilestoneView && (
                                             <div className="text-xs text-gray-500">{item.department}</div>
                                        )}
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