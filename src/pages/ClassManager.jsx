import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '../utils';
import { ArrowLeft, Plus, Calendar, User, Sparkles, Users, ChevronDown, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import ImportScheduleModal from '../components/manager/ImportScheduleModal';
import StudentRecommender from '../components/manager/StudentRecommender';
import AttendanceModal from '../components/manager/AttendanceModal';
import AutoAssignModal from '../components/manager/AutoAssignModal';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm
const HOUR_HEIGHT = 60; // pixels per hour
const DAYS = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];
const DAY_NAMES = { M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri', S: 'Sat', U: 'Sun' };

// Design tokens matching FamilyBillingDisplay
const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  warm: '#f5f3ef',
  muted: '#8a8478',
  border: '#e8e6e1',
  frost: '#fef7f7',
  frostShadow: 'rgba(180, 120, 120, 0.08)',
  frostDeep: 'rgba(180, 120, 120, 0.05)',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
};

// Etched text component
const EtchedText = ({ children, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };
  
  return (
    <span
      className={`${sizes[size]} font-bold tracking-tight ${className}`}
      style={{
        color: 'transparent',
        backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
        filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
      }}
    >
      {children}
    </span>
  );
};

const formatTime = (hour) => {
  const period = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}${period}`;
};

export default function ClassManager() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isRecommenderOpen, setIsRecommenderOpen] = useState(false);
  const [isAutoAssignOpen, setIsAutoAssignOpen] = useState(false);
  const [attendanceClass, setAttendanceClass] = useState(null);
  const [selectedDay, setSelectedDay] = useState('M');
  const [viewMode, setViewMode] = useState('room'); // 'room' or 'teacher'
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const scrollContainerRef = useRef(null);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  // Auto-scroll to current time
  useEffect(() => {
    if (scrollContainerRef.current && classes.length > 0) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      
      // Calculate scroll position
      const scrollPosition = ((currentHour - 6) * HOUR_HEIGHT) + ((currentMinutes / 60) * HOUR_HEIGHT);
      
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, [selectedDay, classes.length]);

  const dayClasses = classes.filter(c => c.day === selectedDay);

  // Daily summary calculations
  const totalClasses = dayClasses.length;
  const totalHours = dayClasses.reduce((sum, c) => sum + (c.duration || 1), 0);
  const totalStudents = new Set(dayClasses.flatMap(c => c.student_names || [])).size;
  const uniqueTeachers = new Set(dayClasses.map(c => c.teacher).filter(Boolean)).size;
  const roomUtilization = rooms.length > 0 
    ? Math.round((new Set(dayClasses.map(c => c.room).filter(Boolean)).size / rooms.length) * 100)
    : 0;

  const getClassStyle = (cls) => {
    const startHour = cls.start_time;
    const duration = cls.duration;
    const top = ((startHour - 6) * HOUR_HEIGHT) + 'px';
    const height = (duration * HOUR_HEIGHT) + 'px';
    return { top, height };
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: colors.paper }}>
      {/* Frosted Header */}
      <div 
        className="px-6 py-4 flex-shrink-0 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 200, 200, 0.3)',
          boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
        }}
      >
        <div className="flex items-center gap-4">
          <Link 
            to={createPageUrl('Home')} 
            className="p-2 rounded-full transition-all hover:scale-105"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: colors.etchDark }} />
          </Link>
          <div className="flex gap-2">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: selectedDay === day ? colors.ink : 'rgba(255, 255, 255, 0.6)',
                  color: selectedDay === day ? '#fff' : colors.muted,
                  boxShadow: selectedDay === day ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                {DAY_NAMES[day]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div 
            className="flex items-center p-1 rounded-full"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
          >
            <button
              onClick={() => setViewMode('room')}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: viewMode === 'room' ? colors.ink : 'transparent',
                color: viewMode === 'room' ? '#fff' : colors.muted,
              }}
            >
              Studios
            </button>
            <button
              onClick={() => setViewMode('teacher')}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: viewMode === 'teacher' ? colors.ink : 'transparent',
                color: viewMode === 'teacher' ? '#fff' : colors.muted,
              }}
            >
              Teachers
            </button>
          </div>

          <Button 
            onClick={() => setIsImportOpen(true)}
            size="sm"
            className="rounded-full px-5 gap-2 font-semibold"
            style={{ 
              backgroundColor: colors.ink, 
              color: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <Plus className="w-4 h-4" />
            Import
          </Button>
        </div>
      </div>

      {/* Collapsible Daily Summary */}
      {classes.length > 0 && (
        <div 
          className="mx-6 mt-4 rounded-2xl overflow-hidden transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.9) 0%, rgba(252, 238, 235, 0.85) 100%)',
            border: '1px solid rgba(255, 200, 200, 0.3)',
            boxShadow: '0 2px 12px rgba(180, 120, 120, 0.06)',
          }}
        >
          {/* Summary Header - Always Visible */}
          <button
            onClick={() => setSummaryExpanded(!summaryExpanded)}
            className="w-full px-5 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium" style={{ color: colors.muted }}>
                {DAY_NAMES[selectedDay]}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-sm" style={{ color: colors.etchDark }}>
                  <span className="font-semibold">{totalClasses}</span> classes
                </span>
                <span style={{ color: colors.border }}>·</span>
                <span className="text-sm" style={{ color: colors.etchDark }}>
                  <span className="font-semibold">{totalHours}</span> hrs
                </span>
                <span style={{ color: colors.border }}>·</span>
                <span className="text-sm" style={{ color: colors.etchDark }}>
                  <span className="font-semibold">{totalStudents}</span> students
                </span>
              </div>
            </div>
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${summaryExpanded ? 'rotate-180' : ''}`} 
              style={{ color: colors.muted }} 
            />
          </button>

          {/* Expanded Details */}
          {summaryExpanded && (
            <div 
              className="px-5 pb-4 pt-2 grid grid-cols-2 md:grid-cols-4 gap-4"
              style={{ borderTop: '1px solid rgba(200, 180, 170, 0.15)' }}
            >
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.5)' }}>
                <div className="text-2xl font-light" style={{ color: colors.etchDark }}>{uniqueTeachers}</div>
                <div className="text-xs" style={{ color: colors.muted }}>Teachers</div>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.5)' }}>
                <div className="text-2xl font-light" style={{ color: colors.etchDark }}>{roomUtilization}%</div>
                <div className="text-xs" style={{ color: colors.muted }}>Room Usage</div>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.5)' }}>
                <div className="text-2xl font-light" style={{ color: colors.etchDark }}>
                  {dayClasses.length > 0 ? formatTime(Math.min(...dayClasses.map(c => c.start_time))) : '—'}
                </div>
                <div className="text-xs" style={{ color: colors.muted }}>First Class</div>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.5)' }}>
                <div className="text-2xl font-light" style={{ color: colors.etchDark }}>
                  {dayClasses.length > 0 ? formatTime(Math.max(...dayClasses.map(c => c.start_time + (c.duration || 1)))) : '—'}
                </div>
                <div className="text-xs" style={{ color: colors.muted }}>Last Class</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Grid */}
      {classes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div 
            className="text-center rounded-3xl py-16 px-12 max-w-md"
            style={{
              background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
              boxShadow: `inset 0 2px 12px ${colors.frostShadow}, inset 0 1px 3px ${colors.frostDeep}`,
              border: '1px solid rgba(255, 200, 200, 0.3)',
            }}
          >
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
            >
              <Calendar className="w-8 h-8" style={{ color: colors.etchDark }} />
            </div>
            <EtchedText size="lg">No classes yet</EtchedText>
            <p className="mt-2 mb-6" style={{ color: colors.muted }}>Import your schedule to get started</p>
            <Button 
              onClick={() => setIsImportOpen(true)} 
              className="rounded-full px-6"
              style={{ backgroundColor: colors.ink, color: '#fff' }}
            >
              Import Now
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Sticky Header Row - Rooms or Teachers */}
            <div className="flex-shrink-0 px-6 py-3" style={{ backgroundColor: colors.paper }}>
              <div className="flex">
                <div className="w-20 flex-shrink-0" />
                {viewMode === 'room' ? (
                  rooms.length === 0 ? (
                    <div 
                      className="flex-1 text-center py-6 rounded-2xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
                        border: '1px dashed rgba(200, 160, 160, 0.4)',
                      }}
                    >
                      <p className="text-sm" style={{ color: colors.muted }}>No rooms configured. Set up rooms in Settings.</p>
                    </div>
                  ) : (
                    rooms.map(room => (
                      <div key={room.id} className="flex-1 px-2">
                        <div 
                          className="rounded-2xl px-4 py-3 text-center"
                          style={{
                            background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
                            boxShadow: `inset 0 2px 8px ${colors.frostShadow}, 0 1px 3px rgba(0,0,0,0.04)`,
                            border: '1px solid rgba(255, 200, 200, 0.3)',
                          }}
                        >
                          <EtchedText size="sm">{room.name}</EtchedText>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  teachers.length === 0 ? (
                    <div 
                      className="flex-1 text-center py-6 rounded-2xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
                        border: '1px dashed rgba(200, 160, 160, 0.4)',
                      }}
                    >
                      <p className="text-sm" style={{ color: colors.muted }}>No teachers configured. Add staff first.</p>
                    </div>
                  ) : (
                    teachers.map(teacher => (
                      <div key={teacher.id} className="flex-1 px-2">
                        <div 
                          className="rounded-2xl px-4 py-3 text-center"
                          style={{
                            background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
                            boxShadow: `inset 0 2px 8px ${colors.frostShadow}, 0 1px 3px rgba(0,0,0,0.04)`,
                            border: '1px solid rgba(255, 200, 200, 0.3)',
                          }}
                        >
                          <EtchedText size="sm">{teacher.name?.split(' ')[0]}</EtchedText>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>

            {/* Scrollable Time Grid */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6">
              <div className="relative">
                {HOURS.map((hour) => (
                  <div key={hour} className="flex relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                    {/* Time Label */}
                    <div className="w-20 flex-shrink-0 pr-4 -mt-2 text-right">
                      <span className="text-[11px] font-medium" style={{ color: colors.muted, opacity: 0.6 }}>
                        {formatTime(hour)}
                      </span>
                    </div>

                    {/* Subtle horizontal line */}
                    <div 
                      className="absolute left-20 right-0 top-0 h-px"
                      style={{ background: `linear-gradient(90deg, transparent 0%, ${colors.border} 5%, ${colors.border} 95%, transparent 100%)`, opacity: 0.4 }}
                    />

                    {/* Room or Teacher Columns */}
                    {(viewMode === 'room' ? rooms : teachers).map(item => (
                      <div key={item.id} className="flex-1 px-2 relative">
                        {/* Empty cell for grid structure */}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Classes Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="flex h-full">
                    <div className="w-20 flex-shrink-0" />
                    {viewMode === 'room' ? (
                      rooms.map((room) => (
                        <div key={room.id} className="flex-1 px-2 relative pointer-events-auto">
                          {dayClasses
                            .filter(cls => cls.room === room.name)
                            .map(cls => {
                              const style = getClassStyle(cls);
                              return (
                                <Link
                                  key={cls.id}
                                  to={`${createPageUrl('ClassDetail')}?id=${cls.id}`}
                                  className="absolute left-2 right-2 rounded-2xl p-3 transition-all cursor-pointer overflow-hidden block hover:scale-[1.02] flex items-center justify-center"
                                  style={{
                                    ...style,
                                    background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.98) 0%, rgba(252, 231, 231, 0.95) 100%)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255, 200, 200, 0.4)',
                                    boxShadow: '0 4px 16px rgba(180, 120, 120, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
                                  }}
                                >
                                  <EtchedText size="sm" className="block truncate text-center">{cls.title}</EtchedText>
                                </Link>
                              );
                            })}
                        </div>
                      ))
                    ) : (
                      teachers.map((teacher) => (
                        <div key={teacher.id} className="flex-1 px-2 relative pointer-events-auto">
                          {dayClasses
                            .filter(cls => cls.teacher === teacher.name)
                            .map(cls => {
                              const style = getClassStyle(cls);
                              return (
                                <Link
                                  key={cls.id}
                                  to={`${createPageUrl('ClassDetail')}?id=${cls.id}`}
                                  className="absolute left-2 right-2 rounded-2xl p-3 transition-all cursor-pointer overflow-hidden block hover:scale-[1.02] flex items-center justify-center"
                                  style={{
                                    ...style,
                                    background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.98) 0%, rgba(252, 231, 231, 0.95) 100%)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255, 200, 200, 0.4)',
                                    boxShadow: '0 4px 16px rgba(180, 120, 120, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
                                  }}
                                >
                                  <EtchedText size="sm" className="block truncate text-center">{cls.title}</EtchedText>
                                </Link>
                              );
                            })}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImportScheduleModal 
        isOpen={isImportOpen} 
        onOpenChange={setIsImportOpen}
        existingClasses={classes}
        students={students}
      />

      <StudentRecommender 
        isOpen={isRecommenderOpen}
        onOpenChange={setIsRecommenderOpen}
        students={students}
        classes={classes}
      />

      <AttendanceModal 
        isOpen={!!attendanceClass}
        onOpenChange={(open) => !open && setAttendanceClass(null)}
        classData={attendanceClass}
        students={students}
      />

      <AutoAssignModal 
        isOpen={isAutoAssignOpen}
        onOpenChange={setIsAutoAssignOpen}
        classes={classes}
        teachers={teachers}
      />
    </div>
  );
}