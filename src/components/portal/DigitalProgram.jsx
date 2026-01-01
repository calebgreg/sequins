import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { format, parseISO, addMinutes } from 'date-fns';
import { Download, Share2, Star, Calendar, MapPin, Clock } from 'lucide-react';
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
                    className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 shadow-xl cursor-pointer hover:shadow-2xl transition-all group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
                    
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Star className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-serif text-white mb-1">Digital Program</h3>
                                    <p className="text-white/70 text-sm">Tap to view your personalized show program</p>
                                </div>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                <span className="text-white text-xs font-bold">{familyRoutines.length} Performance{familyRoutines.length !== 1 ? 's' : ''}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-white/80 text-sm">
                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {format(parseISO(performance.date), 'MMM d, yyyy')}
                            </span>
                            {performance.venue?.venue_name && (
                                <span className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    {performance.venue.venue_name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded Full Program */}
            {isExpanded && (
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
                        
                        <div className="relative z-10">
                            <h2 className="text-4xl font-serif mb-2 text-center">{performance.title?.toUpperCase()}</h2>
                            <div className="flex flex-col items-center gap-2 text-white/90">
                                <span className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {format(parseISO(performance.date), 'EEEE, MMMM d, yyyy')}
                                </span>
                                {performance.venue?.venue_name && (
                                    <span className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        {performance.venue.venue_name}
                                    </span>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 justify-center mt-6">
                                <Button
                                    onClick={handleDownloadPDF}
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-none"
                                >
                                    <Download className="w-4 h-4 mr-2" /> Download PDF
                                </Button>
                                <Button
                                    onClick={handleShare}
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-none"
                                >
                                    <Share2 className="w-4 h-4 mr-2" /> Share
                                </Button>
                                <Button
                                    onClick={() => setIsExpanded(false)}
                                    variant="ghost"
                                    className="text-white hover:bg-white/10"
                                >
                                    Collapse
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Program Content */}
                    <div className="p-8">
                        {/* Family Performances Summary */}
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8">
                            <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                                <Star className="w-5 h-5 fill-amber-400 text-amber-600" />
                                Your Family's Performances
                            </h3>
                            <div className="space-y-3">
                                {familyRoutines.map(routine => {
                                    const routineWithTiming = routinesWithTiming.find(r => r.id === routine.id);
                                    const actNumber = routinesWithTiming.findIndex(r => r.id === routine.id) + 1;
                                    
                                    return (
                                        <div key={routine.id} className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-900 font-bold text-sm">
                                                {actNumber}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-900">{routine.title}</div>
                                                {routine.song_title && (
                                                    <div className="text-sm text-gray-500 italic">"{routine.song_title}"</div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                                <Clock className="w-3 h-3" />
                                                ~{format(routineWithTiming.estimatedTime, 'h:mm a')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Full Run of Show */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Complete Program</h3>
                            <div className="space-y-3">
                                {routinesWithTiming.map((routine, idx) => (
                                    <motion.div
                                        key={routine.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={`flex items-start gap-4 p-4 rounded-xl transition-all ${
                                            routine.isFamilyRoutine 
                                                ? 'bg-amber-50 border-2 border-amber-200 shadow-sm' 
                                                : 'bg-gray-50 border border-gray-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-[80px]">
                                            {routine.isFamilyRoutine && (
                                                <Star className="w-4 h-4 fill-amber-400 text-amber-600 flex-shrink-0" />
                                            )}
                                            <div className={`font-bold ${routine.isFamilyRoutine ? 'text-amber-900' : 'text-gray-400'}`}>
                                                {idx + 1}.
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1">
                                            <div className={`font-bold ${routine.isFamilyRoutine ? 'text-gray-900' : 'text-gray-700'}`}>
                                                {routine.title || 'Untitled Routine'}
                                            </div>
                                            {routine.song_title && (
                                                <div className="text-sm text-gray-500 italic mt-0.5">"{routine.song_title}"</div>
                                            )}
                                            {routine.choreographer && (
                                                <div className="text-xs text-gray-400 mt-1">Choreographer: {routine.choreographer}</div>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            <div className="text-sm text-gray-600 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(routine.estimatedTime, 'h:mm a')}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
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