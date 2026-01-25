import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const STYLE_OPTIONS = [
  'Ballet', 'Jazz', 'Tap', 'Contemporary', 'Lyrical', 
  'Hip Hop', 'Acro', 'Musical Theater', 'Stretch', 'Overflow', 'Other'
];

const FLOOR_TYPES = [
  { value: 'marley', label: 'Marley' },
  { value: 'hardwood', label: 'Hardwood' },
  { value: 'sprung', label: 'Sprung' },
  { value: 'vinyl', label: 'Vinyl' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'carpet', label: 'Carpet' },
];

const DEFAULT_CAPACITIES = [20, 15, 12, 10, 8, 6];

export default function RoomSetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [roomCount, setRoomCount] = useState(3);
  const [rooms, setRooms] = useState([]);
  const queryClient = useQueryClient();

  const { data: existingRooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  useEffect(() => {
    if (existingRooms.length > 0 && rooms.length === 0) {
      setRooms(existingRooms);
      setRoomCount(existingRooms.length);
    }
  }, [existingRooms]);

  const saveMutation = useMutation({
    mutationFn: async (roomsToSave) => {
      const promises = roomsToSave.map((room) => {
        if (room.id) {
          return base44.entities.Room.update(room.id, room);
        } else {
          return base44.entities.Room.create(room);
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Rooms saved successfully!');
      if (onComplete) onComplete();
    },
  });

  const handleContinue = () => {
    if (step === 1 && roomCount > 0) {
      const newRooms = Array.from({ length: roomCount }, (_, i) => ({
        name: existingRooms[i]?.name || `Studio ${i + 1}`,
        capacity: existingRooms[i]?.capacity || DEFAULT_CAPACITIES[i] || 15,
        floor_type: existingRooms[i]?.floor_type || 'marley',
        tap_ok: existingRooms[i]?.tap_ok || false,
        has_mirrors: existingRooms[i]?.has_mirrors || false,
        has_barres: existingRooms[i]?.has_barres || false,
        has_sound_system: existingRooms[i]?.has_sound_system || false,
        acro_safe: existingRooms[i]?.acro_safe || false,
        styles: existingRooms[i]?.styles || [],
        id: existingRooms[i]?.id || null,
      }));
      setRooms(newRooms);
    }
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const updateRoom = (index, field, value) => {
    const updated = [...rooms];
    updated[index] = { ...updated[index], [field]: value };
    setRooms(updated);
  };

  const toggleRoomBoolean = (index, field) => {
    const updated = [...rooms];
    updated[index] = { ...updated[index], [field]: !updated[index][field] };
    setRooms(updated);
  };

  const toggleRoomStyle = (index, style) => {
    const updated = [...rooms];
    const currentStyles = updated[index].styles || [];
    if (currentStyles.includes(style)) {
      updated[index].styles = currentStyles.filter(s => s !== style);
    } else {
      updated[index].styles = [...currentStyles, style];
    }
    setRooms(updated);
  };

  const handleFinish = async () => {
    await saveMutation.mutateAsync(rooms);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && step < 11) {
      handleContinue();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step]);

  const totalSteps = 11;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 md:p-12 font-sans text-[#333333]">
      <div className="max-w-6xl mx-auto">
        
        {/* Progress */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {step > 1 && (
              <Button onClick={handleBack} variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <div className="text-sm text-gray-500">Step {step} of {totalSteps}</div>
              <div className="w-48 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / totalSteps) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
          <Sparkles className="w-6 h-6 text-purple-500" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 1 && (
              <div className="text-center space-y-8">
                <div>
                  <h1 className="text-5xl font-serif mb-4">How many rooms do you teach in?</h1>
                  <p className="text-gray-500">We'll set up each one together</p>
                </div>
                <div className="flex justify-center">
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={roomCount}
                    onChange={(e) => setRoomCount(parseInt(e.target.value) || 1)}
                    className="text-center text-4xl h-24 w-32 text-[#333333] font-bold border-2"
                  />
                  <span className="text-3xl ml-4 self-center text-gray-500">rooms</span>
                </div>
                <Button 
                  onClick={handleContinue} 
                  size="lg" 
                  className="rounded-full px-12 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-lg shadow-lg"
                >
                  Continue <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-serif mb-2">What do you call each room?</h1>
                  <p className="text-gray-500">Give them memorable names</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {rooms.map((room, i) => (
                    <Card key={i} className="p-6 bg-white rounded-3xl shadow-sm border-2 border-gray-100 hover:border-indigo-200 transition-all">
                      <Input
                        value={room.name}
                        onChange={(e) => updateRoom(i, 'name', e.target.value)}
                        className="text-xl font-medium text-center border-0 focus-visible:ring-0 p-0"
                      />
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-12">
                  <Button onClick={handleContinue} size="lg" className="rounded-full px-12 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg">
                    Continue <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-serif mb-2">How many dancers fit comfortably?</h1>
                  <p className="text-gray-500">Think about your typical class size</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {rooms.map((room, i) => (
                    <Card key={i} className="p-8 bg-white rounded-3xl shadow-sm border-2 border-gray-100 hover:border-indigo-200 transition-all text-center">
                      <div className="text-lg font-medium mb-4 text-gray-700">{room.name}</div>
                      <Input
                        type="number"
                        value={room.capacity}
                        onChange={(e) => updateRoom(i, 'capacity', parseInt(e.target.value) || 0)}
                        className="text-3xl font-bold text-center border-2 h-16"
                      />
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-12">
                  <Button onClick={handleContinue} size="lg" className="rounded-full px-12 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg">
                    Continue <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-serif mb-2">What type of floor?</h1>
                  <p className="text-gray-500">This helps match classes to rooms</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {rooms.map((room, i) => (
                    <Card key={i} className="p-8 bg-white rounded-3xl shadow-sm border-2 border-gray-100 hover:border-indigo-200 transition-all text-center">
                      <div className="text-lg font-medium mb-4 text-gray-700">{room.name}</div>
                      <Select value={room.floor_type} onValueChange={(value) => updateRoom(i, 'floor_type', value)}>
                        <SelectTrigger className="h-12 text-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FLOOR_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-12">
                  <Button onClick={handleContinue} size="lg" className="rounded-full px-12 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg">
                    Continue <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-serif mb-2">Which rooms can you teach tap in?</h1>
                  <p className="text-gray-500">Click to toggle</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {rooms.map((room, i) => (
                    <Card 
                      key={i} 
                      onClick={() => toggleRoomBoolean(i, 'tap_ok')}
                      className={`p-12 rounded-3xl shadow-sm border-2 cursor-pointer transition-all text-center ${
                        room.tap_ok ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300' : 'bg-white border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg font-medium mb-6 text-gray-700">{room.name}</div>
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                        room.tap_ok ? 'bg-indigo-500' : 'bg-gray-200'
                      }`}>
                        {room.tap_ok && <Check className="w-8 h-8 text-white" />}
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-12">
                  <Button onClick={handleContinue} size="lg" className="rounded-full px-12 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg">
                    Continue <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-serif mb-2">Which rooms have mirrors?</h1>
                  <p className="text-gray-500">Click to toggle</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {rooms.map((room, i) => (
                    <Card 
                      key={i} 
                      onClick={() => toggleRoomBoolean(i, 'has_mirrors')}
                      className={`p-12 rounded-3xl shadow-sm border-2 cursor-pointer transition-all text-center ${
                        room.has_mirrors ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300' : 'bg-white border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg font-medium mb-6 text-gray-700">{room.name}</div>
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                        room.has_mirrors ? 'bg-indigo-500' : 'bg-gray-200'
                      }`}>
                        {room.has_mirrors && <Check className="w-8 h-8 text-white" />}
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-12">
                  <Button onClick={handleContinue} size="lg" className="rounded-full px-12 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg">
                    Continue <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-serif mb-2">Which rooms have ballet barres?</h1>
                  <p className="text-gray-500">Click to toggle</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {rooms.map((room, i) => (
                    <Card 
                      key={i} 
                      onClick={() => toggleRoomBoolean(i, 'has_barres')}
                      className={`p-12 rounded-3xl shadow-sm border-2 cursor-pointer transition-all text-center ${
                        room.has_barres ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300' : 'bg-white border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg font-medium mb-6 text-gray-700">{room.name}</div>
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                        room.has_barres ? 'bg-indigo-500' : 'bg-gray-200'
                      }`}>
                        {room.has_barres && <Check className="w-8 h-8 text-white" />}
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-12">
                  <Button onClick={handleContinue} size="lg" className="rounded-full px-12 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg">
                    Continue <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 8 && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-serif mb-2">Which rooms have a sound system?</h1>
                  <p className="text-gray-500">Click to toggle</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {rooms.map((room, i) => (
                    <Card 
                      key={i} 
                      onClick={() => toggleRoomBoolean(i, 'has_sound_system')}
                      className={`p-12 rounded-3xl shadow-sm border-2 cursor-pointer transition-all text-center ${
                        room.has_sound_system ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300' : 'bg-white border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg font-medium mb-6 text-gray-700">{room.name}</div>
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                        room.has_sound_system ? 'bg-indigo-500' : 'bg-gray-200'
                      }`}>
                        {room.has_sound_system && <Check className="w-8 h-8 text-white" />}
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-12">
                  <Button onClick={handleContinue} size="lg" className="rounded-full px-12 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg">
                    Continue <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 9 && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-serif mb-2">Which rooms are safe for acro?</h1>
                  <p className="text-gray-500">Ceiling height, mats available, etc.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {rooms.map((room, i) => (
                    <Card 
                      key={i} 
                      onClick={() => toggleRoomBoolean(i, 'acro_safe')}
                      className={`p-12 rounded-3xl shadow-sm border-2 cursor-pointer transition-all text-center ${
                        room.acro_safe ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300' : 'bg-white border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg font-medium mb-6 text-gray-700">{room.name}</div>
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                        room.acro_safe ? 'bg-indigo-500' : 'bg-gray-200'
                      }`}>
                        {room.acro_safe && <Check className="w-8 h-8 text-white" />}
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-12">
                  <Button onClick={handleContinue} size="lg" className="rounded-full px-12 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg">
                    Continue <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 10 && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-serif mb-2">What styles work best in each room?</h1>
                  <p className="text-gray-500">Select all that apply</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {rooms.map((room, i) => (
                    <Card key={i} className="p-8 bg-white rounded-3xl shadow-sm border-2 border-gray-100">
                      <div className="text-xl font-medium mb-6 text-gray-700">{room.name}</div>
                      <div className="grid grid-cols-2 gap-3">
                        {STYLE_OPTIONS.map(style => (
                          <label key={style} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                            <Checkbox
                              checked={room.styles?.includes(style)}
                              onCheckedChange={() => toggleRoomStyle(i, style)}
                            />
                            <span className="text-sm">{style}</span>
                          </label>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center mt-12">
                  <Button onClick={handleContinue} size="lg" className="rounded-full px-12 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg">
                    Continue <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 11 && (
              <div className="space-y-8">
                <div className="text-center mb-12">
                  <h1 className="text-5xl font-serif mb-4">Your studio is ready! 🎉</h1>
                  <p className="text-gray-500 text-lg">Here's what we set up together</p>
                </div>
                <div className="space-y-4 max-w-3xl mx-auto">
                  {rooms.map((room, i) => (
                    <Card key={i} className="p-8 bg-white rounded-3xl shadow-sm border-2 border-gray-100">
                      <div className="text-2xl font-serif mb-3">{room.name}</div>
                      <div className="text-gray-600 mb-3">
                        {room.capacity} dancers · {FLOOR_TYPES.find(f => f.value === room.floor_type)?.label}
                        {room.has_mirrors && ' · Mirrors'}
                        {room.has_barres && ' · Barres'}
                        {room.has_sound_system && ' · Sound'}
                        {room.tap_ok && ' · Tap OK'}
                        {room.acro_safe && ' · Acro Safe'}
                      </div>
                      {room.styles?.length > 0 && (
                        <div className="text-sm text-gray-500">
                          Best for: {room.styles.join(', ')}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
                <div className="flex justify-center gap-4 mt-12">
                  <Button 
                    onClick={() => setStep(2)} 
                    variant="outline" 
                    size="lg" 
                    className="rounded-full px-8 h-14"
                  >
                    Edit Rooms
                  </Button>
                  <Button 
                    onClick={handleFinish} 
                    size="lg" 
                    className="rounded-full px-12 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? 'Saving...' : 'Save & Finish'}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}