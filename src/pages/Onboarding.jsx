import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Building2, AlertTriangle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

import SmartImportDropZone from '../components/import/SmartImportDropZone';
import SmartImportChat from '../components/import/SmartImportChat';
import SmartImportResults from '../components/import/SmartImportResults';

const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  muted: '#8a8478',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
  green: '#7eb89a',
  red: '#c48c8c',
  amber: '#c4a98c',
};

const EtchedText = ({ children, size = 'md', className = '' }) => {
  const sizes = { sm: '14px', md: '18px', lg: '24px', xl: '32px', '2xl': '48px' };
  return (
    <span className={className} style={{
      fontSize: sizes[size],
      fontWeight: '700',
      letterSpacing: '-0.02em',
      color: 'transparent',
      backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      textShadow: '0 2px 3px rgba(255,255,255,0.7)',
    }}>
      {children}
    </span>
  );
};

export default function Onboarding() {
  const [files, setFiles] = useState([]);
  const [context, setContext] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResults, setParsedResults] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);
  const [saveResults, setSaveResults] = useState(null);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: studio } = useQuery({
    queryKey: ['currentStudio', currentUser?.studio_id],
    queryFn: async () => {
      if (!currentUser?.studio_id) return null;
      const studios = await base44.entities.Studio.filter({ id: currentUser.studio_id });
      return studios[0] || null;
    },
    enabled: !!currentUser?.studio_id,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentUser?.studio_id],
    queryFn: () => base44.entities.DanceClass.filter({ studio_id: currentUser.studio_id }),
    enabled: !!currentUser?.studio_id,
  });

  const studioId = currentUser?.studio_id;

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setParsedResults(null);

    // Upload all files
    const uploadedUrls = [];
    for (const file of files) {
      // For CSVs, read text directly
      if (file.name?.endsWith('.csv')) {
        const text = await file.text();
        uploadedUrls.push({ name: file.name, type: 'csv', text });
      } else {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push({ name: file.name, type: 'image', url: file_url });
      }
    }

    // Build class context for the AI
    const classContext = classes.length > 0
      ? `\n\nExisting classes in the studio:\n${classes.filter(c => c.type !== 'admin').map(c => `- "${c.title}" (${c.day}, students: ${c.student_names?.join(', ') || 'none'})`).join('\n')}`
      : '';

    // CSV files: include content inline
    const csvDescriptions = uploadedUrls
      .filter(u => u.type === 'csv')
      .map(u => `CSV file "${u.name}" content:\n${u.text}`)
      .join('\n\n');

    const imageUrls = uploadedUrls.filter(u => u.type === 'image').map(u => u.url);

    const prompt = `You are a smart import assistant for a dance studio management app. The user has uploaded ${files.length} document(s).

User's context/instructions: "${context || 'No additional context provided'}"
${classContext}

${csvDescriptions ? `\n${csvDescriptions}\n` : ''}

For each document, analyze it and determine:
1. Document type: "attendance" (attendance sheet with student names + markings), "roster" (list of students, possibly with class assignments), or "other"
2. For attendance sheets: identify the class name and ALL dates with student statuses. A single sheet may contain MANY dates (columns, rows, pages). You MUST extract EVERY date found. Use the "attendance_entries" array to return one entry per date found.
3. For roster documents: extract student names, class names, and any enrollment info

IMPORTANT matching rules:
- Match student names to the enrolled student lists above when possible
- For attendance markings: checkmark/✓/P = present, A/X = absent, E = excused, L/T = late
- Try to infer the class and dates from the document itself OR from user context
- If you can't determine the class, use your best guess from the class list
- For dates, use YYYY-MM-DD format
- CRITICAL: Extract ALL dates from the document. Do NOT stop at just a few. If a sheet has 16 dates, return all 16.

Return one entry per document uploaded. Each attendance document should have ALL its dates in the attendance_entries array.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: imageUrls.length > 0 ? imageUrls : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          documents: {
            type: "array",
            items: {
              type: "object",
              properties: {
                file_name: { type: "string", description: "Name or description of this document" },
                type: { type: "string", enum: ["attendance", "roster", "other"] },
                class_name: { type: "string", description: "Detected class name" },
                class_id: { type: "string", description: "Matched class ID if possible" },
                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                summary: { type: "string", description: "Brief summary of what was found" },
                attendance_entries: {
                  type: "array",
                  description: "For attendance type: one entry per date found on the sheet. Extract ALL dates.",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string", description: "Date in YYYY-MM-DD format" },
                      student_records: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            student_name: { type: "string" },
                            status: { type: "string", enum: ["present", "absent", "excused", "late"] },
                            notes: { type: "string" },
                          }
                        }
                      }
                    }
                  }
                },
                records: {
                  type: "array",
                  description: "For roster type: list of students",
                  items: {
                    type: "object",
                    properties: {
                      student_name: { type: "string" },
                      name: { type: "string", description: "For roster imports" },
                      status: { type: "string", enum: ["present", "absent", "excused", "late"] },
                      notes: { type: "string" },
                      class_name: { type: "string" },
                      age: { type: "number" },
                      parent_email: { type: "string" },
                    }
                  }
                },
                classes: {
                  type: "array",
                  description: "For roster type: detected classes",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      day: { type: "string" },
                      student_names: { type: "array", items: { type: "string" } },
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Process and flatten results - each attendance date becomes its own entry
    const processedDocuments = [];
    (result.documents || []).forEach((doc, idx) => {
      // Match class IDs
      if (doc.class_name && !doc.class_id) {
        const match = classes.find(c =>
          c.title.toLowerCase().includes(doc.class_name.toLowerCase()) ||
          doc.class_name.toLowerCase().includes(c.title.toLowerCase())
        );
        if (match) {
          doc.class_id = match.id;
          doc.class_name = match.title;
        }
      }
      if (!doc.file_name && files[idx]) {
        doc.file_name = files[idx].name;
      }

      // Flatten attendance entries: one "doc" per date
      if (doc.type === 'attendance' && doc.attendance_entries?.length > 0) {
        for (const entry of doc.attendance_entries) {
          processedDocuments.push({
            ...doc,
            date: entry.date,
            records: entry.student_records || [],
            attendance_entries: undefined,
          });
        }
      } else {
        processedDocuments.push(doc);
      }
    });

    setParsedResults(processedDocuments);
    setIsProcessing(false);
  };

  const handleSave = async () => {
    if (!parsedResults || !studioId) return;
    setIsSaving(true);

    let attendance_saved = 0;
    let students_created = 0;
    let classes_created = 0;
    let teachers_created = 0;

    for (const doc of parsedResults) {
      if (doc.type === 'attendance' && doc.records?.length > 0) {
        const classId = doc.class_id || '';
        const className = doc.class_name || 'Unknown';
        const date = doc.date || new Date().toISOString().split('T')[0];

        // Check for existing attendance
        let existing = [];
        if (classId) {
          existing = await base44.entities.Attendance.filter({ class_id: classId, date });
        }
        const existingNames = new Set(existing.map(a => a.student_name));

        const newRecords = doc.records
          .filter(r => r.student_name && !existingNames.has(r.student_name))
          .map(r => ({
            studio_id: studioId,
            class_id: classId,
            class_name: className,
            student_name: r.student_name,
            date,
            status: r.status || 'present',
            notes: r.notes || undefined,
          }));

        if (newRecords.length > 0) {
          await base44.entities.Attendance.bulkCreate(newRecords);
          attendance_saved += newRecords.length;
        }

        // Save any notes
        const notesToSave = doc.records.filter(r => r.notes?.trim());
        if (notesToSave.length > 0) {
          await base44.entities.StudentNote.bulkCreate(notesToSave.map(r => ({
            studio_id: studioId,
            student_name: r.student_name,
            class_name: className,
            content: r.notes,
            category: 'general',
            sentiment: 'neutral',
            date,
          })));
        }
      }

      if (doc.type === 'roster' && doc.records?.length > 0) {
        const studentData = doc.records
          .filter(r => r.name || r.student_name)
          .map(r => ({
            studio_id: studioId,
            name: r.name || r.student_name,
            status: 'active',
            color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
            age: r.age || undefined,
            parent_email: r.parent_email || undefined,
          }));

        if (studentData.length > 0) {
          await base44.entities.Student.bulkCreate(studentData);
          students_created += studentData.length;
        }

        if (doc.classes?.length > 0) {
          const classData = doc.classes.map(c => ({
            studio_id: studioId,
            title: c.title,
            day: c.day || 'M',
            start_time: 16,
            duration: 1,
            type: 'class',
            student_names: c.student_names || [],
          }));
          await base44.entities.DanceClass.bulkCreate(classData);
          classes_created += classData.length;
        }
      }
    }

    queryClient.invalidateQueries(['attendance']);
    queryClient.invalidateQueries(['classes']);
    queryClient.invalidateQueries(['students']);

    setSaveResults({ attendance_saved, students_created, classes_created, teachers_created });
    setIsSaving(false);
    setSaveComplete(true);
  };

  const handleReset = () => {
    setFiles([]);
    setContext('');
    setParsedResults(null);
    setIsSaving(false);
    setSaveComplete(false);
    setSaveResults(null);
  };

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: colors.paper }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <EtchedText size="2xl">Smart Import</EtchedText>
          <p style={{ color: colors.muted }}>
            Drop anything — photos, spreadsheets, schedules — AI figures out the rest
          </p>
          {studio && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 20,
              background: 'rgba(126,184,154,0.15)', marginTop: 12,
            }}>
              <Building2 size={16} style={{ color: colors.green }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: colors.ink }}>
                {studio.name}
              </span>
            </div>
          )}
        </div>

        {/* No Studio Warning */}
        {currentUser && !studioId && (
          <div style={{
            padding: 24, borderRadius: 24,
            background: `${colors.amber}15`, border: `1px solid ${colors.amber}40`,
            textAlign: 'center',
          }}>
            <AlertTriangle size={32} style={{ color: colors.amber, margin: '0 auto 12px' }} />
            <EtchedText size="md">No Studio Linked</EtchedText>
            <p style={{ color: colors.muted, marginTop: 8, maxWidth: 400, margin: '8px auto 0' }}>
              Your account isn't linked to a studio yet. Please contact your administrator.
            </p>
          </div>
        )}

        {/* Main Import Area */}
        {studioId && !parsedResults && !isProcessing && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <SmartImportDropZone files={files} setFiles={setFiles} disabled={isProcessing} />
            <SmartImportChat
              context={context}
              setContext={setContext}
              onSubmit={handleSubmit}
              isProcessing={isProcessing}
              fileCount={files.length}
            />
            {files.length > 0 && (
              <p className="text-center text-xs" style={{ color: colors.muted }}>
                <Sparkles size={12} className="inline mr-1" style={{ color: colors.etchLight }} />
                AI will auto-detect document types, classes, dates, and student info
              </p>
            )}
          </motion.div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="text-center py-20">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-[#F2DCDD] blur-xl rounded-full opacity-50 animate-pulse" />
              <Loader2 size={48} className="animate-spin relative z-10" style={{ color: colors.etchDark }} />
            </div>
            <p style={{ color: colors.ink, fontWeight: 600, marginTop: 24 }}>
              Analyzing {files.length} document{files.length !== 1 ? 's' : ''}...
            </p>
            <p style={{ color: colors.muted, fontSize: 14, marginTop: 8 }}>
              Detecting document types, matching students, reading attendance
            </p>
          </div>
        )}

        {/* Results */}
        {parsedResults && (
          <SmartImportResults
            results={parsedResults}
            onSave={handleSave}
            onReset={handleReset}
            isSaving={isSaving}
            saveComplete={saveComplete}
            saveResults={saveResults}
          />
        )}

      </div>
    </div>
  );
}