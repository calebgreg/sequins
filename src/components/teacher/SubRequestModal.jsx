import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, getDay } from "date-fns";
import { Calendar as CalendarIcon, Loader2, CheckCircle2, Sparkles, AlertTriangle, User, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SubRequestModal({ isOpen, onOpenChange, classData, teacherName, availableClasses = [] }) {
  const [selectedClassId, setSelectedClassId] = useState(classData?.id || '');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date());
  const [urgency, setUrgency] = useState('medium');
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Determine active class (either passed prop or selected from dropdown)
  const activeClass = useMemo(() => {
    if (classData) return classData;
    return availableClasses.find(c => c.id === selectedClassId);
  }, [classData, availableClasses, selectedClassId]);

  // Reset state when opening fresh
  React.useEffect(() => {
    if (isOpen) {
        if (classData) setSelectedClassId(classData.id);
        setSuccess(false);
        setReason('');
        setSelectedSubs([]);
        setUrgency('medium');
    }
  }, [isOpen, classData]);

  // Fetch context for smart suggestions
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
    enabled: isOpen
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
    enabled: isOpen
  });

  // Smart Suggestion Logic
  const suggestions = useMemo(() => {
    if (!activeClass || !date || teachers.length === 0) return [];

    const dayMap = { 0: 'U', 1: 'M', 2: 'T', 3: 'W', 4: 'R', 5: 'F', 6: 'S' };
    const currentDay = dayMap[getDay(date)];
    
    // 1. Find teachers who teach the style
    // 2. Filter out those who are busy at this time
    
    const styleMatches = teachers.filter(t => 
      t.name !== teacherName && // Don't suggest self
      t.styles?.some(s => s.toLowerCase().includes(activeClass.style?.toLowerCase() || ''))
    );

    const available = styleMatches.filter(t => {
      const teacherClassesOnDay = allClasses.filter(c => 
        c.teacher === t.name && 
        c.day === currentDay
      );

      const isBusy = teacherClassesOnDay.some(c => {
        const cEnd = c.start_time + c.duration;
        const myEnd = activeClass.start_time + activeClass.duration;
        // Check overlap
        return (activeClass.start_time < cEnd && myEnd > c.start_time);
      });

      return !isBusy;
    });

    return available;
  }, [activeClass, date, teachers, allClasses, teacherName]);

  const handleSubmit = async () => {
    if (!reason || !date || !activeClass) return;
    setIsSubmitting(true);
    try {
      await base44.entities.SubRequest.create({
        teacher_name: teacherName,
        class_id: activeClass.id,
        class_name: activeClass.title,
        date: date.toISOString().split('T')[0],
        reason: reason,
        urgency: urgency,
        suggested_subs: selectedSubs,
        status: 'pending'
      });

      // Notify admins
      const subNames = selectedSubs.length > 0 ? ` (Suggested: ${selectedSubs.join(', ')})` : '';
      await base44.entities.Message.create({
       content: `Sub Request (${urgency.toUpperCase()}): ${teacherName} needs cover for ${activeClass.title} on ${format(date, 'MMM d')}.${subNames} Reason: ${reason}`,
       sender: 'ai',
       timestamp: new Date().toISOString(),
       is_alert: urgency === 'high'
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReason('');
        setSelectedSubs([]);
        setUrgency('medium');
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to request sub", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSubSelection = (name) => {
    if (selectedSubs.includes(name)) {
      setSelectedSubs(prev => prev.filter(s => s !== name));
    } else {
      setSelectedSubs(prev => [...prev, name]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-[32px] max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="flex h-full min-h-[600px]">
          
          {/* Left Panel: Context & Visuals */}
          <div className="w-1/3 bg-[#F4F4F6] p-8 flex flex-col justify-between border-r border-gray-100">
            <div>
              <h2 className="font-serif text-2xl text-[#333333] mb-1 leading-tight">Request Coverage</h2>
              <p className="text-sm text-gray-500 font-serif mb-8">We'll find a pro to step in.</p>
              
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                   <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Class</div>
                   {classData ? (
                     <>
                       <div className="font-serif text-lg text-[#333333]">{classData.title}</div>
                       <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                         <Clock className="w-3 h-3" />
                         {format(new Date().setHours(Math.floor(classData.start_time), (classData.start_time % 1) * 60), 'h:mma')}
                       </div>
                     </>
                   ) : (
                     <div className="mt-1">
                       <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                         <SelectTrigger className="w-full border-0 p-0 h-auto font-serif text-lg text-[#333333] focus:ring-0">
                           <SelectValue placeholder="Select a class..." />
                         </SelectTrigger>
                         <SelectContent>
                           {availableClasses.map(cls => (
                             <SelectItem key={cls.id} value={cls.id}>
                               {cls.title} ({format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mma')})
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                       {!selectedClassId && (
                         <p className="text-xs text-red-400 mt-1">Please select a class</p>
                       )}
                     </div>
                   )}
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                   <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Urgency</div>
                   <div className="flex flex-col gap-2">
                      {['low', 'medium', 'high'].map(level => (
                        <button
                          key={level}
                          onClick={() => setUrgency(level)}
                          className={`
                            text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                            ${urgency === level 
                              ? (level === 'high' ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-[#333333] text-white') 
                              : 'hover:bg-gray-50 text-gray-500'}
                          `}
                        >
                          {level === 'high' && <AlertTriangle className="w-3 h-3" />}
                          {level.charAt(0).toUpperCase() + level.slice(1)} Priority
                        </button>
                      ))}
                   </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-gray-400 leading-tight">
              Requests are sent to admins immediately. Confirmation typically within 24h.
            </div>
          </div>

          {/* Right Panel: Form & Suggestions */}
          <div className="flex-1 p-8 relative">
            {!success ? (
              <div className="flex flex-col h-full space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-gray-400 font-bold tracking-wider">Date Needed</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={`w-full justify-start text-left font-normal rounded-xl h-12 bg-gray-50 border-gray-200 ${!date && "text-muted-foreground"}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                          {date ? format(date, "MMM do, yyyy") : <span>Pick a date</span>}
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
                    <Label className="text-xs uppercase text-gray-400 font-bold tracking-wider">Reason</Label>
                    <Textarea 
                      placeholder="e.g. Sick, Traveling..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="rounded-xl bg-gray-50 border-gray-200 h-12 min-h-[48px] resize-none py-2.5"
                    />
                  </div>
                </div>

                {/* AI Suggestions */}
                <div className="flex-1 min-h-0 flex flex-col">
                   <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-[#333333]" />
                      <Label className="text-sm font-serif text-[#333333]">Suggested Pros</Label>
                      <span className="text-xs text-gray-400 font-normal ml-auto">
                        {suggestions.length} available matches
                      </span>
                   </div>
                   
                   <div className="bg-gray-50/50 rounded-2xl p-1 border border-gray-100 flex-1 overflow-hidden">
                     {suggestions.length > 0 ? (
                       <div className="h-full overflow-y-auto p-2 space-y-2">
                         {suggestions.map(teacher => (
                           <div 
                              key={teacher.id}
                              onClick={() => toggleSubSelection(teacher.name)}
                              className={`
                                flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border
                                ${selectedSubs.includes(teacher.name) 
                                  ? 'bg-white border-[#333333] shadow-md' 
                                  : 'bg-white border-transparent hover:border-gray-200'
                                }
                              `}
                           >
                             <div className="flex items-center gap-3">
                               <Avatar className="h-8 w-8 bg-gray-100">
                                 <AvatarFallback className="text-xs">{teacher.name.charAt(0)}</AvatarFallback>
                               </Avatar>
                               <div>
                                 <div className="text-sm font-medium text-[#333333]">{teacher.name}</div>
                                 <div className="text-[10px] text-gray-400 truncate max-w-[120px]">
                                   {teacher.styles?.join(', ')}
                                 </div>
                               </div>
                             </div>
                             {selectedSubs.includes(teacher.name) && (
                               <CheckCircle2 className="w-4 h-4 text-[#333333]" />
                             )}
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                         <User className="w-8 h-8 mb-2 opacity-20" />
                         <p className="text-xs">No matches found for this time & style.</p>
                       </div>
                     )}
                   </div>
                </div>

                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || !reason || !activeClass}
                  className="w-full rounded-full bg-[#333333] text-white hover:bg-black h-14 text-lg font-serif mt-auto shadow-xl shadow-gray-200"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Request"}
                </Button>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-20 h-20 bg-[#F2DCDD] rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-10 h-10 text-[#333333]" />
                </div>
                <h3 className="text-2xl font-serif text-[#333333]">Request Sent</h3>
                <p className="text-gray-500 max-w-xs font-serif">
                  We've notified the team and your suggested subs. Sit tight!
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}