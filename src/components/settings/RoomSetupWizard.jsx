import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp } from 'lucide-react';
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

const QUESTIONS = [
  { id: 'count', text: 'How many rooms do you teach in?', type: 'number' },
  { id: 'names', text: 'What do you call each room?', type: 'text' },
  { id: 'capacity', text: 'How many dancers fit comfortably in each room?', type: 'number' },
  { id: 'floor_type', text: 'What type of floor does each room have?', type: 'select' },
  { id: 'tap_ok', text: 'Which rooms can you teach tap in?', type: 'boolean', helper: 'Click to toggle' },
  { id: 'has_mirrors', text: 'Which rooms have mirrors?', type: 'boolean', helper: 'Click to toggle' },
  { id: 'has_barres', text: 'Which rooms have ballet barres?', type: 'boolean', helper: 'Click to toggle' },
  { id: 'has_sound_system', text: 'Which rooms have a sound system?', type: 'boolean', helper: 'Click to toggle' },
  { id: 'acro_safe', text: 'Which rooms are safe for acro and tumbling?', type: 'boolean', helper: 'Click to toggle' },
  { id: 'styles', text: 'What styles work best in each room?', type: 'multi-select', helper: 'Select all that apply' },
];

export default function RoomSetupWizard({ onComplete }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [roomCount, setRoomCount] = useState(3);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: existingRooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  useEffect(() => {
    if (existingRooms.length > 0 && rooms.length === 0) {
      setRooms(existingRooms);
      setRoomCount(existingRooms.length);
      setQuestionIndex(1);
    }
  }, [existingRooms]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [questionIndex]);

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
      toast.success('Your studio spaces are ready!');
      if (onComplete) onComplete();
    },
  });

  const handleContinue = () => {
    const currentQuestion = QUESTIONS[questionIndex];

    if (currentQuestion.id === 'count' && roomCount > 0) {
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

    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex(questionIndex + 1);
    } else {
      saveMutation.mutate(rooms);
    }
  };

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

  const currentQuestion = QUESTIONS[questionIndex];
  const isLastQuestion = questionIndex === QUESTIONS.length - 1;

  return (
    <div className="min-h-screen bg-[#F4F4F6] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl">
        
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] border border-white/40 shadow-xl overflow-hidden ring-1 ring-black/5">
          
          <div 
            ref={scrollRef}
            className="p-6 md:p-10 space-y-8 max-h-[75vh] overflow-y-auto"
          >
            {/* Question Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-serif text-[#333333]">{currentQuestion.text}</h2>
              {currentQuestion.helper && (
                <p className="text-sm text-gray-500">{currentQuestion.helper}</p>
              )}
            </div>

            {/* Interactive Cards */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {currentQuestion.type === 'number' && currentQuestion.id === 'count' && (
                  <div className="flex items-center gap-3 pl-1">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={roomCount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setRoomCount(parseInt(val) || 1);
                      }}
                      className="w-20 h-14 text-2xl font-bold text-center border rounded-2xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      autoFocus
                    />
                    <span className="text-base text-gray-500">rooms</span>
                  </div>
                )}

                {currentQuestion.type === 'text' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {rooms.map((room, i) => (
                      <Card key={i} className="p-4 bg-white rounded-[20px] shadow-sm border border-gray-100">
                        <Input
                          value={room.name}
                          onChange={(e) => updateRoom(i, 'name', e.target.value)}
                          className="text-center text-sm font-medium border-0 focus-visible:ring-1 focus-visible:ring-gray-200 p-1 h-auto"
                        />
                      </Card>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'number' && currentQuestion.id === 'capacity' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {rooms.map((room, i) => (
                      <Card key={i} className="p-4 bg-white rounded-[20px] shadow-sm border border-gray-100 text-center">
                        <div className="text-xs text-gray-500 mb-2">{room.name}</div>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={room.capacity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            updateRoom(i, 'capacity', parseInt(val) || 0);
                          }}
                          className="text-xl font-bold text-center border h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </Card>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'select' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {rooms.map((room, i) => (
                      <Card key={i} className="p-4 bg-white rounded-[20px] shadow-sm border border-gray-100 text-center">
                        <div className="text-xs text-gray-500 mb-2">{room.name}</div>
                        <Select value={room.floor_type} onValueChange={(value) => updateRoom(i, 'floor_type', value)}>
                          <SelectTrigger className="h-9 text-sm">
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
                )}

                {currentQuestion.type === 'boolean' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {rooms.map((room, i) => {
                      const isActive = room[currentQuestion.id];
                      return (
                        <Card 
                          key={i}
                          onClick={() => toggleRoomBoolean(i, currentQuestion.id)}
                          className={`p-6 rounded-[20px] shadow-sm border cursor-pointer transition-all text-center ${
                            isActive 
                              ? 'bg-black/5 border-black/20 shadow-md' 
                              : 'bg-white border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="text-xs font-medium text-gray-600 mb-3">{room.name}</div>
                          <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center transition-all ${
                            isActive ? 'bg-black' : 'bg-gray-200'
                          }`}>
                            {isActive && (
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'multi-select' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rooms.map((room, i) => (
                      <Card key={i} className="p-5 bg-white rounded-[20px] shadow-sm border border-gray-100">
                        <div className="text-sm font-medium text-gray-700 mb-3">{room.name}</div>
                        <div className="grid grid-cols-2 gap-2">
                          {STYLE_OPTIONS.map(style => (
                            <label key={style} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                              <Checkbox
                                checked={room.styles?.includes(style)}
                                onCheckedChange={() => toggleRoomStyle(i, style)}
                                className="border-gray-300"
                              />
                              <span className="text-xs text-gray-700">{style}</span>
                            </label>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Input Bar */}
          <div className="bg-gray-50/40 backdrop-blur-sm shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] border-t border-white/30 ring-1 ring-black/10 rounded-b-[32px] p-4 flex items-center justify-end">
            <Button 
              onClick={handleContinue}
              disabled={saveMutation.isPending}
              className="rounded-full px-6 h-10 bg-black hover:bg-black/90 text-white shadow-lg gap-2 text-sm"
            >
              {saveMutation.isPending ? (
                'Saving...'
              ) : isLastQuestion ? (
                'Finish'
              ) : (
                <>
                  Continue
                  <ArrowUp className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}