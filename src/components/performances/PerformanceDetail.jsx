import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    ArrowLeft, Calendar, MapPin, Plus, GripVertical, 
    Music, Users, AlertTriangle, Mic2, Footprints,
    PlayCircle, Timer, Trash2, Shirt, Lightbulb
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import RoutineDetailSheet from './RoutineDetailSheet';

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
    const [formData, setFormData] = useState({});
    const [selectedRoutine, setSelectedRoutine] = useState(null);
    const [selectedSection, setSelectedSection] = useState('general');
    const queryClient = useQueryClient();

    // 1. Fetch Performance Data
    const { data: performance } = useQuery({
        queryKey: ['performance', performanceId],
        queryFn: () => base44.entities.Performance.list().then(list => list.find(p => p.id === performanceId))
    });

    useEffect(() => {
        if (performance) {
            setFormData({
                title: performance.title || '',
                date: performance.date || '',
                venue: performance.venue || null // venue is now an object or null
            });
            // Initial display value for venue input
            setVenueSearch(performance.venue?.venue_name || performance.venue || ''); 
        }
    }, [performance]);

    // Venue Autocomplete State
    const [venueSearch, setVenueSearch] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

    // Debounce logic for venue search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (isEditing && venueSearch.length > 2 && showSuggestions) {
                setIsFetchingSuggestions(true);
                try {
                    const { data } = await base44.functions.invoke('googlePlacesAutocomplete', { query: venueSearch });
                    setSuggestions(data.suggestions || []);
                } catch (err) {
                    console.error("Failed to fetch suggestions", err);
                } finally {
                    setIsFetchingSuggestions(false);
                }
            } else {
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [venueSearch, isEditing, showSuggestions]);

    const handleVenueSelect = async (placeId, description) => {
        setVenueSearch(description);
        setShowSuggestions(false);
        
        try {
            const { data: details } = await base44.functions.invoke('googlePlacesDetails', { place_id: placeId });
            setFormData(prev => ({
                ...prev,
                venue: details
            }));
            toast.success("Venue details linked!");
        } catch (err) {
            toast.error("Failed to get venue details");
        }
    };

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
            queryClient.invalidateQueries(['performance', performanceId]);
            toast.success("Event updated");
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
            <div className="bg-[#333333] text-white rounded-[32px] shadow-2xl relative group">
                <div className="absolute inset-0 overflow-hidden rounded-[32px]">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                </div>
                
                <div className="relative z-10 p-8">
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
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                                            value={formData.date || ''} 
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="bg-transparent border-none text-white focus:outline-none"
                                        />
                                    ) : format(new Date(performance.date), 'MMMM d, yyyy')}
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                    <MapPin className="w-4 h-4 text-pink-300" />
                                    {isEditing ? (
                                        <div className="relative">
                                            <input 
                                                value={venueSearch} 
                                                placeholder="Search Venue..."
                                                onChange={(e) => {
                                                    setVenueSearch(e.target.value);
                                                    setShowSuggestions(true);
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                                className="bg-transparent border-none text-white focus:outline-none w-64 placeholder:text-white/50"
                                            />
                                            {showSuggestions && (suggestions.length > 0 || isFetchingSuggestions) && (
                                                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl text-gray-800 z-50 overflow-hidden text-sm">
                                                    {isFetchingSuggestions && <div className="p-3 text-gray-400 text-xs">Loading...</div>}
                                                    {suggestions.map((s) => (
                                                        <div 
                                                            key={s.place_id}
                                                            onClick={() => handleVenueSelect(s.place_id, s.description)}
                                                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                                                        >
                                                            <div className="font-bold text-[#333333]">{s.main_text}</div>
                                                            <div className="text-xs text-gray-500 truncate">{s.secondary_text}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="font-bold">
                                                {performance.venue?.venue_name || (typeof performance.venue === 'string' ? performance.venue : 'TBD')}
                                            </span>
                                            {performance.venue?.formatted_address && (
                                                <span className="text-[10px] opacity-80 max-w-[200px] truncate">
                                                    {performance.venue.formatted_address}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                    <Timer className="w-4 h-4 text-amber-300" />
                                    <span>Run Time: {totalDurationFormatted}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button 
                                onClick={() => {
                                    if (isEditing) {
                                        updatePerformance.mutate({ ...performance, ...formData });
                                    }
                                    setIsEditing(!isEditing);
                                }}
                                variant="outline" 
                                className="bg-transparent text-white border-white/20 hover:bg-white/10"
                            >
                                {isEditing ? 'Save' : 'Edit Details'}
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
            <div className="max-w-6xl mx-auto">

                {/* Run Sheet (The Quarterback View) */}
                <div className="space-y-6">
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

                    <div className="bg-transparent rounded-[32px] p-2">
                        <div className="px-6 py-3 grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-6">Routine Details</div>
                            <div className="col-span-3">Status</div>
                            <div className="col-span-2 text-right">Duration</div>
                        </div>

                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="run-sheet">
                                {(provided) => (
                                    <div 
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="space-y-4"
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
                                                            onClick={() => {
                                                                setSelectedRoutine(routine);
                                                                setSelectedSection('general');
                                                            }}
                                                            className={`
                                                                relative rounded-3xl border transition-all duration-300 group cursor-pointer overflow-hidden
                                                                ${snapshot.isDragging 
                                                                    ? 'bg-white/90 shadow-[0_20px_40px_-12px_rgba(244,63,94,0.3)] scale-105 z-50 border-rose-200 ring-1 ring-rose-100' 
                                                                    : hasConflict 
                                                                        ? 'bg-gradient-to-br from-rose-50/90 to-red-50/50 backdrop-blur-xl border-rose-200 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.1)]' 
                                                                        : 'bg-gradient-to-br from-white/80 to-rose-50/30 backdrop-blur-xl border-white/50 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(244,63,94,0.15)] hover:border-rose-100/50 hover:to-rose-50/60'
                                                                }
                                                            `}
                                                        >
                                                            {/* Glassmorphic Shine Effect */}
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                                            {/* Conflict Alert Line - Removed to avoid clipping, moved to status column */}

                                                            <div className="grid grid-cols-12 items-center p-3">
                                                                {/* Handle & Number */}
                                                                <div className="col-span-1 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                    <div {...provided.dragHandleProps} className="text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-500">
                                                                        <GripVertical className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="font-mono font-bold text-gray-400 text-lg">{index + 1}</span>
                                                                </div>

                                                                {/* Details */}
                                                                <div className="col-span-6 pr-4 border-r border-gray-100/50">
                                                                    <div 
                                                                        className="font-bold text-[#333333] text-base group-hover:text-indigo-600 transition-colors"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedRoutine(routine);
                                                                            setSelectedSection('general');
                                                                        }}
                                                                    >
                                                                        {routine.title}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                                                        <div 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedRoutine(routine);
                                                                                setSelectedSection('music');
                                                                            }}
                                                                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md cursor-pointer transition-colors ${
                                                                                routine.song_title 
                                                                                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' 
                                                                                    : 'text-gray-300 hover:text-gray-400 hover:bg-gray-100'
                                                                            }`}
                                                                        >
                                                                            <Music className="w-3 h-3" /> 
                                                                            {routine.song_title ? routine.song_title : <span className="italic">No music set</span>}
                                                                        </div>
                                                                        
                                                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                                        
                                                                        <div 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedRoutine(routine);
                                                                                setSelectedSection('performers');
                                                                            }}
                                                                            className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                        >
                                                                            <Users className="w-3 h-3" /> {routine.performers?.length || 0}
                                                                        </div>

                                                                        {hasConflict && (
                                                                            <>
                                                                                <span className="w-1 h-1 bg-rose-300/50 rounded-full" />
                                                                                <div className="flex items-center gap-1 text-rose-600 font-medium bg-rose-50/80 px-2 py-0.5 rounded-full border border-rose-100 shadow-sm text-[10px]">
                                                                                    <Timer className="w-3 h-3" />
                                                                                    <span>Quick Change ({conflicts.length})</span>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Status */}
                                                                <div className="col-span-3 px-4">
                                                                    <div className="flex gap-2">
                                                                         {/* Music Icon */}
                                                                         <div 
                                                                             className={`p-2 rounded-xl cursor-pointer hover:scale-105 transition-all shadow-sm border ${
                                                                                routine.song_title 
                                                                                    ? 'bg-white/80 text-indigo-500 border-indigo-100 shadow-indigo-100/30' 
                                                                                    : 'bg-white/40 text-gray-300 border-transparent'
                                                                             }`}
                                                                             title={routine.song_title ? "Music Set" : "No music"}
                                                                             onClick={(e) => { e.stopPropagation(); setSelectedRoutine(routine); setSelectedSection('music'); }}
                                                                         >
                                                                             <Music className="w-3.5 h-3.5" />
                                                                         </div>
                                                                         
                                                                         {/* Costume Icon */}
                                                                         <div 
                                                                             className={`p-2 rounded-xl cursor-pointer hover:scale-105 transition-all shadow-sm border ${
                                                                                routine.costume_details 
                                                                                    ? 'bg-white/80 text-rose-500 border-rose-100 shadow-rose-100/30' 
                                                                                    : 'bg-white/40 text-gray-300 border-transparent'
                                                                             }`} 
                                                                             title={routine.costume_details ? "Costumes Detailed" : "No costume details"}
                                                                             onClick={(e) => { e.stopPropagation(); setSelectedRoutine(routine); setSelectedSection('costumes'); }}
                                                                         >
                                                                             <Shirt className="w-3.5 h-3.5" />
                                                                         </div>

                                                                         {/* Lighting Icon */}
                                                                         <div 
                                                                             className={`p-2 rounded-xl cursor-pointer hover:scale-105 transition-all shadow-sm border ${
                                                                                routine.lighting_notes 
                                                                                    ? 'bg-white/80 text-amber-500 border-amber-100 shadow-amber-100/30' 
                                                                                    : 'bg-white/40 text-gray-300 border-transparent'
                                                                             }`} 
                                                                             title={routine.lighting_notes ? "Lighting Notes" : "No lighting details"}
                                                                             onClick={(e) => { e.stopPropagation(); setSelectedRoutine(routine); setSelectedSection('lighting'); }}
                                                                         >
                                                                             <Lightbulb className="w-3.5 h-3.5" />
                                                                         </div>

                                                                         {/* Choreography/Notes Icon */}
                                                                         <div 
                                                                             className={`p-2 rounded-xl cursor-pointer hover:scale-105 transition-all shadow-sm border ${
                                                                                routine.notes 
                                                                                    ? 'bg-white/80 text-purple-500 border-purple-100 shadow-purple-100/30' 
                                                                                    : 'bg-white/40 text-gray-300 border-transparent'
                                                                             }`} 
                                                                             title={routine.notes ? "Choreography Notes" : "No notes"}
                                                                             onClick={(e) => { e.stopPropagation(); setSelectedRoutine(routine); setSelectedSection('choreography'); }}
                                                                         >
                                                                             <Footprints className="w-3.5 h-3.5" />
                                                                         </div>
                                                                    </div>

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
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (confirm("Delete this routine?")) deleteRoutine.mutate(routine.id);
                                                                        }}
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

                <RoutineDetailSheet 
                    routine={selectedRoutine} 
                    open={!!selectedRoutine} 
                    onOpenChange={(open) => !open && setSelectedRoutine(null)}
                    allStudents={students}
                    selectedSection={selectedSection}
                />

            </div>
        </div>
    );
}