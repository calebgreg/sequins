import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SubRequestModal({ isOpen, onOpenChange, classData, teacherName }) {
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !date) return;
    setIsSubmitting(true);
    try {
      await base44.entities.SubRequest.create({
        teacher_name: teacherName,
        class_id: classData.id,
        class_name: classData.title,
        date: date.toISOString().split('T')[0],
        reason: reason,
        status: 'pending'
      });

      // Notify admins via message (optional but good for "flow")
      await base44.entities.Message.create({
        content: `Sub Request: ${teacherName} needs cover for ${classData.title} on ${format(date, 'MMM d')}. Reason: ${reason}`,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        is_alert: true
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReason('');
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to request sub", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-[32px] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-[#333333]">Request a Sub</DialogTitle>
          <DialogDescription>
            Need cover for {classData?.title}? We'll notify the staff.
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Date Needed</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-full justify-start text-left font-normal rounded-xl h-12 ${!date && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Reason / Notes</Label>
              <Textarea 
                placeholder="e.g. Sick, Traveling, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-xl bg-gray-50 border-gray-200 min-h-[100px]"
              />
            </div>

            <DialogFooter>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !reason}
                className="w-full rounded-full bg-[#333333] text-white hover:bg-black h-12"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Request"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium">Request Sent</h3>
            <p className="text-gray-500 max-w-xs">
              Admins have been notified. Check your messages for confirmation.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}