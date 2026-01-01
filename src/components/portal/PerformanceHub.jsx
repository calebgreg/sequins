import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { format, differenceInDays, parseISO, isSameDay } from 'date-fns';
import { 
    CalendarDays, Clock, MapPin, Shirt, Sparkles, Scissors, 
    ChevronRight, ArrowRight, CheckCircle2, Music 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PerformanceHub({ studentIds, isPreview = false }) {
    // 1. Find upcoming performances for all students in the family
    const { data: hubData, isLoading } = useQuery({
        queryKey: ['performanceHub', studentIds],
        queryFn: async () => {
            if (isPreview) {
                // Mock data for preview
                return {
                    performance: { 
                        id: 'mock-perf', 
                        title: 'Winter Showcase', 
                        date: '2026-02-15',
                        venue: { venue_name: 'Abbey Theater' }
                    },
                    routines: [{
                        id: 'mock-routine-1',
                        title: 'Opening Number',
                        song_title: 'Let It Go',
                        duration_seconds: 240,
                        grooming: { hair: 'Slicked back bun', makeup: 'Stage makeup with glitter' },
                        rehearsals: [{ date: '2026-01-15', title: 'Full Run-Through', start_time: '6:00 PM', end_time: '8:00 PM', location: 'Main Studio' }]
                    }]
                };
            }
            if (!studentIds || studentIds.length === 0) return null;

            // 1. Fetch all routines and filter client-side
            const allRoutines = await base44.entities.PerformanceRoutine.list();
            const studentRoutines = allRoutines.filter(routine => 
                routine.performers && routine.performers.some(performerId => studentIds.includes(performerId))
            );

            if (!studentRoutines || studentRoutines.length === 0) return null;

            // 2. Identify relevant performance IDs
            const performanceIds = [...new Set(studentRoutines.map(r => r.performance_id))];

            // 3. Fetch all performances
            const allPerformances = await base44.entities.Performance.list();

            // 4. Filter for future performances
            const relevantPerformances = allPerformances.filter(p => 
                p.date && 
                new Date(p.date) >= new Date(new Date().setHours(0,0,0,0)) &&
                performanceIds.includes(p.id)
            );

            if (relevantPerformances.length === 0) return null;

            // 5. Pick the soonest one
            const nextPerformance = relevantPerformances.sort((a, b) => new Date(a.date) - new Date(b.date))[0];

            return {
                performance: nextPerformance,
                routines: studentRoutines.filter(r => r.performance_id === nextPerformance.id)
            };
        },
        enabled: !!studentIds && studentIds.length > 0
    });

    if (isLoading || !hubData) return null;

    const { performance, routines } = hubData;
    const daysLeft = differenceInDays(parseISO(performance.date), new Date());
    
    // Simplifed, high-impact countdown
    const countdownTitle = daysLeft === 0 ? "It's Showtime!" : 
                          daysLeft === 1 ? "Tomorrow!" : 
                          `${daysLeft} Days to Go`;

    return (
        <div className="w-full">
            <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');`}
            </style>
            {/* Countdown Header - Integrated into flow */}
            <div className="text-center mb-12 md:mb-16 px-4 max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                    <Sparkles className="w-3 h-3" /> Upcoming Event
                </div>
                <h2 className="font-serif text-5xl sm:text-6xl md:text-7xl text-[#1c1c1c] mb-6 tracking-tight leading-none">
                    {countdownTitle}
                </h2>
                <div className="space-y-3 md:space-y-0 md:flex md:flex-row md:items-center md:justify-center md:gap-4 text-lg md:text-xl text-gray-500 font-serif italic">
                    <span className="block font-semibold text-[#1c1c1c] text-xl md:text-2xl">{performance.title}</span>
                    <span className="hidden md:inline w-1.5 h-1.5 rounded-full bg-gray-300" />
                    <span className="block text-base md:text-xl">{format(parseISO(performance.date), 'MMMM do')}</span>
                    {performance.venue && (
                        <>
                            <span className="hidden md:inline w-1.5 h-1.5 rounded-full bg-gray-300" />
                            <a 
                                href={performance.venue.lat && performance.venue.lng 
                                    ? `https://www.google.com/maps/dir/?api=1&destination=${performance.venue.lat},${performance.venue.lng}`
                                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(performance.venue.formatted_address || performance.venue.venue_name || performance.venue)}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 hover:text-rose-600 transition-colors cursor-pointer group text-base md:text-xl"
                            >
                                <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                                <span className="underline decoration-transparent group-hover:decoration-rose-300 underline-offset-4 transition-all break-all">
                                    {performance.venue.venue_name || performance.venue}
                                </span>
                            </a>
                        </>
                    )}
                </div>
            </div>

            {/* Spoon-fed Routine List - No Modals */}
            <div className="space-y-8 md:space-y-16 px-4 max-w-6xl mx-auto">
                {routines.map((routine, idx) => (
                    <motion.div 
                        key={routine.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative"
                    >
                        <div className="flex flex-col gap-6 md:gap-8">
                            {/* Mobile-First Routine Header */}
                            <div className="w-full">
                                <div className="flex items-center gap-2 mb-3 text-rose-500">
                                    <div className="w-8 h-px bg-rose-300" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Routine {idx + 1}</span>
                                </div>
                                <h3 className="font-serif text-2xl md:text-4xl mb-2 text-[#1c1c1c] leading-tight">{routine.title}</h3>
                                <div className="flex items-center gap-2 text-gray-500 italic font-serif text-base md:text-lg mb-4">
                                    <Music className="w-4 h-4 opacity-40" /> 
                                    <span>{routine.song_title}</span>
                                </div>

                                {routine.costume_product_suggestions?.[0] && (
                                    <div className="aspect-[3/4] w-full max-w-[180px] md:max-w-[220px] rounded-xl overflow-hidden bg-white border-4 border-white shadow-lg relative">
                                        <img src={routine.costume_product_suggestions[0].image_url} alt="Costume" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
                                        <div className="absolute bottom-2 left-2 text-white text-xs font-medium">
                                            Costume Reference
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Details Grid - Stacks on Mobile */}
                            <div className="w-full grid grid-cols-1 gap-4 md:gap-6">
                                {/* Grooming Board - Pinterest Style */}
                                <div className="bg-white p-5 md:p-8 rounded-xl md:rounded-2xl border border-stone-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                                            <Scissors className="w-4 h-4" />
                                        </div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Look & Feel</h4>
                                    </div>

                                    {(!routine.grooming?.hair && !routine.grooming?.makeup && !routine.grooming?.tights && !routine.grooming?.shoes && !routine.grooming?.hair_image && !routine.grooming?.makeup_image && !routine.grooming?.tights_image && !routine.grooming?.shoes_image) ? (
                                        <div className="text-center py-8 border-2 border-dashed border-stone-100 rounded-xl bg-stone-50/30">
                                            <div className="mb-2 opacity-20">
                                                <Scissors className="w-8 h-8 mx-auto" />
                                            </div>
                                            <p className="text-xs text-gray-400 italic">Details coming soon</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <PinterestCard 
                                                label="Hair" 
                                                value={routine.grooming?.hair} 
                                                image={routine.grooming?.hair_image}
                                                rotate="rotate-1"
                                                delay={0.1}
                                            />
                                            <PinterestCard 
                                                label="Makeup" 
                                                value={routine.grooming?.makeup} 
                                                image={routine.grooming?.makeup_image}
                                                rotate="-rotate-1"
                                                delay={0.2}
                                            />
                                            <PinterestCard 
                                                label="Tights" 
                                                value={routine.grooming?.tights} 
                                                image={routine.grooming?.tights_image}
                                                rotate="-rotate-2"
                                                delay={0.3}
                                            />
                                            <PinterestCard 
                                                label="Shoes" 
                                                value={routine.grooming?.shoes} 
                                                image={routine.grooming?.shoes_image}
                                                rotate="rotate-2"
                                                delay={0.4}
                                            />
                                        </div>
                                    )}

                                    {routine.grooming?.notes && (
                                        <div className="mt-4 bg-[#fffbf0] p-4 rounded-lg border border-stone-100">
                                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Director's Note</p>
                                            <p className="text-base text-[#2c2c2c] leading-relaxed" style={{ fontFamily: '"Caveat", "Brush Script MT", cursive' }}>
                                                {routine.grooming.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Schedule Card */}
                                <div className="bg-white p-5 md:p-8 rounded-xl md:rounded-2xl border border-stone-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                                            <CalendarDays className="w-4 h-4" />
                                        </div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rehearsals</h4>
                                    </div>

                                    <div className="space-y-4">
                                        {routine.rehearsals && routine.rehearsals.length > 0 ? (
                                            routine.rehearsals
                                                .filter(r => new Date(r.date) >= new Date())
                                                .sort((a, b) => new Date(a.date) - new Date(b.date))
                                                .slice(0, 3)
                                                .map((event, i) => (
                                                <div key={i} className="flex gap-3 items-start pb-4 border-b border-stone-100 last:border-0 last:pb-0">
                                                    <div className="text-center min-w-[40px]">
                                                        <div className="text-[10px] font-bold text-rose-500 uppercase">{format(parseISO(event.date), 'MMM')}</div>
                                                        <div className="text-lg font-serif font-bold text-[#333333]">{format(parseISO(event.date), 'd')}</div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-sm text-[#333333] mb-1">{event.title}</div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3 text-gray-300" /> {event.start_time} - {event.end_time}
                                                        </div>
                                                        {event.location && (
                                                            <div className="text-xs text-gray-400 mt-1">
                                                                @ {event.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6">
                                                <p className="text-xs text-gray-400 italic">No rehearsals scheduled</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Elegant Divider between routines */}
                        {idx < routines.length - 1 && (
                            <div className="mt-8 md:mt-12 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent w-full" />
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function PinterestCard({ label, value, image, rotate = "rotate-0", delay = 0 }) {
    if (!value && !image) return null;
    return (
        <div className="bg-white p-0 rounded-lg shadow-sm border border-stone-100 overflow-hidden flex flex-col">
            {image && (
                <div className="w-full aspect-square bg-stone-50">
                    <img src={image} alt={label} className="w-full h-full object-cover" />
                </div>
            )}
            <div className="p-3 flex-1 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{label}</span>
                {value && <span className="text-sm font-medium text-[#1c1c1c] font-serif leading-tight block">{value}</span>}
            </div>
        </div>
    );
}