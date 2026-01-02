import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CalendarX, FileText, CheckCircle2, Loader2, Calendar as CalendarIcon, AlertCircle, Sparkles, User, Plus, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { base44 } from "@/api/base44Client";
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getDay } from 'date-fns';
import { motion } from 'framer-motion';

export default function TimeManagementHub({ isOpen, onOpenChange, teacherName, classes, subRequests }) {
  const [activeTab, setActiveTab] = useState('timesheet');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-8 pt-8 pb-0">
          <DialogTitle className="text-2xl font-serif">Time & Schedule Management</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-8 pt-4">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-xl">
              <TabsTrigger value="timesheet" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Clock className="w-4 h-4" />
                Time Sheet
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <FileText className="w-4 h-4" />
                My Requests
              </TabsTrigger>
              <TabsTrigger value="new-request" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <CalendarX className="w-4 h-4" />
                Request Coverage
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-8 pb-8">
            <TabsContent value="timesheet" className="mt-6">
              <TimeSheetContent teacherName={teacherName} classes={classes} subRequests={subRequests} onClose={() => onOpenChange(false)} />
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              <RequestHistoryContent teacherName={teacherName} onNewRequest={() => setActiveTab('new-request')} />
            </TabsContent>

            <TabsContent value="new-request" className="mt-6">
              <NewRequestContent teacherName={teacherName} classes={classes} onClose={() => onOpenChange(false)} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Time Sheet Content Component
function TimeSheetContent({ teacherName, classes, subRequests, onClose }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const today = new Date();
  const periodStart = startOfWeek(today, { weekStartsOn: 1 });
  const periodEnd = endOfWeek(today, { weekStartsOn: 1 });

  const dailyBreakdown = useMemo(() => {
    const days = eachDayOfInterval({ start: periodStart, end: periodEnd });
    
    return days.map(day => {
      const dayName = format(day, 'EEEEE');
      const dayClasses = classes.filter(c => c.day === dayName);
      
      const dayEvents = dayClasses.map(cls => {
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
        onClose();
      }, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="py-20 flex flex-col items-center text-center space-y-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-serif text-[#333333]">Timesheet Submitted</h3>
          <p className="text-gray-500 mt-2">Thanks for confirming your hours!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-2xl p-6 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Hours</p>
          <h3 className="text-3xl font-serif text-[#333333]">{totalPeriodHours}h</h3>
        </div>
        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      <ScrollArea className="h-[300px]">
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

      <Button 
        onClick={handleAcknowledge}
        disabled={isSubmitting}
        className="w-full rounded-full bg-[#333333] text-white hover:bg-black h-12 text-lg"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Acknowledge & Submit"}
      </Button>
    </div>
  );
}

// Request History Content Component
function RequestHistoryContent({ teacherName, onNewRequest }) {
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
    <div className="space-y-4">
      <Button 
        onClick={onNewRequest}
        className="w-full bg-[#333333] text-white hover:bg-black rounded-xl h-12 gap-2"
      >
        <Plus className="w-4 h-4" /> New Request
      </Button>

      <ScrollArea className="h-[400px]">
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
              <div key={req.id} className="bg-white border border-gray-100 hover:border-gray-200 rounded-2xl p-4 transition-all">
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
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 font-light mt-3">
                    "{req.reason}"
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// New Request Content Component
function NewRequestContent({ teacherName, classes, onClose }) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date());
  const [urgency, setUrgency] = useState('medium');
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const activeClass = classes.find(c => c.id === selectedClassId);

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const suggestions = useMemo(() => {
    if (!activeClass || !date || teachers.length === 0) return [];

    const dayMap = { 0: 'U', 1: 'M', 2: 'T', 3: 'W', 4: 'R', 5: 'F', 6: 'S' };
    const currentDay = dayMap[getDay(date)];
    
    const styleMatches = teachers.filter(t => 
      t.name !== teacherName &&
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
        setSelectedClassId('');
        onClose();
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

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-20 flex flex-col items-center text-center space-y-4"
      >
        <div className="w-20 h-20 bg-[#F2DCDD] rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-[#333333]" />
        </div>
        <h3 className="text-2xl font-serif text-[#333333]">Request Sent</h3>
        <p className="text-gray-500 max-w-xs font-serif">
          We've notified the team and your suggested subs!
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs uppercase text-gray-400 font-bold tracking-wider">Select Class</Label>
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl h-12">
            <SelectValue placeholder="Choose a class..." />
          </SelectTrigger>
          <SelectContent>
            {classes.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.title} - {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mma')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase text-gray-400 font-bold tracking-wider">Date Needed</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl h-12 bg-white border-gray-200">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "MMM do") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase text-gray-400 font-bold tracking-wider">Priority</Label>
          <Select value={urgency} onValueChange={setUrgency}>
            <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase text-gray-400 font-bold tracking-wider">Reason</Label>
        <Textarea 
          placeholder="Why do you need coverage?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-xl bg-white border-gray-200 h-24 resize-none"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#333333]" />
          <Label className="text-sm font-serif text-[#333333]">Suggested Subs</Label>
          <span className="text-xs text-gray-400 ml-auto">{suggestions.length} available</span>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-3 max-h-[200px] overflow-y-auto">
          {suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map(teacher => (
                <div 
                  key={teacher.id}
                  onClick={() => toggleSubSelection(teacher.name)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                    selectedSubs.includes(teacher.name) 
                      ? 'bg-white border-2 border-[#333333]' 
                      : 'bg-white border border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 bg-gray-100">
                      <AvatarFallback className="text-xs">{teacher.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-[#333333]">{teacher.name}</div>
                      <div className="text-xs text-gray-400">{teacher.styles?.join(', ')}</div>
                    </div>
                  </div>
                  {selectedSubs.includes(teacher.name) && (
                    <CheckCircle2 className="w-4 h-4 text-[#333333]" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <User className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">No matches found</p>
            </div>
          )}
        </div>
      </div>

      <Button 
        onClick={handleSubmit}
        disabled={isSubmitting || !reason || !activeClass}
        className="w-full rounded-full bg-[#333333] text-white hover:bg-black h-12"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Request"}
      </Button>
    </div>
  );
}