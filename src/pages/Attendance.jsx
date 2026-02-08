import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { TrendingUp, TrendingDown, AlertTriangle, Star, Calendar, Users, BarChart3, Sparkles, Clock, CheckCircle, XCircle, ArrowUpRight, Loader2, ChevronRight, ArrowLeft, Search, X, Mail, MessageSquare, Filter, SlidersHorizontal } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth, parseISO, differenceInDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

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
  { key: 'insights', label: 'Insights', icon: TrendingUp },
];

export default function Attendance() {
  const [timeRange, setTimeRange] = useState('month');
  const [viewMode, setViewMode] = useState('overview');
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [rateFilter, setRateFilter] = useState('all'); // all, at-risk, perfect, good

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

  // Search and filter students
  const filteredStudentStats = useMemo(() => {
    let result = studentStats;
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q));
    }
    
    // Rate filter
    if (rateFilter === 'at-risk') {
      result = result.filter(s => s.rate < 80 && s.total >= 3);
    } else if (rateFilter === 'perfect') {
      result = result.filter(s => s.rate === 100 && s.total >= 5);
    } else if (rateFilter === 'good') {
      result = result.filter(s => s.rate >= 80 && s.rate < 100);
    }
    
    return result;
  }, [studentStats, searchQuery, rateFilter]);

  // Search and filter classes
  const filteredClassStats = useMemo(() => {
    let result = classStats;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }
    return result;
  }, [classStats, searchQuery]);

  // Get detailed student attendance data
  const getStudentDetail = (studentName) => {
    const records = filteredAttendance.filter(a => a.student_name === studentName);
    const byClass = {};
    const byDate = {};
    
    records.forEach(r => {
      // Group by class
      const className = r.class_name || 'Unknown';
      if (!byClass[className]) {
        byClass[className] = { name: className, total: 0, present: 0, absent: 0, late: 0, records: [] };
      }
      byClass[className].total++;
      byClass[className].records.push(r);
      if (r.status === 'present' || r.status === 'made_up') byClass[className].present++;
      if (r.status === 'absent') byClass[className].absent++;
      if (r.status === 'late') byClass[className].late++;
      
      // Group by date for timeline
      byDate[r.date] = r;
    });
    
    // Calculate trends (compare last 30 days to previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);
    
    const recentRecords = records.filter(r => parseISO(r.date) >= thirtyDaysAgo);
    const olderRecords = records.filter(r => {
      const d = parseISO(r.date);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    });
    
    const recentRate = recentRecords.length > 0 
      ? (recentRecords.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'made_up').length / recentRecords.length * 100)
      : null;
    const olderRate = olderRecords.length > 0
      ? (olderRecords.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'made_up').length / olderRecords.length * 100)
      : null;
    
    const trend = (recentRate !== null && olderRate !== null) ? recentRate - olderRate : null;
    
    // Calculate streak
    const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    let currentStreak = 0;
    for (const r of sortedRecords) {
      if (r.status === 'present' || r.status === 'late' || r.status === 'made_up') {
        currentStreak++;
      } else {
        break;
      }
    }
    
    return {
      byClass: Object.values(byClass).map(c => ({ ...c, rate: c.total > 0 ? (c.present / c.total * 100) : 0 })),
      timeline: records.sort((a, b) => new Date(b.date) - new Date(a.date)),
      trend,
      recentRate,
      currentStreak,
      totalRecords: records.length,
    };
  };

  // Get detailed class attendance data
  const getClassDetail = (className) => {
    const records = filteredAttendance.filter(a => a.class_name === className);
    const byStudent = {};
    
    records.forEach(r => {
      if (!byStudent[r.student_name]) {
        byStudent[r.student_name] = { name: r.student_name, total: 0, present: 0, absent: 0, late: 0 };
      }
      byStudent[r.student_name].total++;
      if (r.status === 'present' || r.status === 'made_up') byStudent[r.student_name].present++;
      if (r.status === 'absent') byStudent[r.student_name].absent++;
      if (r.status === 'late') byStudent[r.student_name].late++;
    });
    
    return {
      byStudent: Object.values(byStudent).map(s => ({ ...s, rate: s.total > 0 ? (s.present / s.total * 100) : 0 })).sort((a, b) => a.rate - b.rate),
      timeline: records.sort((a, b) => new Date(b.date) - new Date(a.date)),
    };
  };

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
                    onClick={() => { setViewMode(vm.key); setSelectedStudent(null); setSelectedClass(null); }}
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

          {/* Search & Filters - show on students/classes views */}
          {(viewMode === 'students' || viewMode === 'classes') && (
            <div className="flex flex-wrap items-center gap-4 mt-6">
              {/* Search */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,255,255,0.8)',
                borderRadius: '14px',
                padding: '10px 16px',
                flex: '1',
                maxWidth: '400px',
              }}>
                <Search size={18} style={{ color: colors.muted }} />
                <input
                  type="text"
                  placeholder={viewMode === 'students' ? 'Search students...' : 'Search classes...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '14px',
                    color: colors.ink,
                    width: '100%',
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                    <X size={16} style={{ color: colors.muted }} />
                  </button>
                )}
              </div>

              {/* Rate Filters - only for students view */}
              {viewMode === 'students' && (
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', padding: '4px' }}>
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'at-risk', label: 'At Risk', color: colors.red },
                    { key: 'good', label: 'Good', color: colors.amber },
                    { key: 'perfect', label: 'Perfect', color: colors.green },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setRateFilter(f.key)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        background: rateFilter === f.key ? (f.color || colors.ink) : 'transparent',
                        color: rateFilter === f.key ? '#fff' : colors.muted,
                        transition: 'all 0.2s',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
          <AnimatePresence mode="wait">
            {selectedStudent ? (
              <StudentDetailView 
                key="detail"
                studentName={selectedStudent}
                stats={studentStats.find(s => s.name === selectedStudent)}
                detail={getStudentDetail(selectedStudent)}
                onBack={() => setSelectedStudent(null)}
                students={students}
              />
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: '28px',
                  borderRadius: '24px',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                  border: '1px solid rgba(255, 200, 200, 0.2)',
                  boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
                }}
              >
                {filteredStudentStats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: colors.muted }}>
                    No students match your search or filter criteria.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStudentStats.map(s => (
                      <StudentCard key={s.name} student={s} onClick={() => setSelectedStudent(s.name)} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {viewMode === 'classes' && (
          <AnimatePresence mode="wait">
            {selectedClass ? (
              <ClassDetailView
                key="detail"
                className={selectedClass}
                stats={classStats.find(c => c.name === selectedClass)}
                detail={getClassDetail(selectedClass)}
                onBack={() => setSelectedClass(null)}
                onSelectStudent={(name) => { setViewMode('students'); setSelectedStudent(name); }}
              />
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {filteredClassStats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: colors.muted, gridColumn: '1 / -1' }}>
                    No classes match your search.
                  </div>
                ) : (
                  filteredClassStats.map(c => (
                    <ClassDetailCard key={c.name} classData={c} attendance={filteredAttendance.filter(a => a.class_name === c.name)} onClick={() => setSelectedClass(c.name)} />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {viewMode === 'insights' && (
          <div>
            {loadingInsights ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <Loader2 size={40} style={{ color: colors.etchLight, animation: 'spin 1s linear infinite' }} />
                <p style={{ color: colors.muted, marginTop: '16px', fontSize: '16px' }}>Looking at the numbers...</p>
              </div>
            ) : aiInsights ? (
              <div className="space-y-6">
                {/* Main Narrative */}
                <div style={{
                  padding: '32px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                  border: '1px solid rgba(200, 180, 170, 0.15)',
                  boxShadow: '0 4px 24px rgba(180, 120, 120, 0.06)',
                }}>
                  <p style={{ fontSize: '20px', fontWeight: '500', color: colors.ink, lineHeight: '1.5' }}>
                    {aiInsights.headline}
                  </p>
                </div>
                
                {/* Concerns and Wins as separate small cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiInsights.concerns?.length > 0 && (
                    <div style={{
                      padding: '20px',
                      borderRadius: '16px',
                      background: `${colors.red}08`,
                      border: `1px solid ${colors.red}20`,
                    }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: colors.red, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Heads up</p>
                      <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {aiInsights.concerns.map((c, i) => (
                          <li key={i} style={{ fontSize: '14px', color: colors.ink, marginBottom: '6px' }}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiInsights.celebrations?.length > 0 && (
                    <div style={{
                      padding: '20px',
                      borderRadius: '16px',
                      background: `${colors.green}08`,
                      border: `1px solid ${colors.green}20`,
                    }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: colors.green, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Wins</p>
                      <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {aiInsights.celebrations.map((c, i) => (
                          <li key={i} style={{ fontSize: '14px', color: colors.ink, marginBottom: '6px' }}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Action Cards - Visual, not list-like */}
                {aiInsights.recommendations?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aiInsights.recommendations.map((rec, i) => (
                      <ActionCard key={i} recommendation={rec} index={i} />
                    ))}
                  </div>
                )}

                {/* Students at risk */}
                {aiInsights.retentionRisks?.length > 0 && (
                  <StudentChipSection 
                    title="Low attendance — might be disengaging" 
                    students={aiInsights.retentionRisks} 
                    color={colors.red}
                  />
                )}

                {/* Class placement as conversation */}
                {aiInsights.classPlacementSuggestions?.length > 0 && (
                  <div style={{
                    padding: '32px',
                    borderRadius: '24px',
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(200, 180, 170, 0.1)',
                  }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: colors.muted, marginBottom: '20px' }}>
                      Placement thoughts
                    </p>
                    <div className="space-y-4">
                      {aiInsights.classPlacementSuggestions.map((sug, i) => (
                        <div key={i} style={{ fontSize: '15px', color: colors.ink, lineHeight: '1.6' }}>
                          <span style={{ fontWeight: '600' }}>{sug.student}</span> in {sug.currentClass} — {sug.suggestion.toLowerCase()} {sug.reason && <span style={{ color: colors.muted }}>({sug.reason})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subtle refresh */}
                <div className="text-center pt-4">
                  <button
                    onClick={generateInsights}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '20px',
                      border: 'none',
                      background: 'transparent',
                      color: colors.muted,
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    ↻ Refresh
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

function StudentCard({ student, onClick }) {
  const rateColor = student.rate >= 85 ? colors.green : student.rate >= 70 ? colors.amber : colors.red;
  return (
    <motion.div 
      whileHover={{ scale: 1.01, y: -1 }}
      onClick={onClick}
      style={{
        padding: '20px',
        borderRadius: '20px',
        background: 'linear-gradient(145deg, #fef7f7 0%, #fce8e8 100%)',
        boxShadow: '6px 6px 12px rgba(200, 170, 170, 0.15), -4px -4px 10px rgba(255, 255, 255, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        {/* Light Pink Frosted Avatar - Neumorphic */}
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: '#f5e8e8',
          boxShadow: 'inset 2px 2px 4px rgba(180, 160, 160, 0.25), inset -2px -2px 4px rgba(255, 255, 255, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#9a8888',
          fontWeight: '400', fontSize: '17px',
        }}>
          {student.name.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: colors.ink }}>{student.name}</div>
          <div style={{ fontSize: '12px', color: colors.muted }}>{student.total} classes</div>
        </div>
        {/* Etched Percentage */}
        <span style={{ 
          fontSize: '22px', 
          fontWeight: '700', 
          color: 'transparent',
          backgroundImage: `linear-gradient(180deg, ${rateColor}cc 0%, ${rateColor} 100%)`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          textShadow: '1px 1px 2px rgba(255,255,255,0.7), -1px -1px 1px rgba(150,100,100,0.1)',
          filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
        }}>
          {student.rate.toFixed(0)}%
        </span>
      </div>
      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: colors.muted }}>
        <span><span style={{ color: colors.green }}>●</span> {student.present} present</span>
        <span><span style={{ color: colors.red }}>●</span> {student.absent} absent</span>
        <span><span style={{ color: colors.amber }}>●</span> {student.late} late</span>
      </div>
      <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
        <ChevronRight size={18} style={{ color: colors.etchLight }} />
      </div>
    </motion.div>
  );
}

function ClassDetailCard({ classData, attendance, onClick }) {
  const barColor = classData.rate >= 85 ? colors.green : classData.rate >= 70 ? colors.amber : colors.red;
  const studentNames = [...new Set(attendance.map(a => a.student_name))];
  
  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      style={{
        padding: '24px',
        borderRadius: '20px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
        border: '1px solid rgba(255, 200, 200, 0.2)',
        boxShadow: '0 4px 16px rgba(180, 120, 120, 0.08)',
        cursor: 'pointer',
      }}
    >
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
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
        <ChevronRight size={18} style={{ color: colors.muted }} />
      </div>
    </motion.div>
  );
}

function InsightSection({ title, items, color, icon: Icon }) {
  // Map generic titles to natural language
  const titleMap = {
    'Concerns': 'Needs Attention',
    'Celebrations': 'Wins This Period',
  };
  const displayTitle = titleMap[title] || title;
  
  return (
    <div style={{
      padding: '28px',
      borderRadius: '24px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
      border: '1px solid rgba(255, 200, 200, 0.2)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{displayTitle}</span>
      </div>
      {items?.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-3">
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: '15px', color: colors.ink, lineHeight: '1.6' }}>{item}</li>
          ))}
        </ul>
      ) : (
        <p style={{ color: colors.muted, fontSize: '14px' }}>Nothing to report</p>
      )}
    </div>
  );
}

function InsightList({ title, items, color, icon: Icon }) {
  // Map generic titles to natural language
  const titleMap = {
    'Advancement Candidates': 'Ready to Level Up',
    'Retention Risks': 'At Risk of Leaving',
  };
  const displayTitle = titleMap[title] || title;
  
  return (
    <div style={{
      padding: '28px',
      borderRadius: '24px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
      border: '1px solid rgba(255, 200, 200, 0.2)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{displayTitle}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {items.map((name, i) => (
          <span key={i} style={{
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '500',
            background: `${color}15`,
            color,
          }}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function ActionCard({ recommendation, index }) {
  const priorityColors = { high: colors.red, medium: colors.amber, low: colors.muted };
  const color = priorityColors[recommendation.priority] || colors.etchDark;
  const priorityLabels = { high: 'Do first', medium: 'This week', low: 'When you can' };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      style={{
        padding: '24px',
        borderRadius: '20px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
        border: '1px solid rgba(200, 180, 170, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ 
        fontSize: '11px', 
        fontWeight: '700', 
        color, 
        textTransform: 'uppercase', 
        letterSpacing: '0.5px' 
      }}>
        {priorityLabels[recommendation.priority] || 'To do'}
      </div>
      <div style={{ fontSize: '16px', fontWeight: '500', color: colors.ink, lineHeight: '1.5' }}>
        {recommendation.action}
      </div>
      {recommendation.student && (
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '10px',
          background: 'rgba(200, 180, 170, 0.1)',
          alignSelf: 'flex-start',
        }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%',
            background: `linear-gradient(145deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: '600', fontSize: '11px',
          }}>
            {recommendation.student.charAt(0)}
          </div>
          <span style={{ fontSize: '13px', color: colors.ink }}>{recommendation.student}</span>
        </div>
      )}
    </motion.div>
  );
}

function StudentChipSection({ title, students, color }) {
  return (
    <div style={{
      padding: '28px',
      borderRadius: '20px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
      border: '1px solid rgba(200, 180, 170, 0.15)',
    }}>
      <p style={{ fontSize: '14px', fontWeight: '600', color: colors.muted, marginBottom: '16px' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {students.map((name, i) => (
          <div 
            key={i} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 16px',
              borderRadius: '24px',
              background: `${color}10`,
              border: `1px solid ${color}30`,
            }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: `linear-gradient(145deg, ${color}80 0%, ${color} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: '600', fontSize: '12px',
            }}>
              {name.charAt(0)}
            </div>
            <span style={{ fontSize: '14px', fontWeight: '500', color: colors.ink }}>{name}</span>
          </div>
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

// Student Detail View - Deep dive into a single student
function StudentDetailView({ studentName, stats, detail, onBack, students }) {
  const student = students.find(s => s.name === studentName);
  const barColor = stats?.rate >= 85 ? colors.green : stats?.rate >= 70 ? colors.amber : colors.red;
  const trendColor = detail.trend > 0 ? colors.green : detail.trend < 0 ? colors.red : colors.muted;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div style={{
        padding: '28px',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
        border: '1px solid rgba(255, 200, 200, 0.2)',
        boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
      }}>
        <button 
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', color: colors.muted, fontSize: '14px' }}
        >
          <ArrowLeft size={18} /> Back to all students
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: `linear-gradient(145deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: '700', fontSize: '24px',
            }}>
              {studentName.charAt(0)}
            </div>
            <div>
              <EtchedText size="xl">{studentName}</EtchedText>
              {student && (
                <div style={{ fontSize: '14px', color: colors.muted, marginTop: '4px' }}>
                  {student.age} yrs • {student.level} • {student.status}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Overall Rate */}
            <div className="text-center">
              <div style={{ fontSize: '11px', fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rate</div>
              <EtchedText size="2xl">{stats?.rate.toFixed(0)}%</EtchedText>
            </div>
            
            {/* Trend */}
            {detail.trend !== null && (
              <div className="text-center">
                <div style={{ fontSize: '11px', fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trend</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                  {detail.trend > 0 ? <TrendingUp size={20} style={{ color: trendColor }} /> : detail.trend < 0 ? <TrendingDown size={20} style={{ color: trendColor }} /> : null}
                  <span style={{ fontSize: '24px', fontWeight: '700', color: trendColor }}>
                    {detail.trend > 0 ? '+' : ''}{detail.trend.toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
            
            {/* Streak */}
            <div className="text-center">
              <div style={{ fontSize: '11px', fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Streak</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: detail.currentStreak > 0 ? colors.green : colors.muted }}>
                🔥 {detail.currentStreak}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mt-6">
          {student?.parent_email && (
            <Link 
              to={createPageUrl(`Students?id=${student.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '12px',
                background: colors.ink, color: '#fff',
                fontSize: '13px', fontWeight: '600', textDecoration: 'none',
              }}
            >
              <Mail size={16} /> Message Family
            </Link>
          )}
          <Link 
            to={createPageUrl(`Students?id=${student?.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.8)', color: colors.ink,
              border: '1px solid rgba(200, 180, 170, 0.3)',
              fontSize: '13px', fontWeight: '600', textDecoration: 'none',
            }}
          >
            View Full Profile
          </Link>
        </div>
      </div>

      {/* Stats Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Classes" value={stats?.total || 0} icon={Calendar} color={colors.etchDark} />
        <StatCard label="Present" value={stats?.present || 0} icon={CheckCircle} color={colors.green} />
        <StatCard label="Absent" value={stats?.absent || 0} icon={XCircle} color={colors.red} />
        <StatCard label="Late" value={stats?.late || 0} icon={Clock} color={colors.amber} />
        <StatCard label="Made Up" value={stats?.madeUp || 0} icon={ArrowUpRight} color={colors.green} />
      </div>

      {/* By Class Breakdown */}
      <div style={{
        padding: '28px',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
        border: '1px solid rgba(255, 200, 200, 0.2)',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.etchDark, marginBottom: '20px' }}>
          Attendance by Class
        </h3>
        <div className="space-y-3">
          {detail.byClass.map(c => {
            const classColor = c.rate >= 85 ? colors.green : c.rate >= 70 ? colors.amber : colors.red;
            return (
              <div key={c.name} style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '14px 18px', borderRadius: '14px', background: 'rgba(255,255,255,0.6)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: colors.ink }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: colors.muted }}>{c.total} sessions</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                  <span style={{ color: colors.green }}>{c.present} present</span>
                  <span style={{ color: colors.red }}>{c.absent} absent</span>
                  <span style={{ color: colors.amber }}>{c.late} late</span>
                </div>
                <span style={{ fontSize: '18px', fontWeight: '700', color: classColor }}>{c.rate.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        padding: '28px',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
        border: '1px solid rgba(255, 200, 200, 0.2)',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.etchDark, marginBottom: '20px' }}>
          Attendance Timeline
        </h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {detail.timeline.map((r, i) => {
            const statusColors = {
              present: colors.green,
              absent: colors.red,
              late: colors.amber,
              excused: colors.muted,
              made_up: colors.green,
            };
            const statusLabels = {
              present: 'Present',
              absent: 'Absent',
              late: 'Late',
              excused: 'Excused',
              made_up: 'Made Up',
            };
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.5)',
              }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: statusColors[r.status] || colors.muted,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: colors.ink }}>{r.class_name}</div>
                  <div style={{ fontSize: '12px', color: colors.muted }}>{format(parseISO(r.date), 'MMM d, yyyy')}</div>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: '600', textTransform: 'uppercase',
                  padding: '4px 10px', borderRadius: '6px',
                  background: `${statusColors[r.status]}20`,
                  color: statusColors[r.status],
                }}>
                  {statusLabels[r.status]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// Class Detail View - Deep dive into a single class
function ClassDetailView({ className, stats, detail, onBack, onSelectStudent }) {
  const barColor = stats?.rate >= 85 ? colors.green : stats?.rate >= 70 ? colors.amber : colors.red;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div style={{
        padding: '28px',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
        border: '1px solid rgba(255, 200, 200, 0.2)',
        boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
      }}>
        <button 
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', color: colors.muted, fontSize: '14px' }}
        >
          <ArrowLeft size={18} /> Back to all classes
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <EtchedText size="xl">{className}</EtchedText>
            <div style={{ fontSize: '14px', color: colors.muted, marginTop: '4px' }}>
              {detail.byStudent.length} students • {stats?.total} records
            </div>
          </div>
          
          <div className="text-center">
            <div style={{ fontSize: '11px', fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Class Rate</div>
            <EtchedText size="2xl">{stats?.rate.toFixed(0)}%</EtchedText>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Records" value={stats?.total || 0} icon={Calendar} color={colors.etchDark} />
        <StatCard label="Present" value={stats?.present || 0} icon={CheckCircle} color={colors.green} />
        <StatCard label="Absent" value={stats?.absent || 0} icon={XCircle} color={colors.red} />
        <StatCard label="Late" value={stats?.late || 0} icon={Clock} color={colors.amber} />
      </div>

      {/* Students in this class */}
      <div style={{
        padding: '28px',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
        border: '1px solid rgba(255, 200, 200, 0.2)',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.etchDark, marginBottom: '20px' }}>
          Students in this Class
        </h3>
        <div className="space-y-3">
          {detail.byStudent.map(s => {
            const studentColor = s.rate >= 85 ? colors.green : s.rate >= 70 ? colors.amber : colors.red;
            return (
              <div 
                key={s.name} 
                onClick={() => onSelectStudent(s.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 18px', borderRadius: '14px', background: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', transition: 'transform 0.2s',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: `linear-gradient(145deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: '600', fontSize: '14px',
                }}>
                  {s.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: colors.ink }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: colors.muted }}>{s.total} sessions</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                  <span style={{ color: colors.green }}>{s.present}✓</span>
                  <span style={{ color: colors.red }}>{s.absent}✗</span>
                </div>
                <span style={{ fontSize: '18px', fontWeight: '700', color: studentColor }}>{s.rate.toFixed(0)}%</span>
                <ChevronRight size={18} style={{ color: colors.muted }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Timeline */}
      <div style={{
        padding: '28px',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
        border: '1px solid rgba(255, 200, 200, 0.2)',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: colors.etchDark, marginBottom: '20px' }}>
          Recent Sessions
        </h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {detail.timeline.slice(0, 20).map((r, i) => {
            const statusColors = { present: colors.green, absent: colors.red, late: colors.amber, excused: colors.muted, made_up: colors.green };
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.5)',
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[r.status] || colors.muted }} />
                <div style={{ fontSize: '13px', color: colors.muted, minWidth: '90px' }}>{format(parseISO(r.date), 'MMM d')}</div>
                <div style={{ flex: 1, fontSize: '14px', color: colors.ink }}>{r.student_name}</div>
                <span style={{ fontSize: '12px', color: statusColors[r.status], fontWeight: '500' }}>{r.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}