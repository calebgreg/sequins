import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Plus, Play, Pause, Search, Trash2, Music2, Sparkles, X, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from "@/components/ui/badge";

// Tag presets for dance classes
const TAG_PRESETS = ['Warmup', 'Barre', 'Center', 'Adagio', 'Allegro', 'Jumps', 'Across the Floor', 'Cooldown', 'Stretch', 'Combo'];

export default function MusicManager({ classData, onBack }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [appleSearch, setAppleSearch] = useState('');
  const [appleResults, setAppleResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [playingPreview, setPlayingPreview] = useState(null);
  const audioRef = useRef(null);
  
  const queryClient = useQueryClient();

  const { data: tracks = [] } = useQuery({
    queryKey: ['musicTracks', classData.id],
    queryFn: async () => {
      const all = await base44.entities.MusicTrack.list();
      return all.filter(t => t.class_id === classData.id);
    }
  });

  const addTrackMutation = useMutation({
    mutationFn: (track) => base44.entities.MusicTrack.create({
      ...track,
      class_id: classData.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musicTracks'] });
      setIsAddOpen(false);
      setSelectedTrack(null);
      setSelectedTags([]);
      setAppleSearch('');
      setAppleResults([]);
    }
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (id) => base44.entities.MusicTrack.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['musicTracks'] })
  });

  const filteredTracks = tracks.filter(t => 
    t.title?.toLowerCase().includes(search.toLowerCase()) || 
    t.artist?.toLowerCase().includes(search.toLowerCase()) ||
    t.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  // Apple Music Search
  const handleAppleSearch = async () => {
    if (!appleSearch.trim()) return;
    setIsSearching(true);
    try {
      const res = await base44.functions.invoke('searchAppleMusic', { query: appleSearch });
      setAppleResults(res.data?.songs || []);
    } catch (err) {
      console.error('Apple Music search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Play/Pause preview
  const togglePreview = (previewUrl, trackId) => {
    if (playingPreview === trackId) {
      audioRef.current?.pause();
      setPlayingPreview(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = previewUrl;
        audioRef.current.play();
        setPlayingPreview(trackId);
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setPlayingPreview(null);
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, []);

  const handleAddTrack = () => {
    if (!selectedTrack) return;
    addTrackMutation.mutate({
      title: selectedTrack.song_title,
      artist: selectedTrack.artist,
      platform: 'apple_music',
      url: selectedTrack.itunes_buy_link,
      artwork_url: selectedTrack.album_artwork_url,
      preview_url: selectedTrack.apple_music_preview_url,
      tags: selectedTags,
    });
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Frosted glass styles
  const cardStyle = {
    background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 15px 50px -15px rgba(180,150,140,0.15)',
  };

  const textGradient = {
    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: '#ffffff',
      }}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} />
      
      {/* Ambient background */}
      <div 
        className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
      />
      <div 
        className="fixed bottom-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <div className="relative px-4 md:px-8 py-6 md:py-8 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.6)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
              color: '#b5a599',
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 
              className="text-xl md:text-2xl font-bold tracking-tight"
              style={textGradient}
            >
              Class Playlist
            </h2>
            <p className="text-xs md:text-sm" style={{ color: '#b5a599' }}>{classData.title}</p>
          </div>
        </div>
        
        <Button 
          onClick={() => setIsAddOpen(true)}
          className="rounded-xl px-4 md:px-6 gap-2 transition-all active:scale-95"
          style={{
            background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
            boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), inset 0 1px 2px rgba(255,255,255,0.8)',
            border: '1px solid rgba(255, 220, 210, 0.5)',
            color: '#8a7070',
          }}
        >
          <Sparkles className="w-4 h-4" /> 
          <span className="hidden md:inline">Add from</span> Apple Music
        </Button>
      </div>

      {/* Content */}
      <div className="relative px-4 md:px-8 pb-8 max-w-4xl mx-auto">
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#c9a99c' }} />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your tracks..."
            className="w-full h-12 md:h-14 pl-12 pr-4 rounded-2xl text-base md:text-lg outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.6)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 16px -8px rgba(180,150,140,0.15)',
              color: '#8b7d72',
            }}
          />
        </div>

        {/* Track List */}
        <div 
          className="rounded-2xl md:rounded-3xl p-4 md:p-6 min-h-[400px]"
          style={cardStyle}
        >
          {filteredTracks.length > 0 ? (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredTracks.map((track, i) => (
                  <motion.div 
                    key={track.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.5)',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                    }}
                  >
                    {/* Artwork / Play Button */}
                    <div className="relative flex-shrink-0">
                      {track.artwork_url ? (
                        <img 
                          src={track.artwork_url} 
                          alt={track.title}
                          className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover shadow-md"
                        />
                      ) : (
                        <div 
                          className="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center"
                          style={{ background: 'linear-gradient(145deg, rgba(244,206,206,0.5) 0%, rgba(232,218,210,0.5) 100%)' }}
                        >
                          <Music2 className="w-6 h-6" style={{ color: '#c9a99c' }} />
                        </div>
                      )}
                      {track.preview_url && (
                        <button
                          onClick={() => togglePreview(track.preview_url, track.id)}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {playingPreview === track.id ? (
                            <Pause className="w-6 h-6 text-white fill-white" />
                          ) : (
                            <Play className="w-6 h-6 text-white fill-white" />
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-semibold text-sm md:text-base truncate"
                        style={textGradient}
                      >
                        {track.title}
                      </h3>
                      <p className="text-xs md:text-sm truncate" style={{ color: '#b5a599' }}>{track.artist}</p>
                      {track.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {track.tags.map((tag, t) => (
                            <span 
                              key={t} 
                              className="text-[10px] md:text-xs px-2 py-0.5 rounded-full"
                              style={{ 
                                background: 'rgba(201,169,156,0.15)', 
                                color: '#a8998e' 
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {track.url && (
                        <button
                          onClick={() => window.open(track.url, '_blank')}
                          className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center transition-all active:scale-95 opacity-60 hover:opacity-100"
                          style={{ color: '#b5a599' }}
                          title="Open in Apple Music"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteTrackMutation.mutate(track.id)}
                        className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center transition-all active:scale-95 opacity-40 hover:opacity-100 hover:text-red-400"
                        style={{ color: '#b5a599' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 md:py-20">
              <div 
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
                  boxShadow: '0 8px 32px -8px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,1)',
                }}
              >
                <Music2 className="w-10 h-10 md:w-12 md:h-12" style={{ color: '#d4c4ba' }} />
              </div>
              <p className="text-base md:text-lg font-medium mb-1" style={textGradient}>No tracks yet</p>
              <p className="text-sm" style={{ color: '#b5a599' }}>Search Apple Music to build your playlist</p>
              <Button 
                onClick={() => setIsAddOpen(true)}
                className="mt-6 rounded-xl px-6 gap-2"
                style={{
                  background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
                  boxShadow: '0 4px 16px -4px rgba(180,150,140,0.25), inset 0 1px 2px rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255, 220, 210, 0.5)',
                  color: '#8a7070',
                }}
              >
                <Sparkles className="w-4 h-4" /> Add Music
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Track Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent 
          className="max-w-lg p-0 border-none overflow-hidden flex flex-col max-h-[85vh]"
          style={{ 
            background: '#ffffff',
            borderRadius: '24px',
          }}
        >
          <div className="p-6 pb-4">
            <DialogHeader>
              <DialogTitle 
                className="text-xl font-bold"
                style={textGradient}
              >
                Add from Apple Music
              </DialogTitle>
            </DialogHeader>
            
            {/* Search Input */}
            <div className="flex gap-2 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#c9a99c' }} />
                <input 
                  value={appleSearch}
                  onChange={e => setAppleSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAppleSearch()}
                  placeholder="Search songs..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl text-sm outline-none"
                  style={{
                    background: 'rgba(253,238,236,0.5)',
                    color: '#8b7d72',
                  }}
                />
              </div>
              <Button 
                onClick={handleAppleSearch}
                disabled={isSearching}
                className="rounded-xl px-5"
                style={{
                  background: 'linear-gradient(145deg, #c4a0a0 0%, #8a7070 100%)',
                  color: '#fff',
                }}
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
          </div>

          {/* Results */}
          <ScrollArea className="flex-1 min-h-0 max-h-[250px]">
            <div className="px-6 pb-4 space-y-2">
              {appleResults.map(song => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelectedTrack(selectedTrack?.id === song.id ? null : song)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    selectedTrack?.id === song.id ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{
                    background: selectedTrack?.id === song.id 
                      ? 'linear-gradient(145deg, rgba(253,238,236,0.8) 0%, rgba(250,232,228,0.6) 100%)'
                      : 'rgba(253,238,236,0.3)',
                    ringColor: '#c4a0a0',
                  }}
                >
                  {/* Artwork with preview */}
                  <div className="relative flex-shrink-0">
                    <img 
                      src={song.album_artwork_url} 
                      alt={song.song_title}
                      className="w-12 h-12 rounded-lg object-cover shadow-sm"
                    />
                    {song.apple_music_preview_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePreview(song.apple_music_preview_url, song.id);
                        }}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg"
                      >
                        {playingPreview === song.id ? (
                          <Pause className="w-5 h-5 text-white fill-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white fill-white" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#8a7070' }}>{song.song_title}</p>
                    <p className="text-xs truncate" style={{ color: '#b5a599' }}>{song.artist}</p>
                  </div>
                  {selectedTrack?.id === song.id && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#c4a0a0' }}>
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </motion.div>
              ))}
              
              {appleResults.length === 0 && appleSearch && !isSearching && (
                <p className="text-center py-8 text-sm" style={{ color: '#b5a599' }}>
                  No results found. Try a different search.
                </p>
              )}
              
              {!appleSearch && (
                <div className="text-center py-8">
                  <Music2 className="w-10 h-10 mx-auto mb-2" style={{ color: '#d4c4ba' }} />
                  <p className="text-sm" style={{ color: '#b5a599' }}>
                    Search for any song on Apple Music
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Tag Selection (only when track selected) */}
          <AnimatePresence>
            {selectedTrack && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t overflow-hidden"
                style={{ borderColor: 'rgba(201,169,156,0.2)' }}
              >
                <div className="p-6">
                  <Label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: '#b5a599' }}>
                    Add Tags (optional)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {TAG_PRESETS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedTags.includes(tag) ? '' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          background: selectedTags.includes(tag) 
                            ? 'linear-gradient(145deg, #c4a0a0 0%, #8a7070 100%)'
                            : 'rgba(201,169,156,0.15)',
                          color: selectedTags.includes(tag) ? '#fff' : '#8a7070',
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="p-6 pt-4 border-t" style={{ borderColor: 'rgba(201,169,156,0.2)' }}>
            <Button 
              onClick={handleAddTrack}
              disabled={!selectedTrack || addTrackMutation.isPending}
              className="w-full h-12 rounded-xl font-semibold transition-all disabled:opacity-50"
              style={{
                background: selectedTrack 
                  ? 'linear-gradient(145deg, #c4a0a0 0%, #8a7070 100%)'
                  : 'rgba(201,169,156,0.2)',
                color: selectedTrack ? '#fff' : '#b5a599',
              }}
            >
              {addTrackMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Playlist
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}