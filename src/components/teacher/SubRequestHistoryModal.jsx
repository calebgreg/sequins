import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CalendarX, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SubRequestHistoryModal({ isOpen, onOpenChange, teacherName, onNewRequest }) {
  const { data: requests = [] } = useQuery({
    queryKey: ['sub_requests', teacherName],
    queryFn: async () => {
      const all = await base44.entities.SubRequest.list();
      return all.filter(r => r.teacher_name === teacherName).sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-50 text-green-700 border-green-100';
      case 'filled': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4" />;
      case 'filled': return <CheckCircle2 className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-[32px] max-w-md border-none shadow-2xl p-0 overflow-hidden">
        <div className="bg-[#333333] p-6 text-white">
           <div className="flex items-center justify-between mb-4">
             <DialogTitle className="font-serif text-2xl font-light tracking-wide">Request History</DialogTitle>
             <div className="p-2 bg-white/10 rounded-full">
               <CalendarX className="w-5 h-5 text-white" />
             </div>
           </div>
           <Button 
             onClick={() => {
               onOpenChange(false);
               onNewRequest();
             }}
             className="w-full bg-white text-[#333333] hover:bg-gray-50 font-medium rounded-xl h-10 gap-2"
           >
             <Plus className="w-4 h-4" /> New Request
           </Button>
        </div>
        
        <ScrollArea className="h-[400px] p-6">
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                  <CalendarX className="w-6 h-6" />
                </div>
                <p className="text-gray-400 font-serif">No past requests.</p>
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="group bg-white border border-gray-100 hover:border-gray-200 rounded-2xl p-4 transition-all hover:shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-serif text-lg text-[#333333] leading-none mb-1">{req.class_name}</h4>
                      <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                        {format(new Date(req.date), 'MMM do')}
                      </div>
                    </div>
                    <Badge variant="outline" className={`${getStatusStyle(req.status)} capitalize border px-2.5 py-0.5 h-6 gap-1.5`}>
                      {getIcon(req.status)}
                      {req.status}
                    </Badge>
                  </div>
                  
                  {req.reason && (
                    <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 font-light mt-3 relative">
                       <span className="absolute top-[-4px] left-4 w-2 h-2 bg-gray-50 transform rotate-45 border-t border-l border-gray-50"></span>
                       "{req.reason}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}