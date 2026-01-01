import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { format, parseISO, addMinutes } from 'date-fns';
import { Download, Share2, Star, Calendar, MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { toast } from "sonner";
import jsPDF from 'jspdf';

export default function DigitalProgram({ performance, studentIds }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Fetch all routines for this performance
    const { data: allRoutines = [], isLoading } = useQuery({
        queryKey: ['programRoutines', performance.id],
        queryFn: async () => {
            const routines = await base44.entities.PerformanceRoutine.filter({ 
                performance_id: performance.id 
            });
            return routines.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        },
        enabled: !!performance?.id
    });

    // Identify which routines include family's students
    const familyRoutines = allRoutines.filter(routine => 
        routine.performers && routine.performers.some(performerId => studentIds.includes(performerId))
    );

    if (isLoading || familyRoutines.length === 0) return null;

    // Calculate estimated timing (assuming 7:00 PM start)
    const showStartTime = performance.date ? parseISO(`${performance.date}T19:00:00`) : new Date();
    let cumulativeMinutes = 0;

    const routinesWithTiming = allRoutines.map(routine => {
        const startTime = addMinutes(showStartTime, cumulativeMinutes);
        const durationMinutes = Math.ceil((routine.duration_seconds || 180) / 60);
        cumulativeMinutes += durationMinutes;
        
        return {
            ...routine,
            estimatedTime: startTime,
            isFamilyRoutine: familyRoutines.some(fr => fr.id === routine.id)
        };
    });

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        // Title
        doc.setFontSize(24);
        doc.text(performance.title?.toUpperCase() || 'PROGRAM', pageWidth / 2, 20, { align: 'center' });
        
        // Date and Venue
        doc.setFontSize(12);
        doc.text(format(parseISO(performance.date), 'MMMM d, yyyy'), pageWidth / 2, 30, { align: 'center' });
        if (performance.venue?.venue_name) {
            doc.text(performance.venue.venue_name, pageWidth / 2, 37, { align: 'center' });
        }

        // Divider
        doc.setLineWidth(0.5);
        doc.line(20, 45, pageWidth - 20, 45);

        // Routines
        let yPos = 55;
        routinesWithTiming.forEach((routine, idx) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(10);
            const routineNumber = `${idx + 1}.`;
            const routineTitle = routine.title || 'Untitled';
            const time = format(routine.estimatedTime, 'h:mm a');
            
            // Highlight family routines
            if (routine.isFamilyRoutine) {
                doc.setFillColor(255, 250, 200);
                doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F');
                doc.text('⭐', 18, yPos);
            }

            doc.text(routineNumber, 25, yPos);
            doc.text(routineTitle, 35, yPos);
            doc.text(`(${time})`, pageWidth - 40, yPos);

            if (routine.song_title) {
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(`"${routine.song_title}"`, 35, yPos + 5);
                doc.setTextColor(0);
            }

            yPos += routine.song_title ? 12 : 8;
        });

        // Family Summary
        if (familyRoutines.length > 0) {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setLineWidth(0.5);
            doc.line(20, yPos, pageWidth - 20, yPos);
            yPos += 10;

            doc.setFontSize(14);
            doc.text("Your Family's Performances", pageWidth / 2, yPos, { align: 'center' });
            yPos += 10;

            doc.setFontSize(10);
            familyRoutines.forEach(routine => {
                const routineWithTiming = routinesWithTiming.find(r => r.id === routine.id);
                const actNumber = routinesWithTiming.findIndex(r => r.id === routine.id) + 1;
                const time = format(routineWithTiming.estimatedTime, 'h:mm a');
                
                doc.text(`⭐ #${actNumber} - ${routine.title} (~${time})`, 25, yPos);
                yPos += 7;
            });
        }

        doc.save(`${performance.title || 'Program'}.pdf`);
        toast.success('Program downloaded!');
    };

    const handleShare = async () => {
        const shareText = `${performance.title}\n${format(parseISO(performance.date), 'MMMM d, yyyy')}\n\nMy child performs in:\n${familyRoutines.map((r, i) => `• ${r.title}`).join('\n')}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: performance.title,
                    text: shareText
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    toast.error('Share failed');
                }
            }
        } else {
            navigator.clipboard.writeText(shareText);
            toast.success('Program details copied to clipboard!');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
        >
            {/* Collapsed Preview Card */}
            {!isExpanded && (
                <div 
                    onClick={() => setIsExpanded(true)}
                    className="bg-white rounded-2xl md:rounded-[32px] p-4 md:p-8 shadow-sm hover:shadow-md transition-all cursor-pointer border border-stone-100 group relative overflow-hidden"
                >
                    <div className="flex items-start justify-between mb-4 md:mb-6">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-2 md:px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-2 md:mb-3">
                                <Star className="w-3 h-3" /> Your Program
                            </div>
                            <h3 className="font-serif text-xl sm:text-2xl md:text-3xl text-[#1c1c1c] mb-1 md:mb-2 leading-tight">{performance.title}</h3>
                            <p className="text-gray-500 font-serif italic text-sm md:text-base">Tap to view your personalized program</p>
                        </div>
                        <ChevronDown className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-rose-500 transition-colors flex-shrink-0 ml-2" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gray-300" />
                            <span className="hidden sm:inline">{format(parseISO(performance.date), 'MMMM d, yyyy')}</span>
                            <span className="sm:hidden">{format(parseISO(performance.date), 'MMM d')}</span>
                        </span>
                        {performance.venue?.venue_name && (
                            <span className="flex items-center gap-1.5 truncate max-w-[150px] sm:max-w-none">
                                <MapPin className="w-3 h-3 md:w-4 md:h-4 text-gray-300 flex-shrink-0" />
                                <span className="truncate">{performance.venue.venue_name}</span>
                            </span>
                        )}
                        <span className="ml-auto bg-rose-50 text-rose-600 px-2 md:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                            {familyRoutines.length} Performance{familyRoutines.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            )}

            {/* Expanded Full Program */}
            {isExpanded && (
                <div className="bg-white rounded-2xl md:rounded-[32px] shadow-sm border border-stone-100 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 md:p-8 pb-4 md:pb-6 border-b border-stone-100">
                        <div className="flex items-start justify-between mb-4 md:mb-6">
                            <div className="flex-1 pr-2">
                                <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-2 md:px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-2 md:mb-3">
                                    <Star className="w-3 h-3" /> Your Program
                                </div>
                                <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#1c1c1c] mb-2 leading-tight">{performance.title}</h2>
                                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-4 text-gray-500 font-serif italic text-sm md:text-lg">
                                    <span className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                                        <span className="hidden sm:inline">{format(parseISO(performance.date), 'EEEE, MMMM d, yyyy')}</span>
                                        <span className="sm:hidden">{format(parseISO(performance.date), 'MMM d, yyyy')}</span>
                                    </span>
                                    {performance.venue?.venue_name && (
                                        <>
                                            <span className="hidden sm:inline w-1.5 h-1.5 rounded-full bg-gray-300" />
                                            <span className="flex items-center gap-2">
                                                <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                                                {performance.venue.venue_name}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <Button
                                onClick={() => setIsExpanded(false)}
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-[#1c1c1c] flex-shrink-0"
                            >
                                <ChevronUp className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 md:gap-3">
                            <Button
                                onClick={handleDownloadPDF}
                                variant="outline"
                                className="border-stone-200 hover:bg-stone-50 text-xs md:text-sm flex-1 sm:flex-none"
                            >
                                <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> 
                                <span className="hidden sm:inline">Download PDF</span>
                                <span className="sm:hidden">PDF</span>
                            </Button>
                            <Button
                                onClick={handleShare}
                                variant="outline"
                                className="border-stone-200 hover:bg-stone-50 text-xs md:text-sm flex-1 sm:flex-none"
                            >
                                <Share2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Share
                            </Button>
                        </div>
                    </div>

                    {/* Program Content */}
                    <div className="p-4 md:p-8">
                        {/* Family Performances Summary */}
                        <div className="bg-rose-50/30 border border-rose-100 rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
                            <h3 className="text-base md:text-lg font-bold text-[#1c1c1c] mb-3 md:mb-4 flex items-center gap-2">
                                <Star className="w-4 h-4 md:w-5 md:h-5 text-rose-500" />
                                Your Family's Performances
                            </h3>
                            <div className="space-y-3">
                                {familyRoutines.map(routine => {
                                    const routineWithTiming = routinesWithTiming.find(r => r.id === routine.id);
                                    const actNumber = routinesWithTiming.findIndex(r => r.id === routine.id) + 1;
                                    
                                    return (
                                        <div key={routine.id} className="flex items-start gap-2 md:gap-3">
                                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs md:text-sm flex-shrink-0">
                                                {actNumber}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-[#1c1c1c] text-sm md:text-base">{routine.title}</div>
                                                {routine.song_title && (
                                                    <div className="text-xs md:text-sm text-gray-500 italic font-serif truncate">"{routine.song_title}"</div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs md:text-sm text-gray-500 flex-shrink-0">
                                                <Clock className="w-3 h-3 text-gray-300" />
                                                <span className="hidden sm:inline">~{format(routineWithTiming.estimatedTime, 'h:mm a')}</span>
                                                <span className="sm:hidden">{format(routineWithTiming.estimatedTime, 'h:mm')}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Full Run of Show */}
                        <div>
                            <h3 className="font-serif text-xl md:text-2xl text-[#1c1c1c] mb-4 md:mb-6 text-center">Complete Program</h3>
                            <div className="space-y-1.5 md:space-y-2">
                                {routinesWithTiming.map((routine, idx) => (
                                    <motion.div
                                        key={routine.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className={`flex items-start gap-2 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl transition-all ${
                                            routine.isFamilyRoutine 
                                                ? 'bg-rose-50/50 border border-rose-100' 
                                                : 'bg-stone-50/30 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 md:gap-3 min-w-[40px] md:min-w-[60px]">
                                            {routine.isFamilyRoutine && (
                                                <Star className="w-3 h-3 md:w-4 md:h-4 text-rose-500 flex-shrink-0" />
                                            )}
                                            <div className={`font-semibold text-sm md:text-base ${routine.isFamilyRoutine ? 'text-rose-600' : 'text-gray-400'}`}>
                                                {idx + 1}.
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-semibold text-sm md:text-base ${routine.isFamilyRoutine ? 'text-[#1c1c1c]' : 'text-gray-600'}`}>
                                                {routine.title || 'Untitled Routine'}
                                            </div>
                                            {routine.song_title && (
                                                <div className="text-xs md:text-sm text-gray-500 italic font-serif mt-0.5 truncate">"{routine.song_title}"</div>
                                            )}
                                            {routine.choreographer && (
                                                <div className="text-xs text-gray-400 mt-1 hidden sm:block">Choreographer: {routine.choreographer}</div>
                                            )}
                                        </div>

                                        <div className="text-right flex-shrink-0">
                                            <div className="text-xs md:text-sm text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-gray-300" />
                                                <span className="hidden sm:inline">{format(routine.estimatedTime, 'h:mm a')}</span>
                                                <span className="sm:hidden">{format(routine.estimatedTime, 'h:mm')}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1 hidden sm:block">
                                                {Math.ceil((routine.duration_seconds || 180) / 60)} min
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}