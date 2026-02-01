import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    ArrowLeft, Calendar, MapPin, Plus, GripVertical, 
    Music, Users, Timer, Trash2, Shirt, Lightbulb, PenTool, Footprints, ChevronDown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import RoutineDetailSheet from './RoutineDetailSheet';
import PerformanceTimeline from './PerformanceTimeline';

// Design tokens
const colors = {
  ink: '#1a1a1a',
  muted: '#8a8478',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
};

// Etched text component
const EtchedText = ({ children, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };
  
  return (
    <span
      className={`${sizes[size]} font-bold tracking-tight ${className}`}
      style={{
        color: 'transparent',
        backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
        filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
      }}
    >
      {children}
    </span>
  );
};

// Conflict Helper
const findConflicts = (routineA, routineB) => {
    if (!routineA || !routineB) return [];
    const studentsA = routineA.performers || [];
    const studentsB = routineB.performers || [];
    return studentsA.filter(studentId => studentsB.includes(studentId));
};

export default function PerformanceDetail({ performanceId, onBack }) {
    const navigate = useNavigate();
    const [newRoutineTitle, setNewRoutineTitle] = useState('');
    const [formData, setFormData] = useState({});
    const [selectedRoutine, setSelectedRoutine] = useState(null);
    const [selectedSection, setSelectedSection] = useState('general');
    const [runSheetExpanded, setRunSheetExpanded] = useState(true);
    const queryClient = useQueryClient();

    const [optimisticMilestones, setOptimisticMilestones] = useState(null);

    // Fetch Performance Data
    const { data: performance } = useQuery({
        queryKey: ['performance', performanceId],
        queryFn: () => base44.entities.Performance.list().then(list => list.find(p => p.id === performanceId))
    });

    useEffect(() => {
        if (performance) {
            setFormData({
                title: performance.title || '',
                date: performance.date || '',
                venue: performance.venue || null
            });
            setVenueSearch(performance.venue?.venue_name || performance.venue || ''); 
            setOptimisticMilestones(performance.timeline_milestones);
        }
    }, [performance]);

    // Venue Autocomplete State
    const [venueSearch, setVenueSearch] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (venueSearch.length > 2 && showSuggestions) {
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
    }, [venueSearch, showSuggestions]);

    const handleVenueSelect = async (placeId, description) => {
        setVenueSearch(description);
        setShowSuggestions(false);
        
        try {
            const { data: details } = await base44.functions.invoke('googlePlacesDetails', { place_id: placeId });
            const updatedVenue = details;
            setFormData(prev => ({ ...prev, venue: updatedVenue }));
            updatePerformance.mutate({ ...performance, venue: updatedVenue });
            toast.success("Venue details linked!");
        } catch (err) {
            toast.error("Failed to get venue details");
        }
    };

    const handleVenueBlur = () => {
        setTimeout(() => {
            if (showSuggestions) {
                setShowSuggestions(false);
            }
            
            const currentVenueName = performance.venue?.venue_name || (typeof performance.venue === 'string' ? performance.venue : '');
            
            if (venueSearch !== currentVenueName) {
                const manualVenue = { venue_name: venueSearch };
                setFormData(prev => ({ ...prev, venue: manualVenue }));
                updatePerformance.mutate({ ...performance, venue: manualVenue });
            }
        }, 200);
    };

    // Fetch Routines
    const { data: routines = [] } = useQuery({
        queryKey: ['routines', performanceId],
        queryFn: async () => {
            const all = await base44.entities.PerformanceRoutine.list();
            return all.filter(r => r.performance_id === performanceId).sort((a, b) => a.order_index - b.order_index);
        }
    });

    // Fetch Students
    const { data: students = [] } = useQuery({
        queryKey: ['all_students'],
        queryFn: () => base44.entities.Student.list()
    });

    // Mutations
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
            performers: []
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

    // Handlers
    const handleTitleBlur = () => {
        if (performance && formData.title !== performance.title) {
            updatePerformance.mutate({ ...performance, title: formData.title });
        }
    };

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setFormData({ ...formData, date: newDate });
        updatePerformance.mutate({ ...performance, date: newDate });
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        
        const items = Array.from(routines);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

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

    if (!performance) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-[#c4a0a0] border-t-transparent animate-spin mx-auto mb-4" />
                    <p style={{ color: '#8b7d72' }}>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="min-h-screen relative overflow-hidden"
            style={{ 
                fontFamily: "'DM Sans', -apple-system, sans-serif",
                background: '#ffffff',
            }}
        >
            {/* Ambient background shapes */}
            <div 
                className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
            />
            <div 
                className="fixed bottom-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
            />

            <div className="relative max-w-4xl mx-auto px-8 py-12">
                
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm mb-8" style={{ color: '#c4b5ab' }}>
                    <button onClick={onBack} className="cursor-pointer hover:text-[#a89585] transition-colors flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Performances
                    </button>
                    <span>›</span>
                    <span style={{ color: '#8b7d72' }}>{performance.title}</span>
                </div>

                {/* Main Profile Card - Frosted Glass */}
                <div 
                    className="relative rounded-3xl p-8 mb-8"
                    style={{
                        background: 'linear-gradient(145deg, rgba(253,238,236,0.85) 0%, rgba(250,232,228,0.7) 30%, rgba(248,235,230,0.6) 70%, rgba(252,243,240,0.75) 100%)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(200,180,170,0.15), 0 20px 60px -20px rgba(180,150,140,0.2)',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    {/* Inner glow */}
                    <div 
                        className="absolute inset-0 rounded-3xl pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)',
                        }}
                    />

                    <div className="relative flex flex-col md:flex-row items-start gap-8">
                        {/* Info */}
                        <div className="flex-1 pt-2">
                            <h1 
                                className="text-4xl font-bold tracking-tight mb-1"
                                style={{ 
                                    color: 'transparent',
                                    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
                                    filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                                }}
                            >
                                {formData.title || 'Untitled Event'}
                            </h1>
                            <Input 
                                value={formData.title || ''}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                onBlur={handleTitleBlur}
                                className="text-lg bg-transparent border-none px-0 focus-visible:ring-0 placeholder:text-[#c4b5ab] h-auto p-0 shadow-none sr-only"
                                placeholder="Event Title"
                                style={{ color: '#8b7d72' }}
                            />
                            
                            {/* Meta Tags */}
                            <div className="flex flex-wrap gap-3 mt-4">
                                <div 
                                    className="flex items-center gap-2 px-4 py-2 rounded-full"
                                    style={{
                                        background: 'rgba(255,255,255,0.5)',
                                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 1px 3px rgba(180,150,140,0.1)',
                                    }}
                                >
                                    <Calendar className="w-4 h-4" style={{ color: '#a48bc4' }} />
                                    <input 
                                        type="date" 
                                        value={formData.date || ''} 
                                        onChange={handleDateChange}
                                        className="bg-transparent border-none focus:outline-none p-0 cursor-pointer text-sm"
                                        style={{ color: '#8b7d72' }}
                                    />
                                </div>
                                
                                <div 
                                    className="relative flex items-center gap-2 px-4 py-2 rounded-full"
                                    style={{
                                        background: 'rgba(255,255,255,0.5)',
                                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 1px 3px rgba(180,150,140,0.1)',
                                    }}
                                >
                                    <MapPin className="w-4 h-4" style={{ color: '#d4a574' }} />
                                    <input 
                                        value={venueSearch} 
                                        placeholder="Set venue..."
                                        onChange={(e) => {
                                            setVenueSearch(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onBlur={handleVenueBlur}
                                        className="bg-transparent border-none focus:outline-none w-32 placeholder:text-[#c4b5ab] text-sm"
                                        style={{ color: '#8b7d72' }}
                                    />
                                    {showSuggestions && (suggestions.length > 0 || isFetchingSuggestions) && (
                                        <div 
                                            className="absolute top-full left-0 mt-2 w-72 rounded-2xl z-50 overflow-hidden"
                                            style={{
                                                background: 'linear-gradient(145deg, rgba(253,238,236,0.98) 0%, rgba(252,243,240,0.98) 100%)',
                                                boxShadow: '0 20px 60px -20px rgba(180,150,140,0.4)',
                                                border: '1px solid rgba(255, 200, 200, 0.3)',
                                            }}
                                        >
                                            {isFetchingSuggestions && <div className="p-3 text-xs" style={{ color: '#b5a599' }}>Loading...</div>}
                                            {suggestions.map((s) => (
                                                <div 
                                                    key={s.place_id}
                                                    onMouseDown={() => handleVenueSelect(s.place_id, s.description)}
                                                    className="p-3 cursor-pointer transition-colors hover:bg-white/50"
                                                    style={{ borderBottom: '1px solid rgba(200,180,170,0.15)' }}
                                                >
                                                    <div className="font-medium" style={{ color: '#8b7d72' }}>{s.main_text}</div>
                                                    <div className="text-xs truncate" style={{ color: '#b5a599' }}>{s.secondary_text}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div 
                                    className="flex items-center gap-2 px-4 py-2 rounded-full"
                                    style={{
                                        background: 'rgba(255,255,255,0.5)',
                                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 1px 3px rgba(180,150,140,0.1)',
                                    }}
                                >
                                    <Timer className="w-4 h-4" style={{ color: '#7eb89a' }} />
                                    <span className="text-sm" style={{ color: '#8b7d72' }}>{totalDurationFormatted}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="text-right pt-2">
                            <div className="mb-4">
                                <p className="text-sm mb-1" style={{ color: '#b5a599' }}>Routines</p>
                                <p className="text-4xl font-light" style={{ color: '#8b7d72' }}>
                                    {routines.length}
                                </p>
                            </div>
                            <Button
                                onClick={() => navigate(`/performances?mode=producer&id=${performanceId}`)}
                                className="rounded-xl px-5 py-2 text-sm font-medium transition-all hover:scale-[1.02]"
                                style={{
                                    background: 'rgba(255,255,255,0.6)',
                                    color: '#8b7d72',
                                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
                                }}
                            >
                                <PenTool className="w-3 h-3 mr-2" /> Backstage
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="mb-8">
                    <PerformanceTimeline 
                        milestones={optimisticMilestones || performance?.timeline_milestones} 
                        showDate={performance?.date}
                        onMilestoneUpdate={async (updatedMilestones) => {
                            setOptimisticMilestones(updatedMilestones);
                            updatePerformance.mutate({ 
                                ...performance, 
                                timeline_milestones: updatedMilestones 
                            });

                            const updates = [];
                            updatedMilestones.forEach(ms => {
                                if (ms.tasks) {
                                    ms.tasks.forEach(t => {
                                        if (t.family_task_id) {
                                            updates.push(
                                                base44.entities.FamilyTask.update(t.family_task_id, { 
                                                    due_date: ms.due_date 
                                                }).catch(err => console.error("Failed to update task", t.family_task_id, err))
                                            );
                                        }
                                    });
                                }
                            });
                            
                            if (updates.length > 0) {
                                try {
                                    await Promise.all(updates);
                                    queryClient.invalidateQueries(['tasks', performanceId]);
                                    toast.success("Timeline & tasks updated!");
                                } catch (e) {
                                    console.error("Error updating tasks", e);
                                }
                            }
                        }}
                    />
                </div>

                {/* Run Sheet Card - Frosted */}
                <div 
                    className="rounded-3xl p-8"
                    style={{
                        background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 15px 50px -15px rgba(180,150,140,0.15)',
                    }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-medium" style={{ color: '#8b7d72' }}>Run Sheet</h2>
                            <p className="text-sm mt-1" style={{ color: '#b5a599' }}>{routines.length} acts · {totalDurationFormatted} total</p>
                        </div>
                        
                        {/* Quick Add Routine */}
                        <form onSubmit={handleAddRoutine} className="flex gap-2">
                            <div 
                                className="rounded-xl p-1"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,252,250,0.5) 100%)',
                                    boxShadow: 'inset 0 2px 4px rgba(180,150,140,0.08), 0 1px 2px rgba(255,255,255,0.8)',
                                }}
                            >
                                <Input 
                                    value={newRoutineTitle}
                                    onChange={(e) => setNewRoutineTitle(e.target.value)}
                                    placeholder="Add routine..."
                                    className="border-none shadow-none focus-visible:ring-0 h-9 text-sm bg-transparent w-40"
                                    style={{ color: '#6b5d52' }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!newRoutineTitle.trim()}
                                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-40"
                                style={{
                                    background: newRoutineTitle.trim() 
                                        ? 'linear-gradient(145deg, #8b7d72 0%, #6b5d52 100%)'
                                        : 'rgba(180,170,160,0.3)',
                                    color: '#fff',
                                    boxShadow: newRoutineTitle.trim() 
                                        ? '0 4px 12px -2px rgba(107,93,82,0.3)'
                                        : 'none',
                                }}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </form>
                    </div>

                    {/* Toggle */}
                    <button 
                        onClick={() => setRunSheetExpanded(!runSheetExpanded)}
                        className="flex items-center gap-2 mb-4 text-sm transition-colors hover:opacity-70"
                        style={{ color: '#b5a599' }}
                    >
                        {runSheetExpanded ? 'Hide' : 'Show'} routines
                        <ChevronDown 
                            className={`w-4 h-4 transition-transform ${runSheetExpanded ? 'rotate-180' : ''}`} 
                        />
                    </button>

                    {runSheetExpanded && (
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="run-sheet">
                                {(provided) => (
                                    <div 
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="space-y-3"
                                    >
                                        {routines.map((routine, index) => {
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
                                                                relative rounded-2xl p-4 transition-all cursor-pointer hover:scale-[1.01]
                                                                ${snapshot.isDragging ? 'rotate-1 scale-105 z-50' : ''}
                                                            `}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                background: snapshot.isDragging 
                                                                    ? 'rgba(255,255,255,0.95)'
                                                                    : 'rgba(255,255,255,0.5)',
                                                                boxShadow: snapshot.isDragging 
                                                                    ? '0 20px 40px -10px rgba(180,150,140,0.3), inset 0 1px 1px rgba(255,255,255,1)'
                                                                    : 'inset 0 1px 1px rgba(255,255,255,0.6)',
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                {/* Handle & Number */}
                                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing" style={{ color: '#c4b5ab' }}>
                                                                        <GripVertical className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="font-mono font-bold text-lg w-6" style={{ color: '#b5a599' }}>{index + 1}</span>
                                                                </div>

                                                                {/* Details */}
                                                                <div className="flex-1">
                                                                    <div className="font-medium" style={{ color: '#8b7d72' }}>{routine.title}</div>
                                                                    <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#b5a599' }}>
                                                                        <span className="flex items-center gap-1">
                                                                            <Music className="w-3 h-3" />
                                                                            {routine.song_title || 'No music'}
                                                                        </span>
                                                                        <span className="flex items-center gap-1">
                                                                            <Users className="w-3 h-3" />
                                                                            {routine.performers?.length || 0}
                                                                        </span>
                                                                        {hasConflict && (
                                                                            <span 
                                                                                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                                                                                style={{ background: 'rgba(212,165,116,0.15)', color: '#d4a574' }}
                                                                            >
                                                                                <Timer className="w-3 h-3" />
                                                                                Quick Change
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Status Icons */}
                                                                <div className="flex gap-2">
                                                                    <div 
                                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                                            routine.song_title ? 'bg-[rgba(164,139,196,0.15)]' : 'bg-[rgba(200,180,170,0.1)]'
                                                                        }`}
                                                                        style={{ color: routine.song_title ? '#a48bc4' : '#c4b5ab' }}
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedRoutine(routine); setSelectedSection('music'); }}
                                                                    >
                                                                        <Music className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <div 
                                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                                            routine.costume_details ? 'bg-[rgba(200,170,156,0.15)]' : 'bg-[rgba(200,180,170,0.1)]'
                                                                        }`}
                                                                        style={{ color: routine.costume_details ? '#c8aa9c' : '#c4b5ab' }}
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedRoutine(routine); setSelectedSection('costumes'); }}
                                                                    >
                                                                        <Shirt className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <div 
                                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                                            routine.lighting_notes ? 'bg-[rgba(212,165,116,0.15)]' : 'bg-[rgba(200,180,170,0.1)]'
                                                                        }`}
                                                                        style={{ color: routine.lighting_notes ? '#d4a574' : '#c4b5ab' }}
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedRoutine(routine); setSelectedSection('lighting'); }}
                                                                    >
                                                                        <Lightbulb className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <div 
                                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                                            routine.notes ? 'bg-[rgba(126,184,154,0.15)]' : 'bg-[rgba(200,180,170,0.1)]'
                                                                        }`}
                                                                        style={{ color: routine.notes ? '#7eb89a' : '#c4b5ab' }}
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedRoutine(routine); setSelectedSection('choreography'); }}
                                                                    >
                                                                        <Footprints className="w-3.5 h-3.5" />
                                                                    </div>
                                                                </div>

                                                                {/* Duration & Delete */}
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-mono text-sm" style={{ color: '#b5a599' }}>
                                                                        {Math.floor(routine.duration_seconds / 60)}:{(routine.duration_seconds % 60).toString().padStart(2, '0')}
                                                                    </span>
                                                                    <button 
                                                                        className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                                                        style={{ color: '#c8aa9c' }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (confirm("Delete this routine?")) deleteRoutine.mutate(routine.id);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
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
                    )}
                    
                    {routines.length === 0 && runSheetExpanded && (
                        <div className="py-12 text-center" style={{ color: '#b5a599' }}>
                            Add routines to build your show
                        </div>
                    )}
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