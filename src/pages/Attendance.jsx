import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { TrendingUp, TrendingDown, AlertTriangle, Star, Calendar, Users, BarChart3, Sparkles, Clock, CheckCircle, XCircle, ArrowUpRight, Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth, parseISO } from 'date-fns';

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

const EtchedText = ({ children, size = 'md', className = '' }) => {
  const sizes = { sm: '14px', md: '18px', lg: '24px', xl: '32px', '2xl': '48px', '3xl': '64px' };
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

const timeRanges = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: '30days', label: 'Last 30 Days' },
  { key: '90days', label: 'Last 90 Days' },
  { key: 'all', label: 'All Time' },
];

const viewModes = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'students', label: 'By Student', icon: Users },
  { key: 'classes', label: 'By Class', icon: Calendar },
  { key: 'insights', label: 'AI Insights', icon: Sparkles },
];

export default function Attendance() {
  const [timeRange, setTimeRange] = useState('month');
  const [viewMode, setViewMode] = useState('overview');
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
      case 'week': startDate = startOfWeek(now); break;
      case 'month': startDate = startOfMonth(now); break;
      case '30days': startDate = subDays(now, 30); break;
      case '90days': startDate = subDays(now, 90); break;
      default: startDate = new Date(0);
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
      .map(s => ({ ...s, rate: s.total > 0 ? ((s.present + s.late + s.madeUp) / s.total * 100) : 0 }))
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
      .map(c => ({ ...c, rate: c.total > 0 ? ((c.present + c.late) / c.total * 100) : 0 }))
      .sort((a, b) => a.rate - b.rate);
  }, [filteredAttendance]);

  const atRiskStudents = studentStats.filter(s => s.rate < 80 && s.total >= 3);
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

  React.useEffect(() => {
    if (viewMode === 'insights' && !aiInsights && !loadingInsights) {
      generateInsights();
    }
  }, [viewMode]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.paper }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.98) 0%, rgba(252, 231, 231, 0.95) 100%)',
        borderBottom: '1px solid rgba(200, 180, 170, 0.15)',
        padding: '32px 0 40px',
      }}>
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: colors.muted }}>
            <Link to={createPageUrl('Home')} className="hover:opacity-70 transition-opacity">Dashboard</Link>
            <span>/</span>
            <Link to={createPageUrl('Students')} className="hover:opacity-70 transition-opacity">CRM</Link>
            <span>/</span>
            <span style={{ color: colors.etchDark }}>Attendance</span>
          </div>

          {/* Main Header Content */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <EtchedText size="2xl">Attendance Intelligence</EtchedText>
              <p style={{ color: colors.muted, fontSize: '16px', marginTop: '8px' }}>
                {filteredAttendance.length} records across {studentStats.length} students
              </p>
            </div>

            {/* Big Rate Display */}
            <div className="flex items-end gap-6">
              <div className="text-right">
                <div style={{ fontSize: '12px', fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Overall Rate
                </div>
                <EtchedText size="3xl">{stats.rate.toFixed(0)}%</EtchedText>
              </div>
              <div style={{
                width: '120px',
                height: '8px',
                borderRadius: '4px',
                background: 'rgba(200, 180, 170, 0.2)',
                overflow: 'hidden',
                marginBottom: '16px',
              }}>
                <div style={{
                  width: `${stats.rate}%`,
                  height: '100%',
                  background: stats.rate >= 85 ? colors.green : stats.rate >= 70 ? colors.amber : colors.red,
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex flex-wrap items-center gap-4 mt-8">
            {/* Time Range Pills */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.6)', borderRadius: '16px', padding: '6px' }}>
              {timeRanges.map(tr => (
                <button
                  key={tr.key}
                  onClick={() => setTimeRange(tr.key)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '13px',
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

            <div className="flex-1" />

            {/* View Mode Pills */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.6)', borderRadius: '16px', padding: '6px' }}>
              {viewModes.map(vm => {
                const Icon = vm.icon;
                return (
                  <button
                    key={vm.key}
                    onClick={() => setViewMode(vm.key)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: viewMode === vm.key ? colors.ink : 'transparent',
                      color: viewMode === vm.key ? '#fff' : colors.muted,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{vm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {viewMode === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="Attendance Rate" value={`${stats.rate.toFixed(0)}%`} icon={CheckCircle} color={stats.rate >= 85 ? colors.green : stats.rate >= 70 ? colors.amber : colors.red} />
              <StatCard label="Total Classes" value={stats.total} icon={Calendar} color={colors.etchDark} />
              <StatCard label="Present" value={stats.present} icon={CheckCircle} color={colors.green} />
              <StatCard label="Absent" value={stats.absent} icon={XCircle} color={colors.red} />
              <StatCard label="Late" value={stats.late} icon={Clock} color={colors.amber} />
              <StatCard label="Made Up" value={stats.madeUp} icon={ArrowUpRight} color={colors.green} />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuickList 
                title="At-Risk Students" 
                subtitle="Below 80% attendance"
                icon={AlertTriangle}
                color={colors.red}
                items={atRiskStudents.slice(0, 8).map(s => ({
                  name: s.name,
                  value: `${s.rate.toFixed(0)}%`,
                  sub: `${s.absent} absences`,
                }))}
                emptyText="No at-risk students — great job!"
              />
              <QuickList 
                title="Perfect Attendance" 
                subtitle="100% with 5+ classes"
                icon={Star}
                color={colors.green}
                items={perfectAttendance.slice(0, 8).map(s => ({
                  name: s.name,
                  value: '100%',
                  sub: `${s.total} classes`,
                }))}
                emptyText="No perfect attendance yet this period"
              />
            </div>

            {/* Classes Overview */}
            <div style={{
              padding: '28px',
              borderRadius: '24px',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
              border: '1px solid rgba(255, 200, 200, 0.2)',
              boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.etchDark, marginBottom: '20px' }}>
                Classes by Attendance Rate
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classStats.map(c => (
                  <ClassRow key={c.name} classData={c} />
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'students' && (
          <div style={{
            padding: '28px',
            borderRadius: '24px',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
            border: '1px solid rgba(255, 200, 200, 0.2)',
            boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentStats.map(s => (
                <StudentCard key={s.name} student={s} />
              ))}
            </div>
          </div>
        )}

        {viewMode === 'classes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {classStats.map(c => (
              <ClassDetailCard key={c.name} classData={c} attendance={filteredAttendance.filter(a => a.class_name === c.name)} />
            ))}
          </div>
        )}

        {viewMode === 'insights' && (
          <div>
            {loadingInsights ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <Loader2 size={40} style={{ color: colors.etchLight, animation: 'spin 1s linear infinite' }} />
                <p style={{ color: colors.muted, marginTop: '16px', fontSize: '16px' }}>Analyzing attendance patterns...</p>
              </div>
            ) : aiInsights ? (
              <div className="space-y-8">
                {/* Headline */}
                <div style={{
                  padding: '32px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
                  border: '1px solid rgba(200, 180, 170, 0.2)',
                  boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <Sparkles size={24} style={{ color: colors.etchDark }} />
                    <span style={{ fontSize: '14px', fontWeight: '700', color: colors.etchDark, textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Summary</span>
                  </div>
                  <p style={{ fontSize: '24px', fontWeight: '500', color: colors.ink, lineHeight: '1.4' }}>
                    {aiInsights.headline}
                  </p>
                </div>

                {/* Concerns & Celebrations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <InsightSection title="Concerns" items={aiInsights.concerns} color={colors.red} icon={AlertTriangle} />
                  <InsightSection title="Celebrations" items={aiInsights.celebrations} color={colors.green} icon={Star} />
                </div>

                {/* Recommendations */}
                {aiInsights.recommendations?.length > 0 && (
                  <div style={{
                    padding: '28px',
                    borderRadius: '24px',
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                    border: '1px solid rgba(255, 200, 200, 0.2)',
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.etchDark, marginBottom: '20px' }}>
                      Recommended Actions
                    </h3>
                    <div className="space-y-3">
                      {aiInsights.recommendations.map((rec, i) => (
                        <RecommendationCard key={i} recommendation={rec} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Class Placement */}
                {aiInsights.classPlacementSuggestions?.length > 0 && (
                  <div style={{
                    padding: '28px',
                    borderRadius: '24px',
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                    border: '1px solid rgba(255, 200, 200, 0.2)',
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.etchDark, marginBottom: '20px' }}>
                      Class Placement Considerations
                    </h3>
                    <div className="space-y-3">
                      {aiInsights.classPlacementSuggestions.map((sug, i) => (
                        <PlacementCard key={i} suggestion={sug} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Advancement & Retention */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {aiInsights.advancementCandidates?.length > 0 && (
                    <InsightList title="Advancement Candidates" items={aiInsights.advancementCandidates} color={colors.green} icon={TrendingUp} />
                  )}
                  {aiInsights.retentionRisks?.length > 0 && (
                    <InsightList title="Retention Risks" items={aiInsights.retentionRisks} color={colors.red} icon={TrendingDown} />
                  )}
                </div>

                {/* Regenerate */}
                <div className="text-center">
                  <button
                    onClick={generateInsights}
                    style={{
                      padding: '14px 28px',
                      borderRadius: '16px',
                      border: '1px solid rgba(200, 180, 170, 0.3)',
                      background: 'rgba(255,255,255,0.8)',
                      color: colors.muted,
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <Sparkles size={18} />
                    Regenerate Insights
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-components
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div style={{
      padding: '20px',
      borderRadius: '20px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
      boxShadow: '0 4px 16px -4px rgba(180,150,140,0.15)',
      border: '1px solid rgba(255, 200, 200, 0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Icon size={18} style={{ color }} />
        <span style={{ fontSize: '11px', fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <EtchedText size="lg">{value}</EtchedText>
    </div>
  );
}

function QuickList({ title, subtitle, icon: Icon, color, items, emptyText }) {
  return (
    <div style={{
      padding: '28px',
      borderRadius: '24px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
      border: '1px solid rgba(255, 200, 200, 0.2)',
      boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <Icon size={20} style={{ color }} />
        <span style={{ fontSize: '16px', fontWeight: '700', color: colors.etchDark }}>{title}</span>
      </div>
      {subtitle && <p style={{ fontSize: '13px', color: colors.muted, marginBottom: '20px' }}>{subtitle}</p>}
      
      {items.length === 0 ? (
        <p style={{ color: colors.muted, fontSize: '14px', padding: '20px 0' }}>{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.6)' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '500', color: colors.ink }}>{item.name}</div>
                <div style={{ fontSize: '13px', color: colors.muted }}>{item.sub}</div>
              </div>
              <span style={{ fontSize: '16px', fontWeight: '700', color }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassRow({ classData }) {
  const barColor = classData.rate >= 85 ? colors.green : classData.rate >= 70 ? colors.amber : colors.red;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '14px 18px',
      borderRadius: '14px',
      background: 'rgba(255,255,255,0.6)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: '500', color: colors.ink }}>{classData.name}</div>
        <div style={{ height: '5px', background: 'rgba(200,180,170,0.15)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${classData.rate}%`, background: barColor, borderRadius: '3px' }} />
        </div>
      </div>
      <span style={{ fontSize: '16px', fontWeight: '700', color: barColor }}>{classData.rate.toFixed(0)}%</span>
    </div>
  );
}

function StudentCard({ student }) {
  const barColor = student.rate >= 85 ? colors.green : student.rate >= 70 ? colors.amber : colors.red;
  return (
    <div style={{
      padding: '18px',
      borderRadius: '16px',
      background: 'rgba(255,255,255,0.6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: `linear-gradient(145deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: '600', fontSize: '16px',
        }}>
          {student.name.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: colors.ink }}>{student.name}</div>
          <div style={{ fontSize: '12px', color: colors.muted }}>{student.total} classes</div>
        </div>
        <span style={{ fontSize: '20px', fontWeight: '700', color: barColor }}>{student.rate.toFixed(0)}%</span>
      </div>
      <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
        <span><span style={{ color: colors.green }}>●</span> {student.present} present</span>
        <span><span style={{ color: colors.red }}>●</span> {student.absent} absent</span>
        <span><span style={{ color: colors.amber }}>●</span> {student.late} late</span>
      </div>
    </div>
  );
}

function ClassDetailCard({ classData, attendance }) {
  const barColor = classData.rate >= 85 ? colors.green : classData.rate >= 70 ? colors.amber : colors.red;
  const studentNames = [...new Set(attendance.map(a => a.student_name))];
  
  return (
    <div style={{
      padding: '24px',
      borderRadius: '20px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
      border: '1px solid rgba(255, 200, 200, 0.2)',
      boxShadow: '0 4px 16px rgba(180, 120, 120, 0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: colors.ink }}>{classData.name}</div>
          <div style={{ fontSize: '13px', color: colors.muted }}>{studentNames.length} students • {classData.total} records</div>
        </div>
        <EtchedText size="xl">{classData.rate.toFixed(0)}%</EtchedText>
      </div>
      <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
        <div><span style={{ color: colors.green }}>●</span> Present: {classData.present}</div>
        <div><span style={{ color: colors.red }}>●</span> Absent: {classData.absent}</div>
        <div><span style={{ color: colors.amber }}>●</span> Late: {classData.late}</div>
      </div>
    </div>
  );
}

function InsightSection({ title, items, color, icon: Icon }) {
  return (
    <div style={{
      padding: '28px',
      borderRadius: '24px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
      border: '1px solid rgba(255, 200, 200, 0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Icon size={20} style={{ color }} />
        <span style={{ fontSize: '16px', fontWeight: '700', color: colors.etchDark }}>{title}</span>
      </div>
      {items?.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-3">
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: '15px', color: colors.ink, lineHeight: '1.6' }}>• {item}</li>
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
      padding: '28px',
      borderRadius: '24px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
      border: '1px solid rgba(255, 200, 200, 0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Icon size={20} style={{ color }} />
        <span style={{ fontSize: '16px', fontWeight: '700', color: colors.etchDark }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {items.map((name, i) => (
          <span key={i} style={{
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '14px',
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
      gap: '14px',
      padding: '16px 18px',
      borderRadius: '14px',
      background: 'rgba(255,255,255,0.6)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '15px', fontWeight: '500', color: colors.ink }}>{recommendation.action}</div>
        {recommendation.student && (
          <div style={{ fontSize: '13px', color: colors.muted, marginTop: '4px' }}>Student: {recommendation.student}</div>
        )}
      </div>
      <span style={{
        padding: '5px 10px',
        borderRadius: '8px',
        fontSize: '11px',
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
      padding: '16px 18px',
      borderRadius: '14px',
      background: 'rgba(255,255,255,0.6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '15px', fontWeight: '600', color: colors.ink }}>{suggestion.student}</span>
        <ChevronRight size={16} style={{ color: colors.muted }} />
        <span style={{ fontSize: '14px', color: colors.muted }}>{suggestion.currentClass}</span>
      </div>
      <div style={{ fontSize: '15px', color: colors.ink, marginBottom: '4px' }}>{suggestion.suggestion}</div>
      <div style={{ fontSize: '13px', color: colors.muted }}>{suggestion.reason}</div>
    </div>
  );
}