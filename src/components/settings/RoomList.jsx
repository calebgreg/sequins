import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function RoomList({ onAddNew }) {
  const queryClient = useQueryClient();

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (roomId) => base44.entities.Room.delete(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room deleted');
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="h-48 animate-pulse bg-gray-100 rounded-[24px]" />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-[32px] p-12 shadow-sm border-0 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
          <Plus className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-serif text-[#333333] mb-2">No rooms configured yet</h3>
        <p className="text-gray-500 mb-6">Set up your teaching spaces to enable smarter scheduling</p>
        <Button 
          onClick={onAddNew}
          className="rounded-full px-8 h-12 bg-black hover:bg-black/90 text-white shadow-lg"
        >
          Set Up Rooms
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-[#333333]">{rooms.length} Studio Rooms</h3>
          <p className="text-sm text-gray-500">Manage your teaching spaces</p>
        </div>
        <Button 
          onClick={onAddNew}
          variant="outline"
          className="rounded-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Room
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <Card key={room.id} className="bg-white rounded-[24px] p-6 shadow-sm border-0 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-medium text-[#333333]">{room.name}</h4>
                <p className="text-sm text-gray-500">Capacity: {room.capacity}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(room.id)}
                className="h-8 w-8 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Badge variant="outline" className="rounded-full">{room.floor_type}</Badge>
              </div>

              {room.styles && room.styles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {room.styles.slice(0, 3).map(style => (
                    <Badge key={style} className="rounded-full text-xs bg-black/5 text-gray-700 border-0">
                      {style}
                    </Badge>
                  ))}
                  {room.styles.length > 3 && (
                    <Badge className="rounded-full text-xs bg-black/5 text-gray-700 border-0">
                      +{room.styles.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {room.has_mirrors && <span className="text-xs text-gray-500">✓ Mirrors</span>}
                {room.has_barres && <span className="text-xs text-gray-500">✓ Barres</span>}
                {room.has_sound_system && <span className="text-xs text-gray-500">✓ Sound</span>}
                {room.tap_ok && <span className="text-xs text-gray-500">✓ Tap</span>}
                {room.acro_safe && <span className="text-xs text-gray-500">✓ Acro</span>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}