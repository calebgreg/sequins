import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Plus, X, Globe, Music, ShoppingBag } from 'lucide-react';
import { toast } from "sonner";
import LevelManager from './LevelManager';

export default function GeneralSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    type: 'mixed',
    ai_assistant_name: 'Gene',
    music_preference: 'spotify',
    costume_vendors: []
  });
  const [isDirty, setIsDirty] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['studioSettings'],
    queryFn: async () => {
      const res = await base44.entities.StudioSettings.list();
      return res[0] || null;
    }
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || '',
        type: settings.type || 'mixed',
        ai_assistant_name: settings.ai_assistant_name || 'Gene',
        music_preference: settings.music_preference || 'spotify',
        costume_vendors: settings.costume_vendors || []
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (settings) {
        return base44.entities.StudioSettings.update(settings.id, { ...settings, ...data });
      } else {
        return base44.entities.StudioSettings.create({ ...data, levels: ["Beginner", "Intermediate"] });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studioSettings'] });
      toast.success("Studio details updated");
      setIsDirty(false);
    }
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const addVendor = () => {
    setFormData(prev => ({
      ...prev,
      costume_vendors: [...(prev.costume_vendors || []), ""]
    }));
    setIsDirty(true);
  };

  const updateVendor = (index, value) => {
    const newVendors = [...(formData.costume_vendors || [])];
    newVendors[index] = value;
    setFormData(prev => ({ ...prev, costume_vendors: newVendors }));
    setIsDirty(true);
  };

  const removeVendor = (index) => {
    const newVendors = [...(formData.costume_vendors || [])];
    newVendors.splice(index, 1);
    setFormData(prev => ({ ...prev, costume_vendors: newVendors }));
    setIsDirty(true);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <Card className="border-none shadow-sm rounded-[32px] bg-white">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Studio Identity</CardTitle>
          <CardDescription>Basic information about your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Studio Name</Label>
              <Input 
                value={formData.name}
                onChange={(e) => {
                  setFormData({...formData, name: e.target.value});
                  setIsDirty(true);
                }}
                className="h-11 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>AI Assistant Name</Label>
              <Input 
                value={formData.ai_assistant_name}
                onChange={(e) => {
                  setFormData({...formData, ai_assistant_name: e.target.value});
                  setIsDirty(true);
                }}
                placeholder="e.g. Gene, Jarvis, Assistant"
                className="h-11 rounded-xl bg-indigo-50/30 border-indigo-100 focus:border-indigo-300"
              />
              <p className="text-[10px] text-gray-400">Staff can @mention this name to trigger actions.</p>
            </div>
            <div className="space-y-2">
              <Label>Program Focus</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => {
                  setFormData({...formData, type: v});
                  setIsDirty(true);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed (Rec & Comp)</SelectItem>
                  <SelectItem value="recreational">Recreational Only</SelectItem>
                  <SelectItem value="competitive">Competitive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
            {/* Music Integrations */}
            <div className="space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-base">Music Services</Label>
                    <p className="text-[10px] text-gray-500">Connect your account for seamless playback</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-3">
                   {/* Spotify */}
                   <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${formData.music_preference === 'spotify' ? 'bg-[#1DB954]/5 border-[#1DB954]/20 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                       <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center text-white shadow-sm">
                               <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                           </div>
                           <div>
                               <div className="font-bold text-sm text-gray-900">Spotify</div>
                               <div className="text-xs text-gray-500">{formData.music_preference === 'spotify' ? 'Active account connected' : 'Not connected'}</div>
                           </div>
                       </div>
                       {formData.music_preference === 'spotify' ? (
                           <Button variant="outline" size="sm" onClick={() => { setFormData({...formData, music_preference: null}); setIsDirty(true); }} className="text-gray-500 hover:text-red-600 hover:bg-red-50 text-xs h-8 rounded-full border-gray-200">Disconnect</Button>
                       ) : (
                           <Button size="sm" onClick={() => { setFormData({...formData, music_preference: 'spotify'}); setIsDirty(true); }} className="bg-[#1DB954] hover:bg-[#1ed760] text-white text-xs h-8 rounded-full px-4 shadow-sm">Connect</Button>
                       )}
                   </div>

                   {/* Apple Music */}
                   <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${formData.music_preference === 'apple_music' ? 'bg-[#FA243C]/5 border-[#FA243C]/20 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                       <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-[#FA243C] flex items-center justify-center text-white shadow-sm">
                               <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.24-.87 3.56-.74c1.52.13 2.67.62 3.4 1.53-2.9 1.5-2.4 5.37.52 6.64-.67 1.83-1.6 3.63-2.56 4.8zm-5.4-15.16c.55-1.74 2.22-3 4.1-3.12.3 2-1.72 4.2-4.1 3.12z"/></svg>
                           </div>
                           <div>
                               <div className="font-bold text-sm text-gray-900">Apple Music</div>
                               <div className="text-xs text-gray-500">{formData.music_preference === 'apple_music' ? 'Active account connected' : 'Not connected'}</div>
                           </div>
                       </div>
                       {formData.music_preference === 'apple_music' ? (
                           <Button variant="outline" size="sm" onClick={() => { setFormData({...formData, music_preference: null}); setIsDirty(true); }} className="text-gray-500 hover:text-red-600 hover:bg-red-50 text-xs h-8 rounded-full border-gray-200">Disconnect</Button>
                       ) : (
                           <Button size="sm" onClick={() => { setFormData({...formData, music_preference: 'apple_music'}); setIsDirty(true); }} className="bg-[#FA243C] hover:bg-[#fd4a5d] text-white text-xs h-8 rounded-full px-4 shadow-sm">Connect</Button>
                       )}
                   </div>
               </div>
            </div>

            {/* Costume Vendors */}
            <div className="space-y-4">
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <Label className="text-base">Preferred Costume Shops</Label>
                      <p className="text-[10px] text-gray-500">AI will prioritize these sites for sourcing</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={addVendor} className="h-8 w-8 p-0 rounded-full">
                    <Plus className="w-4 h-4" />
                  </Button>
               </div>

               <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                 {(formData.costume_vendors || []).map((vendor, index) => (
                   <div key={index} className="flex gap-2">
                     <div className="relative flex-1">
                       <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                       <Input 
                         value={vendor}
                         onChange={(e) => updateVendor(index, e.target.value)}
                         placeholder="https://www.weissmans.com"
                         className="h-10 pl-9 rounded-lg"
                       />
                     </div>
                     <Button 
                       variant="ghost" 
                       size="icon"
                       onClick={() => removeVendor(index)}
                       className="h-10 w-10 text-gray-400 hover:text-red-500"
                     >
                       <X className="w-4 h-4" />
                     </Button>
                   </div>
                 ))}
                 {(formData.costume_vendors || []).length === 0 && (
                   <div className="text-center py-4 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                     No preferred vendors added yet.
                   </div>
                 )}
               </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              disabled={!isDirty || updateMutation.isPending}
              className="bg-[#333333] text-white rounded-xl px-6"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Level Manager Integrated Here */}
      <LevelManager />
    </div>
  );
}