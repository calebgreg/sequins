import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, CheckCircle2, XCircle, ChevronLeft, Camera, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const colors = {
  ink: '#1a1a1a',
  muted: '#8a8478',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
  green: '#7eb89a',
  red: '#c48c8c',
  amber: '#c4a98c',
  blue: '#8cb4c8',
};

const statusColors = {
  present: { bg: 'rgba(126,184,154,0.15)', text: '#7eb89a', label: 'Present' },
  absent: { bg: 'rgba(212,165,116,0.15)', text: '#d4a574', label: 'Absent' },
  excused: { bg: 'rgba(140,180,200,0.15)', text: '#8cb4c8', label: 'Excused' },
  late: { bg: 'rgba(164,139,196,0.15)', text: '#a48bc4', label: 'Late' },
};

export default function AttendancePhotoImport({ studioId, onBack }) {
  const [step, setStep] = useState('select'); // select, upload, processing, review, saving, done
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [extractedAttendance, setExtractedAttendance] = useState([]); // [{student_name, status, notes}]
  const [saveResults, setSaveResults] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', studioId],
    queryFn: () => base44.entities.DanceClass.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: existingAttendance = [] } = useQuery({
    queryKey: ['existingAttendance', selectedClassId, selectedDate],
    queryFn: () => base44.entities.Attendance.filter({ class_id: selectedClassId, date: selectedDate }),
    enabled: !!selectedClassId && !!selectedDate,
  });

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const handleFileSelect = async (file) => {
    if (!file || !selectedClass) return;

    setStep('processing');

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const studentList = selectedClass.student_names?.join(', ') || 'Unknown students';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are reading a handwritten attendance sheet photo for a dance class.

The class "${selectedClass.title}" has these enrolled students: ${studentList}

Look at this attendance sheet image and extract each student's attendance status.

Common markings on analog sheets:
- A checkmark (✓), "P", or similar = present
- "A" or an X = absent  
- "E" = excused
- "L" or "T" (tardy) = late
- Any written notes next to a name should be captured

For each student you can identify, return their name (match to the enrolled list as closely as possible), their status, and any notes written next to their name.

IMPORTANT: Only return students from the enrolled list. Match handwritten names to the closest enrolled name.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          attendance: {
            type: "array",
            items: {
              type: "object",
              properties: {
                student_name: { type: "string", description: "Matched enrolled student name" },
                status: { type: "string", enum: ["present", "absent", "excused", "late"], description: "Attendance status" },
                notes: { type: "string", description: "Any handwritten notes found next to the name" },
                confidence: { type: "string", enum: ["high", "medium", "low"], description: "How confident you are in reading this entry" },
              }
            }
          },
          unmatched_names: {
            type: "array",
            items: { type: "string" },
            description: "Names seen on sheet that couldn't be matched to enrolled students"
          }
        }
      }
    });

    // Merge AI results with full roster — default missing students to present
    const attendanceMap = new Map();
    (result.attendance || []).forEach(a => {
      attendanceMap.set(a.student_name, a);
    });

    const fullRoster = (selectedClass.student_names || []).map(name => {
      const match = attendanceMap.get(name);
      return {
        student_name: name,
        status: match?.status || 'present',
        notes: match?.notes || '',
        confidence: match?.confidence || 'low',
        ai_matched: !!match,
      };
    });

    setExtractedAttendance(fullRoster);
    setStep('review');
  };

  const handleStatusChange = (index, newStatus) => {
    setExtractedAttendance(prev => prev.map((a, i) => 
      i === index ? { ...a, status: newStatus } : a
    ));
  };

  const handleSave = async () => {
    setStep('saving');

    const records = extractedAttendance.map(a => ({
      studio_id: studioId,
      class_id: selectedClassId,
      class_name: selectedClass.title,
      student_name: a.student_name,
      date: selectedDate,
      status: a.status,
      notes: a.notes || undefined,
    }));

    // If there are existing records for this class/date, skip to avoid duplicates
    if (existingAttendance.length > 0) {
      const existingNames = new Set(existingAttendance.map(a => a.student_name));
      const newRecords = records.filter(r => !existingNames.has(r.student_name));
      
      if (newRecords.length > 0) {
        await base44.entities.Attendance.bulkCreate(newRecords);
      }
      
      setSaveResults({
        saved: newRecords.length,
        skipped: records.length - newRecords.length,
        total: records.length,
      });
    } else {
      await base44.entities.Attendance.bulkCreate(records);
      setSaveResults({ saved: records.length, skipped: 0, total: records.length });
    }

    // Create StudentNotes for any AI-extracted notes
    const notesToSave = extractedAttendance.filter(a => a.notes?.trim());
    if (notesToSave.length > 0) {
      const noteRecords = notesToSave.map(a => ({
        studio_id: studioId,
        student_name: a.student_name,
        class_name: selectedClass.title,
        content: a.notes,
        category: 'general',
        sentiment: 'neutral',
        date: selectedDate,
      }));
      await base44.entities.StudentNote.bulkCreate(noteRecords);
    }

    queryClient.invalidateQueries(['attendance']);
    setStep('done');
  };

  // Generate last 60 days of date options
  const dateOptions = Array.from({ length: 60 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return { value: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE, MMM do') };
  });

  return (
    <div className="space-y-6">
      {/* Back button */}
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-sm" style={{ color: colors.muted }}>
          <ChevronLeft size={16} /> Back to Import Hub
        </button>
      )}

      {/* STEP: Select class & date */}
      {step === 'select' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="text-center space-y-2">
            <Camera size={40} style={{ color: colors.etchDark, margin: '0 auto' }} />
            <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.ink }}>Import from Photo</h2>
            <p style={{ color: colors.muted, maxWidth: 400, margin: '0 auto' }}>
              Snap a photo of your handwritten attendance sheet and AI will read it for you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: colors.muted }}>Class</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="h-12 rounded-xl" style={{ background: 'rgba(255,255,255,0.8)' }}>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.filter(c => c.type !== 'admin').map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} ({c.day})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: colors.muted }}>Date</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="h-12 rounded-xl" style={{ background: 'rgba(255,255,255,0.8)' }}>
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  {dateOptions.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedClass && existingAttendance.length > 0 && (
            <div className="max-w-lg mx-auto" style={{
              padding: '12px 16px', borderRadius: 12,
              background: `${colors.amber}15`, border: `1px solid ${colors.amber}30`,
            }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} style={{ color: colors.amber }} />
                <span style={{ fontSize: 13, color: colors.ink }}>
                  Attendance already exists for this class on {format(new Date(selectedDate + 'T12:00:00'), 'MMM do')} ({existingAttendance.length} records). New students will be added, existing ones skipped.
                </span>
              </div>
            </div>
          )}

          {selectedClass && (
            <div className="max-w-lg mx-auto">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all hover:border-[#8a7070]"
                style={{ borderColor: 'rgba(200,180,170,0.4)', background: 'rgba(255,255,255,0.6)' }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
                <Upload size={32} style={{ color: colors.etchDark, margin: '0 auto 16px' }} />
                <p style={{ fontWeight: 600, color: colors.ink }}>Upload attendance photo</p>
                <p style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                  Take a photo or choose from gallery
                </p>
              </div>
            </div>
          )}

          {!selectedClassId && (
            <p className="text-center text-sm" style={{ color: colors.muted }}>
              Select a class first to continue
            </p>
          )}
        </motion.div>
      )}

      {/* STEP: Processing */}
      {step === 'processing' && (
        <div className="text-center py-16">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-[#F2DCDD] blur-xl rounded-full opacity-50 animate-pulse" />
            <Loader2 size={48} className="animate-spin relative z-10" style={{ color: colors.etchDark }} />
          </div>
          <p style={{ color: colors.ink, fontWeight: 600, marginTop: 24 }}>AI is reading the attendance sheet...</p>
          <p style={{ color: colors.muted, fontSize: 14, marginTop: 8 }}>
            Matching handwriting to {selectedClass?.student_names?.length || 0} enrolled students
          </p>
        </div>
      )}

      {/* STEP: Review */}
      {step === 'review' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="text-center space-y-1">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.ink }}>Review Attendance</h2>
            <p style={{ color: colors.muted, fontSize: 14 }}>
              {selectedClass?.title} · {format(new Date(selectedDate + 'T12:00:00'), 'EEE, MMM do')}
            </p>
          </div>

          <div className="space-y-2 max-w-2xl mx-auto">
            {extractedAttendance.map((a, i) => {
              const sc = statusColors[a.status];
              return (
                <div key={a.student_name}
                  className="rounded-xl p-3 flex items-center justify-between gap-3"
                  style={{
                    background: 'rgba(255,255,255,0.7)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7)',
                    border: a.confidence === 'low' && a.ai_matched ? `1px solid ${colors.amber}40` : '1px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,252,250,0.8))', boxShadow: 'inset 0 1px 1px rgba(255,255,255,1)' }}>
                      <span className="text-sm font-medium" style={{ color: colors.etchLight }}>{a.student_name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium block truncate" style={{ color: colors.ink }}>{a.student_name}</span>
                      {a.notes && (
                        <span className="text-xs block truncate" style={{ color: colors.muted }}>📝 {a.notes}</span>
                      )}
                      {!a.ai_matched && (
                        <span className="text-[10px] font-medium" style={{ color: colors.amber }}>Not found on sheet — defaulted to present</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 flex-shrink-0">
                    {Object.entries(statusColors).map(([status, s]) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(i, status)}
                        className="px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-medium transition-all active:scale-95"
                        style={{
                          background: a.status === status ? s.bg : 'transparent',
                          color: a.status === status ? s.text : '#c4b5ab',
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary bar */}
          <div className="flex items-center justify-center gap-4 py-3" style={{ fontSize: 13 }}>
            {Object.entries(statusColors).map(([status, s]) => {
              const count = extractedAttendance.filter(a => a.status === status).length;
              if (!count) return null;
              return (
                <span key={status} style={{ color: s.text, fontWeight: 600 }}>
                  {count} {s.label}
                </span>
              );
            })}
          </div>

          <div className="flex gap-3 max-w-md mx-auto">
            <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => {
              setExtractedAttendance([]);
              setStep('select');
            }}>
              Re-upload
            </Button>
            <Button className="flex-1 h-12 rounded-xl" style={{ backgroundColor: colors.ink }} onClick={handleSave}>
              Save Attendance
            </Button>
          </div>
        </motion.div>
      )}

      {/* STEP: Saving */}
      {step === 'saving' && (
        <div className="text-center py-16">
          <Loader2 size={48} className="animate-spin mx-auto" style={{ color: colors.etchLight }} />
          <p style={{ color: colors.ink, fontWeight: 600, marginTop: 24 }}>Saving attendance records...</p>
        </div>
      )}

      {/* STEP: Done */}
      {step === 'done' && saveResults && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-8">
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: `linear-gradient(145deg, ${colors.green}30, ${colors.green}20)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
          }}>
            <CheckCircle2 size={40} style={{ color: colors.green }} />
          </div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.ink }}>Attendance Saved!</h2>
            <p style={{ color: colors.muted, marginTop: 8 }}>
              {saveResults.saved} records saved{saveResults.skipped > 0 ? `, ${saveResults.skipped} already existed` : ''}
            </p>
          </div>
          <div className="flex gap-3 max-w-md mx-auto">
            <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => {
              setExtractedAttendance([]);
              setSaveResults(null);
              setStep('select');
            }}>
              Import Another
            </Button>
            {onBack && (
              <Button className="flex-1 h-12 rounded-xl" style={{ backgroundColor: colors.ink }} onClick={onBack}>
                Done
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}