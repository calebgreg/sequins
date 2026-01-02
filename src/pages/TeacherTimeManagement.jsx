import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, CheckCircle2, Calendar, AlertCircle, Sparkles, Play, Square } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, differenceInMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function TeacherTimeManagement() {
  const [activeTab, setActiveTab] = useState('timesheet');
  const [isClocking, setIsClocking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Coverage Request State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [urgency, setUrgency] = useState('medium');

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  const teacherName = currentUser?.full_name || "Teacher";

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const myClasses = classes.filter(c => c.teacher === teacherName);

  const { data: timeLogs = [] } = useQuery({
    queryKey: ['timeLogs', teacherName],
    queryFn: async () => {
      const all = await base44.entities.TimeLog.list();
      return all.filter(log => log.teacher_name === teacherName);
    }
  });

  const { data: subRequests = [] } = useQuery({
    queryKey: ['subRequests', teacherName],
    queryFn: async () => {
      const all = await base44.entities.SubRequest.list();
      return all.filter(r => r.teacher_name === teacherName).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  const activeLog = timeLogs.find(log => log.status === 'active');

  const clockInMutation = useMutation({
    mutationFn: () => base44.entities.TimeLog.create({
      teacher_name: teacherName,
      clock_in: new Date().toISOString(),
      status: 'active'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeLogs'] });
      setIsClocking(false);
    }
  });

  const clockOutMutation = useMutation({
    mutationFn: () => base44.entities.TimeLog.update(activeLog.id, {
      clock_out: new Date().toISOString(),
      status: 'completed'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeLogs'] });
      setIsClocking(false);
    }
  });

  const submitTimeSheetMutation = useMutation({
    mutationFn: async (totalHours) => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      return base44.entities.TimeSheetAcknowledgement.create({
        teacher_name: teacherName,
        period_start: format(weekStart, 'yyyy-MM-dd'),
        period_end: format(weekEnd, 'yyyy-MM-dd'),
        total_hours: totalHours,
        acknowledged_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    }
  });

  const createSubRequestMutation = useMutation({
    mutationFn: async (data) => {
      const selectedClass = myClasses.find(c => c.id === data.class_id);
      
      // AI suggestion for subs
      const suggestions = await base44.integrations.Core.InvokeLLM({
        prompt: `Suggest 2-3 substitute teachers for a ${selectedClass?.style || 'dance'} class. Available teachers: ${teachers.map(t => `${t.name} (${t.styles?.join(', ')})`).join(', ')}. Return JSON: { "suggested_subs": ["Name1", "Name2"] }`,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_subs: { type: "array", items: { type: "string" } }
          }
        }
      });

      return base44.entities.SubRequest.create({
        teacher_name: teacherName,
        class_id: data.class_id,
        class_name: selectedClass?.title || 'Class',
        date: data.date,
        reason: data.reason,
        urgency: data.urgency,
        suggested_subs: suggestions?.suggested_subs || [],
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subRequests'] });
      setSelectedClassId('');
      setRequestDate('');
      setRequestReason('');
      setUrgency('medium');
    }
  });

  const handleClockToggle = async () => {
    setIsClocking(true);
    if (activeLog) {
      await clockOutMutation.mutateAsync();
    } else {
      await clockInMutation.mutateAsync();
    }
  };

  const handleSubmitCoverageRequest = async () => {
    if (!selectedClassId || !requestDate || !requestReason) return;
    await createSubRequestMutation.mutateAsync({
      class_id: selectedClassId,
      date: requestDate,
      reason: requestReason,
      urgency
    });
  };

  // Calculate weekly hours
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const completedLogs = timeLogs.filter(log => log.status === 'completed');
  const weeklyBreakdown = weekDays.map(day => {
    const dayLogs = completedLogs.filter(log => 
      format(new Date(log.clock_in), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );
    const totalMinutes = dayLogs.reduce((sum, log) => {
      return sum + differenceInMinutes(new Date(log.clock_out), new Date(log.clock_in));
    }, 0);
    return {
      day: format(day, 'EEE'),
      date: format(day, 'MMM d'),
      hours: (totalMinutes / 60).toFixed(1),
      logs: dayLogs
    };
  });

  const totalWeekHours = weeklyBreakdown.reduce((sum, d) => sum + parseFloat(d.hours), 0);

  const urgencyColors = {
    low: 'bg-blue-50 text-blue-700 border-blue-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    high: 'bg-red-50 text-red-700 border-red-200'
  };

  const statusColors = {
    pending: 'bg-gray-100 text-gray-600',
    approved: 'bg-blue-100 text-blue-600',
    filled: 'bg-green-100 text-green-600'
  };

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('TeacherStudio')}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-serif text-4xl text-[#333333]">Time Management</h1>
              <p className="text-gray-400 font-serif text-lg mt-1">Track hours & manage coverage</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white p-1.5 rounded-full inline-flex relative shadow-sm border border-gray-100 mb-8">
          {[
            { id: 'timesheet', label: 'Time Sheet', icon: Clock },
            { id: 'coverage', label: 'Coverage', icon: Calendar }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 z-10 flex items-center gap-2
                  ${isActive ? 'text-[#333333]' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-[#F2DCDD] rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'timesheet' ? (
            <motion.div
              key="timesheet"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Clock In/Out Card */}
              <Card className="p-8 bg-white rounded-[32px] shadow-sm border-0 lg:col-span-1 flex flex-col items-center justify-center gap-6">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center ${activeLog ? 'bg-red-50 animate-pulse' : 'bg-[#F4F4F6]'}`}>
                  {activeLog ? (
                    <Square className="w-12 h-12 text-red-500 fill-current" />
                  ) : (
                    <Play className="w-12 h-12 text-[#333333] fill-current" />
                  )}
                </div>
                
                {activeLog && (
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">Clocked in at</p>
                    <p className="text-2xl font-serif text-[#333333]">
                      {format(new Date(activeLog.clock_in), 'h:mm a')}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleClockToggle}
                  disabled={isClocking}
                  className={`w-full h-14 rounded-full text-lg font-serif shadow-lg ${activeLog ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-[#333333] hover:bg-black text-white'}`}
                >
                  {isClocking ? 'Processing...' : activeLog ? 'Clock Out' : 'Clock In'}
                </Button>
              </Card>

              {/* Weekly Summary */}
              <Card className="p-8 bg-white rounded-[32px] shadow-sm border-0 lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[#333333]">This Week</h2>
                    <p className="text-gray-400 text-sm mt-1">
                      {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Total Hours</p>
                    <p className="text-4xl font-serif text-[#333333]">{totalWeekHours.toFixed(1)}</p>
                  </div>
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {weeklyBreakdown.map((day, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-[#F4F4F6] rounded-2xl">
                        <div>
                          <p className="font-medium text-[#333333]">{day.day}</p>
                          <p className="text-xs text-gray-400">{day.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-serif text-[#333333]">{day.hours} hrs</p>
                          <p className="text-xs text-gray-400">{day.logs.length} sessions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator className="my-6" />

                <Button
                  onClick={() => {
                    setIsSubmitting(true);
                    submitTimeSheetMutation.mutate(totalWeekHours);
                    setTimeout(() => setIsSubmitting(false), 1000);
                  }}
                  disabled={isSubmitting || submitSuccess || totalWeekHours === 0}
                  className={`w-full h-14 rounded-full text-lg font-serif shadow-lg transition-all ${
                    submitSuccess 
                      ? 'bg-green-500 hover:bg-green-500' 
                      : 'bg-[#333333] hover:bg-black text-white'
                  }`}
                >
                  {submitSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Submitted!
                    </>
                  ) : isSubmitting ? (
                    'Submitting...'
                  ) : (
                    'Submit Time Sheet'
                  )}
                </Button>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="coverage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Request Coverage Form */}
              <Card className="p-8 bg-white rounded-[32px] shadow-sm border-0">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#F2DCDD] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[#333333]" />
                  </div>
                  <div>
                    <h2 className="font-serif text-2xl text-[#333333]">Request Coverage</h2>
                    <p className="text-gray-400 text-sm">Need a substitute?</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Class</Label>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                      <SelectTrigger className="mt-1 rounded-xl">
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {myClasses.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.title} • {cls.day} {format(new Date().setHours(Math.floor(cls.start_time), (cls.start_time % 1) * 60), 'h:mm a')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Date</Label>
                    <Input
                      type="date"
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                      className="mt-1 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Reason</Label>
                    <Textarea
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="Brief explanation..."
                      className="mt-1 rounded-xl min-h-[100px]"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Priority</Label>
                    <Select value={urgency} onValueChange={setUrgency}>
                      <SelectTrigger className="mt-1 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleSubmitCoverageRequest}
                    disabled={!selectedClassId || !requestDate || !requestReason || createSubRequestMutation.isPending}
                    className="w-full h-14 rounded-full bg-[#333333] hover:bg-black text-white text-lg font-serif shadow-lg mt-6"
                  >
                    {createSubRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </Card>

              {/* My Coverage Requests */}
              <Card className="p-8 bg-white rounded-[32px] shadow-sm border-0">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[#333333]">My Requests</h2>
                    <p className="text-gray-400 text-sm">Coverage history</p>
                  </div>
                  <Badge variant="secondary" className="bg-[#F2DCDD] text-[#333333]">
                    {subRequests.length} total
                  </Badge>
                </div>

                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {subRequests.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No requests yet</p>
                      </div>
                    ) : (
                      subRequests.map((request) => (
                        <div key={request.id} className="p-4 bg-[#F4F4F6] rounded-2xl space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-[#333333]">{request.class_name}</p>
                              <p className="text-sm text-gray-400">{format(new Date(request.date || request.created_date), 'MMM d, yyyy')}</p>
                            </div>
                            <Badge className={statusColors[request.status]}>
                              {request.status}
                            </Badge>
                          </div>
                          
                          {request.reason && (
                            <p className="text-sm text-gray-600 italic">"{request.reason}"</p>
                          )}

                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={urgencyColors[request.urgency]}>
                              {request.urgency} priority
                            </Badge>
                            {request.suggested_subs && request.suggested_subs.length > 0 && (
                              <p className="text-xs text-gray-400">
                                Suggested: {request.suggested_subs.slice(0, 2).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}