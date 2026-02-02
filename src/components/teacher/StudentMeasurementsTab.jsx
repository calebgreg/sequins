import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ruler, Save, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function StudentMeasurementsTab({ student }) {
  const [isEditing, setIsEditing] = useState(false);
  const [measurements, setMeasurements] = useState(student.measurements || {});
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Student.update(student.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Measurements saved!');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Failed to save measurements');
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      measurements: {
        ...measurements,
        updated_at: new Date().toISOString().split('T')[0]
      }
    });
  };

  const handleChange = (field, value) => {
    setMeasurements(prev => ({ ...prev, [field]: value }));
  };

  const fields = [
    { key: 'height', label: 'Height', placeholder: "e.g. 4'2\"" },
    { key: 'weight', label: 'Weight', placeholder: 'e.g. 65 lbs' },
    { key: 'chest', label: 'Chest', placeholder: 'e.g. 28"' },
    { key: 'waist', label: 'Waist', placeholder: 'e.g. 24"' },
    { key: 'hips', label: 'Hips', placeholder: 'e.g. 30"' },
    { key: 'inseam', label: 'Inseam', placeholder: 'e.g. 22"' },
    { key: 'girth', label: 'Girth', placeholder: 'e.g. 48"' },
    { key: 'torso', label: 'Torso', placeholder: 'e.g. 14"' },
    { key: 'shoe_size', label: 'Shoe Size', placeholder: 'e.g. 3' },
    { key: 'tight_size', label: 'Tights Size', placeholder: 'e.g. Child M' },
    { key: 'leotard_size', label: 'Leotard Size', placeholder: 'e.g. Child L' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)',
              boxShadow: '0 4px 12px -4px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)',
            }}
          >
            <Ruler className="w-5 h-5" style={{ color: '#c9a99c' }} />
          </div>
          <div>
            <h3 className="font-medium" style={{ color: '#8b7d72' }}>Costume Measurements</h3>
            {measurements.updated_at && (
              <p className="text-xs" style={{ color: '#b5a599' }}>
                Last updated: {format(new Date(measurements.updated_at), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
        
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            size="sm"
            className="rounded-full gap-1.5 h-8 px-3 text-xs font-medium transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
              boxShadow: '0 4px 12px -2px rgba(180,150,140,0.25), inset 0 1px 2px rgba(255,255,255,0.8)',
              border: '1px solid rgba(255, 220, 210, 0.5)',
              color: '#8a7070',
            }}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setMeasurements(student.measurements || {});
                setIsEditing(false);
              }}
              variant="ghost"
              size="sm"
              className="rounded-full h-8 px-3 text-xs"
              style={{ color: '#b5a599' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              size="sm"
              className="rounded-full gap-1.5 h-8 px-3 text-xs font-medium transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(145deg, rgba(126,184,154,0.9) 0%, rgba(100,160,130,0.85) 100%)',
                boxShadow: '0 4px 12px -2px rgba(126,184,154,0.4), inset 0 1px 2px rgba(255,255,255,0.3)',
                color: 'white',
              }}
            >
              <Save className="w-3.5 h-3.5" /> {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {/* Measurements Grid */}
      <div 
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(145deg, rgba(253,238,236,0.6) 0%, rgba(250,232,228,0.4) 100%)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {fields.map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs" style={{ color: '#9a8b80' }}>{field.label}</Label>
              {isEditing ? (
                <Input
                  value={measurements[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="h-9 text-sm rounded-xl border-gray-200 focus:border-[#c9a99c] focus:ring-[#c9a99c]"
                  style={{ background: 'rgba(255,255,255,0.7)' }}
                />
              ) : (
                <div 
                  className="h-9 px-3 flex items-center rounded-xl text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.5)',
                    color: measurements[field.key] ? '#8b7d72' : '#c4b5ab',
                  }}
                >
                  {measurements[field.key] || '—'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {!isEditing && Object.values(measurements).filter(v => v && v !== measurements.updated_at).length === 0 && (
        <div 
          className="py-8 text-center rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.4)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
          }}
        >
          <span className="text-2xl mb-3 block">📏</span>
          <p style={{ color: '#b5a599' }}>No measurements recorded yet</p>
          <p className="text-xs mt-1" style={{ color: '#c4b5ab' }}>Click Edit to add costume measurements</p>
        </div>
      )}
    </div>
  );
}