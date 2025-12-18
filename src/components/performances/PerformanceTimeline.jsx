import React, { useRef, useState, useEffect } from 'react';
import { format, differenceInDays, addDays, startOfDay, parseISO, isSameDay } from 'date-fns';
import { motion, useMotionValue } from "framer-motion";
import { CalendarDays, Clock, Sparkles, Flag } from 'lucide-react';

export default function PerformanceTimeline({ milestones = [], showDate, onMilestoneUpdate }) {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(0);

    // Update width on resize
    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setWidth(entry.contentRect.width);
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const today = startOfDay(new Date());
    const showDay = showDate ? startOfDay(parseISO(showDate)) : null;
    
    // Sort milestones by date
    const sortedMilestones = [...(milestones || [])].sort((a, b) => {
        return new Date(a.due_date) - new Date(b.due_date);
    });

    // --- FUN EMPTY STATE ---
    if (!showDay || sortedMilestones.length === 0) {
        return (
            <div className="h-[400px] w-full rounded-[32px] overflow-hidden relative group">
                {/* Animated Purple Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-8 text-white">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mb-6 border border-white/20 shadow-xl shadow-purple-900/20"
                    >
                        <motion.div
                            animate={{ 
                                rotate: [0, 10, -10, 0],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{ 
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <Sparkles className="w-10 h-10 text-amber-300" />
                        </motion.div>
                    </motion.div>
                    
                    <h3 className="font-serif text-3xl mb-3 font-medium tracking-tight">Production Roadmap</h3>
                    <p className="text-indigo-100 max-w-sm mb-8 text-lg leading-relaxed font-light">
                        The stage is dark... for now. Set a show date to ignite your interactive production timeline.
                    </p>

                    <div className="flex gap-2">
                        <div className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0s' }} />
                        <div className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                </div>
            </div>
        );
    }

    const totalDays = differenceInDays(showDay, today);
    const spanDays = Math.max(totalDays, 1);
    
    // Generate grid markers
    const markers = [];
    const markerCount = spanDays > 120 ? 6 : 4;
    const step = Math.ceil(spanDays / markerCount);
    
    for (let i = 0; i <= spanDays; i += step) {
        markers.push({
            day: i,
            date: addDays(today, i),
            label: i === 0 ? 'Today' : i === spanDays ? 'Show Day' : null
        });
    }
    if (markers[markers.length - 1].day < spanDays) {
        markers.push({ day: spanDays, date: showDay, label: 'Show Day' });
    }

    return (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-white">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                        <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-serif text-[#333333] text-xl">Production Schedule</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {format(today, 'MMM d')} — {format(showDay, 'MMM d, yyyy')}
                            </span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span className="text-xs font-medium text-gray-500">{totalDays} Days to Curtain</span>
                        </div>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Interactive Timeline</span>
                </div>
            </div>

            {/* Timeline Body */}
            <div className="p-8 relative min-h-[400px] bg-[#FAFAFA]" ref={containerRef}>
                {/* Background Grid */}
                <div className="absolute inset-x-8 top-8 bottom-8 pointer-events-none">
                     {markers.map((marker, idx) => (
                         <div key={idx} className="h-full flex flex-col items-center relative group" style={{ left: `${(marker.day / spanDays) * 100}%`, position: 'absolute' }}>
                             <div className="h-full w-px bg-gray-200/60 border-r border-dashed border-gray-300/50 group-last:bg-indigo-200 group-last:border-indigo-200" />
                             <div className={`absolute bottom-0 translate-y-full pt-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${marker.label === 'Show Day' ? 'text-indigo-600' : 'text-gray-400'}`}>
                                 {marker.label || format(marker.date, 'MMM d')}
                             </div>
                         </div>
                     ))}
                </div>

                {/* Tracks */}
                <div className="relative z-10 space-y-10 mt-6">
                    {sortedMilestones.map((milestone, idx) => (
                        <TimelineRow
                            key={milestone.id}
                            milestone={milestone}
                            today={today}
                            showDay={showDay}
                            spanDays={spanDays}
                            containerWidth={width}
                            onUpdate={onMilestoneUpdate}
                            allMilestones={milestones}
                            index={idx}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function TimelineRow({ milestone, today, showDay, spanDays, containerWidth, onUpdate, allMilestones, index }) {
    const [isDragging, setIsDragging] = useState(false);
    
    const dueDate = parseISO(milestone.due_date);
    const daysFromStart = differenceInDays(dueDate, today);
    const initialProgress = Math.max(0, Math.min(1, daysFromStart / spanDays));
    
    const x = useMotionValue(initialProgress * containerWidth);
    
    useEffect(() => {
        if (!isDragging && containerWidth > 0) {
            const targetX = initialProgress * containerWidth;
            if (Math.abs(x.get() - targetX) > 2) {
                x.set(targetX);
            }
        }
    }, [initialProgress, containerWidth, isDragging, x]);

    const daysUntil = differenceInDays(dueDate, today);
    const isOverdue = daysUntil < 0;
    const isDueSoon = daysUntil >= 0 && daysUntil <= 14;
    
    // Dynamic styling based on status
    let trackGradient = "from-indigo-400 to-purple-500";
    let knobRing = "ring-indigo-100 group-hover:ring-indigo-200";
    let knobBorder = "border-indigo-500";
    let textColor = "text-gray-600";
    
    if (isOverdue) {
        trackGradient = "from-rose-400 to-pink-500";
        knobRing = "ring-rose-100 group-hover:ring-rose-200";
        knobBorder = "border-rose-500";
        textColor = "text-rose-600";
    } else if (isDueSoon) {
        trackGradient = "from-amber-400 to-orange-500";
        knobRing = "ring-amber-100 group-hover:ring-amber-200";
        knobBorder = "border-amber-500";
        textColor = "text-amber-700";
    }

    const [dragDate, setDragDate] = useState(dueDate);

    const handleDrag = (event, info) => {
        if (containerWidth > 0) {
            const currentX = x.get();
            const progress = Math.max(0, Math.min(1, currentX / containerWidth));
            const newDays = Math.round(progress * spanDays);
            const newDate = addDays(today, newDays);
            if (!isSameDay(newDate, dragDate)) {
                setDragDate(newDate);
            }
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        if (onUpdate) {
            const updatedList = allMilestones.map(m => 
                m.id === milestone.id ? { ...m, due_date: format(dragDate, 'yyyy-MM-dd') } : m
            );
            onUpdate(updatedList);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative group"
        >
            <div className="flex justify-between items-end mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isOverdue ? 'bg-rose-50 text-rose-500' : 'bg-white border border-gray-100 text-gray-400'}`}>
                        {isOverdue ? <Flag className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                    </div>
                    <span className={`text-sm font-bold ${textColor}`}>
                        {milestone.name}
                    </span>
                </div>
                <span className={`text-xs font-mono font-medium px-2 py-1 rounded-md transition-all ${isDragging ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-500'}`}>
                    {format(isDragging ? dragDate : dueDate, 'MMM d')}
                </span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-white border border-gray-100 relative flex items-center shadow-inner">
                {/* Active Gradient Track */}
                <motion.div 
                    className={`absolute left-0 h-full rounded-full bg-gradient-to-r ${trackGradient} opacity-80`}
                    style={{ width: x }}
                />

                {/* Draggable Knob */}
                <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: containerWidth }}
                    dragElastic={0}
                    dragMomentum={false}
                    style={{ x, y: "-50%", left: 0 }}
                    onDragStart={() => setIsDragging(true)}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    className={`
                        absolute top-1/2 -ml-[12px]
                        w-6 h-6 rounded-full bg-white border-2 cursor-grab active:cursor-grabbing
                        flex items-center justify-center z-20 transition-all shadow-md
                        ring-4 ${knobRing} ${knobBorder}
                        ${isDragging ? 'scale-110 shadow-lg ring-opacity-50' : 'hover:scale-110'}
                    `}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                    
                    {/* Floating Tooltip */}
                    <div className={`
                        absolute bottom-full mb-3 left-1/2 -translate-x-1/2 
                        bg-[#333333] text-white text-[10px] font-bold py-1.5 px-3 rounded-lg 
                        whitespace-nowrap shadow-xl pointer-events-none transition-all
                        flex flex-col items-center
                        ${isDragging || 'group-hover:opacity-100 opacity-0 translate-y-2 group-hover:translate-y-0'}
                    `}>
                        <span className="uppercase tracking-wider opacity-60 text-[9px] mb-0.5">Due Date</span>
                        {format(isDragging ? dragDate : dueDate, 'EEE, MMM d')}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#333333] rotate-45"></div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}