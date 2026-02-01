import React, { useState } from 'react';
import { format, differenceInDays, startOfDay, parseISO, isSameDay, isPast, isToday } from 'date-fns';
import { motion } from "framer-motion";
import { Sparkles, Edit2, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Design tokens
const colors = {
  muted: '#b5a599',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
  accent: '#a48bc4',
};

export default function PerformanceTimeline({ milestones = [], showDate, onMilestoneUpdate }) {
    const [expanded, setExpanded] = useState(true);
    const today = startOfDay(new Date());
    const showDay = showDate ? startOfDay(parseISO(showDate)) : null;
    
    const sortedMilestones = [...(milestones || [])]
        .filter(m => m.name?.toLowerCase() !== 'show day' && (!showDay || !isSameDay(parseISO(m.due_date), showDay)))
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    const totalDays = showDay ? differenceInDays(showDay, today) : 0;
    
    const startDate = sortedMilestones.length > 0 
        ? startOfDay(parseISO(sortedMilestones[0].due_date)) 
        : today;
    
    const effectiveStart = startDate < today ? startDate : today;
    const totalSpan = showDay ? differenceInDays(showDay, effectiveStart) : 1;
    const daysPassed = differenceInDays(today, effectiveStart);
    const progressPercent = Math.max(0, Math.min(100, (daysPassed / totalSpan) * 100));

    // Empty state
    if (!showDay || sortedMilestones.length === 0) {
        return (
            <div 
                className="rounded-3xl p-8 text-center"
                style={{
                    background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 8px 24px -8px rgba(180,150,140,0.15)',
                }}
            >
                <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{
                        background: 'rgba(255,255,255,0.6)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                    }}
                >
                    <Sparkles className="w-6 h-6" style={{ color: colors.accent }} />
                </div>
                <h3 
                    className="text-lg font-bold tracking-tight mb-1"
                    style={{ 
                        color: 'transparent',
                        backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                    }}
                >
                    Your Production Journey
                </h3>
                <p className="text-sm" style={{ color: colors.muted }}>
                    Set your show date to begin the adventure.
                </p>
            </div>
        );
    }

    return (
        <div 
            className="rounded-3xl overflow-hidden"
            style={{
                background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 15px 50px -15px rgba(180,150,140,0.15)',
            }}
        >
            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h3 
                        className="text-lg font-bold tracking-tight"
                        style={{ 
                            color: 'transparent',
                            backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            textShadow: '0 2px 3px rgba(255,255,255,0.7)',
                            filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                        }}
                    >
                        Road to Opening Night
                    </h3>
                    <span 
                        className="text-xs font-medium px-3 py-1 rounded-full"
                        style={{
                            background: 'rgba(255,255,255,0.5)',
                            color: colors.muted,
                        }}
                    >
                        {format(showDay, 'MMM d, yyyy')}
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    <span 
                        className="text-sm font-medium px-4 py-1.5 rounded-full"
                        style={{
                            background: totalDays <= 0 
                                ? 'rgba(212,100,100,0.15)' 
                                : totalDays <= 7 
                                    ? 'rgba(212,165,116,0.15)' 
                                    : 'rgba(126,184,154,0.15)',
                            color: totalDays <= 0 
                                ? '#d46464' 
                                : totalDays <= 7 
                                    ? '#d4a574' 
                                    : '#7eb89a',
                        }}
                    >
                        {totalDays} days left
                    </span>
                    <button 
                        onClick={() => setExpanded(!expanded)}
                        className="p-2 rounded-xl transition-all hover:bg-white/40"
                        style={{ color: colors.muted }}
                    >
                        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Timeline Content */}
            {expanded && (
                <div className="px-6 pb-6">
                    {/* Progress Bar */}
                    <div className="relative mb-6">
                        <div 
                            className="h-1.5 rounded-full"
                            style={{ background: 'rgba(200,180,170,0.2)' }}
                        >
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                className="h-full rounded-full relative"
                                style={{ background: `linear-gradient(90deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)` }}
                            >
                                <div 
                                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full border-2"
                                    style={{ 
                                        background: '#fff',
                                        borderColor: colors.etchDark,
                                        boxShadow: '0 2px 8px rgba(138,112,112,0.4)',
                                    }}
                                />
                            </motion.div>
                        </div>
                    </div>

                    {/* Milestones Grid */}
                    <div className="flex flex-wrap gap-3">
                        {sortedMilestones.map((milestone, idx) => (
                            <MilestoneCard
                                key={milestone.id}
                                milestone={milestone}
                                index={idx}
                                onUpdate={(updated) => {
                                    const newList = sortedMilestones.map(m => 
                                        m.id === updated.id ? updated : m
                                    );
                                    onMilestoneUpdate(newList);
                                }}
                            />
                        ))}

                        {/* Opening Night Card */}
                        <div 
                            className="flex-1 min-w-[140px] max-w-[180px] rounded-2xl p-4 text-center"
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
                                boxShadow: '0 8px 24px -8px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
                                border: '1px solid rgba(196,160,160,0.2)',
                            }}
                        >
                            <p 
                                className="text-sm font-bold"
                                style={{ 
                                    color: 'transparent',
                                    backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                }}
                            >
                                Opening Night
                            </p>
                            <p className="text-xs mt-1" style={{ color: colors.muted }}>
                                {format(showDay, 'MMM d')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MilestoneCard({ milestone, index, onUpdate }) {
    const dueDate = parseISO(milestone.due_date);
    const isPastDate = isPast(dueDate) && !isToday(dueDate);
    const isTodayDate = isToday(dueDate);
    
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
            className={`
                flex-1 min-w-[140px] max-w-[180px] rounded-2xl p-4 transition-all group
                ${isPastDate ? 'opacity-50' : 'hover:scale-[1.02]'}
            `}
            style={{
                background: isPastDate 
                    ? 'rgba(240,235,230,0.5)' 
                    : isTodayDate 
                        ? 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)'
                        : 'rgba(255,255,255,0.5)',
                boxShadow: isPastDate 
                    ? 'none' 
                    : isTodayDate 
                        ? '0 8px 24px -8px rgba(212,165,116,0.3), inset 0 1px 1px rgba(255,255,255,0.8)'
                        : 'inset 0 1px 1px rgba(255,255,255,0.6)',
                border: isTodayDate ? '1px solid rgba(212,165,116,0.3)' : 'none',
            }}
        >
            {/* Date + Edit */}
            <div className="flex items-center justify-between mb-2">
                <span 
                    className={`text-xs font-bold tracking-wide uppercase ${isPastDate ? 'line-through' : ''}`}
                    style={{ 
                        color: isPastDate ? '#c4b5ab' : isTodayDate ? '#d4a574' : colors.etchLight,
                    }}
                >
                    {format(dueDate, 'MMM d')}
                </span>
                
                <Popover open={isEditing} onOpenChange={setIsEditing}>
                    <PopoverTrigger asChild>
                        <button 
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/50"
                            style={{ color: colors.muted }}
                        >
                            <Edit2 className="w-3 h-3" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent 
                        className="w-auto p-4 rounded-2xl z-50"
                        style={{
                            background: 'linear-gradient(145deg, rgba(253,238,236,0.98) 0%, rgba(252,243,240,0.98) 100%)',
                            boxShadow: '0 20px 60px -20px rgba(180,150,140,0.4)',
                            border: '1px solid rgba(255, 200, 200, 0.3)',
                        }}
                    >
                        <div className="space-y-3">
                            <h4 className="font-medium text-sm" style={{ color: '#8b7d72' }}>Reschedule</h4>
                            <input 
                                type="date" 
                                value={tempDate}
                                onChange={(e) => setTempDate(e.target.value)}
                                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                                style={{ 
                                    background: 'rgba(255,255,255,0.6)',
                                    color: '#6b5d52',
                                    border: '1px solid rgba(200,180,170,0.2)',
                                }}
                            />
                            <button 
                                onClick={handleSave} 
                                className="w-full py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                                style={{
                                    background: `linear-gradient(145deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
                                    color: '#fff',
                                    boxShadow: '0 4px 12px -2px rgba(138,112,112,0.3)',
                                }}
                            >
                                Update
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
            
            {/* Milestone name */}
            <p 
                className="text-sm font-medium leading-tight"
                style={{ color: isPastDate ? '#c4b5ab' : '#8b7d72' }}
            >
                {milestone.name}
            </p>
        </motion.div>
    );
}