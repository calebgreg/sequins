import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { format, differenceInDays, parseISO, isSameDay } from 'date-fns';
import { 
    CalendarDays, Clock, MapPin, Shirt, Sparkles, Scissors, 
    ChevronRight, ArrowRight, CheckCircle2, Music 
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

            // 1. Fetch routines directly where student is a performer
            // This uses backend filtering which is more reliable than client-side filtering of limited lists
            const studentRoutines = await base44.entities.PerformanceRoutine.filter({
                performers: studentId
            });

            if (!studentRoutines || studentRoutines.length === 0) return null;

            // 2. Identify relevant performance IDs
            const performanceIds = [...new Set(studentRoutines.map(r => r.performance_id))];

            // 3. Fetch all performances (usually a small list)
            const allPerformances = await base44.entities.Performance.list();

            // 4. Filter for future performances that contain our student's routines
            const relevantPerformances = allPerformances.filter(p => 
                p.date && 
                new Date(p.date) >= new Date(new Date().setHours(0,0,0,0)) &&
                performanceIds.includes(p.id)
            );

            if (relevantPerformances.length === 0) return null;

            // 5. Pick the soonest one
            const nextPerformance = relevantPerformances.sort((a, b) => new Date(a.date) - new Date(b.date))[0];

            // 6. Return data
            return {
                performance: nextPerformance,
                routines: studentRoutines.filter(r => r.performance_id === nextPerformance.id)
            };
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
        <div className="mb-12">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FDFBF7] rounded-[24px] overflow-hidden shadow-2xl shadow-stone-200/50 border border-white relative group"
            >
                {/* Hero Header */}
                <div className="bg-[#1c1c1c] text-white p-8 relative overflow-hidden">
                    {/* Elegant grain or subtle texture could go here, staying minimal for now */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-rose-900/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <Badge className="bg-rose-500/90 hover:bg-rose-500 text-white border-none font-serif tracking-wide px-3 py-1">
                                Next Event
                            </Badge>
                            {performance.venue && (
                                <div className="flex items-center gap-2 text-xs font-medium text-white/40 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">
                                    <MapPin className="w-3 h-3" />
                                    {performance.venue.venue_name || performance.venue}
                                </div>
                            )}
                        </div>
                        
                        <h2 className="font-serif text-3xl md:text-5xl mb-3 leading-tight text-white">
                            {countdownText}
                        </h2>
                        <div className="flex items-center gap-3 text-white/50 text-lg font-light italic font-serif">
                            <span>{format(parseISO(performance.date), 'MMMM do, yyyy')}</span>
                        </div>
                    </div>
                </div>

                {/* Routines List */}
                <div className="p-6 bg-[#FDFBF7]">
                    <h3 className="text-xs font-bold text-[#333333]/40 uppercase tracking-[0.2em] mb-6 px-2">
                        Performance Portfolio
                    </h3>
                    <div className="grid gap-4">
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
                <div className="flex items-center gap-5 p-5 rounded-xl bg-white hover:shadow-lg border border-[#e5e5e5] hover:border-rose-100 transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#333333] group-hover:bg-rose-400 transition-colors" />
                    
                    <div className="w-12 h-12 rounded-full bg-[#FDFBF7] border border-[#eee] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Sparkles className="w-5 h-5 text-rose-300 group-hover:text-rose-500 transition-colors" strokeWidth={1.5} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <h4 className="font-serif font-medium text-[#333333] text-xl group-hover:text-rose-900 transition-colors truncate">
                            {routine.title}
                        </h4>
                        <div className="flex items-center gap-4 text-xs tracking-wide text-gray-400 mt-1">
                            {nextRehearsal ? (
                                <span className="flex items-center gap-1.5 text-rose-600 font-bold uppercase">
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    {format(parseISO(nextRehearsal.date), 'MMM d')}
                                </span>
                            ) : (
                                <span className="uppercase tracking-widest text-[10px]">No upcoming rehearsals</span>
                            )}
                            
                            {routine.grooming?.hair && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                    <span className="truncate italic font-serif text-gray-500">
                                        {routine.grooming.hair}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-300 group-hover:text-[#333333] group-hover:border-[#333333] transition-all">
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
            </SheetTrigger>
            
            <SheetContent className="w-full sm:max-w-md bg-[#FDFBF7] p-0 overflow-y-auto border-l border-[#e5e5e5]">
                {/* Header Image/Gradient */}
                <div className="h-48 bg-[#1c1c1c] relative overflow-hidden flex items-end p-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-900/20 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="relative z-10 text-white w-full">
                        <div className="flex items-center gap-2 mb-3 opacity-60">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Routine Details</span>
                        </div>
                        <h2 className="font-serif text-3xl mb-2 leading-tight">{routine.title}</h2>
                        <div className="flex items-center gap-2 text-white/60 text-sm font-light italic font-serif">
                             <Music className="w-4 h-4" />
                             <span>{routine.song_title} {routine.artist && `— ${routine.artist}`}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-10">
                    {/* Grooming Section */}
                    <div className="space-y-4">
                        <h3 className="font-serif text-xl text-[#333333] flex items-center gap-2 border-b border-[#e5e5e5] pb-2">
                            Look & Feel
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white p-5 rounded-xl border border-[#e5e5e5] shadow-sm">
                                <div className="space-y-4">
                                    <InfoRow label="Hair" value={routine.grooming?.hair} />
                                    <InfoRow label="Makeup" value={routine.grooming?.makeup} />
                                    <InfoRow label="Tights" value={routine.grooming?.tights} />
                                    <InfoRow label="Shoes" value={routine.grooming?.shoes} />
                                </div>
                                {routine.grooming?.notes && (
                                    <div className="mt-5 pt-4 border-t border-dashed border-gray-200">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Director's Notes</p>
                                        <p className="text-sm text-[#333333] font-serif italic leading-relaxed">"{routine.grooming.notes}"</p>
                                    </div>
                                )}
                            </div>
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