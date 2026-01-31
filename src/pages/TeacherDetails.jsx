import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SubRequestFlow from '../components/teachers/SubRequestFlow';

const TeacherDetails = () => {
  const [activeTab, setActiveTab] = useState('schedule');
  const [subRequestOpen, setSubRequestOpen] = useState(false);
  const navigate = useNavigate();

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

  // Fetch time logs for this teacher
  const { data: timeLogs = [] } = useQuery({
    queryKey: ['timeLogs', teacher?.name],
    queryFn: () => base44.entities.TimeLog.filter({ teacher_name: teacher?.name }),
    enabled: !!teacher?.name,
  });

  // Fetch sub requests for this teacher
  const { data: subRequests = [] } = useQuery({
    queryKey: ['subRequests', teacher?.name],
    queryFn: () => base44.entities.SubRequest.filter({ teacher_name: teacher?.name }),
    enabled: !!teacher?.name,
  });

  // Fetch classes for this teacher
  const { data: classes = [] } = useQuery({
    queryKey: ['teacherClasses', teacher?.name],
    queryFn: () => base44.entities.DanceClass.filter({ teacher: teacher?.name }),
    enabled: !!teacher?.name,
  });

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

  const timecardBreakdown = classes.map((c, i) => ({
    date: c.day,
    type: 'scheduled',
    name: c.title,
    time: `${Math.floor(c.start_time)}:${(c.start_time % 1) * 60 || '00'}`,
    hours: c.duration || 1,
  }));

  const subActivity = subRequests.slice(0, 5).map(s => ({
    type: s.status === 'filled' ? 'requested' : 'covered',
    date: s.date,
    class: s.class_name,
    person: s.suggested_subs?.[0] || 'TBD',
  }));

  const timeline = [
    { date: 'Jan 25', type: 'note', author: 'Studio', content: 'Great work this month!' },
    ...(subRequests.slice(0, 2).map(s => ({
      date: s.date,
      type: 'sub',
      content: `Sub request: ${s.class_name} - ${s.status}`,
    }))),
  ];

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
        background: 'linear-gradient(165deg, #fef7f7 0%, #faf5f3 25%, #f9f6f4 50%, #faf4f2 75%, #fcf8f7 100%)',
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
                className="text-4xl font-medium tracking-tight mb-1"
                style={{ color: '#b89a8c' }}
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
              { id: 'schedule', label: 'Schedule' },
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

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-3">
            {classes.length > 0 ? (
              classes
                .sort((a, b) => {
                  const dayOrder = { M: 1, T: 2, W: 3, R: 4, F: 5, S: 6, U: 7 };
                  return (dayOrder[a.day] || 0) - (dayOrder[b.day] || 0) || a.start_time - b.start_time;
                })
                .map((classItem) => {
                  const hour = Math.floor(classItem.start_time);
                  const minutes = Math.round((classItem.start_time % 1) * 60);
                  const timeStr = `${hour}:${minutes.toString().padStart(2, '0')}`;
                  
                  return (
                    <div 
                      key={classItem.id}
                      onClick={() => navigate(createPageUrl('ClassDetail') + `?id=${classItem.id}`)}
                      className="flex items-center justify-between p-5 rounded-2xl transition-all cursor-pointer hover:scale-[1.01]"
                      style={{
                        background: 'rgba(255,255,255,0.4)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                      }}
                    >
                      <div className="flex items-center gap-5">
                        <span 
                          className="text-lg w-8 text-center font-light"
                          style={{ color: '#b5a599' }}
                        >
                          {classItem.day}
                        </span>
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ background: '#c4b5ab' }}
                        />
                        <div>
                          <p className="font-medium" style={{ color: '#8b7d72' }}>{classItem.title}</p>
                          <p className="text-sm" style={{ color: '#b5a599' }}>
                            {timeStr}
                          </p>
                        </div>
                      </div>
                      <span 
                        className="font-medium"
                        style={{ color: '#b5a599' }}
                      >
                        +{classItem.duration || 1}
                      </span>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-12" style={{ color: '#b5a599' }}>
                No classes assigned
              </div>
            )}
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
                className="px-8 py-3 rounded-2xl text-sm font-medium transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(145deg, rgba(200,170,156,0.9) 0%, rgba(185,155,140,0.85) 100%)',
                  color: '#fff',
                  boxShadow: '0 8px 24px -8px rgba(180,150,140,0.4), inset 0 1px 1px rgba(255,255,255,0.2)',
                }}
              >
                New Sub Request
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
                className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  color: '#a8998e',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.1)',
                }}
              >
                Add Note
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
      </div>
    </div>
  );
};

export default TeacherDetails;