import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    ArrowLeft, Calendar, MapPin, Clock, Plus, GripVertical, 
    Music, Users, AlertTriangle, CheckCircle2, Mic2, Save,
    PlayCircle, PauseCircle, Timer, Trash2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// --- Conflict Helper ---
// Checks if any student in routine A is also in routine B
const findConflicts = (routineA, routineB) => {
    if (!routineA || !routineB) return [];
    const studentsA = routineA.performers || [];
    const studentsB = routineB.performers || [];
    return studentsA.filter(studentId => studentsB.includes(studentId));
};

export default function PerformanceDetail({ performanceId, onBack }) {
    const [isEditing, setIsEditing] = useState(false);
    const [newRoutineTitle, setNewRoutineTitle] = useState('');
    const queryClient = useQueryClient();

    // 1. Fetch Performance Data
    const { data: performance } = useQuery({
        queryKey: ['performance', performanceId],
        queryFn: () => base44.entities.Performance.list().then(list => list.find(p => p.id === performanceId))
    });

    // 2. Fetch Routines
    const { data: routines = [] } = useQuery({
        queryKey: ['routines', performanceId],
        queryFn: async () => {
            const all = await base44.entities.PerformanceRoutine.list();
            return all.filter(r => r.performance_id === performanceId).sort((a, b) => a.order_index - b.order_index);
        }
    });

    // 3. Fetch Students (for name resolution and conflict checking visual)
    const { data: students = [] } = useQuery({
        queryKey: ['all_students'],
        queryFn: () => base44.entities.Student.list()
    });

    // --- Mutations ---

    const updatePerformance = useMutation({
        mutationFn: (data) => base44.entities.Performance.update(performanceId, data),
        onSuccess: () => {
            setIsEditing(false);
            queryClient.invalidateQueries(['performance', performanceId]);
        }
    });

    const createRoutine = useMutation({
        mutationFn: (title) => base44.entities.PerformanceRoutine.create({
            performance_id: performanceId,
            title: title,
            duration_seconds: 180,
            order_index: routines.length + 1,
            performers: [] // Empty start
        }),
        onSuccess: () => {
            setNewRoutineTitle('');
            queryClient.invalidateQueries(['routines', performanceId]);
        }
    });

    const updateRoutine = useMutation({
        mutationFn: (data) => base44.entities.PerformanceRoutine.update(data.id, data),
        onSuccess: () => queryClient.invalidateQueries(['routines', performanceId])
    });

    const deleteRoutine = useMutation({
        mutationFn: (id) => base44.entities.PerformanceRoutine.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['routines', performanceId])
    });

    // --- Handlers ---

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        
        const items = Array.from(routines);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Optimistic UI update could happen here, but for simplicity we'll just fire updates
        // In a real app, you'd batch this or use a more sophisticated ordering system
        items.forEach((item, index) => {
            if (item.order_index !== index + 1) {
                updateRoutine.mutate({ id: item.id, order_index: index + 1 });
            }
        });
    };

    const handleAddRoutine = (e) => {
        e.preventDefault();
        if (newRoutineTitle.trim()) {
            createRoutine.mutate(newRoutineTitle);
        }
    };

    // Calculate total runtime
    const totalDurationSeconds = routines.reduce((acc, r) => acc + (r.duration_seconds || 0), 0);
    const totalDurationFormatted = `${Math.floor(totalDurationSeconds / 60)}m ${totalDurationSeconds % 60}s`;

    if (!performance) return <div className="p-8 text-center">Loading Quarterback View...</div>;

    return (
        <div className="space-y-6">
            {/* --- Quarterback Header --- */}
            <div className="bg-[#333333] text-white rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10">
                    <button 
                        onClick={onBack}
                        className="flex items-center text-white/60 hover:text-white transition-colors mb-6 text-sm font-medium uppercase tracking-wider"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Events
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="space-y-4 max-w-2xl">
                            {isEditing ? (
                                <Input 
                                    value={performance.title}
                                    onChange={(e) => updatePerformance.mutate({ ...performance, title: e.target.value })} // Note: This fires on every keystroke, ideally debounced or on blur
                                    className="text-4xl font-serif bg-white/10 border-white/20 text-white h-16 px-4 rounded-xl"
                                />
                            ) : (
                                <h1 className="text-4xl md:text-5xl font-serif leading-tight">
                                    {performance.title}
                                </h1>
                            )}
                            
                            <div className="flex flex-wrap gap-6 text-sm text-white/70">
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                    <Calendar className="w-4 h-4 text-indigo-300" />
                                    {isEditing ? (
                                        <input 
                                            type="date" 
                                            value={performance.date} 
                                            onChange={(e) => updatePerformance.mutate({ ...performance, date: e.target.value })} // simplified
                                            className="bg-transparent border-none text-white focus:outline-none"
                                        />
                                    ) : format(new Date(performance.date), 'MMMM d, yyyy')}
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                    <MapPin className="w-4 h-4 text-pink-300" />
                                    {isEditing ? (
                                        <input 
                                            value={performance.venue || ''} 
                                            placeholder="Set Venue"
                                            onChange={(e) => updatePerformance.mutate({ ...performance, venue: e.target.value })} // simplified
                                            className="bg-transparent border-none text-white focus:outline-none w-32"
                                        />
                                    ) : (performance.venue || 'TBD')}
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                    <Timer className="w-4 h-4 text-amber-300" />
                                    <span>Run Time: {totalDurationFormatted}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button 
                                onClick={() => setIsEditing(!isEditing)}
                                variant="outline" 
                                className="bg-transparent text-white border-white/20 hover:bg-white/10"
                            >
                                {isEditing ? 'Done' : 'Edit Details'}
                            </Button>
                            <Button 
                                onClick={() => toast.info("Show Mode is coming soon!", { description: "This feature will allow you to run the show in real-time." })}
                                className="bg-white text-[#333333] hover:bg-gray-100 font-bold shadow-lg shadow-black/20"
                            >
                                <PlayCircle className="w-4 h-4 mr-2" /> Start Show Mode
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Main Workspace --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Col: Run Sheet (The Quarterback View) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-serif text-[#333333] flex items-center gap-2">
                            Run Sheet <Badge className="bg-gray-100 text-gray-500">{routines.length} Acts</Badge>
                        </h2>
                        
                        {/* Quick Add Routine */}
                        <form onSubmit={handleAddRoutine} className="flex gap-2">
                            <Input 
                                value={newRoutineTitle}
                                onChange={(e) => setNewRoutineTitle(e.target.value)}
                                placeholder="Add new routine..."
                                className="bg-white border-gray-200 w-64 rounded-xl"
                            />
                            <Button type="submit" disabled={!newRoutineTitle.trim()} className="rounded-xl">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>

                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden p-2">
                        <div className="px-6 py-3 grid grid-cols-12 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-2">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-6">Routine Details</div>
                            <div className="col-span-3">Tech/Music</div>
                            <div className="col-span-2 text-right">Duration</div>
                        </div>

                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="run-sheet">
                                {(provided) => (
                                    <div 
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="space-y-2"
                                    >
                                        {routines.map((routine, index) => {
                                            // Conflict Check: Look at previous routine
                                            const prevRoutine = index > 0 ? routines[index - 1] : null;
                                            const conflicts = prevRoutine ? findConflicts(prevRoutine, routine) : [];
                                            const hasConflict = conflicts.length > 0;

                                            return (
                                                <Draggable key={routine.id} draggableId={routine.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className={`
                                                                relative rounded-2xl border transition-all duration-200 group
                                                                ${snapshot.isDragging ? 'bg-white shadow-2xl scale-105 z-50 border-indigo-200' : 'bg-white border-transparent hover:border-gray-100 hover:bg-gray-50'}
                                                            `}
                                                        >
                                                            {/* Conflict Alert Line */}
                                                            {hasConflict && (
                                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1 border border-red-200">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    Quick Change: {conflicts.length} Dancers
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-12 items-center p-3">
                                                                {/* Handle & Number */}
                                                                <div className="col-span-1 flex items-center justify-center gap-2">
                                                                    <div {...provided.dragHandleProps} className="text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-500">
                                                                        <GripVertical className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="font-mono font-bold text-gray-400 text-lg">{index + 1}</span>
                                                                </div>

                                                                {/* Details */}
                                                                <div className="col-span-6 pr-4 border-r border-gray-100/50">
                                                                    <div className="font-bold text-[#333333] text-base">{routine.title}</div>
                                                                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                                                        {routine.song_title ? (
                                                                            <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                                                                <Music className="w-3 h-3" /> {routine.song_title}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="italic text-gray-300">No music set</span>
                                                                        )}
                                                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                                        <span className="flex items-center gap-1">
                                                                            <Users className="w-3 h-3" /> {routine.performers?.length || 0}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Tech Info */}
                                                                <div className="col-span-3 px-4">
                                                                    {/* Placeholder for Lighting/Costume quick tags */}
                                                                    <div className="flex gap-1">
                                                                         {routine.costume_details ? (
                                                                             <div className="w-2 h-2 rounded-full bg-pink-400" title="Costumes Checked" />
                                                                         ) : (
                                                                             <div className="w-2 h-2 rounded-full bg-gray-200" title="No Costume Details" />
                                                                         )}
                                                                         {routine.lighting_notes ? (
                                                                             <div className="w-2 h-2 rounded-full bg-amber-400" title="Lighting Set" />
                                                                         ) : (
                                                                             <div className="w-2 h-2 rounded-full bg-gray-200" title="No Lighting Details" />
                                                                         )}
                                                                    </div>
                                                                    {hasConflict && (
                                                                        <div className="text-[10px] text-red-500 mt-1 leading-tight">
                                                                            Conflict w/ Prev
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Actions & Time */}
                                                                <div className="col-span-2 text-right flex items-center justify-end gap-3">
                                                                    <span className="font-mono text-sm text-gray-500">
                                                                        {Math.floor(routine.duration_seconds / 60)}:{(routine.duration_seconds % 60).toString().padStart(2, '0')}
                                                                    </span>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-8 w-8 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => deleteRoutine.mutate(routine.id)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                        
                        {routines.length === 0 && (
                            <div className="py-12 text-center text-gray-400 text-sm">
                                Drag and drop routines here to build your show.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col: Stats & Quick Actions */}
                <div className="space-y-6">
                    {/* Stats Card */}
                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Event Stats</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Total Routines</span>
                                <span className="font-serif text-xl">{routines.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Total Performers</span>
                                {/* De-dupe students across all routines */}
                                <span className="font-serif text-xl">
                                    {new Set(routines.flatMap(r => r.performers || [])).size}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Est. Duration</span>
                                <span className="font-serif text-xl">{totalDurationFormatted}</span>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span>3 Potential Conflicts</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Tools */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[32px] text-white shadow-lg">
                        <h3 className="text-lg font-serif mb-2">AI Assistant</h3>
                        <p className="text-white/80 text-sm mb-4">
                            Need help ordering the show? I can minimize quick changes for you.
                        </p>
                        <Button 
                            onClick={() => toast.info("AI Optimization", { description: "I'm learning how to optimize your run sheet. Check back soon!" })}
                            className="w-full bg-white text-indigo-600 hover:bg-indigo-50 border-none font-bold"
                        >
                            <Mic2 className="w-4 h-4 mr-2" /> "Optimize Run Order"
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}