import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SubRequestFlow from '../components/teachers/SubRequestFlow';
import AddNoteModal from '../components/teachers/AddNoteModal';

const TeacherDetails = () => {
  const [activeTab, setActiveTab] = useState('timecard');
  const [timecardExpanded, setTimecardExpanded] = useState(true);
  const [subRequestOpen, setSubRequestOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const queryClient = useQueryClient();

  // Get teacher ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const teacherId = urlParams.get('id');

  // Fetch teacher data
  const { data: teacher, isLoading: teacherLoading } = useQuery({
    queryKey: ['teacher', teacherId],
    queryFn: () => base44.entities.Teacher.filter({ id: teacherId }),
    enabled: !!teacherId,
    select: (data) => data[0],
  });

  // Fetch current user to get studio context
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id;

  // Fetch time logs for this teacher
  const { data: timeLogs = [] } = useQuery({
    queryKey: ['timeLogs', teacher?.name, studioId],
    queryFn: () => base44.entities.TimeLog.filter({ studio_id: studioId, teacher_name: teacher?.name }),
    enabled: !!teacher?.name && !!studioId,
  });

  // Fetch sub requests for this teacher
  const { data: subRequests = [] } = useQuery({
    queryKey: ['subRequests', teacher?.name, studioId],
    queryFn: () => base44.entities.SubRequest.filter({ studio_id: studioId, teacher_name: teacher?.name }),
    enabled: !!teacher?.name && !!studioId,
  });

  // Fetch classes for this teacher
  const { data: classes = [] } = useQuery({
    queryKey: ['teacherClasses', teacher?.name, studioId],
    queryFn: () => base44.entities.DanceClass.filter({ studio_id: studioId, teacher: teacher?.name }),
    enabled: !!teacher?.name && !!studioId,
  });

  // Fetch notes for this teacher
  const { data: teacherNotes = [] } = useQuery({
    queryKey: ['teacherNotes', teacherId, studioId],
    queryFn: () => base44.entities.TeacherNote.filter({ studio_id: studioId, teacher_id: teacherId }),
    enabled: !!teacherId && !!studioId,
  });



  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: (noteData) => base44.entities.TeacherNote.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherNotes', teacherId] });
      setAddNoteOpen(false);
    },
  });

  const handleSaveNote = (content) => {
    const today = new Date().toISOString().split('T')[0];
    createNoteMutation.mutate({
      studio_id: studioId,
      teacher_id: teacherId,
      teacher_name: teacher?.name,
      content,
      author_name: currentUser?.full_name || 'Unknown',
      date: today,
    });
  };

  // Calculate hours
  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const calculateScheduledHours = () => {
    return classes.reduce((total, c) => total + (c.duration || 1), 0);
  };

  // Mock data for demonstration (would come from real data in production)
  const currentPayPeriod = {
    range: 'Jan 16 - Jan 31',
    scheduledHours: calculateScheduledHours() || 19.5,
    subbedOutHours: subRequests.filter(s => s.status === 'filled').length * 1.5,
    subbedInHours: 3.0,
    eventHours: 1.5,
    get totalHours() {
      return this.scheduledHours - this.subbedOutHours + this.subbedInHours + this.eventHours;
    }
  };

  const formatTime = (time) => {
    const hours = Math.floor(time);
    const minutes = (time % 1) * 60;
    const ampm = hours >= 12 ? 'p' : 'a';
    const displayHour = hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')}${ampm}`;
  };

  const dayMapShort = {
    M: 'Mon',
    T: 'Tue',
    W: 'Wed',
    R: 'Thu',
    F: 'Fri',
    S: 'Sat',
    U: 'Sun',
  };

  const timecardBreakdown = classes.map((c) => ({
    id: c.id,
    date: dayMapShort[c.day] || c.day,
    type: 'scheduled',
    name: c.title,
    time: formatTime(c.start_time),
    hours: c.duration || 1,
  }));

  const subActivity = subRequests.slice(0, 5).map(s => ({
    type: s.status === 'filled' ? 'requested' : 'covered',
    date: s.date,
    class: s.class_name,
    person: s.suggested_subs?.[0] || 'TBD',
  }));

  // Build timeline from notes + sub requests
  const formatDateShort = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getAuthorInitials = (name) => {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return name;
  };

  const timeline = [
    ...teacherNotes.map(n => ({
      date: formatDateShort(n.date),
      rawDate: n.date,
      type: 'note',
      author: getAuthorInitials(n.author_name),
      content: n.content,
    })),
    ...subRequests.slice(0, 5).map(s => ({
      date: formatDateShort(s.date || s.created_date),
      rawDate: s.date || s.created_date,
      type: 'sub',
      content: `Sub request: ${s.class_name} - ${s.status}`,
    })),
  ].sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

  if (teacherLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fef7f7' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#c4a0a0] border-t-transparent animate-spin mx-auto mb-4" />
          <p style={{ color: '#8b7d72' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fef7f7' }}>
        <div className="text-center">
          <p style={{ color: '#8b7d72' }}>Teacher not found</p>
          <Link to={createPageUrl('Teachers')} className="text-sm mt-4 block" style={{ color: '#c4a0a0' }}>
            ← Back to Staff
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: '#ffffff',
      }}
    >
      {/* Ambient background shapes */}
      <div 
        className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,206,206,0.5) 0%, transparent 70%)' }}
      />
      <div 
        className="fixed bottom-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,218,210,0.6) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-4xl mx-auto px-8 py-12">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-8" style={{ color: '#c4b5ab' }}>
          <Link to={createPageUrl('Teachers')} className="cursor-pointer hover:text-[#a89585] transition-colors">Staff</Link>
          <span>›</span>
          <span style={{ color: '#8b7d72' }}>{teacher.name}</span>
        </div>

        {/* Main Profile Card - Frosted Glass */}
        <div 
          className="relative rounded-3xl p-8 mb-8"
          style={{
            background: 'linear-gradient(145deg, rgba(253,238,236,0.85) 0%, rgba(250,232,228,0.7) 30%, rgba(248,235,230,0.6) 70%, rgba(252,243,240,0.75) 100%)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(200,180,170,0.15), 0 20px 60px -20px rgba(180,150,140,0.2)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Inner glow */}
          <div 
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)',
            }}
          />

          <div className="relative flex flex-col md:flex-row items-start gap-8">
            {/* Avatar */}
            <div 
              className="w-28 h-28 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                boxShadow: '0 8px 32px -8px rgba(180,150,140,0.25), inset 0 1px 1px rgba(255,255,255,1)',
              }}
            >
              {teacher.avatar_url ? (
                <img src={teacher.avatar_url} alt={teacher.name} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <span 
                  className="text-3xl font-medium"
                  style={{ color: '#c9a99c' }}
                >
                  {getInitials(teacher.name)}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 pt-2">
              <h1 
                className="text-4xl font-bold tracking-tight mb-1"
                style={{ 
                  color: 'transparent',
                  backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
                  filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                }}
              >
                {teacher.name}
              </h1>
              <p 
                className="text-lg mb-5"
                style={{ color: '#a8998e' }}
              >
                {teacher.title || 'Staff Member'}
              </p>
              
              {/* Disciplines as soft tags */}
              <div className="flex flex-wrap gap-2">
                {(teacher.styles || []).map((d) => (
                  <span 
                    key={d} 
                    className="px-4 py-1.5 rounded-full text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.5)',
                      color: '#9a8b80',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 1px 3px rgba(180,150,140,0.1)',
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="text-right pt-2">
              <div className="mb-4">
                <p className="text-sm mb-1" style={{ color: '#b5a599' }}>This Period</p>
                <p className="text-4xl font-light" style={{ color: '#8b7d72' }}>
                  {currentPayPeriod.totalHours.toFixed(1)}
                  <span className="text-xl ml-1" style={{ color: '#c4b5ab' }}>hrs</span>
                </p>
              </div>
              {teacher.created_date && (
                <div>
                  <p className="text-sm" style={{ color: '#b5a599' }}>Since {new Date(teacher.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact row */}
          <div 
            className="relative flex flex-wrap items-center gap-8 mt-8 pt-6"
            style={{ borderTop: '1px solid rgba(200,180,170,0.2)' }}
          >
            {teacher.email && (
              <a 
                href={`mailto:${teacher.email}`} 
                className="text-sm transition-colors hover:opacity-70"
                style={{ color: '#a8998e' }}
              >
                {teacher.email}
              </a>
            )}
            {teacher.phone && (
              <a 
                href={`tel:${teacher.phone}`} 
                className="text-sm transition-colors hover:opacity-70"
                style={{ color: '#a8998e' }}
              >
                {teacher.phone}
              </a>
            )}
          </div>
        </div>

        {/* Tab Navigation - Pill Style */}
        <div className="flex justify-center mb-8">
          <div 
            className="inline-flex items-center gap-1 p-1.5 rounded-2xl"
            style={{
              background: 'rgba(240,230,225,0.5)',
              boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.1)',
            }}
          >
            {[
              { id: 'timecard', label: 'Timecard' },
              { id: 'subs', label: 'Subs' },
              { id: 'timeline', label: 'Timeline' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-6 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: activeTab === tab.id 
                    ? 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)'
                    : 'transparent',
                  color: activeTab === tab.id ? '#8b7d72' : '#b5a599',
                  boxShadow: activeTab === tab.id 
                    ? '0 2px 8px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,0.8)'
                    : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Smart Timecard Tab */}
        {activeTab === 'timecard' && (
          <div className="space-y-6">
            
            {/* Timecard Summary - Frosted Card */}
            <div 
              className="rounded-3xl p-8"
              style={{
                background: 'linear-gradient(145deg, rgba(253,238,236,0.7) 0%, rgba(250,232,228,0.5) 50%, rgba(252,243,240,0.6) 100%)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 15px 50px -15px rgba(180,150,140,0.15)',
              }}
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-medium" style={{ color: '#8b7d72' }}>
                    Smart Timecard
                  </h2>
                  <p className="text-sm mt-1" style={{ color: '#b5a599' }}>
                    {currentPayPeriod.range}
                  </p>
                </div>
                <div 
                  className="px-4 py-1.5 rounded-full text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    color: '#c9a060',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8)',
                  }}
                >
                  Pending Review
                </div>
              </div>

              {/* The Formula */}
              <div 
                className="flex flex-wrap items-center justify-center gap-3 p-6 rounded-2xl mb-6"
                style={{
                  background: 'rgba(255,255,255,0.4)',
                  boxShadow: 'inset 0 1px 2px rgba(180,150,140,0.08)',
                }}
              >
                <div className="text-center px-4">
                  <p className="text-3xl font-light" style={{ color: '#8b7d72' }}>{currentPayPeriod.scheduledHours}</p>
                  <p className="text-xs mt-1" style={{ color: '#b5a599' }}>Scheduled</p>
                </div>
                
                <span className="text-2xl" style={{ color: '#d4c4ba' }}>−</span>
                
                <div className="text-center px-4">
                  <p className="text-3xl font-light" style={{ color: '#d4a574' }}>{currentPayPeriod.subbedOutHours}</p>
                  <p className="text-xs mt-1" style={{ color: '#d4a574' }}>Out</p>
                </div>
                
                <span className="text-2xl" style={{ color: '#d4c4ba' }}>+</span>
                
                <div className="text-center px-4">
                  <p className="text-3xl font-light" style={{ color: '#7eb89a' }}>{currentPayPeriod.subbedInHours}</p>
                  <p className="text-xs mt-1" style={{ color: '#7eb89a' }}>In</p>
                </div>
                
                <span className="text-2xl" style={{ color: '#d4c4ba' }}>+</span>
                
                <div className="text-center px-4">
                  <p className="text-3xl font-light" style={{ color: '#a48bc4' }}>{currentPayPeriod.eventHours}</p>
                  <p className="text-xs mt-1" style={{ color: '#a48bc4' }}>Events</p>
                </div>
                
                <span className="text-2xl" style={{ color: '#d4c4ba' }}>=</span>
                
                <div 
                  className="text-center px-6 py-3 rounded-xl"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                    boxShadow: '0 4px 16px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,1)',
                  }}
                >
                  <p className="text-4xl font-medium" style={{ color: '#8b7d72' }}>{currentPayPeriod.totalHours.toFixed(1)}</p>
                  <p className="text-xs mt-1" style={{ color: '#b89a8c' }}>Total</p>
                </div>
              </div>

              {/* Toggle breakdown */}
              <button 
                onClick={() => setTimecardExpanded(!timecardExpanded)}
                className="flex items-center gap-2 mx-auto text-sm transition-colors hover:opacity-70"
                style={{ color: '#b5a599' }}
              >
                {timecardExpanded ? 'Hide' : 'Show'} schedule
                <svg 
                  className={`w-4 h-4 transition-transform ${timecardExpanded ? 'rotate-180' : ''}`} 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Breakdown List */}
            {timecardExpanded && timecardBreakdown.length > 0 && (
              <div className="space-y-2">
                {timecardBreakdown.map((item, i) => (
                  <Link 
                    to={createPageUrl('ClassDetail') + `?id=${item.id}`}
                    key={i}
                    className="flex items-center justify-between p-4 rounded-2xl transition-all hover:scale-[1.01] cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.4)',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <span 
                        className="text-sm w-16"
                        style={{ color: '#b5a599' }}
                      >
                        {item.date}
                      </span>
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ 
                          background: item.type === 'scheduled' ? '#c4b5ab' 
                            : item.type === 'out' ? '#d4a574' 
                            : item.type === 'in' ? '#7eb89a' 
                            : '#a48bc4'
                        }}
                      />
                      <div>
                        <p className="font-medium" style={{ color: '#8b7d72' }}>{item.name}</p>
                        <p className="text-sm" style={{ color: '#b5a599' }}>
                          {item.time}
                          {item.note && <span className="ml-2">· {item.note}</span>}
                        </p>
                      </div>
                    </div>
                    <svg 
                      className="w-4 h-4 flex-shrink-0"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      style={{ color: '#d4c4ba' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}

            {timecardExpanded && timecardBreakdown.length === 0 && (
              <div className="text-center py-8" style={{ color: '#b5a599' }}>
                No classes scheduled
              </div>
            )}

            {/* Approve Button */}
            <div className="flex justify-center pt-4">
              <button 
                className="px-10 py-4 rounded-2xl text-base font-bold tracking-tight transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
                  boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255, 220, 210, 0.5)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span
                  style={{
                    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
                    filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                  }}
                >
                  Approve Timecard
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Subs Tab */}
        {activeTab === 'subs' && (
          <div className="space-y-6">
            
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Covered', value: subActivity.filter(s => s.type === 'covered').length.toString(), sub: 'classes for others' },
                { label: 'Requested', value: subActivity.filter(s => s.type === 'requested').length.toString(), sub: 'subs this year' },
                { label: 'Response', value: '94%', sub: 'acceptance rate' },
              ].map((stat) => (
                <div 
                  key={stat.label}
                  className="p-5 rounded-2xl text-center"
                  style={{
                    background: 'rgba(255,255,255,0.4)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                  }}
                >
                  <p className="text-3xl font-light" style={{ color: '#8b7d72' }}>{stat.value}</p>
                  <p className="text-sm mt-1" style={{ color: '#b5a599' }}>{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Activity List */}
            <div 
              className="rounded-3xl p-6"
              style={{
                background: 'linear-gradient(145deg, rgba(253,238,236,0.6) 0%, rgba(250,232,228,0.4) 100%)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
              }}
            >
              <h3 className="text-lg font-medium mb-4" style={{ color: '#8b7d72' }}>Recent</h3>
              {subActivity.length > 0 ? (
                <div className="space-y-3">
                  {subActivity.map((item, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.5)' }}
                    >
                      <div className="flex items-center gap-3">
                        <span 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                          style={{
                            background: item.type === 'covered' 
                              ? 'rgba(126,184,154,0.15)' 
                              : 'rgba(200,170,156,0.15)',
                            color: item.type === 'covered' ? '#7eb89a' : '#c8aa9c',
                          }}
                        >
                          {item.type === 'covered' ? '↓' : '↑'}
                        </span>
                        <div>
                          <p style={{ color: '#8b7d72' }}>
                            {item.type === 'covered' ? 'Covered' : 'Requested sub for'} {item.class}
                          </p>
                          <p className="text-sm" style={{ color: '#b5a599' }}>
                            {item.type === 'covered' ? `For ${item.person}` : `Covered by ${item.person}`} · {item.date}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4" style={{ color: '#b5a599' }}>No sub activity yet</p>
              )}
            </div>

            {/* Smart Sub Callout */}
            <div 
              className="rounded-3xl p-6"
              style={{
                background: 'linear-gradient(145deg, rgba(164,139,196,0.15) 0%, rgba(180,160,200,0.1) 100%)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)',
              }}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">✦</span>
                <div>
                  <p className="font-medium" style={{ color: '#8b7d9a' }}>Smart Sub Matching</p>
                  <p className="text-sm" style={{ color: '#a8a0b5' }}>
                    Gene finds qualified subs, handles the back-and-forth, updates everyone.
                  </p>
                </div>
              </div>
            </div>

            {/* Request Sub Button */}
            <div className="flex justify-center">
              <button 
                onClick={() => setSubRequestOpen(true)}
                className="px-10 py-4 rounded-2xl text-base font-bold tracking-tight transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
                  boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255, 220, 210, 0.5)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span
                  style={{
                    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
                    filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                  }}
                >
                  New Sub Request
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            {timeline.length > 0 ? timeline.map((item, i) => (
              <div 
                key={i}
                className="flex gap-4 p-5 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.4)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                }}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: item.type === 'note' ? 'rgba(200,170,156,0.15)'
                      : item.type === 'sub' ? 'rgba(212,165,116,0.15)'
                      : item.type === 'milestone' ? 'rgba(164,139,196,0.15)'
                      : 'rgba(180,181,169,0.15)',
                  }}
                >
                  <span style={{ 
                    color: item.type === 'note' ? '#c8aa9c'
                      : item.type === 'sub' ? '#d4a574'
                      : item.type === 'milestone' ? '#a48bc4'
                      : '#b5a599',
                    fontSize: '14px',
                  }}>
                    {item.type === 'note' ? '✎' 
                      : item.type === 'sub' ? '⇄' 
                      : item.type === 'milestone' ? '★'
                      : '✓'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm" style={{ color: '#b5a599' }}>{item.date}</span>
                    {item.author && (
                      <span className="text-sm" style={{ color: '#c4b5ab' }}>· {item.author}</span>
                    )}
                  </div>
                  <p style={{ color: '#8b7d72' }}>{item.content}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8" style={{ color: '#b5a599' }}>
                No timeline activity yet
              </div>
            )}

            {/* Add Note Button */}
            <div className="flex justify-center pt-4">
              <button 
                onClick={() => setAddNoteOpen(true)}
                className="px-10 py-4 rounded-2xl text-base font-bold tracking-tight transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(145deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 50%, rgba(248, 225, 220, 0.85) 100%)',
                  boxShadow: '0 8px 24px -4px rgba(180,150,140,0.35), 0 4px 8px -2px rgba(180,150,140,0.2), inset 0 1px 2px rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255, 220, 210, 0.5)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span
                  style={{
                    backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
                    filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
                  }}
                >
                  Add Note
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Sub Request Modal */}
        {subRequestOpen && (
          <SubRequestFlow 
            onClose={() => setSubRequestOpen(false)}
            classes={classes}
            teacherName={teacher?.name}
          />
        )}

        {/* Add Note Modal */}
        <AddNoteModal
          isOpen={addNoteOpen}
          onClose={() => setAddNoteOpen(false)}
          onSave={handleSaveNote}
          saving={createNoteMutation.isPending}
          teacherName={teacher?.name}
        />
      </div>
    </div>
  );
};

export default TeacherDetails;