import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Users, Calendar, FileText } from 'lucide-react';

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

export default function SmartImportResults({ results, onSave, onReset, isSaving, saveComplete, saveResults, saveProgress }) {

  if (saveComplete && saveResults) {
    return (
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
          <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.ink }}>Import Complete!</h2>
          <p style={{ color: colors.muted, marginTop: 8 }}>
            {saveResults.attendance_saved > 0 && `${saveResults.attendance_saved} attendance records`}
            {saveResults.students_created > 0 && `, ${saveResults.students_created} students`}
            {saveResults.classes_created > 0 && `, ${saveResults.classes_created} classes`}
            {saveResults.teachers_created > 0 && `, ${saveResults.teachers_created} teachers`}
            {' saved successfully'}
          </p>
        </div>
        <Button variant="outline" className="h-12 rounded-xl px-8" onClick={onReset}>
          Import More
        </Button>
      </motion.div>
    );
  }

  if (isSaving) {
    return (
      <div className="text-center py-16">
        <Loader2 size={48} className="animate-spin mx-auto" style={{ color: colors.etchLight }} />
        <p style={{ color: colors.ink, fontWeight: 600, marginTop: 24 }}>Saving records...</p>
        {saveProgress && <p style={{ color: colors.muted, fontSize: 14, marginTop: 8 }}>{saveProgress}</p>}
      </div>
    );
  }

  if (!results || results.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {results.map((doc, docIndex) => (
        <DocumentResult key={docIndex} doc={doc} docIndex={docIndex} />
      ))}

      <div className="flex gap-3 max-w-md mx-auto pt-2">
        <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={onReset}>
          Start Over
        </Button>
        <Button className="flex-1 h-12 rounded-xl" style={{ backgroundColor: colors.ink }} onClick={onSave}>
          Confirm & Import
        </Button>
      </div>
    </motion.div>
  );
}

function DocumentResult({ doc, docIndex }) {
  const [expanded, setExpanded] = useState(true);

  const typeIcons = {
    attendance: Calendar,
    roster: Users,
    other: FileText,
  };
  const Icon = typeIcons[doc.type] || FileText;

  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,252,250,0.9))',
      border: '1px solid rgba(200,180,170,0.2)',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: doc.type === 'attendance' ? `${colors.green}20` : `${colors.blue}20` }}>
            <Icon size={20} style={{ color: doc.type === 'attendance' ? colors.green : colors.blue }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: colors.ink }}>
              {doc.file_name || `Document ${docIndex + 1}`}
            </p>
            <p className="text-xs" style={{ color: colors.muted }}>
              {doc.type === 'attendance' && `${doc.class_name || 'Unknown class'} · ${doc.date || 'Unknown date'} · ${doc.records?.length || 0} students`}
              {doc.type === 'roster' && `${doc.records?.length || 0} students, ${doc.classes?.length || 0} classes`}
              {doc.type === 'other' && (doc.summary || 'Document detected')}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: colors.muted }} /> : <ChevronDown size={16} style={{ color: colors.muted }} />}
      </button>

      {expanded && doc.type === 'attendance' && doc.records && (
        <div className="px-4 pb-4 space-y-1">
          {doc.records.map((r, i) => {
            const sc = statusColors[r.status] || statusColors.present;
            return (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.5)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244,236,236,0.8)' }}>
                    <span className="text-xs font-medium" style={{ color: colors.etchDark }}>{r.student_name?.charAt(0)}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium" style={{ color: colors.ink }}>{r.student_name}</span>
                    {r.notes && <span className="text-xs block" style={{ color: colors.muted }}>📝 {r.notes}</span>}
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{ background: sc.bg, color: sc.text }}>
                  {sc.label}
                </span>
              </div>
            );
          })}
          {/* Summary */}
          <div className="flex items-center justify-center gap-3 pt-2" style={{ fontSize: 12 }}>
            {Object.entries(statusColors).map(([status, s]) => {
              const count = doc.records.filter(r => r.status === status).length;
              if (!count) return null;
              return <span key={status} style={{ color: s.text, fontWeight: 600 }}>{count} {s.label}</span>;
            })}
          </div>
        </div>
      )}

      {expanded && doc.type === 'roster' && doc.records && (
        <div className="px-4 pb-4 space-y-1">
          {doc.records.slice(0, 10).map((r, i) => (
            <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.5)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244,236,236,0.8)' }}>
                <span className="text-xs font-medium" style={{ color: colors.etchDark }}>{r.name?.charAt(0)}</span>
              </div>
              <span className="text-sm font-medium" style={{ color: colors.ink }}>{r.name}</span>
              {r.class_name && <span className="text-xs" style={{ color: colors.muted }}>· {r.class_name}</span>}
            </div>
          ))}
          {doc.records.length > 10 && (
            <p className="text-center text-xs pt-1" style={{ color: colors.muted }}>+{doc.records.length - 10} more</p>
          )}
        </div>
      )}
    </div>
  );
}