import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save } from 'lucide-react';
import { toast } from "sonner";
import LevelManager from './LevelManager';

export default function GeneralSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    type: 'mixed',
    ai_assistant_name: 'Gene'
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
        ai_assistant_name: settings.ai_assistant_name || 'Gene'
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
          
          <div className="flex justify-end">
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