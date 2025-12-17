import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Music, Clock, Users, Shirt, Lightbulb, StickyNote, Trash2, Save, Link2, Search, Loader2, PlayCircle, ExternalLink, X, Mic, Plus, Check } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function RoutineDetailSheet({ routine, open, onOpenChange, allStudents = [], selectedSection = 'general' }) {
    const [formData, setFormData] = useState({});
    const [isSearchingMusic, setIsSearchingMusic] = useState(false);
    const [searchStudent, setSearchStudent] = useState("");
    const queryClient = useQueryClient();

    // Auto-scroll effect
    useEffect(() => {
        if (open && selectedSection) {
            setTimeout(() => {
                const element = document.getElementById(`section-${selectedSection}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100); // Small delay to ensure sheet is rendered
        }
    }, [open, selectedSection]);

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
                costume_product_suggestions: data.costume_product_suggestions,
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
        updateRoutine.mutate(formData, {
            onSuccess: () => onOpenChange(false)
        });
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

    const filteredStudents = useMemo(() => {
        if (!searchStudent) return allStudents;
        return allStudents.filter(s => s.name.toLowerCase().includes(searchStudent.toLowerCase()));
    }, [allStudents, searchStudent]);

    const toggleStudent = (studentId) => {
        const currentPerformers = formData.performers || [];
        const newPerformers = currentPerformers.includes(studentId)
            ? currentPerformers.filter(id => id !== studentId)
            : [...currentPerformers, studentId];
        setFormData({ ...formData, performers: newPerformers });
    };

    if (!routine) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 bg-[#FDFBF7]">
                <div className="p-6 pb-2 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <SheetHeader>
                        <SheetTitle className="text-2xl font-serif text-[#333333]">Edit Routine</SheetTitle>
                        <SheetDescription>
                            Configure details for {formData.title || 'this act'}
                        </SheetDescription>
                    </SheetHeader>
                </div>

                <div className="p-6 space-y-8">
                    {/* Basic Info */}
                    <div id="section-general" className="space-y-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Routine Title</Label>
                            <Input 
                                value={formData.title || ''} 
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="text-lg font-medium border-gray-200 bg-[#F9F9FB] focus:bg-white transition-colors h-11"
                            />
                        </div>

                        <div id="section-music" className="grid grid-cols-2 gap-4 scroll-mt-20">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Music className="w-3 h-3" /> Song</Label>
                                <Input 
                                    value={formData.song_title || ''} 
                                    onChange={(e) => setFormData({...formData, song_title: e.target.value})}
                                    placeholder="Song Title"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Mic className="w-3 h-3" /> Artist</Label>
                                <Input 
                                    value={formData.artist || ''} 
                                    onChange={(e) => setFormData({...formData, artist: e.target.value})}
                                    placeholder="Artist Name"
                                />
                            </div>
                        </div>

                        {/* Premium Music Card Integration */}
                        {hasValidMusic ? (
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
                                          {isValidSpotify(formData.spotify_link) ? (
                                              <a 
                                                  href={formData.spotify_link} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="flex items-center gap-2 px-3 py-1.5 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] rounded-full text-xs font-bold transition-colors"
                                              >
                                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                                                  Spotify
                                              </a>
                                          ) : (
                                              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-full text-xs font-bold select-none cursor-not-allowed grayscale opacity-70">
                                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                                                  Spotify
                                              </div>
                                          )}

                                          {isValidApple(formData.apple_music_link) ? (
                                              <a 
                                                  href={formData.apple_music_link} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="flex items-center gap-2 px-3 py-1.5 bg-[#FA243C]/10 hover:bg-[#FA243C]/20 text-[#FA243C] rounded-full text-xs font-bold transition-colors"
                                              >
                                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.24-.87 3.56-.74c1.52.13 2.67.62 3.4 1.53-2.9 1.5-2.4 5.37.52 6.64-.67 1.83-1.6 3.63-2.56 4.8zm-5.4-15.16c.55-1.74 2.22-3 4.1-3.12.3 2-1.72 4.2-4.1 3.12z"/></svg>
                                                  Apple Music
                                              </a>
                                          ) : (
                                              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-full text-xs font-bold select-none cursor-not-allowed grayscale opacity-70">
                                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.24-.87 3.56-.74c1.52.13 2.67.62 3.4 1.53-2.9 1.5-2.4 5.37.52 6.64-.67 1.83-1.6 3.63-2.56 4.8zm-5.4-15.16c.55-1.74 2.22-3 4.1-3.12.3 2-1.72 4.2-4.1 3.12z"/></svg>
                                                  Apple Music
                                              </div>
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

                    {/* Tech Details */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                        <h3 className="font-serif text-xl text-[#333333] flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-gray-400" />
                            Production Details
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-6">
                            <div id="section-costumes" className="space-y-2 scroll-mt-20">
                                <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <Shirt className="w-3 h-3" /> Costumes
                                </Label>
                                <Textarea 
                                    value={formData.costume_details || ''} 
                                    onChange={(e) => setFormData({...formData, costume_details: e.target.value})}
                                    placeholder="Describe specific costume requirements, colors, and accessories..."
                                    className="min-h-[80px] bg-[#F9F9FB] border-gray-100 focus:bg-white focus:border-indigo-200 transition-all resize-none"
                                />
                                {formData.costume_product_suggestions && formData.costume_product_suggestions.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        <Label className="text-[10px] font-bold text-pink-500 uppercase tracking-wider flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" /> AI Sourced Options
                                        </Label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {formData.costume_product_suggestions.map((item, idx) => (
                                                <a 
                                                    key={idx} 
                                                    href={item.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="group relative block bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-all"
                                                >
                                                    <div className="aspect-[3/4] bg-gray-50 relative">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Shirt className="w-8 h-8 text-gray-200" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <ExternalLink className="w-6 h-6 text-white drop-shadow-md" />
                                                        </div>
                                                    </div>
                                                    <div className="p-2">
                                                        <p className="text-xs font-medium text-gray-700 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                                                            {item.name}
                                                        </p>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div id="section-lighting" className="space-y-2 scroll-mt-20">
                                <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <Lightbulb className="w-3 h-3" /> Lighting & Tech
                                </Label>
                                <Textarea 
                                    value={formData.lighting_notes || ''} 
                                    onChange={(e) => setFormData({...formData, lighting_notes: e.target.value})}
                                    placeholder="Lighting cues, mood, props, and special effects..."
                                    className="min-h-[80px] bg-[#F9F9FB] border-gray-100 focus:bg-white focus:border-indigo-200 transition-all resize-none"
                                />
                            </div>

                            <div id="section-choreography" className="space-y-2 scroll-mt-20">
                                <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <StickyNote className="w-3 h-3" /> Notes
                                </Label>
                                <Textarea 
                                    value={formData.notes || ''} 
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    placeholder="Choreography notes, entrance/exit, blocking..."
                                    className="min-h-[80px] bg-[#F9F9FB] border-gray-100 focus:bg-white focus:border-indigo-200 transition-all resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Performers */}
                    <div id="section-performers" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                         <div className="flex items-center justify-between">
                            <h3 className="font-serif text-xl text-[#333333] flex items-center gap-2">
                                <Users className="w-5 h-5 text-gray-400" />
                                Cast <Badge variant="secondary" className="rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100">{formData.performers?.length || 0}</Badge>
                            </h3>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input 
                                    placeholder="Search students..." 
                                    value={searchStudent}
                                    onChange={(e) => setSearchStudent(e.target.value)}
                                    className="pl-9 bg-[#F9F9FB] border-gray-100 focus:bg-white"
                                />
                            </div>

                            <ScrollArea className="h-[200px] pr-4">
                                <div className="space-y-2">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map(student => {
                                            const isSelected = (formData.performers || []).includes(student.id);
                                            return (
                                                <div 
                                                    key={student.id}
                                                    onClick={() => toggleStudent(student.id)}
                                                    className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all group ${
                                                        isSelected 
                                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                                                            : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                                        isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                                                    }`}>
                                                        {student.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`font-medium text-sm truncate ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                                                            {student.name}
                                                        </div>
                                                        <div className="text-xs text-gray-400 truncate">
                                                            {student.level} • {student.age} yrs
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <Check className="w-4 h-4 text-indigo-600 mr-1" />
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            No students found
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0 z-10 flex items-center justify-between gap-3">
                     <Button 
                        variant="ghost" 
                        onClick={() => {
                            if (confirm("Are you sure you want to delete this routine?")) {
                                deleteRoutine.mutate();
                            }
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">Cancel</Button>
                        <Button onClick={handleSave} className="bg-[#333333] text-white hover:bg-black rounded-full px-6 shadow-lg hover:shadow-xl transition-all">
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}