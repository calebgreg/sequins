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
import { Music, Clock, Users, Shirt, Lightbulb, StickyNote, Trash2, Save, Link2, Search, Loader2, PlayCircle, ExternalLink, X } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function RoutineDetailSheet({ routine, open, onOpenChange, allStudents }) {
    const [formData, setFormData] = useState({});
    const [isSearchingMusic, setIsSearchingMusic] = useState(false);
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
                performers: data.performers,
                spotify_link: data.spotify_link,
                apple_music_link: data.apple_music_link
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

    const handleFindLinks = async () => {
        if (!formData.song_title) {
            toast.error("Please enter a song title first");
            return;
        }

        setIsSearchingMusic(true);
        try {
            const { data } = await base44.functions.invoke('findMusicLinks', {
                song_title: formData.song_title,
                artist: formData.artist
            });

            if (data.spotify_link || data.apple_music_link) {
                const newLinks = {
                    spotify_link: data.spotify_link || formData.spotify_link,
                    apple_music_link: data.apple_music_link || formData.apple_music_link
                };
                const updatedData = { ...formData, ...newLinks };
                setFormData(updatedData);
                updateRoutine.mutate(updatedData);
                toast.success("Music links found and saved!");
            } else {
                toast.info("No links found automatically");
            }
        } catch (error) {
            toast.error("Failed to search for links");
            console.error(error);
        } finally {
            setIsSearchingMusic(false);
        }
    };

    const isValidSpotify = (url) => url && url.includes('spotify.com') && url.includes('/track/');
    const isValidApple = (url) => url && url.includes('music.apple.com');
    const hasValidMusic = isValidSpotify(formData.spotify_link) || isValidApple(formData.apple_music_link);

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

                        {/* Premium Music Card Integration */}
                        {formData.spotify_link || formData.apple_music_link ? (
                          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative group">
                              <div className="absolute top-2 right-2 flex gap-1 z-10">
                                   <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded-full bg-white/80 hover:bg-white text-gray-500 shadow-sm backdrop-blur-sm"
                                      onClick={() => setFormData(prev => ({ ...prev, spotify_link: '', apple_music_link: '' }))}
                                   >
                                      <X className="w-3 h-3" />
                                   </Button>
                              </div>
                              <div className="flex items-center p-4">
                                  {/* Content Section */}
                                  <div className="flex-1 flex flex-col justify-center">
                                      <div className="mb-3">
                                          <h4 className="font-bold text-[#333333] leading-tight text-lg line-clamp-1">{formData.song_title || "Unknown Track"}</h4>
                                          <p className="text-gray-500 text-sm line-clamp-1">{formData.artist || "Unknown Artist"}</p>
                                      </div>

                                      <div className="flex items-center gap-2">
                                          {formData.spotify_link && (
                                              <a 
                                                  href={formData.spotify_link} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="flex items-center gap-2 px-3 py-1.5 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] rounded-full text-xs font-bold transition-colors"
                                              >
                                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                                                  Spotify
                                              </a>
                                          )}
                                          {formData.apple_music_link && (
                                              <a 
                                                  href={formData.apple_music_link} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="flex items-center gap-2 px-3 py-1.5 bg-[#FA243C]/10 hover:bg-[#FA243C]/20 text-[#FA243C] rounded-full text-xs font-bold transition-colors"
                                              >
                                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.24-.87 3.56-.74c1.52.13 2.67.62 3.4 1.53-2.9 1.5-2.4 5.37.52 6.64-.67 1.83-1.6 3.63-2.56 4.8zm-5.4-15.16c.55-1.74 2.22-3 4.1-3.12.3 2-1.72 4.2-4.1 3.12z"/></svg>
                                                  Apple Music
                                              </a>
                                          )}
                                          {!formData.spotify_link && !formData.apple_music_link && (
                                               <Button 
                                                  variant="ghost" 
                                                  size="sm" 
                                                  onClick={handleFindLinks}
                                                  disabled={isSearchingMusic}
                                                  className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 h-auto rounded-full"
                                              >
                                                  {isSearchingMusic ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Search className="w-3 h-3 mr-1" />}
                                                  Retry Auto-Search
                                              </Button>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                        ) : (
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex flex-col items-center justify-center text-center space-y-3 group hover:border-indigo-100 hover:bg-indigo-50/10 transition-colors">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                    <Music className="w-6 h-6 text-gray-300 group-hover:text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">No music links yet</p>
                                    <p className="text-xs text-gray-500 max-w-[200px] mx-auto">Connect Spotify or Apple Music to enable one-click playback.</p>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={handleFindLinks}
                                    disabled={isSearchingMusic || !formData.song_title}
                                    className="rounded-full text-xs font-bold bg-white hover:text-indigo-600 hover:border-indigo-200"
                                >
                                    {isSearchingMusic ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin mr-2" /> Searching...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-3 h-3 mr-2" /> Auto-Find from Title
                                        </>
                                    )}
                                </Button>

                                <div className="pt-2 w-full max-w-sm">
                                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Or paste links manually</div>
                                      <div className="grid grid-cols-2 gap-2">
                                          <Input 
                                              value={formData.spotify_link || ''}
                                              onChange={(e) => setFormData({...formData, spotify_link: e.target.value})}
                                              placeholder="Spotify URL"
                                              className="h-8 text-xs bg-white text-center"
                                          />
                                          <Input 
                                              value={formData.apple_music_link || ''}
                                              onChange={(e) => setFormData({...formData, apple_music_link: e.target.value})}
                                              placeholder="Apple Music URL"
                                              className="h-8 text-xs bg-white text-center"
                                          />
                                      </div>
                                </div>
                            </div>
                        )}

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