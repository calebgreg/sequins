import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Music, Clock, Users, Shirt, Lightbulb, StickyNote, Trash2, Save } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function RoutineDetailSheet({ routine, open, onOpenChange, allStudents }) {
    const [formData, setFormData] = useState({});
    const queryClient = useQueryClient();

    useEffect(() => {
        if (routine) {
            setFormData({
                ...routine,
                performers: routine.performers || [],
                duration_minutes: Math.floor((routine.duration_seconds || 180) / 60),
                duration_seconds_part: (routine.duration_seconds || 180) % 60
            });
        }
    }, [routine]);

    const updateRoutine = useMutation({
        mutationFn: async (data) => {
            const totalSeconds = (parseInt(data.duration_minutes || 0) * 60) + parseInt(data.duration_seconds_part || 0);
            return base44.entities.PerformanceRoutine.update(routine.id, {
                title: data.title,
                song_title: data.song_title,
                artist: data.artist,
                duration_seconds: totalSeconds,
                costume_details: data.costume_details,
                lighting_notes: data.lighting_notes,
                notes: data.notes,
                performers: data.performers
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['routines']);
            toast.success("Routine updated");
            onOpenChange(false);
        },
        onError: () => toast.error("Failed to update routine")
    });

    const deleteRoutine = useMutation({
        mutationFn: () => base44.entities.PerformanceRoutine.delete(routine.id),
        onSuccess: () => {
            queryClient.invalidateQueries(['routines']);
            toast.success("Routine deleted");
            onOpenChange(false);
        }
    });

    const handleSave = () => {
        updateRoutine.mutate(formData);
    };

    if (!routine) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl font-serif">Edit Routine</SheetTitle>
                    <SheetDescription>
                        Configure technical details, music, and performers for this act.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-8">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Routine Title</Label>
                            <Input 
                                value={formData.title || ''} 
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="text-lg font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Music className="w-3 h-3" /> Song</Label>
                                <Input 
                                    value={formData.song_title || ''} 
                                    onChange={(e) => setFormData({...formData, song_title: e.target.value})}
                                    placeholder="Song Title"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Artist</Label>
                                <Input 
                                    value={formData.artist || ''} 
                                    onChange={(e) => setFormData({...formData, artist: e.target.value})}
                                    placeholder="Artist Name"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Clock className="w-3 h-3" /> Duration</Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    min="0"
                                    value={formData.duration_minutes || 0} 
                                    onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                                    className="w-20"
                                />
                                <span className="text-sm text-gray-500">min</span>
                                <Input 
                                    type="number" 
                                    min="0" 
                                    max="59"
                                    value={formData.duration_seconds_part || 0} 
                                    onChange={(e) => setFormData({...formData, duration_seconds_part: e.target.value})}
                                    className="w-20"
                                />
                                <span className="text-sm text-gray-500">sec</span>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Tech Details */}
                    <div className="space-y-4">
                        <h3 className="font-serif text-lg">Production Details</h3>
                        
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-pink-600"><Shirt className="w-4 h-4" /> Costume Notes</Label>
                            <Textarea 
                                value={formData.costume_details || ''} 
                                onChange={(e) => setFormData({...formData, costume_details: e.target.value})}
                                placeholder="Describe costume requirements..."
                                className="bg-pink-50/30 border-pink-100 focus-visible:ring-pink-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-amber-600"><Lightbulb className="w-4 h-4" /> Lighting / Tech</Label>
                            <Textarea 
                                value={formData.lighting_notes || ''} 
                                onChange={(e) => setFormData({...formData, lighting_notes: e.target.value})}
                                placeholder="Lighting cues, props, projections..."
                                className="bg-amber-50/30 border-amber-100 focus-visible:ring-amber-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><StickyNote className="w-4 h-4" /> General Notes</Label>
                            <Textarea 
                                value={formData.notes || ''} 
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                placeholder="Choreography notes, entrance/exit..."
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Performers */}
                    <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2"><Users className="w-4 h-4" /> Cast ({formData.performers?.length || 0})</Label>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 h-40 overflow-y-auto text-sm text-gray-500">
                            {/* Simple placeholder for student selection - fully implementing a multi-select student picker is complex for this modal size but this is where it would go */}
                            <p className="italic">Performers list management coming in next update.</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {formData.performers?.map(pid => {
                                    const st = allStudents?.find(s => s.id === pid);
                                    return (
                                        <Badge key={pid} variant="secondary">
                                            {st ? st.name : 'Unknown Student'}
                                        </Badge>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <SheetFooter className="mt-8 gap-2 sm:gap-0">
                    <Button 
                        variant="destructive" 
                        onClick={() => {
                            if (confirm("Are you sure you want to delete this routine?")) {
                                deleteRoutine.mutate();
                            }
                        }}
                        className="mr-auto"
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} className="bg-[#333333] text-white hover:bg-black">
                        <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}