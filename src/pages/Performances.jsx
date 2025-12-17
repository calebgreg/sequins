import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    Calendar, MapPin, Clock, Users, Music, MoveVertical, 
    Plus, Search, ChevronRight, Play, Settings, AlertCircle,
    MoreHorizontal, Mic2, Star, Trophy, Sparkles, PenTool
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import PerformanceDetail from '../components/performances/PerformanceDetail';

import ProducerWorkspace from '../components/performances/ProducerWorkspace';

export default function PerformancesPage() {
    const [selectedPerformanceId, setSelectedPerformanceId] = useState(null);

    const [view, setView] = useState('list'); // 'list' | 'producer'
    const [searchQuery, setSearchQuery] = useState('');

    const queryClient = useQueryClient();

    // Fetch Performances
    const { data: performances = [], isLoading } = useQuery({
        queryKey: ['performances'],
        queryFn: () => base44.entities.Performance.list('-date'),
        staleTime: 5 * 60 * 1000, // 5 minutes
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
        planning: { label: 'Planning', color: 'bg-amber-50 border-amber-100 text-amber-900' },
        rehearsal: { label: 'Rehearsal', color: 'bg-blue-50 border-blue-100 text-blue-900' },
        showtime: { label: 'Showtime', color: 'bg-purple-50 border-purple-100 text-purple-900' },
        completed: { label: 'Completed', color: 'bg-green-50 border-green-100 text-green-900' },
        archived: { label: 'Archived', color: 'bg-gray-50 border-gray-100 text-gray-900' }
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
                onCancel={() => setView('list')}
                onPlanCreated={(id) => {
                    setView('list');
                    setSelectedPerformanceId(id);
                }}
            />
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 p-4 md:p-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-serif text-[#333333] mb-2">Performances</h1>
                    <p className="text-gray-500 max-w-lg">
                        The command center for your recitals, competitions, and showcases. 
                        Manage run sheets, costumes, and logistics in one place.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        onClick={() => setView('producer')}
                        className="bg-[#333333] hover:bg-black text-white rounded-full px-8 h-12 shadow-lg shadow-gray-200 transition-all hover:scale-105 group"
                    >
                        <PenTool className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" /> 
                        Open Drafting Table
                    </Button>
                </div>
            </div>

            {/* Filter/Search Bar */}
            <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-full md:w-auto self-start">
                <Search className="w-5 h-5 text-gray-400 ml-2" />
                <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events..."
                    className="border-none shadow-none focus-visible:ring-0 w-full md:w-64"
                />
            </div>



            {/* Kanban Board */}
            <div className="overflow-x-auto pb-8">
                {isLoading ? (
                    <div className="py-20 text-center text-gray-400">Loading events...</div>
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex gap-6 min-w-[1200px]">
                            {Object.entries(columns).map(([columnId, columnDef]) => {
                                const columnItems = filteredPerformances.filter(p => p.status === columnId);
                                
                                return (
                                    <div key={columnId} className="flex-1 min-w-[300px] flex flex-col">
                                        <div className={`mb-4 p-3 rounded-xl border flex items-center justify-between ${columnDef.color}`}>
                                            <span className="font-bold uppercase tracking-wider text-xs">{columnDef.label}</span>
                                            <Badge variant="secondary" className="bg-white/50 border-none">{columnItems.length}</Badge>
                                        </div>

                                        <Droppable droppableId={columnId}>
                                            {(provided, snapshot) => (
                                                <div
                                                    {...provided.droppableProps}
                                                    ref={provided.innerRef}
                                                    className={`flex-1 rounded-2xl transition-colors min-h-[500px] p-2 ${
                                                        snapshot.isDraggingOver ? 'bg-gray-50/80 ring-2 ring-indigo-100' : 'bg-transparent'
                                                    }`}
                                                >
                                                    {columnItems.map((perf, index) => (
                                                        <Draggable key={perf.id} draggableId={perf.id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    onClick={() => setSelectedPerformanceId(perf.id)}
                                                                    className={`
                                                                        relative mb-4 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all cursor-grab active:cursor-grabbing group overflow-hidden
                                                                        ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-2xl ring-2 ring-white/50 z-50' : ''}
                                                                    `}
                                                                    style={provided.draggableProps.style}
                                                                >
                                                                    {/* Background Image */}
                                                                    <div 
                                                                        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                                                        style={{ 
                                                                            backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b7ce31c9c985decfff75a/4500517ed_Gemini_Generated_Image_2u5n1l2u5n1l2u5n.png)',
                                                                        }}
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/10 z-0 group-hover:bg-black/0 transition-colors" />

                                                                    <div className="relative z-10">
                                                                        <div className="flex justify-between items-start mb-3">
                                                                            <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                                                                                {format(new Date(perf.date), 'MMM d, yyyy')}
                                                                            </div>
                                                                            <div className="p-1.5 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20">
                                                                                {perf.type === 'competition' ? <Trophy className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <h3 className="font-serif text-lg text-white mb-3 leading-snug group-hover:text-white/90 transition-colors h-14 line-clamp-2 drop-shadow-md">
                                                                            {perf.title}
                                                                        </h3>

                                                                        <div className="flex items-center gap-2 text-xs text-white/70">
                                                                            <MapPin className="w-3 h-3 text-white/50" />
                                                                            <span className="truncate">
                                                                                {perf.venue?.venue_name || (typeof perf.venue === 'string' ? perf.venue : 'No venue set')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                );
                            })}
                        </div>
                    </DragDropContext>
                )}
            </div>
        </div>
    );
}