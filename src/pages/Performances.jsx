import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { 
    Calendar, MapPin, Clock, Users, Music, MoveVertical, 
    Plus, Search, ChevronRight, Play, Settings, AlertCircle,
    MoreHorizontal, Mic2, Star, Trophy
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import PerformanceDetail from '../components/performances/PerformanceDetail';
import CreatePerformanceModal from '../components/performances/CreatePerformanceModal';
import ProducerAIModal from '../components/performances/ProducerAIModal';

export default function PerformancesPage() {
    const [selectedPerformanceId, setSelectedPerformanceId] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isProducerModalOpen, setIsProducerModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const queryClient = useQueryClient();

    // Fetch Performances
    const { data: performances = [], isLoading } = useQuery({
        queryKey: ['performances'],
        queryFn: () => base44.entities.Performance.list('-date'),
    });

    const createPerformance = useMutation({
        mutationFn: (data) => base44.entities.Performance.create({
            ...data,
            status: 'planning' // Default status
        }),
        onSuccess: (newPerf) => {
            queryClient.invalidateQueries(['performances']);
            setSelectedPerformanceId(newPerf.id);
            setIsCreateModalOpen(false);
        }
    });

    const filteredPerformances = performances.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedPerformanceId) {
        return (
            <PerformanceDetail 
                performanceId={selectedPerformanceId} 
                onBack={() => setSelectedPerformanceId(null)} 
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
                        onClick={() => setIsProducerModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 h-12 shadow-lg shadow-indigo-200"
                    >
                        <Sparkles className="w-5 h-5 mr-2" /> AI Producer
                    </Button>
                    <Button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-[#333333] hover:bg-black text-white rounded-full px-6 h-12 shadow-lg shadow-gray-200"
                    >
                        <Plus className="w-5 h-5 mr-2" /> Create Event
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

            <CreatePerformanceModal 
                open={isCreateModalOpen} 
                onOpenChange={setIsCreateModalOpen}
                onSubmit={(data) => createPerformance.mutate(data)}
                isLoading={createPerformance.isPending}
            />

            <ProducerAIModal 
                open={isProducerModalOpen}
                onOpenChange={setIsProducerModalOpen}
                onPlanCreated={(id) => setSelectedPerformanceId(id)}
            />

            {/* Event Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-20 text-center text-gray-400">Loading events...</div>
                ) : filteredPerformances.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">
                        <Mic2 className="w-12 h-12 mb-4 opacity-20" />
                        <p>No performances found. Create your first event!</p>
                    </div>
                ) : (
                    filteredPerformances.map(perf => (
                        <motion.div
                            key={perf.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -4 }}
                            onClick={() => setSelectedPerformanceId(perf.id)}
                            className="bg-white group rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden flex flex-col h-[280px]"
                        >
                            {/* Card Header / Image Area Placeholder */}
                            <div className={`h-24 p-6 relative flex items-start justify-between ${
                                perf.type === 'competition' ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : 
                                perf.type === 'showcase' ? 'bg-gradient-to-r from-purple-50 to-pink-50' :
                                'bg-gradient-to-r from-amber-50 to-orange-50'
                            }`}>
                                <Badge className="bg-white/80 backdrop-blur-sm text-[#333333] shadow-sm border-none">
                                    {perf.status}
                                </Badge>
                                <div className="p-2 bg-white/50 rounded-full">
                                    {perf.type === 'competition' ? <Trophy className="w-5 h-5 text-blue-400" /> : <Star className="w-5 h-5 text-amber-400" />}
                                </div>
                            </div>

                            <div className="p-6 pt-2 flex-1 flex flex-col">
                                <div className="mb-4">
                                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                                        {format(new Date(perf.date), 'MMMM d, yyyy')}
                                    </div>
                                    <h3 className="text-2xl font-serif text-[#333333] group-hover:text-indigo-600 transition-colors line-clamp-2">
                                        {perf.title}
                                    </h3>
                                </div>

                                <div className="mt-auto flex items-center justify-between text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        <span className="truncate max-w-[150px]">
                                            {perf.venue?.venue_name || (typeof perf.venue === 'string' ? perf.venue : 'No venue set')}
                                        </span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#333333] group-hover:text-white transition-colors">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}