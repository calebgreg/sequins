import React from 'react';
import { Calendar, MapPin, ExternalLink, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function EventDetailCard({ performance }) {
    if (!performance) return null;

    const { title, date, venue, routines = [] } = performance;
    
    // Calculate runtime if routines are passed, otherwise default to 0
    const totalDurationSeconds = routines?.reduce((acc, r) => acc + (r.duration_seconds || 0), 0) || 0;
    const durationFormatted = `${Math.floor(totalDurationSeconds / 60)}m ${totalDurationSeconds % 60}s`;

    const handleGetDirections = () => {
        if (venue?.lat && venue?.lng) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`, '_blank');
        } else if (venue?.formatted_address) {
             window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.formatted_address)}`, '_blank');
        }
    };

    return (
        <div className="bg-[#333333] text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden group">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 space-y-6">
                
                {/* Header */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-white/10 text-white hover:bg-white/20 border-none px-3 py-1">
                            Upcoming Event
                        </Badge>
                        {date && (
                             <div className="flex items-center gap-2 text-sm text-gray-300">
                                <Calendar className="w-4 h-4" />
                                <span>{format(new Date(date), 'MMMM d, yyyy')}</span>
                            </div>
                        )}
                    </div>
                    <h3 className="text-3xl md:text-4xl font-serif leading-tight">
                        {title}
                    </h3>
                </div>

                {/* Venue Card */}
                {venue && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center shrink-0">
                                <MapPin className="w-5 h-5 text-pink-400" />
                            </div>
                            <div>
                                <p className="font-bold text-lg">{venue.venue_name || 'TBD'}</p>
                                {venue.formatted_address && (
                                    <p className="text-sm text-gray-400 max-w-md">{venue.formatted_address}</p>
                                )}
                            </div>
                        </div>
                        <Button 
                            onClick={handleGetDirections}
                            className="bg-white text-[#333333] hover:bg-gray-100 font-semibold rounded-xl whitespace-nowrap"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" /> Get Directions
                        </Button>
                    </div>
                )}

                {/* Stats / Footer */}
                <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Est. Runtime: {durationFormatted}</span>
                    </div>
                </div>

            </div>
        </div>
    );
}