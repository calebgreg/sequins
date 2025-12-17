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

    if (!performance) return <div className="p-8 text-center text-pink-400">Loading Quarterback View...</div>;

    return (
        <div className="space-y-6 p-6 min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 rounded-[32px]">
            {/* --- Glassmorphic Header --- */}
            <div className="bg-white/40 backdrop-blur-xl border border-white/50 shadow-xl rounded-[32px] p-8 relative overflow-hidden group transition-all hover:shadow-2xl hover:bg-white/50">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-pink-200/20 to-purple-200/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                
                <div className="relative z-10">
                    <button 
                        onClick={onBack}
                        className="flex items-center text-gray-500 hover:text-pink-600 transition-colors mb-6 text-sm font-medium uppercase tracking-wider"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Events
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="space-y-4 max-w-2xl">
                            {isEditing ? (
                                <Input 
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="text-4xl font-serif bg-white/50 border-white/40 text-gray-800 h-16 px-4 rounded-xl shadow-inner focus:ring-pink-200"
                                />
                            ) : (
                                <h1 className="text-4xl md:text-5xl font-serif leading-tight text-gray-800 drop-shadow-sm">
                                    {performance.title}
                                </h1>
                            )}
                            
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full border border-white/60 shadow-sm backdrop-blur-sm">
                                    <Calendar className="w-4 h-4 text-pink-500" />
                                    {isEditing ? (
                                        <input 
                                            type="date" 
                                            value={formData.date || ''} 
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="bg-transparent border-none text-gray-700 focus:outline-none"
                                        />
                                    ) : format(new Date(performance.date), 'MMMM d, yyyy')}
                                </div>
                                <div className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full border border-white/60 shadow-sm backdrop-blur-sm">
                                    <MapPin className="w-4 h-4 text-purple-500" />
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
                                                className="bg-transparent border-none text-gray-700 focus:outline-none w-64 placeholder:text-gray-400"
                                            />
                                            {showSuggestions && (suggestions.length > 0 || isFetchingSuggestions) && (
                                                <div className="absolute top-full left-0 mt-2 w-72 bg-white/90 backdrop-blur-xl rounded-lg shadow-xl text-gray-800 z-50 overflow-hidden text-sm border border-pink-100">
                                                    {isFetchingSuggestions && <div className="p-3 text-gray-400 text-xs">Loading...</div>}
                                                    {suggestions.map((s) => (
                                                        <div 
                                                            key={s.place_id}
                                                            onClick={() => handleVenueSelect(s.place_id, s.description)}
                                                            className="p-3 hover:bg-pink-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                                                        >
                                                            <div className="font-bold text-gray-800">{s.main_text}</div>
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
                                <div className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full border border-white/60 shadow-sm backdrop-blur-sm">
                                    <Timer className="w-4 h-4 text-amber-500" />
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
                                className="bg-white/40 text-gray-700 border-white/60 hover:bg-white/60 hover:text-pink-600 rounded-full shadow-sm backdrop-blur-sm transition-all"
                            >
                                {isEditing ? 'Save' : 'Edit Details'}
                            </Button>
                            <Button 
                                onClick={() => toast.info("Show Mode is coming soon!", { description: "This feature will allow you to run the show in real-time." })}
                                className="bg-white/80 text-pink-600 hover:bg-white hover:text-pink-700 font-bold shadow-lg shadow-pink-100/50 rounded-full border border-pink-100 transition-all"
                            >
                                <PlayCircle className="w-4 h-4 mr-2" /> Start Show Mode
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Main Workspace --- */}
            <div className="max-w-6xl mx-auto pt-4">

                {/* Run Sheet (Glassmorphic Table) */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-2xl font-serif text-gray-800 flex items-center gap-2">
                            Run Sheet <Badge className="bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200">{routines.length} Acts</Badge>
                        </h2>
                        
                        {/* Quick Add Routine */}
                        <form onSubmit={handleAddRoutine} className="flex gap-2">
                            <Input 
                                value={newRoutineTitle}
                                onChange={(e) => setNewRoutineTitle(e.target.value)}
                                placeholder="Add new routine..."
                                className="bg-white/60 border-white/60 w-64 rounded-xl shadow-sm focus:ring-pink-200 backdrop-blur-sm"
                            />
                            <Button type="submit" disabled={!newRoutineTitle.trim()} className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white shadow-md shadow-pink-200">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>

                    <div className="bg-white/30 backdrop-blur-xl border border-white/50 rounded-[32px] shadow-xl overflow-hidden p-4 relative">
                        {/* Header Row */}
                        <div className="px-6 py-4 grid grid-cols-12 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-white/40 mb-2">
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
                                        className="space-y-3"
                                    >
                                        {routines.map((routine, index) => {
                                            // Conflict Check
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
                                                                relative rounded-2xl border transition-all duration-300 group cursor-pointer backdrop-blur-md
                                                                ${snapshot.isDragging 
                                                                    ? 'bg-white/90 shadow-2xl scale-105 z-50 border-pink-200 ring-2 ring-pink-100' 
                                                                    : 'bg-white/50 border-white/40 hover:bg-white/70 hover:border-pink-100 hover:shadow-lg hover:shadow-pink-50/50'
                                                                }
                                                            `}
                                                        >
                                                            {/* Conflict Alert Line */}
                                                            {hasConflict && (
                                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-red-50/90 backdrop-blur-sm text-red-500 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1 border border-red-100">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    Quick Change: {conflicts.length} Dancers
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-12 items-center p-4">
                                                                {/* Handle & Number */}
                                                                <div className="col-span-1 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                    <div {...provided.dragHandleProps} className="text-gray-300 cursor-grab active:cursor-grabbing hover:text-pink-400 transition-colors">
                                                                        <GripVertical className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="font-mono font-bold text-gray-300 text-lg group-hover:text-pink-300 transition-colors">{index + 1}</span>
                                                                </div>

                                                                {/* Details */}
                                                                <div className="col-span-6 pr-4 border-r border-white/30">
                                                                    <div 
                                                                        className="font-bold text-gray-800 text-lg group-hover:text-pink-600 transition-colors"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedRoutine(routine);
                                                                            setSelectedSection('general');
                                                                        }}
                                                                    >
                                                                        {routine.title}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                                                        <div 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedRoutine(routine);
                                                                                setSelectedSection('music');
                                                                            }}
                                                                            className={`flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-all border ${
                                                                                routine.song_title 
                                                                                    ? 'text-indigo-600 bg-indigo-50/50 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200' 
                                                                                    : 'text-gray-400 bg-gray-50/50 border-transparent hover:bg-gray-100'
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
                                                                            className="flex items-center gap-1 cursor-pointer hover:text-pink-600 transition-colors px-1 py-0.5 rounded hover:bg-pink-50"
                                                                        >
                                                                            <Users className="w-3 h-3" /> {routine.performers?.length || 0}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Status Icons */}
                                                                <div className="col-span-3 px-6">
                                                                    <div className="flex gap-2">
                                                                         {/* Music Icon */}
                                                                         <div 
                                                                             className={`p-2 rounded-xl cursor-pointer hover:scale-105 transition-all shadow-sm border ${
                                                                                routine.song_title 
                                                                                    ? 'bg-blue-50/80 text-blue-500 border-blue-100' 
                                                                                    : 'bg-gray-50/50 text-gray-300 border-transparent'
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
                                                                                    ? 'bg-pink-50/80 text-pink-500 border-pink-100' 
                                                                                    : 'bg-gray-50/50 text-gray-300 border-transparent'
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
                                                                                    ? 'bg-amber-50/80 text-amber-500 border-amber-100' 
                                                                                    : 'bg-gray-50/50 text-gray-300 border-transparent'
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
                                                                                    ? 'bg-purple-50/80 text-purple-500 border-purple-100' 
                                                                                    : 'bg-gray-50/50 text-gray-300 border-transparent'
                                                                             }`} 
                                                                             title={routine.notes ? "Choreography Notes" : "No notes"}
                                                                             onClick={(e) => { e.stopPropagation(); setSelectedRoutine(routine); setSelectedSection('choreography'); }}
                                                                         >
                                                                             <Footprints className="w-3.5 h-3.5" />
                                                                         </div>
                                                                    </div>
                                                                    {hasConflict && (
                                                                        <div className="text-[10px] text-red-400 mt-2 leading-tight flex items-center gap-1 font-medium pl-1">
                                                                            <AlertTriangle className="w-3 h-3" /> Quick Change
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Actions & Time */}
                                                                <div className="col-span-2 text-right flex items-center justify-end gap-3">
                                                                    <span className="font-mono text-sm text-gray-500 font-medium">
                                                                        {Math.floor(routine.duration_seconds / 60)}:{(routine.duration_seconds % 60).toString().padStart(2, '0')}
                                                                    </span>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
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
                            <div className="py-16 text-center text-gray-400 text-sm flex flex-col items-center">
                                <div className="w-16 h-16 bg-white/50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                    <Plus className="w-6 h-6 text-pink-300" />
                                </div>
                                <p>Drag and drop routines here to build your show.</p>
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