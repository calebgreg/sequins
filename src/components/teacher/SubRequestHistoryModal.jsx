import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CalendarX, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from 'date-fns';

export default function SubRequestHistoryModal({ isOpen, onOpenChange, teacherName }) {
  const { data: requests = [] } = useQuery({
    queryKey: ['sub_requests', teacherName],
    queryFn: async () => {
      const all = await base44.entities.SubRequest.list();
      return all.filter(r => r.teacher_name === teacherName).sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'filled': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-[32px] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-[#333333] flex items-center gap-2">
            <CalendarX className="w-6 h-6" />
            Sub Requests
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p>No sub requests found.</p>
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="bg-[#F4F4F6] rounded-2xl p-4 flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-[#333333]">{req.class_name}</h4>
                    <p className="text-sm text-gray-500">{format(new Date(req.date), 'MMM do, yyyy')}</p>
                    <p className="text-xs text-gray-400 mt-1">"{req.reason}"</p>
                  </div>
                  <Badge variant="secondary" className={`${getStatusColor(req.status)} capitalize`}>
                    {req.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}