import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, TrendingUp, TrendingDown, AlertTriangle, Star, Calendar, Users, BarChart3, Filter, ChevronRight, Sparkles, Clock, CheckCircle, XCircle, ArrowUpRight, Loader2 } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

// Design tokens
const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  warm: '#f5f3ef',
  muted: '#8a8478',
  border: '#e8e6e1',
  frost: '#fef7f7',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
  green: '#7eb89a',
  red: '#c48c8c',
  amber: '#c4a98c',
};

const EtchedText = ({ children, size = 'md' }) => {
  const sizes = { sm: '14px', md: '18px', lg: '24px', xl: '32px', '2xl': '48px' };
  return (
    <span style={{
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

// Time range options
const timeRanges = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: '30days', label: 'Last 30 Days' },
  { key: '90days', label: 'Last 90 Days' },
  { key: 'all', label: 'All Time' },
];

// View modes
const viewModes = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'students', label: 'By Student', icon: Users },
  { key: 'classes', label: 'By Class', icon: Calendar },
  { key: 'insights', label: 'AI Insights', icon: Sparkles },
];

export default function AttendanceReportModal({ isOpen, onClose }) {
  const [timeRange, setTimeRange] = useState('month');
  const [viewMode, setViewMode] = useState('overview');
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const { data: attendance = [] } = useQuery({
    queryKey: ['allAttendance'],
    queryFn: () => base44.entities.Attendance.list('-date', 5000),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.filter({ status: 'active' }),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.filter({ type: 'class' }),
  });

  // Filter attendance by time range
  const filteredAttendance = useMemo(() => {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case 'week':
        startDate = startOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case '30days':
        startDate = subDays(now, 30);
        break;
      case '90days':
        startDate = subDays(now, 90);
        break;
      default:
        startDate = new Date(0);
    }

    return attendance.filter(a => {
      const date = parseISO(a.date);
      return date >= startDate && date <= now;
    });
  }, [attendance, timeRange]);

  // Calculate overall stats
  const stats = useMemo(() => {
    const total = filteredAttendance.length;
    const present = filteredAttendance.filter(a => a.status === 'present').length;
    const absent = filteredAttendance.filter(a => a.status === 'absent').length;
    const late = filteredAttendance.filter(a => a.status === 'late').length;
    const excused = filteredAttendance.filter(a => a.status === 'excused').length;
    const madeUp = filteredAttendance.filter(a => a.status === 'made_up').length;

    const rate = total > 0 ? ((present + late + madeUp) / total * 100) : 0;

    return { total, present, absent, late, excused, madeUp, rate };
  }, [filteredAttendance]);

  // Student-level analysis
  const studentStats = useMemo(() => {
    const byStudent = {};
    
    filteredAttendance.forEach(a => {
      if (!byStudent[a.student_name]) {
        byStudent[a.student_name] = { name: a.student_name, total: 0, present: 0, absent: 0, late: 0, excused: 0, madeUp: 0 };
      }
      byStudent[a.student_name].total++;
      if (a.status === 'present') byStudent[a.student_name].present++;
      if (a.status === 'absent') byStudent[a.student_name].absent++;
      if (a.status === 'late') byStudent[a.student_name].late++;
      if (a.status === 'excused') byStudent[a.student_name].excused++;
      if (a.status === 'made_up') byStudent[a.student_name].madeUp++;
    });

    return Object.values(byStudent)
      .map(s => ({
        ...s,
        rate: s.total > 0 ? ((s.present + s.late + s.madeUp) / s.total * 100) : 0,
      }))
      .sort((a, b) => a.rate - b.rate);
  }, [filteredAttendance]);

  // Class-level analysis
  const classStats = useMemo(() => {
    const byClass = {};
    
    filteredAttendance.forEach(a => {
      const className = a.class_name || 'Unknown Class';
      if (!byClass[className]) {
        byClass[className] = { name: className, classId: a.class_id, total: 0, present: 0, absent: 0, late: 0 };
      }
      byClass[className].total++;
      if (a.status === 'present') byClass[className].present++;
      if (a.status === 'absent') byClass[className].absent++;
      if (a.status === 'late') byClass[className].late++;
    });

    return Object.values(byClass)
      .map(c => ({
        ...c,
        rate: c.total > 0 ? ((c.present + c.late) / c.total * 100) : 0,
      }))
      .sort((a, b) => a.rate - b.rate);
  }, [filteredAttendance]);

  // At-risk students (below 80% attendance)
  const atRiskStudents = studentStats.filter(s => s.rate < 80 && s.total >= 3);
  
  // Perfect attendance
  const perfectAttendance = studentStats.filter(s => s.rate === 100 && s.total >= 5);

  // Generate AI insights
  const generateInsights = async () => {
    setLoadingInsights(true);
    try {
      const insights = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant for a dance studio analyzing attendance data.

## Attendance Summary (${timeRange})
- Total Records: ${stats.total}
- Overall Rate: ${stats.rate.toFixed(1)}%
- Present: ${stats.present}, Absent: ${stats.absent}, Late: ${stats.late}, Excused: ${stats.excused}

## At-Risk Students (below 80%)
${atRiskStudents.slice(0, 10).map(s => `- ${s.name}: ${s.rate.toFixed(0)}% (${s.absent} absences)`).join('\n') || 'None'}

## Perfect Attendance
${perfectAttendance.slice(0, 5).map(s => `- ${s.name}: ${s.total} classes`).join('\n') || 'None'}

## Classes by Attendance Rate
${classStats.slice(0, 5).map(c => `- ${c.name}: ${c.rate.toFixed(0)}%`).join('\n')}

Provide actionable insights in JSON format:
{
  "headline": "One sentence summary of the attendance health",
  "concerns": ["List 2-3 specific concerns with student names"],
  "celebrations": ["List 1-2 positive highlights"],
  "recommendations": [
    {"action": "Specific action to take", "priority": "high|medium|low", "student": "Name if applicable"}
  ],
  "classPlacementSuggestions": [
    {"student": "Name", "currentClass": "Class", "suggestion": "What to consider", "reason": "Why"}
  ],
  "advancementCandidates": ["Names of students ready to advance based on consistent attendance"],
  "retentionRisks": ["Names of students who might leave based on declining attendance"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            headline: { type: "string" },
            concerns: { type: "array", items: { type: "string" } },
            celebrations: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "object" } },
            classPlacementSuggestions: { type: "array", items: { type: "object" } },
            advancementCandidates: { type: "array", items: { type: "string" } },
            retentionRisks: { type: "array", items: { type: "string" } },
          }
        }
      });
      setAiInsights(insights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    }
    setLoadingInsights(false);
  };

  // Auto-generate insights when switching to that view
  React.useEffect(() => {
    if (viewMode === 'insights' && !aiInsights && !loadingInsights) {
      generateInsights();
    }
  }, [viewMode]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden border-none" style={{ 
        background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.98) 0%, rgba(252, 231, 231, 0.95) 100%)',
        maxHeight: '90vh',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid rgba(200, 180, 170, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <EtchedText size="lg">Attendance Intelligence</EtchedText>
            <p style={{ color: colors.muted, fontSize: '14px', marginTop: '4px' }}>
              {filteredAttendance.length} records • {studentStats.length} students
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
            <X style={{ color: colors.muted }} />
          </button>
        </div>

        {/* Controls */}
        <div style={{
          padding: '16px 32px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(200, 180, 170, 0.1)',
        }}>
          {/* Time Range */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', padding: '4px' }}>
            {timeRanges.map(tr => (
              <button
                key={tr.key}
                onClick={() => setTimeRange(tr.key)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: timeRange === tr.key ? colors.ink : 'transparent',
                  color: timeRange === tr.key ? '#fff' : colors.muted,
                  transition: 'all 0.2s',
                }}
              >
                {tr.label}
              </button>
            ))}
          </div>

          {/* View Mode */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', padding: '4px', marginLeft: 'auto' }}>
            {viewModes.map(vm => {
              const Icon = vm.icon;
              return (
                <button
                  key={vm.key}
                  onClick={() => setViewMode(vm.key)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: viewMode === vm.key ? colors.ink : 'transparent',
                    color: viewMode === vm.key ? '#fff' : colors.muted,
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={14} />
                  {vm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 32px', overflowY: 'auto', maxHeight: 'calc(90vh - 200px)' }}>
          
          {viewMode === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Big Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                <StatCard label="Attendance Rate" value={`${stats.rate.toFixed(0)}%`} icon={CheckCircle} color={stats.rate >= 85 ? colors.green : stats.rate >= 70 ? colors.amber : colors.red} />
                <StatCard label="Total Classes" value={stats.total} icon={Calendar} color={colors.etchDark} />
                <StatCard label="Present" value={stats.present} icon={CheckCircle} color={colors.green} />
                <StatCard label="Absent" value={stats.absent} icon={XCircle} color={colors.red} />
                <StatCard label="Late" value={stats.late} icon={Clock} color={colors.amber} />
                <StatCard label="Made Up" value={stats.madeUp} icon={ArrowUpRight} color={colors.green} />
              </div>

              {/* Quick Lists */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* At Risk */}
                <QuickList 
                  title="At-Risk Students" 
                  icon={AlertTriangle}
                  color={colors.red}
                  items={atRiskStudents.slice(0, 5).map(s => ({
                    name: s.name,
                    value: `${s.rate.toFixed(0)}%`,
                    sub: `${s.absent} absences`,
                  }))}
                  emptyText="No at-risk students"
                />

                {/* Perfect Attendance */}
                <QuickList 
                  title="Perfect Attendance" 
                  icon={Star}
                  color={colors.green}
                  items={perfectAttendance.slice(0, 5).map(s => ({
                    name: s.name,
                    value: '100%',
                    sub: `${s.total} classes`,
                  }))}
                  emptyText="No perfect attendance yet"
                />
              </div>

              {/* Classes Overview */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: colors.etchDark, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Classes by Attendance
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {classStats.slice(0, 6).map(c => (
                    <ClassRow key={c.name} classData={c} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'students' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {studentStats.map(s => (
                <StudentRow key={s.name} student={s} />
              ))}
            </div>
          )}

          {viewMode === 'classes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {classStats.map(c => (
                <ClassDetailCard key={c.name} classData={c} attendance={filteredAttendance.filter(a => a.class_name === c.name)} />
              ))}
            </div>
          )}

          {viewMode === 'insights' && (
            <div>
              {loadingInsights ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <Loader2 size={32} style={{ color: colors.etchLight, animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: colors.muted, marginTop: '12px' }}>Analyzing attendance patterns...</p>
                </div>
              ) : aiInsights ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Headline */}
                  <div style={{
                    padding: '20px 24px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,252,250,0.7) 100%)',
                    border: '1px solid rgba(200, 180, 170, 0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <Sparkles size={20} style={{ color: colors.etchDark }} />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: colors.etchDark, textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Summary</span>
                    </div>
                    <p style={{ fontSize: '18px', fontWeight: '500', color: colors.ink, lineHeight: '1.5' }}>
                      {aiInsights.headline}
                    </p>
                  </div>

                  {/* Concerns & Celebrations */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    <InsightSection title="Concerns" items={aiInsights.concerns} color={colors.red} icon={AlertTriangle} />
                    <InsightSection title="Celebrations" items={aiInsights.celebrations} color={colors.green} icon={Star} />
                  </div>

                  {/* Recommendations */}
                  {aiInsights.recommendations?.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', color: colors.etchDark, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                        Recommended Actions
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {aiInsights.recommendations.map((rec, i) => (
                          <RecommendationCard key={i} recommendation={rec} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Class Placement Suggestions */}
                  {aiInsights.classPlacementSuggestions?.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '700', color: colors.etchDark, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                        Class Placement Considerations
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {aiInsights.classPlacementSuggestions.map((sug, i) => (
                          <PlacementCard key={i} suggestion={sug} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advancement & Retention */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {aiInsights.advancementCandidates?.length > 0 && (
                      <InsightList title="Advancement Candidates" items={aiInsights.advancementCandidates} color={colors.green} icon={TrendingUp} />
                    )}
                    {aiInsights.retentionRisks?.length > 0 && (
                      <InsightList title="Retention Risks" items={aiInsights.retentionRisks} color={colors.red} icon={TrendingDown} />
                    )}
                  </div>

                  {/* Regenerate Button */}
                  <button
                    onClick={generateInsights}
                    style={{
                      alignSelf: 'center',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      border: '1px solid rgba(200, 180, 170, 0.3)',
                      background: 'rgba(255,255,255,0.6)',
                      color: colors.muted,
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Sparkles size={16} />
                    Regenerate Insights
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <p style={{ color: colors.muted }}>No insights generated yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Sub-components
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div style={{
      padding: '16px 20px',
      borderRadius: '16px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
      boxShadow: '0 4px 16px -4px rgba(180,150,140,0.15)',
      border: '1px solid rgba(255, 200, 200, 0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: '11px', fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <EtchedText size="lg">{value}</EtchedText>
    </div>
  );
}

function QuickList({ title, icon: Icon, color, items, emptyText }) {
  return (
    <div style={{
      padding: '20px',
      borderRadius: '16px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
      border: '1px solid rgba(255, 200, 200, 0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: '12px', fontWeight: '700', color: colors.etchDark, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
      </div>
      {items.length === 0 ? (
        <p style={{ color: colors.muted, fontSize: '14px' }}>{emptyText}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: colors.ink }}>{item.name}</div>
                <div style={{ fontSize: '12px', color: colors.muted }}>{item.sub}</div>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600', color }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassRow({ classData }) {
  const barWidth = `${classData.rate}%`;
  const barColor = classData.rate >= 85 ? colors.green : classData.rate >= 70 ? colors.amber : colors.red;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 16px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.5)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: '500', color: colors.ink }}>{classData.name}</div>
        <div style={{ height: '4px', background: 'rgba(200,180,170,0.15)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: barWidth, background: barColor, borderRadius: '2px', transition: 'width 0.3s' }} />
        </div>
      </div>
      <span style={{ fontSize: '14px', fontWeight: '600', color: barColor }}>{classData.rate.toFixed(0)}%</span>
    </div>
  );
}

function StudentRow({ student }) {
  const barColor = student.rate >= 85 ? colors.green : student.rate >= 70 ? colors.amber : colors.red;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 16px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.5)',
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: `linear-gradient(145deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: '600',
        fontSize: '14px',
      }}>
        {student.name.charAt(0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: '500', color: colors.ink }}>{student.name}</div>
        <div style={{ fontSize: '12px', color: colors.muted }}>
          {student.total} classes • {student.absent} absences • {student.late} late
        </div>
      </div>
      <span style={{ fontSize: '16px', fontWeight: '700', color: barColor }}>{student.rate.toFixed(0)}%</span>
    </div>
  );
}

function ClassDetailCard({ classData, attendance }) {
  const barColor = classData.rate >= 85 ? colors.green : classData.rate >= 70 ? colors.amber : colors.red;
  
  // Get unique students in this class
  const studentNames = [...new Set(attendance.map(a => a.student_name))];
  
  return (
    <div style={{
      padding: '20px',
      borderRadius: '16px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
      border: '1px solid rgba(255, 200, 200, 0.2)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: colors.ink }}>{classData.name}</div>
          <div style={{ fontSize: '12px', color: colors.muted }}>{studentNames.length} students • {classData.total} records</div>
        </div>
        <span style={{ fontSize: '24px', fontWeight: '700', color: barColor }}>{classData.rate.toFixed(0)}%</span>
      </div>
      
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
        <div style={{ fontSize: '12px' }}>
          <span style={{ color: colors.green }}>●</span> Present: {classData.present}
        </div>
        <div style={{ fontSize: '12px' }}>
          <span style={{ color: colors.red }}>●</span> Absent: {classData.absent}
        </div>
        <div style={{ fontSize: '12px' }}>
          <span style={{ color: colors.amber }}>●</span> Late: {classData.late}
        </div>
      </div>
    </div>
  );
}

function InsightSection({ title, items, color, icon: Icon }) {
  return (
    <div style={{
      padding: '20px',
      borderRadius: '16px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
      border: '1px solid rgba(255, 200, 200, 0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: '12px', fontWeight: '700', color: colors.etchDark, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
      </div>
      {items?.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: '14px', color: colors.ink, lineHeight: '1.5' }}>• {item}</li>
          ))}
        </ul>
      ) : (
        <p style={{ color: colors.muted, fontSize: '14px' }}>None identified</p>
      )}
    </div>
  );
}

function InsightList({ title, items, color, icon: Icon }) {
  return (
    <div style={{
      padding: '20px',
      borderRadius: '16px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
      border: '1px solid rgba(255, 200, 200, 0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: '12px', fontWeight: '700', color: colors.etchDark, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {items.map((name, i) => (
          <span key={i} style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            background: `${color}20`,
            color,
          }}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation }) {
  const priorityColors = { high: colors.red, medium: colors.amber, low: colors.muted };
  const color = priorityColors[recommendation.priority] || colors.muted;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '14px 16px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.6)',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '500', color: colors.ink }}>{recommendation.action}</div>
        {recommendation.student && (
          <div style={{ fontSize: '12px', color: colors.muted, marginTop: '4px' }}>Student: {recommendation.student}</div>
        )}
      </div>
      <span style={{
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: '700',
        textTransform: 'uppercase',
        background: `${color}20`,
        color,
      }}>
        {recommendation.priority}
      </span>
    </div>
  );
}

function PlacementCard({ suggestion }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: colors.ink }}>{suggestion.student}</span>
        <ChevronRight size={14} style={{ color: colors.muted }} />
        <span style={{ fontSize: '13px', color: colors.muted }}>{suggestion.currentClass}</span>
      </div>
      <div style={{ fontSize: '14px', color: colors.ink, marginBottom: '4px' }}>{suggestion.suggestion}</div>
      <div style={{ fontSize: '12px', color: colors.muted }}>{suggestion.reason}</div>
    </div>
  );
}