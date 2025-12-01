import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Plus, X, Save, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function LevelManager() {
  const queryClient = useQueryClient();
  const [newLevel, setNewLevel] = useState('');
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['studioSettings'],
    queryFn: async () => {
      const res = await base44.entities.StudioSettings.list();
      return res[0] || null;
    }
  });

  const [levels, setLevels] = useState([]);

  useEffect(() => {
    if (settings?.levels) {
      setLevels(settings.levels);
    } else if (settings && !settings.levels) {
      // Default fallback if settings exist but no levels defined
      setLevels(["Beginner", "Intermediate", "Advanced"]);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (newLevels) => {
      if (settings) {
        return base44.entities.StudioSettings.update(settings.id, { ...settings, levels: newLevels });
      } else {
        return base44.entities.StudioSettings.create({ 
          name: "My Studio", 
          type: "mixed", 
          pricing_model: "per_class",
          levels: newLevels 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studioSettings'] });
      toast.success("Levels updated successfully");
    }
  });

  const handleAdd = () => {
    if (newLevel.trim() && !levels.includes(newLevel.trim())) {
      const updated = [...levels, newLevel.trim()];
      setLevels(updated);
      mutation.mutate(updated);
      setNewLevel('');
    }
  };

  const handleRemove = (levelToRemove) => {
    const updated = levels.filter(l => l !== levelToRemove);
    setLevels(updated);
    mutation.mutate(updated);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <Card className="bg-white border-none shadow-sm rounded-[32px]">
      <CardHeader>
        <CardTitle className="font-serif text-2xl text-[#333333]">Student Levels</CardTitle>
        <CardDescription>Define the progression levels for your students.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input 
            placeholder="Add new level (e.g. 'Pre-Professional')" 
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="rounded-xl bg-[#F4F4F6] border-transparent"
          />
          <Button onClick={handleAdd} className="bg-[#333333] text-white rounded-xl hover:bg-black">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {levels.map((level) => (
            <div key={level} className="flex items-center justify-between p-3 bg-[#F4F4F6] rounded-xl group">
              <span className="font-medium text-[#333333] ml-2">{level}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleRemove(level)}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {levels.length === 0 && (
            <div className="text-center text-gray-400 py-4 text-sm italic">No levels defined yet.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}