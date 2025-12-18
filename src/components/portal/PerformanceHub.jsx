import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { format, differenceInDays, parseISO, isSameDay } from 'date-fns';
import { 
    CalendarDays, Clock, MapPin, Shirt, Sparkles, Scissors, 
    ChevronRight, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function PerformanceHub({ studentId }) {
    // 1. Find upcoming performances for this student
    const { data: hubData, isLoading } = useQuery({
        queryKey: ['performanceHub', studentId],
        queryFn: async () => {
            if (!studentId) return null;

            // Fetch all performances
            const allPerformances = await base44.entities.Performance.list();
            const futurePerformances = allPerformances.filter(p => 
                p.date && new Date(p.date) >= new Date(new Date().setHours(0,0,0,0))
            );

            if (futurePerformances.length === 0) return null;

            // Fetch routines for these performances
            const allRoutines = await base44.entities.PerformanceRoutine.list();
            
            // Find performances where this student is a performer
            const relevantData = futurePerformances.map(perf => {
                const studentRoutines = allRoutines.filter(r => 
                    r.performance_id === perf.id && 
                    r.performers?.includes(studentId)
                );

                if (studentRoutines.length === 0) return null;

                return {
                    performance: perf,
                    routines: studentRoutines
                };
            }).filter(Boolean);

            // Return the soonest one
            return relevantData.sort((a, b) => new Date(a.performance.date) - new Date(b.performance.date))[0];
        },
        enabled: !!studentId
    });

    if (isLoading || !hubData) return null;

    const { performance, routines } = hubData;
    const daysLeft = differenceInDays(parseISO(performance.date), new Date());
    const countdownText = daysLeft === 0 ? "Today is the big day!" : 
                          daysLeft === 1 ? "Tomorrow is the show!" : 
                          `${performance.title} is in ${daysLeft} days`;

    return (
        <div className="mb-8">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-gray-100 relative group"
            >
                {/* Hero Header */}
                <div className="bg-[#333333] text-white p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/3" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500 rounded-full blur-[80px] opacity-20 translate-y-1/2 -translate-x-1/3" />
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <Badge className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm">
                                Upcoming Event
                            </Badge>
                            {performance.venue && (
                                <div className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {performance.venue.venue_name || performance.venue}
                                </div>
                            )}
                        </div>
                        
                        <h2 className="font-serif text-3xl md:text-4xl mb-2 leading-tight">
                            {countdownText}
                        </h2>
                        <p className="text-white/60 text-lg font-light">
                            {format(parseISO(performance.date), 'EEEE, MMMM do')}
                        </p>
                    </div>
                </div>

                {/* Routines List */}
                <div className="p-6 bg-white">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">
                        Your Roles & Call Times
                    </h3>
                    <div className="space-y-3">
                        {routines.map(routine => (
                            <RoutineCard key={routine.id} routine={routine} />
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function RoutineCard({ routine }) {
    const [isOpen, setIsOpen] = useState(false);

    // Calculate next rehearsal
    const upcomingRehearsals = (routine.rehearsals || [])
        .filter(r => new Date(r.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const nextRehearsal = upcomingRehearsals[0];

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-indigo-50/30 border border-gray-100 hover:border-indigo-100 transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[#333333] text-lg group-hover:text-indigo-900 transition-colors">
                            {routine.title}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                            {nextRehearsal ? (
                                <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    Next: {format(parseISO(nextRehearsal.date), 'MMM d')}
                                </span>
                            ) : (
                                <span className="text-gray-400">No upcoming rehearsals</span>
                            )}
                            {routine.grooming?.hair && (
                                <span className="flex items-center gap-1.5 truncate">
                                    <Scissors className="w-3.5 h-3.5" />
                                    {routine.grooming.hair}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-300 group-hover:text-indigo-500 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
            </SheetTrigger>
            
            <SheetContent className="w-full sm:max-w-md bg-[#FDFBF7] p-0 overflow-y-auto">
                {/* Header Image/Gradient */}
                <div className="h-40 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden flex items-end p-6">
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="relative z-10 text-white">
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none mb-2">
                            Routine Details
                        </Badge>
                        <h2 className="font-serif text-2xl font-bold">{routine.title}</h2>
                        <p className="text-white/80 text-sm">{routine.song_title} • {routine.artist}</p>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* Grooming Section */}
                    <div className="space-y-4">
                        <h3 className="font-serif text-lg text-[#333333] flex items-center gap-2">
                            <Scissors className="w-5 h-5 text-gray-400" /> Grooming & Attire
                        </h3>
                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                            <InfoRow label="Hair" value={routine.grooming?.hair} />
                            <InfoRow label="Makeup" value={routine.grooming?.makeup} />
                            <InfoRow label="Tights" value={routine.grooming?.tights} />
                            <InfoRow label="Shoes" value={routine.grooming?.shoes} />
                            {routine.grooming?.notes && (
                                <div className="pt-2 border-t border-gray-100 mt-2">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                                    <p className="text-sm text-gray-700">{routine.grooming.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Schedule Section */}
                    <div className="space-y-4">
                        <h3 className="font-serif text-lg text-[#333333] flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-gray-400" /> Schedule
                        </h3>
                        {routine.rehearsals && routine.rehearsals.length > 0 ? (
                            <div className="space-y-3">
                                {[...routine.rehearsals]
                                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                                  .map(event => (
                                    <div key={event.id} className="bg-white rounded-xl p-4 border border-gray-100 flex gap-4">
                                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-indigo-50 rounded-lg text-indigo-700 shrink-0">
                                            <span className="text-[10px] font-bold uppercase">{format(parseISO(event.date), 'MMM')}</span>
                                            <span className="text-lg font-bold leading-none">{format(parseISO(event.date), 'd')}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">{event.title}</h4>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                <Clock className="w-3 h-3" />
                                                {event.start_time} - {event.end_time}
                                            </div>
                                            {event.location && (
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                    <MapPin className="w-3 h-3" />
                                                    {event.location}
                                                </div>
                                            )}
                                            {event.notes && (
                                                <p className="text-xs text-indigo-600 mt-1.5 font-medium bg-indigo-50 inline-block px-1.5 py-0.5 rounded">
                                                    {event.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                No specific rehearsals posted yet.
                            </div>
                        )}
                    </div>

                    {/* Costume Section */}
                    {routine.costume_product_suggestions && routine.costume_product_suggestions.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-serif text-lg text-[#333333] flex items-center gap-2">
                                <Shirt className="w-5 h-5 text-gray-400" /> Costume Look
                            </h3>
                            <ScrollArea className="w-full whitespace-nowrap">
                                <div className="flex gap-4 pb-4">
                                    {routine.costume_product_suggestions.map((item, i) => (
                                        <div key={i} className="w-32 shrink-0">
                                            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 border border-gray-100 mb-2 relative group">
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                            </div>
                                            <p className="text-xs text-gray-600 truncate">{item.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function InfoRow({ label, value }) {
    if (!value) return null;
    return (
        <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0 last:pb-0">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
        </div>
    );
}