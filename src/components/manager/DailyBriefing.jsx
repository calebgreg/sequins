import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronDown, Sparkles, AlertTriangle, UserCheck, Star, Calendar } from 'lucide-react';

const DAY_NAMES = { M: 'Monday', T: 'Tuesday', W: 'Wednesday', R: 'Thursday', F: 'Friday', S: 'Saturday', U: 'Sunday' };

const colors = {
  muted: '#8a8478',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
};

export default function DailyBriefing({ dayClasses, selectedDay, teachers, students, expanded, onToggle }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch sub requests for today
  const { data: subRequests = [] } = useQuery({
    queryKey: ['subRequests'],
    queryFn: () => base44.entities.SubRequest.list(),
  });

  // Fetch student notes for context
  const { data: studentNotes = [] } = useQuery({
    queryKey: ['studentNotes'],
    queryFn: () => base44.entities.StudentNote.list(),
  });

  // Generate AI briefing when day changes or data updates
  useEffect(() => {
    if (dayClasses.length === 0) {
      setBriefing(null);
      return;
    }

    const generateBriefing = async () => {
      setLoading(true);

      // Gather context
      const dayTeachers = [...new Set(dayClasses.map(c => c.teacher).filter(Boolean))];
      const todaysSubs = subRequests.filter(s => s.status === 'pending' || s.status === 'filled');
      const classStudentNames = dayClasses.flatMap(c => c.student_names || []);
      
      // Find recent concerning notes (last 7 days)
      const recentNotes = studentNotes.filter(n => {
        const noteDate = new Date(n.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return noteDate >= weekAgo && n.sentiment === 'constructive';
      });

      // Find students with concerning notes who are in today's classes
      const concernStudents = recentNotes
        .filter(n => classStudentNames.includes(n.student_name))
        .map(n => ({ name: n.student_name, note: n.content, category: n.category }));

      // Find new/trial students (joined in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newStudents = students.filter(s => {
        const joinedDate = new Date(s.joined_date);
        return joinedDate >= thirtyDaysAgo && classStudentNames.includes(s.name);
      });

      // Find prospect/trial students
      const trialStudents = students.filter(s => 
        s.status === 'prospect' && classStudentNames.includes(s.name)
      );

      const prompt = `You are Gene, a helpful AI assistant for a dance studio. Generate a brief daily briefing for ${DAY_NAMES[selectedDay]}.

Context:
- ${dayClasses.length} classes scheduled
- Teachers working: ${dayTeachers.join(', ') || 'None assigned'}
- Active sub requests: ${todaysSubs.length > 0 ? todaysSubs.map(s => `${s.class_name} (${s.status})`).join(', ') : 'None'}
- Students with recent concerns: ${concernStudents.length > 0 ? concernStudents.map(s => `${s.name} (${s.category}: "${s.note.slice(0, 50)}...")`).join('; ') : 'None'}
- New students (joined <30 days): ${newStudents.map(s => s.name).join(', ') || 'None'}
- Trial/prospect students in classes: ${trialStudents.map(s => s.name).join(', ') || 'None'}

Generate a JSON response with these fields:
- headline: A short, friendly one-liner about the day (max 10 words)
- teachers_today: Array of teacher first names working today
- has_subs: boolean if there are any sub situations
- sub_note: Brief note about subs if any (or null)
- concerns: Array of {student_name, brief_note} for students needing attention (max 2)
- trials: Array of student names who are new/trial today
- special_note: Any other heads up (or null) - like if it's unusually busy, gaps in schedule, etc.`;

      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              headline: { type: 'string' },
              teachers_today: { type: 'array', items: { type: 'string' } },
              has_subs: { type: 'boolean' },
              sub_note: { type: 'string' },
              concerns: { 
                type: 'array', 
                items: { 
                  type: 'object',
                  properties: {
                    student_name: { type: 'string' },
                    brief_note: { type: 'string' }
                  }
                }
              },
              trials: { type: 'array', items: { type: 'string' } },
              special_note: { type: 'string' }
            }
          }
        });
        setBriefing(result);
      } catch (err) {
        console.error('Briefing error:', err);
        // Fallback to basic info
        setBriefing({
          headline: `${dayClasses.length} classes on ${DAY_NAMES[selectedDay]}`,
          teachers_today: dayTeachers.map(t => t?.split(' ')[0]),
          has_subs: todaysSubs.length > 0,
          sub_note: todaysSubs.length > 0 ? `${todaysSubs.length} sub request(s)` : null,
          concerns: concernStudents.slice(0, 2).map(s => ({ student_name: s.name, brief_note: s.category })),
          trials: trialStudents.map(s => s.name),
          special_note: null
        });
      }
      setLoading(false);
    };

    generateBriefing();
  }, [selectedDay, dayClasses.length]);

  if (dayClasses.length === 0) return null;

  return (
    <div 
      className="mx-6 mt-4 rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.9) 0%, rgba(252, 238, 235, 0.85) 100%)',
        border: '1px solid rgba(255, 200, 200, 0.3)',
        boxShadow: '0 2px 12px rgba(180, 120, 120, 0.06)',
      }}
    >
      {/* Header - Always Visible */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(164, 139, 196, 0.15)' }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: '#9a8aad' }} />
          </div>
          {loading ? (
            <span className="text-sm" style={{ color: colors.muted }}>Preparing briefing...</span>
          ) : briefing ? (
            <span className="text-sm font-medium" style={{ color: colors.etchDark }}>
              {briefing.headline}
            </span>
          ) : (
            <span className="text-sm" style={{ color: colors.muted }}>
              {dayClasses.length} classes today
            </span>
          )}
        </div>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} 
          style={{ color: colors.muted }} 
        />
      </button>

      {/* Expanded Briefing */}
      {expanded && briefing && (
        <div 
          className="px-5 pb-5 space-y-4"
          style={{ borderTop: '1px solid rgba(200, 180, 170, 0.15)' }}
        >
          {/* Teachers Today */}
          {briefing.teachers_today?.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-4 h-4" style={{ color: '#7eb89a' }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.muted }}>
                  Teaching Today
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {briefing.teachers_today.map((name, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1.5 rounded-full text-sm"
                    style={{ 
                      background: 'rgba(255,255,255,0.6)',
                      color: colors.etchDark,
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sub Alert */}
          {briefing.has_subs && briefing.sub_note && (
            <div 
              className="p-3 rounded-xl flex items-start gap-3"
              style={{ background: 'rgba(212, 165, 116, 0.1)' }}
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212, 165, 116, 0.2)' }}>
                <span style={{ color: '#d4a574', fontSize: '12px' }}>⇄</span>
              </div>
              <div>
                <span className="text-sm font-medium" style={{ color: '#c49660' }}>Sub Coverage</span>
                <p className="text-sm mt-0.5" style={{ color: '#a8896a' }}>{briefing.sub_note}</p>
              </div>
            </div>
          )}

          {/* Concerns */}
          {briefing.concerns?.length > 0 && (
            <div 
              className="p-3 rounded-xl"
              style={{ background: 'rgba(200, 170, 156, 0.1)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" style={{ color: '#c8aa9c' }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#b5998a' }}>
                  Heads Up
                </span>
              </div>
              <div className="space-y-2">
                {briefing.concerns.map((c, i) => (
                  <div key={i} className="text-sm" style={{ color: colors.etchDark }}>
                    <span className="font-medium">{c.student_name}</span>
                    <span style={{ color: colors.muted }}> — {c.brief_note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trials / New Students */}
          {briefing.trials?.length > 0 && (
            <div 
              className="p-3 rounded-xl flex items-start gap-3"
              style={{ background: 'rgba(126, 184, 154, 0.1)' }}
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(126, 184, 154, 0.2)' }}>
                <Star className="w-3 h-3" style={{ color: '#7eb89a' }} />
              </div>
              <div>
                <span className="text-sm font-medium" style={{ color: '#5a8a70' }}>Trial Classes</span>
                <p className="text-sm mt-0.5" style={{ color: '#7a9a88' }}>
                  {briefing.trials.join(', ')} — make them feel welcome!
                </p>
              </div>
            </div>
          )}

          {/* Special Note */}
          {briefing.special_note && (
            <div 
              className="p-3 rounded-xl flex items-start gap-3"
              style={{ background: 'rgba(164, 139, 196, 0.08)' }}
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(164, 139, 196, 0.15)' }}>
                <Calendar className="w-3 h-3" style={{ color: '#9a8aad' }} />
              </div>
              <p className="text-sm" style={{ color: '#8a7d9a' }}>{briefing.special_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}