import React, { useRef, useState, useEffect } from 'react';
import { format, differenceInDays, addDays, startOfDay, parseISO, isSameDay } from 'date-fns';
import { motion, useMotionValue } from "framer-motion";
import { CalendarDays, Sparkles, Flag, Clock } from 'lucide-react';

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

    // --- ELEGANT EMPTY STATE (PINK GLASS) ---
    if (!showDay || sortedMilestones.length === 0) {
        return (
            <div className="h-[400px] w-full rounded-[32px] overflow-hidden relative group">
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
                        className="w-24 h-24 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/60 shadow-[0_8px_32px_0_rgba(244,63,94,0.1)]"
                    >
                        <Sparkles className="w-10 h-10 text-rose-400" strokeWidth={1.5} />
                    </motion.div>
                    
                    <h3 className="font-serif text-3xl mb-3 text-rose-950 font-medium">Production Timeline</h3>
                    <p className="text-rose-800/60 max-w-sm mb-8 text-lg font-light leading-relaxed">
                        A blank canvas awaits. Set your show date to unveil the production roadmap.
                    </p>
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
        <div className="bg-white/60 backdrop-blur-xl rounded-[32px] border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col h-full relative">
            {/* Soft pink gradient underlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-rose-50/30 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 px-8 py-6 border-b border-rose-100/50 flex justify-between items-center">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white to-rose-50 flex items-center justify-center text-rose-400 shadow-[0_2px_10px_-2px_rgba(244,63,94,0.1)] border border-white">
                        <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-serif text-rose-950 text-xl tracking-tight">Production Schedule</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-rose-300 uppercase tracking-widest">
                                {format(today, 'MMM d')} — {format(showDay, 'MMM d, yyyy')}
                            </span>
                            <span className="w-1 h-1 bg-rose-200 rounded-full" />
                            <span className="text-xs font-medium text-rose-700/60 font-serif italic">{totalDays} Days until curtain</span>
                        </div>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-rose-500 bg-rose-50/50 px-4 py-2 rounded-full border border-rose-100/50 backdrop-blur-sm">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Interactive</span>
                </div>
            </div>

            {/* Timeline Body */}
            <div className="p-8 relative min-h-[400px]" ref={containerRef}>
                {/* Background Grid */}
                <div className="absolute inset-x-8 top-8 bottom-8 pointer-events-none">
                     {markers.map((marker, idx) => (
                         <div key={idx} className="h-full flex flex-col items-center relative group" style={{ left: `${(marker.day / spanDays) * 100}%`, position: 'absolute' }}>
                             <div className="h-full w-px bg-rose-200/20 border-r border-dashed border-rose-300/20 group-last:bg-rose-300/40 group-last:border-rose-300/40" />
                             <div className={`absolute bottom-0 translate-y-full pt-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${marker.label === 'Show Day' ? 'text-rose-500' : 'text-rose-300/60'}`}>
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
    
    // Glassmorphic Colors
    let trackGradient = "from-rose-300/80 to-pink-400/80";
    let knobRing = "ring-white/50 shadow-[0_4px_14px_0_rgba(244,63,94,0.3)]";
    let textColor = "text-rose-900/80";
    let flagColor = "bg-white/60 text-rose-400 border-rose-100";
    
    if (isOverdue) {
        trackGradient = "from-red-300/80 to-red-400/80";
        knobRing = "ring-red-100/50 shadow-[0_4px_14px_0_rgba(239,68,68,0.3)]";
        textColor = "text-red-900/80";
        flagColor = "bg-red-50/60 text-red-500 border-red-100";
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, ease: "easeOut" }}
            className="relative group"
        >
            <div className="flex justify-between items-end mb-3 px-1">
                <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center backdrop-blur-sm border transition-colors ${flagColor}`}>
                        {isOverdue ? <Flag className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-rose-300/50" />}
                    </div>
                    <span className={`text-sm font-medium tracking-wide ${textColor}`}>
                        {milestone.name}
                    </span>
                </div>
                <span className={`text-xs font-serif italic px-3 py-1 rounded-full transition-all border ${isDragging ? 'bg-rose-500 text-white shadow-lg scale-105 border-rose-400' : 'bg-white/40 text-rose-800/60 border-rose-100/50'}`}>
                    {format(isDragging ? dragDate : dueDate, 'MMM do')}
                </span>
            </div>

            <div className="h-2 w-full rounded-full bg-rose-100/30 border border-rose-100/20 relative flex items-center">
                {/* Active Gradient Track with Shine */}
                <motion.div 
                    className={`absolute left-0 h-full rounded-full bg-gradient-to-r ${trackGradient} shadow-[0_0_10px_rgba(244,63,94,0.2)]`}
                    style={{ width: x }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
                </motion.div>

                {/* Draggable Glass Knob */}
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
                        w-6 h-6 rounded-full bg-white/80 backdrop-blur-md border border-white cursor-grab active:cursor-grabbing
                        flex items-center justify-center z-20 transition-all
                        ring-4 ${knobRing}
                        ${isDragging ? 'scale-110' : 'hover:scale-110'}
                    `}
                >
                    <div className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-400' : 'bg-rose-400'}`} />
                    
                    {/* Elegant Tooltip */}
                    <div className={`
                        absolute bottom-full mb-4 left-1/2 -translate-x-1/2 
                        bg-white/90 backdrop-blur-xl text-rose-900 text-[10px] font-medium py-2 px-4 rounded-xl 
                        whitespace-nowrap shadow-[0_10px_30px_-5px_rgba(244,63,94,0.3)] pointer-events-none transition-all border border-rose-100/50
                        flex flex-col items-center
                        ${isDragging || 'group-hover:opacity-100 opacity-0 translate-y-2 group-hover:translate-y-0'}
                    `}>
                        <span className="uppercase tracking-widest opacity-50 text-[8px] mb-0.5">Deadline</span>
                        {format(isDragging ? dragDate : dueDate, 'EEEE, MMM do')}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/90 rotate-45 border-r border-b border-rose-100/50"></div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}