import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, ArrowUp } from 'lucide-react';
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
  { id: 'tap_ok', text: 'Which rooms can you teach tap in?', type: 'boolean' },
  { id: 'has_mirrors', text: 'Which rooms have mirrors?', type: 'boolean' },
  { id: 'has_barres', text: 'Which rooms have ballet barres?', type: 'boolean' },
  { id: 'has_sound_system', text: 'Which rooms have a sound system?', type: 'boolean' },
  { id: 'acro_safe', text: 'Which rooms are safe for acro and tumbling?', type: 'boolean' },
  { id: 'styles', text: 'What styles work best in each room?', type: 'multi-select' },
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
      setQuestionIndex(1); // Skip count if rooms exist
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
      toast.success('🎉 Your studio spaces are ready!');
      if (onComplete) onComplete();
    },
  });

  const handleContinue = () => {
    const currentQuestion = QUESTIONS[questionIndex];

    // Initialize rooms after count question
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

    // Move to next question or finish
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
      <div className="w-full max-w-5xl">
        
        {/* Chat Container */}
        <div className="bg-white/60 backdrop-blur-xl rounded-[32px] border border-white/40 shadow-2xl overflow-hidden">
          
          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="p-8 md:p-12 space-y-8 max-h-[70vh] overflow-y-auto"
          >
            {/* Gene's Question */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400 mb-2">Gene</div>
                <div className="bg-white/80 rounded-2xl rounded-tl-sm border border-gray-200/50 px-5 py-4 shadow-sm">
                  <p className="text-[#333333] text-lg leading-relaxed">{currentQuestion.text}</p>
                </div>
              </div>
            </div>

            {/* Interactive Response Area */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="pl-14"
              >
                {currentQuestion.type === 'number' && currentQuestion.id === 'count' && (
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={roomCount}
                      onChange={(e) => setRoomCount(parseInt(e.target.value) || 1)}
                      className="w-24 h-16 text-3xl font-bold text-center border-2 border-gray-200 rounded-2xl"
                      autoFocus
                    />
                    <span className="text-xl text-gray-500">rooms</span>
                  </div>
                )}

                {currentQuestion.type === 'text' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {rooms.map((room, i) => (
                      <Card key={i} className="p-4 bg-white rounded-[24px] shadow-sm border border-gray-100 hover:border-indigo-200 transition-all">
                        <Input
                          value={room.name}
                          onChange={(e) => updateRoom(i, 'name', e.target.value)}
                          className="text-center font-medium border-0 focus-visible:ring-0 p-0"
                        />
                      </Card>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'number' && currentQuestion.id === 'capacity' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {rooms.map((room, i) => (
                      <Card key={i} className="p-6 bg-white rounded-[24px] shadow-sm border border-gray-100 hover:border-indigo-200 transition-all text-center">
                        <div className="text-sm font-medium text-gray-500 mb-3">{room.name}</div>
                        <Input
                          type="number"
                          value={room.capacity}
                          onChange={(e) => updateRoom(i, 'capacity', parseInt(e.target.value) || 0)}
                          className="text-2xl font-bold text-center border h-12"
                        />
                      </Card>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'select' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {rooms.map((room, i) => (
                      <Card key={i} className="p-6 bg-white rounded-[24px] shadow-sm border border-gray-100 hover:border-indigo-200 transition-all text-center">
                        <div className="text-sm font-medium text-gray-500 mb-3">{room.name}</div>
                        <Select value={room.floor_type} onValueChange={(value) => updateRoom(i, 'floor_type', value)}>
                          <SelectTrigger className="h-10">
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {rooms.map((room, i) => {
                      const isActive = room[currentQuestion.id];
                      return (
                        <Card 
                          key={i}
                          onClick={() => toggleRoomBoolean(i, currentQuestion.id)}
                          className={`p-8 rounded-[24px] shadow-sm border-2 cursor-pointer transition-all text-center ${
                            isActive 
                              ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300 shadow-lg scale-105' 
                              : 'bg-white border-gray-100 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-700 mb-4">{room.name}</div>
                          <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center transition-all ${
                            isActive ? 'bg-indigo-500 scale-110' : 'bg-gray-200'
                          }`}>
                            {isActive && (
                              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'multi-select' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rooms.map((room, i) => (
                      <Card key={i} className="p-6 bg-white rounded-[24px] shadow-sm border border-gray-100">
                        <div className="text-base font-medium text-gray-700 mb-4">{room.name}</div>
                        <div className="grid grid-cols-2 gap-2">
                          {STYLE_OPTIONS.map(style => (
                            <label key={style} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors">
                              <Checkbox
                                checked={room.styles?.includes(style)}
                                onCheckedChange={() => toggleRoomStyle(i, style)}
                              />
                              <span className="text-sm text-gray-700">{style}</span>
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

          {/* Input Area */}
          <div className="border-t border-gray-200/50 bg-gray-50/40 backdrop-blur-sm p-6 flex items-center justify-end gap-4">
            <Button 
              onClick={handleContinue}
              disabled={saveMutation.isPending}
              className="rounded-full px-8 h-12 bg-black hover:bg-black/90 text-white shadow-lg gap-2"
            >
              {saveMutation.isPending ? (
                'Saving...'
              ) : isLastQuestion ? (
                'Save & Finish'
              ) : (
                <>
                  Continue
                  <ArrowUp className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}