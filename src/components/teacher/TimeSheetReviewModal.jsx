import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Loader2, Calendar, Clock, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";

export default function TimeSheetReviewModal({ isOpen, onOpenChange, teacherName, classes, subRequests }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Calculate Pay Period (Weekly for demo)
  const today = new Date();
  const periodStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const periodEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Generate Daily Breakdown
  const dailyBreakdown = useMemo(() => {
    const days = eachDayOfInterval({ start: periodStart, end: periodEnd });
    
    return days.map(day => {
      const dayName = format(day, 'EEEEE'); // M, T, W...
      // Find classes for this day of week
      const dayClasses = classes.filter(c => c.day === dayName);
      
      // Check for Subs
      const dayEvents = dayClasses.map(cls => {
        // Is there a sub request for this specific date?
        // Note: In a real app, we'd match exact dates. 
        // For this demo, we'll assume subRequests have a 'date' field that matches YYYY-MM-DD
        const dateStr = format(day, 'yyyy-MM-dd');
        const subReq = subRequests.find(r => r.class_id === cls.id && r.date === dateStr && r.status !== 'pending');
        
        return {
          ...cls,
          isSubbed: !!subReq,
          hours: cls.duration || 1
        };
      });

      const dailyHours = dayEvents.reduce((acc, curr) => acc + (curr.isSubbed ? 0 : curr.hours), 0);

      return {
        date: day,
        events: dayEvents,
        totalHours: dailyHours
      };
    });
  }, [classes, subRequests, periodStart, periodEnd]);

  const totalPeriodHours = dailyBreakdown.reduce((acc, day) => acc + day.totalHours, 0);

  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    try {
      await base44.entities.TimeSheetAcknowledgement.create({
        teacher_name: teacherName,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        total_hours: totalPeriodHours,
        acknowledged_at: new Date().toISOString()
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-[32px] max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-[#333333]">Review Timesheet</DialogTitle>
          <DialogDescription>
            Period: {format(periodStart, 'MMM d')} - {format(periodEnd, 'MMM d')}
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <>
            <div className="bg-gray-50 rounded-2xl p-6 mb-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Hours</p>
                <h3 className="text-3xl font-serif text-[#333333]">{totalPeriodHours}h</h3>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6">
                {dailyBreakdown.map((day, i) => (
                  <div key={i} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-900">{format(day.date, 'EEEE, MMM d')}</h4>
                      <span className="text-sm text-gray-500">{day.totalHours > 0 ? `${day.totalHours}h` : '-'}</span>
                    </div>
                    {day.events.length > 0 ? (
                      <div className="space-y-2">
                        {day.events.map((event, j) => (
                          <div key={j} className={`text-sm flex justify-between items-center p-2 rounded-lg ${event.isSubbed ? 'bg-red-50 text-red-400' : 'bg-white text-gray-600'}`}>
                            <span className="flex items-center gap-2">
                                {event.isSubbed && <AlertCircle className="w-3 h-3" />}
                                {event.title}
                            </span>
                            {event.isSubbed ? (
                                <span className="text-xs font-medium">Subbed Out</span>
                            ) : (
                                <span>{event.hours}h</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                        <p className="text-xs text-gray-300 italic">No classes scheduled</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="mt-6">
              <Button 
                onClick={handleAcknowledge}
                disabled={isSubmitting}
                className="w-full rounded-full bg-[#333333] text-white hover:bg-black h-12 text-lg"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Acknowledge & Submit"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-20 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div>
                <h3 className="text-xl font-serif text-[#333333]">Timesheet Submitted</h3>
                <p className="text-gray-500 mt-2">Thanks for confirming your hours!</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}