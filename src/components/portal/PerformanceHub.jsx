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
        enabled: !!studentIds && studentIds.length > 0 && !isPreview
    });

    // Mock data for preview
    const mockData = isPreview ? {
        performance: {
            title: 'Winter Showcase',
            date: '2026-02-15',
            venue: { venue_name: 'Abbey Theater', formatted_address: '123 Theater St' }
        },
        routines: [
            {
                id: 'mock-1',
                title: 'Swan Lake Act II',
                song_title: 'Dance of the Swans',
                grooming: {
                    hair: 'Classical ballet bun',
                    makeup: 'Stage makeup with emphasis on eyes',
                    tights: 'Pink ballet tights',
                    shoes: 'Pink pointe shoes'
                },
                rehearsals: [
                    { id: '1', title: 'Tech Rehearsal', date: '2026-02-10', start_time: '6:00 PM', end_time: '9:00 PM', location: 'Main Studio' }
                ]
            }
        ]
    } : null;

    const data = isPreview ? mockData : hubData;

    if (isLoading || !data) return null;

    const { performance, routines } = data;
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
            <div className="text-center mb-8 md:mb-12 px-4 max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                    <Sparkles className="w-3 h-3" /> Upcoming Event
                </div>
                <h2 className="font-serif text-4xl md:text-6xl text-[#1c1c1c] mb-4 tracking-tight leading-tight px-2">
                    {countdownTitle}
                </h2>
                <div className="space-y-2">
                    <div className="font-semibold text-lg md:text-xl text-[#1c1c1c]">{performance.title}</div>
                    <div className="text-sm md:text-base text-gray-500 font-serif italic">{format(parseISO(performance.date), 'MMMM do')}</div>
                    {performance.venue && (
                        <a 
                            href={performance.venue.lat && performance.venue.lng 
                                ? `https://www.google.com/maps/dir/?api=1&destination=${performance.venue.lat},${performance.venue.lng}`
                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(performance.venue.formatted_address || performance.venue.venue_name || performance.venue)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 hover:text-rose-600 transition-colors cursor-pointer group text-sm md:text-base text-gray-500 font-serif italic"
                        >
                            <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                            <span className="underline decoration-transparent group-hover:decoration-rose-300 underline-offset-4 transition-all">
                                {performance.venue.venue_name || performance.venue}
                            </span>
                        </a>
                    )}
                </div>
            </div>

            {/* Spoon-fed Routine List - No Modals */}
            <div className="space-y-8 md:space-y-12 px-4 max-w-6xl mx-auto">
                {routines.map((routine, idx) => (
                    <motion.div 
                        key={routine.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative"
                    >
                        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                            {/* Left Column: Routine Identity */}
                            <div className="w-full md:w-1/3">
                                <div className="flex items-center gap-2 mb-3 text-rose-500">
                                    <div className="w-8 h-px bg-rose-300" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Routine {idx + 1}</span>
                                </div>
                                <h3 className="font-serif text-2xl md:text-3xl mb-2 text-[#1c1c1c] leading-tight">{routine.title}</h3>
                                <div className="flex items-center gap-2 text-gray-500 italic font-serif mb-4 text-base">
                                    <Music className="w-4 h-4 opacity-40" /> {routine.song_title}
                                </div>

                                {routine.costume_product_suggestions?.[0] && (
                                    <div className="aspect-[3/4] w-full max-w-[200px] rounded-xl overflow-hidden bg-white border-4 border-white shadow-md mx-auto md:mx-0 relative group rotate-1 hover:rotate-0 transition-all duration-500">
                                        <img src={routine.costume_product_suggestions[0].image_url} alt="Costume" className="w-full h-full object-cover rounded-lg" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60 rounded-lg" />
                                        <div className="absolute bottom-2 left-2 text-white text-xs font-medium tracking-wide">
                                            Costume Reference
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: The "Spoon-fed" Details Grid */}
                            <div className="flex-1 grid grid-cols-1 gap-4 w-full">
                                {/* Grooming Board - Pinterest Style */}
                                <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow h-full relative overflow-hidden flex flex-col">
                                    <div className="absolute inset-0 bg-stone-50/30 pointer-events-none" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm">
                                                <Scissors className="w-4 h-4" />
                                            </div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Look & Feel Board</h4>
                                        </div>

                                        {(!routine.grooming?.hair && !routine.grooming?.makeup && !routine.grooming?.tights && !routine.grooming?.shoes && !routine.grooming?.hair_image && !routine.grooming?.makeup_image && !routine.grooming?.tights_image && !routine.grooming?.shoes_image) ? (
                                            <div className="text-center py-8 border-2 border-dashed border-stone-100 rounded-xl bg-white/50">
                                                <div className="mb-2 opacity-20">
                                                    <Scissors className="w-8 h-8 mx-auto" />
                                                </div>
                                                <p className="text-sm text-gray-400 italic font-serif">Grooming details coming soon.</p>
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
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                className="mt-4 bg-[#fffbf0] p-4 rounded-lg shadow-md border border-stone-100 -rotate-1 mx-1 relative"
                                            >
                                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-3 bg-yellow-100/50 blur-sm rounded-full" />
                                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Director's Note</p>
                                                <p className="text-lg text-[#2c2c2c] leading-relaxed" style={{ fontFamily: '"Caveat", "Brush Script MT", cursive', transform: 'rotate(-0.5deg)' }}>
                                                    {routine.grooming.notes}
                                                </p>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                {/* Schedule Card */}
                                <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
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
                                                <div key={i} className="flex gap-3 items-start group">
                                                    <div className="text-center min-w-[40px] pt-1">
                                                        <div className="text-[10px] font-bold text-rose-500 uppercase">{format(parseISO(event.date), 'MMM')}</div>
                                                        <div className="text-lg font-serif font-bold text-[#333333]">{format(parseISO(event.date), 'd')}</div>
                                                    </div>
                                                    <div className="pb-4 border-b border-stone-50 w-full group-last:border-0 group-last:pb-0">
                                                        <div className="font-bold text-sm text-[#333333] mb-1">{event.title}</div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3 text-gray-300" /> {event.start_time} - {event.end_time}
                                                        </div>
                                                        {event.location && (
                                                            <a 
                                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-gray-400 mt-1 block hover:text-rose-500 transition-colors"
                                                            >
                                                                @ {event.location}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6">
                                                <p className="text-sm text-gray-400 italic font-serif">No upcoming rehearsals scheduled.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Elegant Divider between routines */}
                        {idx < routines.length - 1 && (
                            <div className="mt-10 mb-10 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent w-full max-w-2xl mx-auto" />
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
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            className={`bg-white p-0 rounded-lg shadow-sm border border-stone-50 ${rotate} hover:rotate-0 hover:scale-105 hover:shadow-md hover:z-10 transition-all duration-300 overflow-hidden flex flex-col`}
        >
            {image && (
                <div className="w-full aspect-square bg-stone-50">
                    <img src={image} alt={label} className="w-full h-full object-cover" />
                </div>
            )}
            <div className="p-3 flex-1 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{label}</span>
                {value && <span className="text-sm font-medium text-[#1c1c1c] font-serif leading-tight block">{value}</span>}
            </div>
        </motion.div>
    );
}