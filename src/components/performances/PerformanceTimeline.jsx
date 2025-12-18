import React, { useRef, useState, useEffect } from 'react';
import { format, differenceInDays, addDays, startOfDay, parseISO, isSameDay, isPast, isToday } from 'date-fns';
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Sparkles, Flag, CheckCircle2, Circle, Clock, ArrowRight, Calendar as CalendarIcon, Edit2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function PerformanceTimeline({ milestones = [], showDate, onMilestoneUpdate }) {
    const today = startOfDay(new Date());
    const showDay = showDate ? startOfDay(parseISO(showDate)) : null;
    
    // Sort milestones by date
    const sortedMilestones = [...(milestones || [])].sort((a, b) => {
        return new Date(a.due_date) - new Date(b.due_date);
    });

    const totalDays = showDay ? differenceInDays(showDay, today) : 0;
    
    // Calculate progress percentage for the main track
    const startDate = sortedMilestones.length > 0 
        ? startOfDay(parseISO(sortedMilestones[0].due_date)) 
        : today;
    
    const effectiveStart = startDate < today ? startDate : today;
    const totalSpan = showDay ? differenceInDays(showDay, effectiveStart) : 1;
    const daysPassed = differenceInDays(today, effectiveStart);
    const progressPercent = Math.max(0, Math.min(100, (daysPassed / totalSpan) * 100));

    // --- COMPACT EMPTY STATE ---
    if (!showDay || sortedMilestones.length === 0) {
        return (
            <div className="h-[180px] w-full rounded-[24px] overflow-hidden relative group border border-rose-100">
                {/* Glassmorphic Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-rose-50/50">
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-md"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex items-center justify-center text-center px-6 gap-6">
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-16 h-16 bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/60 shadow-sm shrink-0"
                    >
                        <Sparkles className="w-8 h-8 text-rose-300" strokeWidth={1.5} />
                    </motion.div>
                    
                    <div className="text-left">
                        <h3 className="font-serif text-lg mb-1 text-rose-950 font-medium">Your Production Journey</h3>
                        <p className="text-rose-800/60 max-w-sm text-sm font-light leading-snug">
                            Set your show date to begin the adventure.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white/40 backdrop-blur-xl rounded-[24px] border border-white/60 shadow-sm overflow-hidden flex flex-col relative">
            {/* Header */}
            <div className="px-6 py-3 flex justify-between items-center border-b border-rose-100/30 bg-white/30 h-14">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-200/50">
                        <Flag className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="font-serif text-rose-950 text-sm font-semibold">Road to Opening Night</h3>
                        <span className="text-[10px] text-rose-400 font-medium bg-rose-50 px-1.5 py-0.5 rounded-md">
                            {format(showDay, 'MMM d, yyyy')}
                        </span>
                    </div>
                </div>
                
                <div className="flex items-center">
                    <div className="text-xs font-medium text-rose-600 bg-white/50 px-2 py-1 rounded-full border border-rose-100">
                        {totalDays} days left
                    </div>
                </div>
            </div>

            {/* Scrollable Timeline Area */}
            <div className="relative px-6 py-6 overflow-x-auto min-h-[180px] flex items-center custom-scrollbar">
                
                {/* Connecting Line Container */}
                <div className="absolute left-6 right-6 top-[60%] -translate-y-1/2 h-0.5 bg-rose-100 rounded-full z-0 min-w-[600px]">
                    {/* Progress Fill */}
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="h-full bg-gradient-to-r from-rose-300 to-pink-500 rounded-full relative"
                    >
                        {/* Current Day Indicator */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white border-[3px] border-pink-500 rounded-full shadow-md z-10" />
                    </motion.div>
                </div>

                {/* Milestones Container */}
                <div className="relative z-10 flex gap-4 min-w-[600px] w-full justify-between items-start">
                    {sortedMilestones.map((milestone, idx) => (
                        <MilestoneCard
                            key={milestone.id}
                            milestone={milestone}
                            today={today}
                            onUpdate={(updatedMilestone) => {
                                const newList = sortedMilestones.map(m => 
                                    m.id === updatedMilestone.id ? updatedMilestone : m
                                );
                                onMilestoneUpdate(newList);
                            }}
                            index={idx}
                        />
                    ))}

                    {/* Show Day Flag */}
                    <div className="flex flex-col items-center justify-start group min-w-[80px] pt-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-rose-200 rotate-3 group-hover:rotate-6 transition-transform duration-300 border-2 border-white mb-2">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="text-center">
                            <div className="font-serif text-xs font-bold text-rose-600 leading-tight">Show<br/>Day</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MilestoneCard({ milestone, today, onUpdate, index }) {
    const dueDate = parseISO(milestone.due_date);
    const isPastDate = isPast(dueDate) && !isToday(dueDate);
    const isTodayDate = isToday(dueDate);
    
    // Status Logic
    const isCompleted = isPastDate; 

    const nodeColor = isCompleted ? "bg-green-400 border-green-100" : 
                     isTodayDate ? "bg-amber-400 border-amber-100" : 
                     "bg-white border-rose-200";

    const [isEditing, setIsEditing] = useState(false);
    const [tempDate, setTempDate] = useState(milestone.due_date);

    const handleSave = () => {
        onUpdate({ ...milestone, due_date: tempDate });
        setIsEditing(false);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex flex-col items-center min-w-[100px] group relative"
        >
            {/* Top Card (Details) */}
            <div className={`
                relative p-2.5 rounded-xl border backdrop-blur-md shadow-sm transition-all duration-300 w-full mb-3
                ${isCompleted ? 'bg-green-50/50 border-green-100/50' : 'bg-white/70 border-white/60 hover:shadow-md hover:-translate-y-0.5 hover:bg-white/90'}
            `}>
                <div className="flex justify-between items-start mb-1 gap-2">
                    <div className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${isCompleted ? 'bg-green-100/80 text-green-700' : 'bg-rose-50 text-rose-600'}`}>
                        {format(dueDate, 'MMM d')}
                    </div>
                    
                    <Popover open={isEditing} onOpenChange={setIsEditing}>
                        <PopoverTrigger asChild>
                            <button className="text-gray-300 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100">
                                <Edit2 className="w-2.5 h-2.5" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3 bg-white/95 backdrop-blur-xl border-rose-100 shadow-xl rounded-xl">
                            <div className="space-y-2">
                                <h4 className="font-medium text-xs text-rose-900">Reschedule</h4>
                                <input 
                                    type="date" 
                                    value={tempDate}
                                    onChange={(e) => setTempDate(e.target.value)}
                                    className="w-full bg-rose-50 border border-rose-100 rounded px-2 py-1 text-xs text-rose-900 focus:outline-none focus:ring-1 focus:ring-rose-200"
                                />
                                <Button size="sm" onClick={handleSave} className="w-full h-7 text-xs bg-rose-500 hover:bg-rose-600 text-white rounded">
                                    Update
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                
                <div className="font-bold text-xs text-gray-700 leading-tight line-clamp-2" title={milestone.name}>
                    {milestone.name}
                </div>
            </div>

            {/* Connector Node */}
            <div className={`w-3 h-3 rounded-full border-[3px] z-20 transition-all duration-500 ${nodeColor} shadow-sm group-hover:scale-125`} />
            
        </motion.div>
    );
}