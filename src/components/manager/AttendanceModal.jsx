import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function AttendanceModal({ isOpen, onOpenChange, classData, students }) {
  const [attendance, setAttendance] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [alertsSent, setAlertsSent] = useState([]);

  // Reset when class changes
  useEffect(() => {
    if (classData && classData.student_names) {
      const initial = {};
      classData.student_names.forEach(name => {
        initial[name] = 'present';
      });
      setAttendance(initial);
      setSaveSuccess(false);
    }
  }, [classData]);

  if (!classData) return null;

  const handleStatusChange = (name, status) => {
    setAttendance(prev => ({ ...prev, [name]: status }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setAlertsSent([]);
    try {
      // 1. Create Attendance Records
      const records = Object.entries(attendance).map(([name, status]) => ({
        class_id: classData.id,
        class_name: classData.title,
        student_name: name,
        date: new Date().toISOString().split('T')[0],
        status: status
      }));
      
      await base44.entities.Attendance.bulkCreate(records);

      // 2. AI Analysis for Flagging
      // Filter students who are absent or late
      const issues = Object.entries(attendance).filter(([_, s]) => s === 'absent' || s === 'late');
      
      if (issues.length > 0) {
        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `
            Analyze attendance for these students in ${classData.title}:
            ${issues.map(([n, s]) => `${n}: ${s}`).join(', ')}
            
            Tasks:
            1. Identify who should be flagged for "Low Attendance" (assume strict policy).
            2. Write a very short 1-sentence summary for their profile (e.g. "Frequently late to Ballet").
            
            Return JSON:
            {
              "updates": [
                { "student_name": "Name", "flag": boolean, "summary": "string" }
              ]
            }
          `,
          response_json_schema: {
            type: "object",
            properties: {
              updates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    student_name: { type: "string" },
                    flag: { type: "boolean" },
                    summary: { type: "string" }
                  }
                }
              }
            }
          }
        });

        // Apply updates to Students
        if (analysis?.updates) {
          const updatePromises = analysis.updates.map(async (update) => {
            const student = students.find(s => s.name === update.student_name);
            if (student) {
              await base44.entities.Student.update(student.id, {
                attendance_alert: update.flag,
                attendance_summary: update.summary
              });

              // Send Message to Portal if flagged
              if (update.flag) {
                await base44.entities.Message.create({
                  content: `Attendance Alert for ${student.name}: ${update.summary}`,
                  sender: 'ai',
                  timestamp: new Date().toISOString(),
                  is_alert: true
                });
                setAlertsSent(prev => [...prev, student.name]);
              }
            }
          });
          await Promise.all(updatePromises);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSaveSuccess(false);
      }, 1500);

    } catch (error) {
      console.error("Failed to save attendance", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'absent': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'late': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'excused': return <CheckCircle2 className="w-5 h-5 text-blue-500 opacity-50" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span className="font-serif text-2xl">Attendance</span>
            <Badge variant="outline" className="text-xs font-normal text-gray-500">
              {format(new Date(), 'MMM d, yyyy')}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Mark attendance for {classData.title} ({classData.student_names?.length || 0} students)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4 -mr-4">
          <div className="space-y-2 py-4">
            {classData.student_names?.map((name, i) => {
              const status = attendance[name] || 'present';
              const student = students.find(s => s.name === name);
              
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 bg-white border border-gray-200">
                      <AvatarFallback className="text-xs text-[#333333] bg-[#F2DCDD]">
                        {name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm text-[#333333]">{name}</div>
                      {student?.attendance_alert && (
                        <div className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
                          <AlertCircle className="w-3 h-3" /> Low Attendance
                        </div>
                      )}
                      {alertsSent.includes(name) && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium animate-in fade-in slide-in-from-left-2">
                          <Sparkles className="w-3 h-3" /> Alert Sent to Portal
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {['present', 'late', 'absent'].map((s) => (
                      <Button
                        key={s}
                        size="icon"
                        variant={status === s ? "default" : "ghost"}
                        className={`w-8 h-8 rounded-full ${
                          status === s 
                            ? s === 'present' ? 'bg-green-500 hover:bg-green-600' 
                            : s === 'absent' ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-yellow-500 hover:bg-yellow-600'
                            : 'text-gray-300'
                        }`}
                        onClick={() => handleStatusChange(name, s)}
                        title={s.charAt(0).toUpperCase() + s.slice(1)}
                      >
                        {s === 'present' && <CheckCircle2 className="w-4 h-4" />}
                        {s === 'absent' && <XCircle className="w-4 h-4" />}
                        {s === 'late' && <Clock className="w-4 h-4" />}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
            {(!classData.student_names || classData.student_names.length === 0) && (
               <div className="text-center text-gray-400 py-8 italic">No students enrolled.</div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button 
            onClick={handleSave} 
            className="w-full bg-[#333333] hover:bg-black text-white gap-2"
            disabled={isSaving || saveSuccess}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isSaving ? "Analyzing & Saving..." : saveSuccess ? (alertsSent.length > 0 ? "Saved & Alerts Sent!" : "Saved!") : "Save & Analyze"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}