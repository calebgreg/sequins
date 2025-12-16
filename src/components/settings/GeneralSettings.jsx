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