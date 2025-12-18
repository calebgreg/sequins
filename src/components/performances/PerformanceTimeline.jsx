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
    // Find the first milestone date or today, whichever is earlier
    const startDate = sortedMilestones.length > 0 
        ? startOfDay(parseISO(sortedMilestones[0].due_date)) 
        : today;
    
    // If start date is after today, we start from today
    const effectiveStart = startDate < today ? startDate : today;
    const totalSpan = showDay ? differenceInDays(showDay, effectiveStart) : 1;
    const daysPassed = differenceInDays(today, effectiveStart);
    const progressPercent = Math.max(0, Math.min(100, (daysPassed / totalSpan) * 100));

    // --- EMPTY STATE ---
    if (!showDay || sortedMilestones.length === 0) {
        return (
            <div className="h-[300px] w-full rounded-[32px] overflow-hidden relative group">
                {/* Glassmorphic Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-rose-100 via-pink-50 to-white">
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl"></div>
                </div>

                {/* Decorative Orbs */}
                <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] rounded-full bg-rose-300/20 blur-[80px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[250px] h-[250px] rounded-full bg-pink-400/20 blur-[80px]" />

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-8">
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="w-20 h-20 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/60 shadow-[0_8px_32px_0_rgba(244,63,94,0.1)]"
                    >
                        <Sparkles className="w-8 h-8 text-rose-400" strokeWidth={1.5} />
                    </motion.div>
                    
                    <h3 className="font-serif text-2xl mb-2 text-rose-950 font-medium">Your Production Journey</h3>
                    <p className="text-rose-800/60 max-w-sm mb-6 text-base font-light leading-relaxed">
                        Every great show starts with a plan. Set your show date to begin the adventure.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col relative">
            {/* Header */}
            <div className="px-8 py-6 flex justify-between items-center border-b border-rose-100/30 bg-white/30">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-200">
                        <Flag className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-serif text-rose-950 text-lg">Road to Opening Night</h3>
                        <div className="flex items-center gap-2 text-xs font-medium text-rose-500/80">
                            <span>{format(today, 'MMM d')}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{format(showDay, 'MMM d, yyyy')}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-rose-400 uppercase tracking-widest">Countdown</div>
                        <div className="font-mono text-lg font-bold text-rose-600">{totalDays} <span className="text-xs font-sans font-medium text-rose-400">days left</span></div>
                    </div>
                </div>
            </div>

            {/* Scrollable Timeline Area */}
            <div className="relative p-8 overflow-x-auto min-h-[320px] flex items-center custom-scrollbar">
                
                {/* Connecting Line Container */}
                <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-rose-100 rounded-full z-0 min-w-[800px]">
                    {/* Progress Fill */}
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="h-full bg-gradient-to-r from-rose-300 to-pink-500 rounded-full relative"
                    >
                        {/* Current Day Indicator */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-white border-4 border-pink-500 rounded-full shadow-lg z-10" />
                        <div className="absolute right-0 bottom-full mb-3 translate-x-1/2 text-[10px] font-bold text-pink-500 uppercase tracking-wider bg-white/80 backdrop-blur px-2 py-1 rounded-full shadow-sm">
                            Today
                        </div>
                    </motion.div>
                </div>

                {/* Milestones Container */}
                <div className="relative z-10 flex gap-12 min-w-[800px] px-4 w-full justify-between items-start pt-12">
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
                    <div className="flex flex-col items-center justify-start group min-w-[120px]">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-xl shadow-rose-200 rotate-3 group-hover:rotate-6 transition-transform duration-300 border-4 border-white">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div className="h-12 w-0.5 border-l-2 border-dashed border-rose-200 my-2"></div>
                        <div className="text-center">
                            <div className="font-serif text-lg font-bold text-rose-600">Show Day</div>
                            <div className="text-xs font-medium text-rose-400 bg-rose-50 px-2 py-1 rounded-md mt-1 inline-block">
                                {format(showDay, 'MMM d')}
                            </div>
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
    const isCompleted = isPastDate; // Simplified logic: past = done for this visual
    const statusColor = isCompleted ? "bg-green-100 text-green-600 border-green-200" : 
                       isTodayDate ? "bg-amber-100 text-amber-600 border-amber-200" : 
                       "bg-white text-rose-900 border-white/60";

    const nodeColor = isCompleted ? "bg-green-500 border-green-200" : 
                     isTodayDate ? "bg-amber-500 border-amber-200" : 
                     "bg-white border-rose-200";

    const [isEditing, setIsEditing] = useState(false);
    const [tempDate, setTempDate] = useState(milestone.due_date);

    const handleSave = () => {
        onUpdate({ ...milestone, due_date: tempDate });
        setIsEditing(false);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col items-center min-w-[140px] group"
        >
            {/* Top Card (Details) */}
            <div className={`
                relative p-4 rounded-2xl border backdrop-blur-md shadow-sm transition-all duration-300 w-full mb-4
                ${isCompleted ? 'bg-green-50/50 border-green-100/50' : 'bg-white/60 border-white/60 hover:shadow-lg hover:-translate-y-1 hover:bg-white/80'}
            `}>
                <div className="flex justify-between items-start mb-2">
                    <div className={`p-1.5 rounded-lg ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-rose-50 text-rose-500'}`}>
                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    </div>
                    
                    <Popover open={isEditing} onOpenChange={setIsEditing}>
                        <PopoverTrigger asChild>
                            <button className="text-gray-300 hover:text-rose-400 transition-colors">
                                <Edit2 className="w-3 h-3" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-4 bg-white/90 backdrop-blur-xl border-rose-100 shadow-xl rounded-2xl">
                            <div className="space-y-3">
                                <h4 className="font-medium text-sm text-rose-900">Reschedule Milestone</h4>
                                <input 
                                    type="date" 
                                    value={tempDate}
                                    onChange={(e) => setTempDate(e.target.value)}
                                    className="w-full bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                />
                                <Button size="sm" onClick={handleSave} className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-lg">
                                    Update Date
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                
                <div className="font-bold text-sm text-gray-800 leading-tight mb-1">{milestone.name}</div>
                <div className={`text-xs font-mono font-medium ${isCompleted ? 'text-green-600/70' : 'text-gray-400'}`}>
                    {format(dueDate, 'MMM d')}
                </div>
            </div>

            {/* Connector Node */}
            <div className={`w-4 h-4 rounded-full border-4 z-20 transition-all duration-500 ${nodeColor} shadow-sm group-hover:scale-125`} />
            
            {/* Dashed Line to card */}
            <div className="h-6 w-px border-l-2 border-dashed border-gray-200 -mt-2 mb-2 absolute top-[calc(100%-20px)] opacity-0"></div> 
            {/* (Hiding vertical lines for cleaner look, letting cards float above) */}

        </motion.div>
    );
}