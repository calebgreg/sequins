import React, { useState, useRef } from 'react';
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
    const scrollRef = useRef(null);
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
                <div 
                    ref={scrollRef}
                    className="relative overflow-x-auto px-6 pb-6"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <style>{`.timeline-scroll::-webkit-scrollbar { display: none; }`}</style>
                    
                    {/* Timeline Track */}
                    <div className="relative min-w-max">
                        {/* The horizontal line - centered vertically */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full" style={{ background: 'rgba(200,180,170,0.25)' }}>
                            {/* Progress fill */}
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                className="h-full rounded-full relative"
                                style={{ background: `linear-gradient(90deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)` }}
                            >
                                {/* Current position dot */}
                                <div 
                                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full border-2"
                                    style={{ 
                                        background: '#fff',
                                        borderColor: colors.etchDark,
                                        boxShadow: '0 2px 8px rgba(138,112,112,0.4)',
                                    }}
                                />
                            </motion.div>
                        </div>

                        {/* Milestones Container */}
                        <div className="relative flex items-center" style={{ minHeight: '280px' }}>
                            {sortedMilestones.map((milestone, idx) => (
                                <MilestoneNode
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

                            {/* Opening Night Node */}
                            <div className="relative flex-shrink-0 w-28 flex flex-col items-center justify-center">
                                {/* Connector dot on the line */}
                                <div 
                                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full z-10"
                                    style={{ 
                                        background: `linear-gradient(135deg, ${colors.accent} 0%, #8b6eb8 100%)`,
                                        boxShadow: `0 0 20px ${colors.accent}40, 0 2px 8px rgba(164,139,196,0.4)`,
                                    }}
                                />
                                
                                {/* Card below */}
                                <div className="absolute top-[58%] mt-4 text-center">
                                    <div 
                                        className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2"
                                        style={{
                                            background: `linear-gradient(145deg, rgba(164,139,196,0.2) 0%, rgba(164,139,196,0.1) 100%)`,
                                            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5)',
                                        }}
                                    >
                                        <Sparkles className="w-5 h-5" style={{ color: colors.accent }} />
                                    </div>
                                    <p 
                                        className="text-sm font-bold whitespace-nowrap"
                                        style={{ 
                                            color: 'transparent',
                                            backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
                                            backgroundClip: 'text',
                                            WebkitBackgroundClip: 'text',
                                        }}
                                    >
                                        Opening Night
                                    </p>
                                    <p className="text-xs mt-0.5" style={{ color: colors.accent }}>
                                        {format(showDay, 'MMM d')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MilestoneNode({ milestone, index, onUpdate }) {
    const dueDate = parseISO(milestone.due_date);
    const isPastDate = isPast(dueDate) && !isToday(dueDate);
    const isTodayDate = isToday(dueDate);
    const isTop = index % 2 === 0;
    
    const [isEditing, setIsEditing] = useState(false);
    const [tempDate, setTempDate] = useState(milestone.due_date);

    const handleSave = () => {
        onUpdate({ ...milestone, due_date: tempDate });
        setIsEditing(false);
    };

    return (
        <div className="relative flex-shrink-0 w-32 flex flex-col items-center justify-center">
            {/* Connector dot on the line */}
            <div 
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 transition-transform hover:scale-125"
                style={{ 
                    background: isPastDate 
                        ? 'rgba(200,180,170,0.4)' 
                        : isTodayDate 
                            ? '#d4a574'
                            : '#fff',
                    border: `2px solid ${isPastDate ? 'rgba(200,180,170,0.3)' : colors.etchLight}`,
                    boxShadow: isTodayDate ? '0 0 12px rgba(212,165,116,0.5)' : '0 1px 4px rgba(180,150,140,0.2)',
                }}
            />
            
            {/* Vertical connector line */}
            <div 
                className={`absolute left-1/2 -translate-x-1/2 w-px ${isTop ? 'bottom-1/2 mb-1.5 h-8' : 'top-1/2 mt-1.5 h-8'}`}
                style={{ background: `linear-gradient(${isTop ? '0deg' : '180deg'}, rgba(200,180,170,0.3) 0%, transparent 100%)` }}
            />

            {/* Card - alternates top/bottom */}
            <motion.div 
                initial={{ opacity: 0, y: isTop ? 10 : -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className={`absolute ${isTop ? 'bottom-[58%] mb-4' : 'top-[58%] mt-4'} w-full px-1 group`}
            >
                <div 
                    className={`
                        rounded-2xl p-3 transition-all cursor-pointer
                        ${isPastDate ? 'opacity-50' : 'hover:scale-105'}
                    `}
                    style={{
                        background: isPastDate 
                            ? 'rgba(240,235,230,0.5)' 
                            : isTodayDate 
                                ? 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)'
                                : 'linear-gradient(145deg, rgba(255,255,255,0.8) 0%, rgba(255,252,250,0.7) 100%)',
                        boxShadow: isPastDate 
                            ? 'none' 
                            : isTodayDate 
                                ? '0 8px 24px -8px rgba(212,165,116,0.3), inset 0 1px 1px rgba(255,255,255,0.8)'
                                : 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 12px -4px rgba(180,150,140,0.15)',
                        border: isTodayDate ? '1px solid rgba(212,165,116,0.3)' : '1px solid rgba(255,255,255,0.5)',
                    }}
                >
                    {/* Date badge */}
                    <div className="flex items-center justify-between mb-1.5">
                        <span 
                            className={`text-[10px] font-bold tracking-wide uppercase ${isPastDate ? 'line-through' : ''}`}
                            style={{ 
                                color: isPastDate ? '#c4b5ab' : isTodayDate ? '#d4a574' : colors.etchLight,
                            }}
                        >
                            {format(dueDate, 'MMM d')}
                        </span>
                        
                        <Popover open={isEditing} onOpenChange={setIsEditing}>
                            <PopoverTrigger asChild>
                                <button 
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/50"
                                    style={{ color: colors.muted }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Edit2 className="w-2.5 h-2.5" />
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
                        className="text-xs font-semibold leading-tight text-center"
                        style={{ color: isPastDate ? '#c4b5ab' : '#8b7d72' }}
                    >
                        {milestone.name}
                    </p>
                </div>
            </motion.div>
        </div>
    );
}