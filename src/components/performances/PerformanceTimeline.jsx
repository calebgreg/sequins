import React, { useRef, useState, useEffect } from 'react';
import { format, differenceInDays, addDays, startOfDay, parseISO, isBefore, isSameDay } from 'date-fns';
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Milestone, CalendarDays, Clock } from 'lucide-react';

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

    if (!showDay || sortedMilestones.length === 0) {
        return (
            <div className="h-[400px] bg-white rounded-[24px] border border-gray-100 p-8 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
                    <Milestone className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="font-serif text-xl text-gray-900 mb-2">Production Timeline</h3>
                <p className="text-gray-400 max-w-sm mb-6 text-sm">
                    Set a show date and generate milestones to see your interactive roadmap.
                </p>
            </div>
        );
    }

    const totalDays = differenceInDays(showDay, today);
    // Ensure we have a valid range (at least 30 days for visual context if strictly short, or actual range)
    const spanDays = Math.max(totalDays, 1);
    
    // Generate grid markers (every 2 weeks or month depending on span)
    const markers = [];
    const markerCount = spanDays > 120 ? 6 : 4; // approximate markers
    const step = Math.ceil(spanDays / markerCount);
    
    for (let i = 0; i <= spanDays; i += step) {
        markers.push({
            day: i,
            date: addDays(today, i),
            label: i === 0 ? 'Today' : i === spanDays ? 'Show Day' : null
        });
    }

    // Ensure Show Day is explicitly the last marker if not hit by step
    if (markers[markers.length - 1].day < spanDays) {
        markers.push({ day: spanDays, date: showDay, label: 'Show Day' });
    }

    return (
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Production Schedule</h3>
                        <p className="text-xs text-gray-500 font-medium">
                            {format(today, 'MMM d')} — {format(showDay, 'MMM d, yyyy')} ({totalDays} days)
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Drag knobs to reschedule</span>
                </div>
            </div>

            {/* Timeline Body */}
            <div className="p-8 relative min-h-[400px]" ref={containerRef}>
                {/* Background Grid - aligned to content box (inset-x-8 matches p-8) */}
                <div className="absolute inset-x-8 top-8 bottom-4 pointer-events-none">
                     {markers.map((marker, idx) => (
                         <div key={idx} className="h-full flex flex-col items-center relative" style={{ left: `${(marker.day / spanDays) * 100}%`, position: 'absolute' }}>
                             <div className="h-full w-px bg-gray-100 border-r border-dashed border-gray-200" />
                             <div className="absolute bottom-0 translate-y-full pt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                 {marker.label || format(marker.date, 'MMM d')}
                             </div>
                         </div>
                     ))}
                </div>

                {/* Tracks */}
                <div className="relative z-10 space-y-8 mt-4">
                    {sortedMilestones.map((milestone) => (
                        <TimelineRow
                            key={milestone.id}
                            milestone={milestone}
                            today={today}
                            showDay={showDay}
                            spanDays={spanDays}
                            containerWidth={width}
                            onUpdate={onMilestoneUpdate}
                            allMilestones={milestones}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function TimelineRow({ milestone, today, showDay, spanDays, containerWidth, onUpdate, allMilestones }) {
    const [isDragging, setIsDragging] = useState(false);
    const constraintsRef = useRef(null);
    
    // Calculate initial position
    const dueDate = parseISO(milestone.due_date);
    const daysFromStart = differenceInDays(dueDate, today);
    const initialProgress = Math.max(0, Math.min(1, daysFromStart / spanDays));
    
    // Motion value for smooth dragging
    const initialX = initialProgress * containerWidth;
    const x = useMotionValue(initialX);
    
    // Sync x with props when not dragging
    useEffect(() => {
        if (!isDragging && containerWidth > 0) {
            x.set(initialProgress * containerWidth);
        }
    }, [initialProgress, containerWidth, isDragging]);

    // Derived values for visual feedback
    const daysUntil = differenceInDays(dueDate, today);
    const isOverdue = daysUntil < 0;
    const isDueSoon = daysUntil >= 0 && daysUntil <= 14;
    
    // Professional monochrome palette with minimal status colors
    let knobBorderClass = "border-gray-200 shadow-sm";
    let progressTrackClass = "bg-gray-800"; // High contrast dark track for visibility
    let dotColorClass = "bg-gray-800";
    
    if (isOverdue) {
        knobBorderClass = "border-rose-200";
        progressTrackClass = "bg-rose-500"; 
        dotColorClass = "bg-rose-500";
    } else if (isDueSoon) {
        // Subtle urgency - Dark Gray / Slate (Professional)
        knobBorderClass = "border-slate-500";
        progressTrackClass = "bg-slate-500";
        dotColorClass = "bg-slate-700";
    }

    // Dynamic date label while dragging
    // Dynamic date label while dragging
    const [dragDate, setDragDate] = useState(dueDate);

    const handleDrag = (event, info) => {
        if (containerWidth > 0) {
            const currentX = x.get();
            const progress = Math.max(0, Math.min(1, currentX / containerWidth));
            const newDays = Math.round(progress * spanDays);
            const newDate = addDays(today, newDays);
            // Only update state if date changed to minimize re-renders
            if (!isSameDay(newDate, dragDate)) {
                setDragDate(newDate);
            }
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        if (onUpdate) {
            // Optimistic update of the specific milestone
            const updatedList = allMilestones.map(m => 
                m.id === milestone.id ? { ...m, due_date: format(dragDate, 'yyyy-MM-dd') } : m
            );
            onUpdate(updatedList);
        }
    };

    return (
        <div className="relative group">
            <div className="flex justify-between items-end mb-2 px-1">
                <span className="text-sm font-medium text-gray-900">
                    {milestone.name}
                </span>
                <span className={`text-xs font-mono font-medium ${isDragging ? 'text-indigo-600 scale-110' : 'text-gray-400'} transition-all`}>
                    {format(isDragging ? dragDate : dueDate, 'MMM d')}
                </span>
            </div>

            <div className="h-3 w-full rounded-full bg-gray-50 border border-gray-100 relative flex items-center overflow-visible">
                {/* Active Track Portion (Progress Indicator) */}
                <motion.div 
                    className={`absolute left-0 h-full rounded-full ${progressTrackClass}`}
                    style={{ width: x }}
                />

                {/* Draggable Knob */}
                <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: containerWidth }}
                    dragElastic={0}
                    dragMomentum={false}
                    style={{ x, y: "-50%", left: 0 }} // Explicit left: 0 is crucial for absolute positioning
                    onDragStart={() => setIsDragging(true)}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    className={`
                        absolute top-1/2 -ml-[10px]
                        w-5 h-5 rounded-full bg-white border-2 cursor-grab active:cursor-grabbing
                        flex items-center justify-center z-20 transition-all
                        ${isDragging ? 'scale-110 border-gray-900 shadow-md' : `hover:scale-105 ${knobBorderClass}`}
                    `}
                >
                    {/* Inner Dot */}
                    <div className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} />
                    
                    {/* Tooltip Label (Visible on Hover/Drag) */}
                    <div className={`
                        absolute bottom-full mb-2 left-1/2 -translate-x-1/2 
                        bg-gray-900 text-white text-[10px] py-1 px-2 rounded-lg 
                        whitespace-nowrap shadow-xl pointer-events-none transition-all
                        ${isDragging || 'group-hover:opacity-100 opacity-0'}
                    `}>
                        {format(isDragging ? dragDate : dueDate, 'EEE, MMM d')}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}