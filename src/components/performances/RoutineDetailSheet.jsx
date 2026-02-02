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
import { Music, Clock, Users, Shirt, Lightbulb, StickyNote, Trash2, Save, Link2, Search, Loader2, PlayCircle, ExternalLink, X, Mic, Plus, Check, Scissors, CalendarDays, UploadCloud, Image as ImageIcon } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

function AppleMusicCard({ formData, setFormData, isValidApple }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = React.useRef(null);

    const togglePlay = () => {
        if (!formData.apple_music_preview_url) return;
        
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }
        setIsPlaying(!isPlaying);
    };

    React.useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.onended = () => setIsPlaying(false);
        }
        return () => {
            if (audio) audio.onended = null;
        };
    }, []);

    return (
        <div 
            className="rounded-2xl overflow-hidden relative group"
            style={{
                background: 'rgba(255,255,255,0.6)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                border: '1px solid rgba(200,180,170,0.2)',
            }}
        >
            {formData.apple_music_preview_url && (
                <audio ref={audioRef} src={formData.apple_music_preview_url} />
            )}
            
            <div className="absolute top-2 right-2 flex gap-1 z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full backdrop-blur-sm"
                    style={{ background: 'rgba(255,255,255,0.6)', color: '#b5a599' }}
                    onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        apple_music_link: '', 
                        album_artwork_url: '',
                        apple_music_preview_url: '',
                        itunes_buy_link: ''
                    }))}
                >
                    <X className="w-3 h-3" />
                </Button>
            </div>
            
            <div className="flex items-center gap-4 p-4">
                {/* Album Art with Play Button */}
                <div className="relative flex-shrink-0">
                    {formData.album_artwork_url ? (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-lg">
                            <img 
                                src={formData.album_artwork_url} 
                                alt="Album Art" 
                                className="w-full h-full object-cover"
                            />
                            {formData.apple_music_preview_url && (
                                <button
                                    onClick={togglePlay}
                                    className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                                >
                                    {isPlaying ? (
                                        <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                            <div className="flex gap-1">
                                                <div className="w-1 h-4 bg-[#FA243C] rounded-full" />
                                                <div className="w-1 h-4 bg-[#FA243C] rounded-full" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                            <PlayCircle className="w-5 h-5 text-[#FA243C]" />
                                        </div>
                                    )}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div 
                            className="w-20 h-20 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(200,180,170,0.15)' }}
                        >
                            <Music className="w-8 h-8" style={{ color: '#c9a99c' }} />
                        </div>
                    )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold leading-tight text-base line-clamp-1" style={{ color: '#8b7d72' }}>
                        {formData.song_title || "Unknown Track"}
                    </h4>
                    <p className="text-sm line-clamp-1 mb-3" style={{ color: '#a8998e' }}>
                        {formData.artist || "Unknown Artist"}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                        {isValidApple(formData.apple_music_link) && (
                            <a 
                                href={formData.apple_music_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FA243C]/10 hover:bg-[#FA243C]/20 text-[#FA243C] rounded-full text-xs font-bold transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.24-.87 3.56-.74c1.52.13 2.67.62 3.4 1.53-2.9 1.5-2.4 5.37.52 6.64-.67 1.83-1.6 3.63-2.56 4.8zm-5.4-15.16c.55-1.74 2.22-3 4.1-3.12.3 2-1.72 4.2-4.1 3.12z"/></svg>
                                Listen
                            </a>
                        )}
                        {formData.itunes_buy_link && (
                            <a 
                                href={formData.itunes_buy_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                                style={{ background: 'rgba(200,180,170,0.15)', color: '#8b7d72' }}
                            >
                                <ExternalLink className="w-3 h-3" />
                                Buy
                            </a>
                        )}
                        {formData.apple_music_preview_url && (
                            <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(126,184,154,0.15)', color: '#7eb89a' }}>
                                30s Preview Available
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function GroomingInput({ label, value, image, onChange, onImageUpload, onImageRemove, placeholder }) {
    return (
        <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">{label}</Label>
            
            {/* Image Drop Area */}
            <div className="relative group">
                {image ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group-hover:shadow-md transition-all">
                        <img src={image} alt={label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="cursor-pointer p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors">
                                <UploadCloud className="w-4 h-4" />
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => onImageUpload(e.target.files[0])} />
                            </label>
                            <button 
                                onClick={onImageRemove}
                                className="p-2 bg-white/20 hover:bg-red-500/80 rounded-full text-white backdrop-blur-sm transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-indigo-50/50 hover:border-indigo-200 cursor-pointer transition-all group-hover:scale-[1.01]">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <div className="w-10 h-10 mb-3 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 group-hover:text-indigo-500 transition-colors">
                                <ImageIcon className="w-5 h-5" />
                            </div>
                            <p className="mb-1 text-xs text-gray-500 font-medium">Click to upload photo</p>
                            <p className="text-[10px] text-gray-400">or drag and drop</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => onImageUpload(e.target.files[0])} />
                    </label>
                )}
            </div>

            {/* Text Input */}
            <Input 
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="bg-white"
            />
        </div>
    );
}

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
                duration_seconds_part: (routine.duration_seconds || 180) % 60,
                grooming: routine.grooming || { hair: '', makeup: '', tights: '', shoes: '', notes: '' },
                rehearsals: routine.rehearsals || []
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
                apple_music_link: data.apple_music_link,
                album_artwork_url: data.album_artwork_url,
                apple_music_preview_url: data.apple_music_preview_url,
                itunes_buy_link: data.itunes_buy_link,
                grooming: data.grooming,
                rehearsals: data.rehearsals
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
                    apple_music_link: data.apple_music_link || formData.apple_music_link,
                    album_artwork_url: data.album_artwork_url || formData.album_artwork_url,
                    apple_music_preview_url: data.apple_music_preview_url || formData.apple_music_preview_url,
                    itunes_buy_link: data.itunes_buy_link || formData.itunes_buy_link
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

    const isValidApple = (url) => url && url.includes('music.apple.com');
    const hasValidMusic = isValidApple(formData.apple_music_link) || formData.album_artwork_url;

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

    const handleGroomingChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            grooming: { ...prev.grooming, [field]: value }
        }));
    };

    const handleImageUpload = async (file, field) => {
        if (!file) return;
        
        const toastId = toast.loading("Uploading image...");
        try {
            // Upload to base44 storage
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            // Update form data
            handleGroomingChange(field, file_url);
            toast.success("Image uploaded", { id: toastId });
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to upload image", { id: toastId });
        }
    };

    const addRehearsal = () => {
        setFormData(prev => ({
            ...prev,
            rehearsals: [...(prev.rehearsals || []), {
                id: crypto.randomUUID(),
                title: 'New Rehearsal',
                date: '',
                start_time: '',
                end_time: '',
                location: '',
                notes: ''
            }]
        }));
    };

    const updateRehearsal = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            rehearsals: prev.rehearsals.map(r => r.id === id ? { ...r, [field]: value } : r)
        }));
    };

    const removeRehearsal = (id) => {
        setFormData(prev => ({
            ...prev,
            rehearsals: prev.rehearsals.filter(r => r.id !== id)
        }));
    };

    if (!routine) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent 
                className="w-full sm:max-w-xl overflow-y-auto p-0 border-none"
                style={{ background: '#ffffff' }}
            >
                {/* Ambient background shapes */}
                <div 
                    className="fixed top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-40 blur-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
                />
                <div 
                    className="fixed bottom-[-30%] left-[-15%] w-[500px] h-[500px] rounded-full opacity-30 blur-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
                />

                <div 
                    className="p-6 pb-4 sticky top-0 z-10"
                    style={{
                        background: 'linear-gradient(145deg, rgba(253,238,236,0.95) 0%, rgba(250,232,228,0.9) 100%)',
                        boxShadow: 'inset 0 -1px 1px rgba(200,180,170,0.1)',
                    }}
                >
                    <SheetHeader>
                        <SheetTitle 
                            className="text-2xl font-bold tracking-tight"
                            style={{ 
                                color: 'transparent',
                                backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                            }}
                        >
                            Edit Routine
                        </SheetTitle>
                        <SheetDescription style={{ color: '#a8998e' }}>
                            Configure details for {formData.title || 'this act'}
                        </SheetDescription>
                    </SheetHeader>
                </div>

                <div className="p-6 space-y-8 relative">
                    {/* Basic Info */}
                    <div 
                        id="section-general" 
                        className="space-y-5 p-6 rounded-3xl relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                        }}
                    >
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#b5a599' }}>Routine Title</Label>
                            <Input 
                                value={formData.title || ''} 
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="text-lg font-medium h-12 rounded-xl transition-colors"
                                style={{
                                    background: 'rgba(255,255,255,0.6)',
                                    border: '1px solid rgba(200,180,170,0.2)',
                                    color: '#8b7d72',
                                }}
                            />
                        </div>

                        <div id="section-music" className="grid grid-cols-2 gap-4 scroll-mt-20">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm" style={{ color: '#8b7d72' }}><Music className="w-3 h-3" style={{ color: '#c9a99c' }} /> Song</Label>
                                <Input 
                                    value={formData.song_title || ''} 
                                    onChange={(e) => setFormData({...formData, song_title: e.target.value})}
                                    placeholder="Song Title"
                                    className="rounded-xl"
                                    style={{
                                        background: 'rgba(255,255,255,0.6)',
                                        border: '1px solid rgba(200,180,170,0.2)',
                                        color: '#8b7d72',
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm" style={{ color: '#8b7d72' }}><Mic className="w-3 h-3" style={{ color: '#c9a99c' }} /> Artist</Label>
                                <Input 
                                    value={formData.artist || ''} 
                                    onChange={(e) => setFormData({...formData, artist: e.target.value})}
                                    placeholder="Artist Name"
                                    className="rounded-xl"
                                    style={{
                                        background: 'rgba(255,255,255,0.6)',
                                        border: '1px solid rgba(200,180,170,0.2)',
                                        color: '#8b7d72',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Apple Music Card Integration */}
                        {hasValidMusic ? (
                          <AppleMusicCard 
                              formData={formData}
                              setFormData={setFormData}
                              isValidApple={isValidApple}
                          />
                        ) : (
                            <div 
                                className="rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 group transition-colors"
                                style={{
                                    background: 'rgba(255,255,255,0.4)',
                                    border: '2px dashed rgba(200,180,170,0.3)',
                                }}
                            >
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                                    style={{
                                        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                                        boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                                    }}
                                >
                                    <Music className="w-6 h-6" style={{ color: '#c9a99c' }} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium" style={{ color: '#8b7d72' }}>No music linked yet</p>
                                    <p className="text-xs max-w-[200px] mx-auto" style={{ color: '#b5a599' }}>Search Apple Music to add album art and preview.</p>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={handleFindLinks}
                                    disabled={isSearchingMusic || !formData.song_title}
                                    className="rounded-full text-xs font-bold"
                                    style={{
                                        background: 'rgba(255,255,255,0.6)',
                                        color: '#8b7d72',
                                        border: '1px solid rgba(200,180,170,0.2)',
                                    }}
                                >
                                    {isSearchingMusic ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin mr-2" /> Searching Apple Music...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-3 h-3 mr-2" /> Find on Apple Music
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm" style={{ color: '#8b7d72' }}><Clock className="w-3 h-3" style={{ color: '#c9a99c' }} /> Duration</Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    min="0"
                                    value={formData.duration_minutes || 0} 
                                    onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                                    className="w-20 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(200,180,170,0.2)', color: '#8b7d72' }}
                                />
                                <span className="text-sm" style={{ color: '#b5a599' }}>min</span>
                                <Input 
                                    type="number" 
                                    min="0" 
                                    max="59"
                                    value={formData.duration_seconds_part || 0} 
                                    onChange={(e) => setFormData({...formData, duration_seconds_part: e.target.value})}
                                    className="w-20 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(200,180,170,0.2)', color: '#8b7d72' }}
                                />
                                <span className="text-sm" style={{ color: '#b5a599' }}>sec</span>
                            </div>
                        </div>
                    </div>

                    {/* Grooming & Schedule */}
                    <div 
                        className="p-6 rounded-3xl space-y-6"
                        style={{
                            background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                        }}
                    >
                        <h3 
                            className="text-xl font-bold flex items-center gap-2"
                            style={{ color: '#8b7d72' }}
                        >
                            <Scissors className="w-5 h-5" style={{ color: '#c9a99c' }} />
                            Grooming & Attire
                        </h3>
                        <div id="section-grooming" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <GroomingInput 
                                label="Hair" 
                                value={formData.grooming?.hair} 
                                image={formData.grooming?.hair_image}
                                onChange={(val) => handleGroomingChange('hair', val)}
                                onImageUpload={(file) => handleImageUpload(file, 'hair_image')}
                                onImageRemove={() => handleGroomingChange('hair_image', '')}
                                placeholder="e.g. Low bun, middle part"
                            />
                            <GroomingInput 
                                label="Makeup" 
                                value={formData.grooming?.makeup} 
                                image={formData.grooming?.makeup_image}
                                onChange={(val) => handleGroomingChange('makeup', val)}
                                onImageUpload={(file) => handleImageUpload(file, 'makeup_image')}
                                onImageRemove={() => handleGroomingChange('makeup_image', '')}
                                placeholder="e.g. Standard Stage Face"
                            />
                            <GroomingInput 
                                label="Tights" 
                                value={formData.grooming?.tights} 
                                image={formData.grooming?.tights_image}
                                onChange={(val) => handleGroomingChange('tights', val)}
                                onImageUpload={(file) => handleImageUpload(file, 'tights_image')}
                                onImageRemove={() => handleGroomingChange('tights_image', '')}
                                placeholder="e.g. Tan Footed"
                            />
                            <GroomingInput 
                                label="Shoes" 
                                value={formData.grooming?.shoes} 
                                image={formData.grooming?.shoes_image}
                                onChange={(val) => handleGroomingChange('shoes', val)}
                                onImageUpload={(file) => handleImageUpload(file, 'shoes_image')}
                                onImageRemove={() => handleGroomingChange('shoes_image', '')}
                                placeholder="e.g. Black Jazz"
                            />
                            
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Director's Notes</Label>
                                <Textarea 
                                    value={formData.grooming?.notes || ''}
                                    onChange={(e) => handleGroomingChange('notes', e.target.value)}
                                    placeholder="Add notes that will appear as handwritten instructions for parents..."
                                    className="bg-white border-gray-200 focus:bg-white min-h-[100px]"
                                />
                            </div>
                        </div>
                    </div>

                    <div 
                        className="p-6 rounded-3xl space-y-6"
                        style={{
                            background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#8b7d72' }}>
                                <CalendarDays className="w-5 h-5" style={{ color: '#c9a99c' }} />
                                Class Schedule
                            </h3>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={addRehearsal}
                                className="rounded-full"
                                style={{ background: 'rgba(255,255,255,0.6)', color: '#8b7d72', border: '1px solid rgba(200,180,170,0.2)' }}
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add Event
                            </Button>
                        </div>
                        
                        <div id="section-schedule" className="space-y-3">
                            {formData.rehearsals?.map((rehearsal) => (
                                <div key={rehearsal.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative group">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                        onClick={() => removeRehearsal(rehearsal.id)}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                                        <Input 
                                            value={rehearsal.title}
                                            onChange={(e) => updateRehearsal(rehearsal.id, 'title', e.target.value)}
                                            placeholder="Event Name (e.g. Dress Rehearsal)"
                                            className="font-medium bg-white"
                                        />
                                        <Input 
                                            type="date"
                                            value={rehearsal.date}
                                            onChange={(e) => updateRehearsal(rehearsal.id, 'date', e.target.value)}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 mb-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-400 uppercase">Start</Label>
                                            <Input 
                                                type="time"
                                                value={rehearsal.start_time}
                                                onChange={(e) => updateRehearsal(rehearsal.id, 'start_time', e.target.value)}
                                                className="bg-white text-xs h-8"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-400 uppercase">End</Label>
                                            <Input 
                                                type="time"
                                                value={rehearsal.end_time}
                                                onChange={(e) => updateRehearsal(rehearsal.id, 'end_time', e.target.value)}
                                                className="bg-white text-xs h-8"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-gray-400 uppercase">Location</Label>
                                            <Input 
                                                value={rehearsal.location}
                                                onChange={(e) => updateRehearsal(rehearsal.id, 'location', e.target.value)}
                                                placeholder="Venue"
                                                className="bg-white text-xs h-8"
                                            />
                                        </div>
                                    </div>
                                    <Input 
                                        value={rehearsal.notes}
                                        onChange={(e) => updateRehearsal(rehearsal.id, 'notes', e.target.value)}
                                        placeholder="Notes (e.g. Arrive in costume, no parents allowed)"
                                        className="bg-white text-xs"
                                    />
                                </div>
                            ))}
                            {(!formData.rehearsals || formData.rehearsals.length === 0) && (
                                <div className="text-center text-sm text-gray-400 py-6 border-2 border-dashed border-gray-100 rounded-xl">
                                    No specific rehearsals or call times added for this group.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tech Details */}
                    <div 
                        className="p-6 rounded-3xl space-y-6"
                        style={{
                            background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                        }}
                    >
                        <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#8b7d72' }}>
                            <Lightbulb className="w-5 h-5" style={{ color: '#c9a99c' }} />
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
                    <div 
                        id="section-performers" 
                        className="p-6 rounded-3xl space-y-4"
                        style={{
                            background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                        }}
                    >
                         <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#8b7d72' }}>
                                <Users className="w-5 h-5" style={{ color: '#c9a99c' }} />
                                Cast 
                                <span 
                                    className="text-sm px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(164,139,196,0.15)', color: '#8b7d9a' }}
                                >
                                    {formData.performers?.length || 0}
                                </span>
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

                <div 
                    className="p-6 sticky bottom-0 z-10 flex items-center justify-between gap-3"
                    style={{
                        background: 'linear-gradient(145deg, rgba(253,238,236,0.95) 0%, rgba(250,232,228,0.9) 100%)',
                        borderTop: '1px solid rgba(200,180,170,0.2)',
                    }}
                >
                     <Button 
                        variant="ghost" 
                        onClick={() => {
                            if (confirm("Are you sure you want to delete this routine?")) {
                                deleteRoutine.mutate();
                            }
                        }}
                        className="rounded-full"
                        style={{ color: '#c87070' }}
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => onOpenChange(false)} 
                            className="rounded-full"
                            style={{ color: '#b5a599' }}
                        >
                            Cancel
                        </Button>
                        <button 
                            onClick={handleSave}
                            className="px-6 py-3 rounded-2xl text-sm font-bold tracking-tight transition-all hover:scale-[1.02]"
                            style={{
                                background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
                                boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
                                border: '1px solid rgba(255, 220, 210, 0.5)',
                            }}
                        >
                            <span
                                style={{
                                    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    color: 'transparent',
                                }}
                                className="flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" style={{ color: '#8a7070' }} /> Save Changes
                            </span>
                        </button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}