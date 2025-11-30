import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, Plus, ExternalLink, Play, Search, Trash2, MoreVertical, Disc, ListMusic } from 'lucide-react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MusicManager({ classData, onBack }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', url: '', platform: 'spotify', tags: '' });
  const [search, setSearch] = useState('');
  
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
      tags: track.tags.split(',').map(t => t.trim()).filter(Boolean)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['musicTracks'] });
      setIsAddOpen(false);
      setNewTrack({ title: '', artist: '', url: '', platform: 'spotify', tags: '' });
    }
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (id) => base44.entities.MusicTrack.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['musicTracks'] })
  });

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.artist.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!newTrack.title) return;
    addTrackMutation.mutate(newTrack);
  };

  return (
    <div className="h-full flex flex-col bg-[#F4F4F6]">
      {/* Header */}
      <div className="px-8 py-8 flex items-center justify-between sticky top-0 z-10 bg-[#F4F4F6]">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={onBack} className="bg-white rounded-full w-12 h-12 shadow-sm text-[#333333] hover:bg-white/80">
            <ListMusic className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-serif text-3xl text-[#333333]">Class Music</h2>
            <p className="text-gray-400 font-serif">Playlists for {classData.title}</p>
          </div>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#333333] text-white rounded-full px-6 gap-2 hover:bg-black shadow-lg">
              <Plus className="w-4 h-4" /> Add Track
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white rounded-[32px] border-none p-8 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-center mb-6">Add New Track</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="ml-1 mb-1 block text-xs font-bold uppercase text-gray-400 tracking-wider">Title</Label>
                <Input value={newTrack.title} onChange={e => setNewTrack({...newTrack, title: e.target.value})} className="rounded-xl bg-[#F4F4F6] border-transparent" placeholder="Song Name" />
              </div>
              <div>
                <Label className="ml-1 mb-1 block text-xs font-bold uppercase text-gray-400 tracking-wider">Artist</Label>
                <Input value={newTrack.artist} onChange={e => setNewTrack({...newTrack, artist: e.target.value})} className="rounded-xl bg-[#F4F4F6] border-transparent" placeholder="Artist Name" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                 <div className="col-span-2">
                    <Label className="ml-1 mb-1 block text-xs font-bold uppercase text-gray-400 tracking-wider">Link / URL</Label>
                    <Input value={newTrack.url} onChange={e => setNewTrack({...newTrack, url: e.target.value})} className="rounded-xl bg-[#F4F4F6] border-transparent" placeholder="https://..." />
                 </div>
                 <div>
                    <Label className="ml-1 mb-1 block text-xs font-bold uppercase text-gray-400 tracking-wider">Source</Label>
                    <Select value={newTrack.platform} onValueChange={v => setNewTrack({...newTrack, platform: v})}>
                      <SelectTrigger className="rounded-xl bg-[#F4F4F6] border-transparent"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spotify">Spotify</SelectItem>
                        <SelectItem value="apple_music">Apple</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                      </SelectContent>
                    </Select>
                 </div>
              </div>
              <div>
                <Label className="ml-1 mb-1 block text-xs font-bold uppercase text-gray-400 tracking-wider">Tags (comma separated)</Label>
                <Input value={newTrack.tags} onChange={e => setNewTrack({...newTrack, tags: e.target.value})} className="rounded-xl bg-[#F4F4F6] border-transparent" placeholder="Warmup, Adagio, Combo..." />
              </div>
              <Button onClick={handleAdd} className="w-full rounded-full h-12 mt-4 bg-[#333333] hover:bg-black">Save Track</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 pb-8 overflow-hidden flex flex-col max-w-5xl mx-auto w-full">
        
        {/* Search Bar */}
        <div className="relative mb-6">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
           <Input 
             value={search}
             onChange={e => setSearch(e.target.value)}
             placeholder="Search tracks by title, artist, or tag..."
             className="w-full h-14 pl-12 rounded-2xl bg-white border-transparent shadow-sm text-lg"
           />
        </div>

        {/* Track List */}
        <div className="flex-1 bg-white rounded-[32px] shadow-sm overflow-hidden p-2">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {filteredTracks.length > 0 ? (
                filteredTracks.map((track, i) => (
                  <motion.div 
                    key={track.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex items-center justify-between p-4 rounded-2xl hover:bg-[#F4F4F6] transition-colors cursor-default"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#F2DCDD] flex items-center justify-center text-[#333333] group-hover:scale-110 transition-transform shadow-sm">
                         <Music className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg text-[#333333]">{track.title}</h3>
                        <p className="text-gray-400 text-sm">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                        {track.tags?.map((tag, t) => (
                          <span key={t} className="text-xs px-2 py-1 bg-white border border-gray-100 rounded-md text-gray-500 shadow-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                         {track.url && (
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-10 w-10 rounded-full bg-white hover:bg-green-50 text-green-600 shadow-sm border border-gray-100"
                             onClick={() => window.open(track.url, '_blank')}
                             title="Open Link"
                           >
                             <Play className="w-4 h-4 fill-current" />
                           </Button>
                         )}
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-10 w-10 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50"
                           onClick={() => deleteTrackMutation.mutate(track.id)}
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <Disc className="w-16 h-16 mx-auto mb-4 text-gray-200 animate-spin-slow" />
                  <p>No tracks found. Add some music to get the vibe going!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}