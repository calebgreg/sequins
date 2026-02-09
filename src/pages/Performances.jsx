import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { 
    Calendar, MapPin, Clock, Users, Music, 
    Plus, Search, ChevronRight, Star, Trophy, PenTool
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import PerformanceDetail from '../components/performances/PerformanceDetail';
import ProducerWorkspace from '../components/performances/ProducerWorkspace';

// Design tokens matching TeacherDetails
const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
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

export default function PerformancesPage() {
    const [selectedPerformanceId, setSelectedPerformanceId] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const modeParam = searchParams.get('mode');
    const idParam = searchParams.get('id');

    const [view, setView] = useState(modeParam === 'producer' ? 'producer' : 'list');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeColumn, setActiveColumn] = useState('planning');
    
    React.useEffect(() => {
        if (modeParam === 'producer') {
            setView('producer');
            setSelectedPerformanceId(null);
        } else if (idParam) {
            setSelectedPerformanceId(idParam);
            setView('list');
        }
    }, [modeParam, idParam]);

    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    const studioId = currentUser?.studio_id;

    const { data: performances = [], isLoading } = useQuery({
        queryKey: ['performances', studioId],
        queryFn: () => base44.entities.Performance.filter({ studio_id: studioId }, '-date'),
        enabled: !!studioId,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => base44.entities.Performance.update(id, { status }),
        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries(['performances']);
            const previousPerformances = queryClient.getQueryData(['performances']);
            
            queryClient.setQueryData(['performances'], (old) => {
                return old.map(p => 
                    p.id === id ? { ...p, status } : p
                );
            });
            
            return { previousPerformances };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['performances'], context.previousPerformances);
        },
        onSettled: () => {
            queryClient.invalidateQueries(['performances']);
        }
    });

    const onDragEnd = (result) => {
        if (!result.destination) return;
        
        const { draggableId, destination } = result;
        const newStatus = destination.droppableId;
        
        const performance = performances.find(p => p.id === draggableId);
        if (performance && performance.status !== newStatus) {
            updateStatusMutation.mutate({ id: draggableId, status: newStatus });
        }
    };

    const filteredPerformances = performances.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const columns = {
        planning: { label: 'Planning', icon: '✎' },
        rehearsal: { label: 'Rehearsal', icon: '♪' },
        showtime: { label: 'Showtime', icon: '★' },
        completed: { label: 'Completed', icon: '✓' },
    };

    if (selectedPerformanceId) {
        return (
            <PerformanceDetail 
                performanceId={selectedPerformanceId} 
                onBack={() => setSelectedPerformanceId(null)} 
            />
        );
    }

    if (view === 'producer') {
        return (
            <ProducerWorkspace 
                performanceId={modeParam === 'producer' ? idParam : null}
                onCancel={() => {
                    setSearchParams({});
                    setView('list');
                }}
                onPlanCreated={(id) => {
                    setSearchParams({});
                    setView('list');
                    setSelectedPerformanceId(id);
                }}
            />
        );
    }

    const activeColumnItems = filteredPerformances.filter(p => p.status === activeColumn);

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
                
                {/* Header Card - Frosted Glass */}
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

                    <div className="relative flex flex-col md:flex-row items-start justify-between gap-6">
                        <div>
                            <EtchedText size="xl">Performances</EtchedText>
                            <p className="text-base mt-2 max-w-lg" style={{ color: '#a8998e' }}>
                                The command center for your recitals, competitions, and showcases.
                            </p>
                        </div>
                        
                        <Button 
                            onClick={() => setView('producer')}
                            className="rounded-2xl px-8 py-6 text-base font-bold tracking-tight transition-all hover:scale-[1.02]"
                            style={{
                                background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
                                boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
                                border: '1px solid rgba(255, 220, 210, 0.5)',
                            }}
                        >
                            <span
                                style={{
                                    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    color: 'transparent',
                                }}
                            >
                                <PenTool className="w-4 h-4 mr-2 inline" /> 
                                Enter Backstage
                            </span>
                        </Button>
                    </div>

                    {/* Search */}
                    <div 
                        className="relative mt-6 rounded-2xl p-1"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,252,250,0.5) 100%)',
                            boxShadow: 'inset 0 2px 4px rgba(180,150,140,0.08), 0 1px 2px rgba(255,255,255,0.8)',
                        }}
                    >
                        <div className="flex items-center gap-2 px-4">
                            <Search className="w-4 h-4" style={{ color: '#b5a599' }} />
                            <Input 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search events..."
                                className="border-none shadow-none focus-visible:ring-0 flex-1 min-w-0 h-10 text-sm bg-transparent"
                                style={{ color: '#6b5d52' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tab Navigation - Pill Style */}
                <div className="flex justify-center mb-8">
                    <div 
                        className="inline-flex items-center gap-1 p-1.5 rounded-2xl"
                        style={{
                            background: 'rgba(240,230,225,0.5)',
                            boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.1)',
                        }}
                    >
                        {Object.entries(columns).map(([id, col]) => {
                            const count = filteredPerformances.filter(p => p.status === id).length;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setActiveColumn(id)}
                                    className="px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                                    style={{
                                        background: activeColumn === id 
                                            ? 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)'
                                            : 'transparent',
                                        color: activeColumn === id ? '#8b7d72' : '#b5a599',
                                        boxShadow: activeColumn === id 
                                            ? '0 2px 8px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,0.8)'
                                            : 'none',
                                    }}
                                >
                                    <span>{col.label}</span>
                                    {count > 0 && (
                                        <span 
                                            className="text-xs px-2 py-0.5 rounded-full"
                                            style={{ 
                                                background: activeColumn === id ? 'rgba(200,170,156,0.2)' : 'rgba(200,170,156,0.15)',
                                                color: activeColumn === id ? '#8b7d72' : '#b5a599',
                                            }}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Performance Cards */}
                {isLoading ? (
                    <div className="text-center py-20" style={{ color: '#b5a599' }}>Loading events...</div>
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId={activeColumn}>
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`space-y-4 min-h-[300px] rounded-3xl p-4 transition-colors ${
                                        snapshot.isDraggingOver ? 'bg-[rgba(253,238,236,0.3)]' : ''
                                    }`}
                                >
                                    {activeColumnItems.length === 0 ? (
                                        <div 
                                            className="text-center py-16 rounded-2xl"
                                            style={{
                                                background: 'rgba(255,255,255,0.4)',
                                                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                                            }}
                                        >
                                            <p style={{ color: '#b5a599' }}>No performances in {columns[activeColumn].label.toLowerCase()}</p>
                                        </div>
                                    ) : (
                                        activeColumnItems.map((perf, index) => (
                                            <Draggable key={perf.id} draggableId={perf.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => setSelectedPerformanceId(perf.id)}
                                                        className={`
                                                            relative rounded-2xl p-6 transition-all cursor-pointer hover:scale-[1.01]
                                                            ${snapshot.isDragging ? 'rotate-1 scale-105 z-50' : ''}
                                                        `}
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                            background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
                                                            boxShadow: snapshot.isDragging 
                                                                ? '0 20px 60px -15px rgba(180,150,140,0.4), inset 0 1px 1px rgba(255,255,255,0.7)'
                                                                : 'inset 0 1px 1px rgba(255,255,255,0.7), 0 8px 24px -8px rgba(180,150,140,0.15)',
                                                        }}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <span 
                                                                        className="text-xs font-medium uppercase tracking-wider"
                                                                        style={{ color: '#b5a599' }}
                                                                    >
                                                                        {format(new Date(perf.date), 'MMM d, yyyy')}
                                                                    </span>
                                                                    <span 
                                                                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                                                                        style={{
                                                                            background: perf.type === 'competition' 
                                                                                ? 'rgba(212,165,116,0.15)' 
                                                                                : 'rgba(164,139,196,0.15)',
                                                                        }}
                                                                    >
                                                                        {perf.type === 'competition' 
                                                                            ? <Trophy className="w-3 h-3" style={{ color: '#d4a574' }} />
                                                                            : <Star className="w-3 h-3" style={{ color: '#a48bc4' }} />
                                                                        }
                                                                    </span>
                                                                </div>
                                                                
                                                                <h3 
                                                                    className="text-xl font-bold tracking-tight mb-2"
                                                                    style={{ 
                                                                        color: 'transparent',
                                                                        backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                                                                        backgroundClip: 'text',
                                                                        WebkitBackgroundClip: 'text',
                                                                    }}
                                                                >
                                                                    {perf.title}
                                                                </h3>

                                                                <div className="flex items-center gap-2 text-sm" style={{ color: '#a8998e' }}>
                                                                    <MapPin className="w-3.5 h-3.5" style={{ color: '#c4b5ab' }} />
                                                                    <span>
                                                                        {perf.venue?.venue_name || (typeof perf.venue === 'string' ? perf.venue : 'No venue set')}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: '#d4c4ba' }} />
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))
                                    )}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}

                {/* Add Performance Button */}
                <div className="flex justify-center pt-8">
                    <button 
                        onClick={() => setView('producer')}
                        className="px-10 py-4 rounded-2xl text-base font-bold tracking-tight transition-all hover:scale-[1.02]"
                        style={{
                            background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
                            boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
                            border: '1px solid rgba(255, 220, 210, 0.5)',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        <span
                            style={{
                                backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent',
                                textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
                                filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2 inline" />
                            New Performance
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}