import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Calendar, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import DailyBriefing from '../manager/DailyBriefing';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm
const HOUR_HEIGHT = 60;
const DAY_NAMES = { M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri', S: 'Sat', U: 'Sun' };

const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  muted: '#8a8478',
  border: '#e8e6e1',
  frostShadow: 'rgba(180, 120, 120, 0.08)',
  frostDeep: 'rgba(180, 120, 120, 0.05)',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
};

const EtchedText = ({ children, size = 'md', className = '' }) => {
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };
  return (
    <span
      className={`${sizes[size]} font-bold tracking-tight ${className}`}
      style={{
        color: 'transparent',
        backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        textShadow: '0 2px 3px rgba(255,255,255,0.7)',
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

export default function PlanMode({
  classes, rooms, students, teachers,
  selectedDay, setSelectedDay,
  viewMode, setViewMode,
  setIsImportOpen,
  summaryExpanded, setSummaryExpanded,
  DAYS
}) {
  const scrollContainerRef = useRef(null);
  const dayClasses = classes.filter(c => c.day === selectedDay);

  useEffect(() => {
    if (scrollContainerRef.current && classes.length > 0) {
      const now = new Date();
      const scrollPosition = ((now.getHours() - 6) * HOUR_HEIGHT) + ((now.getMinutes() / 60) * HOUR_HEIGHT);
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, [selectedDay, classes.length]);

  const getClassStyle = (cls) => {
    const top = ((cls.start_time - 6) * HOUR_HEIGHT) + 'px';
    const height = ((cls.duration || 1) * HOUR_HEIGHT) + 'px';
    return { top, height };
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day and View Mode Selector */}
      <div className="px-6 py-4 flex-shrink-0 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
          borderBottom: '1px solid rgba(255, 200, 200, 0.3)',
        }}>
        <div className="flex gap-2">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: selectedDay === day ? colors.ink : 'transparent',
                color: selectedDay === day ? '#fff' : colors.muted,
              }}
            >
              {DAY_NAMES[day]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
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
            style={{ backgroundColor: colors.ink, color: '#fff' }}
          >
            <Plus className="w-4 h-4" />
            Import
          </Button>
        </div>
      </div>

      {/* AI Daily Briefing */}
      {classes.length > 0 && (
        <DailyBriefing 
          dayClasses={dayClasses}
          selectedDay={selectedDay}
          teachers={teachers}
          students={students}
          expanded={summaryExpanded}
          onToggle={() => setSummaryExpanded(!summaryExpanded)}
        />
      )}

      {/* Schedule Grid */}
      {classes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div 
            className="text-center rounded-3xl py-16 px-12 max-w-md"
            style={{
              background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
              border: '1px solid rgba(255, 200, 200, 0.3)',
            }}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
              <Calendar className="w-8 h-8" style={{ color: colors.etchDark }} />
            </div>
            <EtchedText size="lg">No classes yet</EtchedText>
            <p className="mt-2 mb-6" style={{ color: colors.muted }}>Import your schedule to get started</p>
            <Button onClick={() => setIsImportOpen(true)} className="rounded-full px-6" style={{ backgroundColor: colors.ink, color: '#fff' }}>
              Import Now
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Column Headers */}
          <div className="flex-shrink-0 px-6 py-3" style={{ backgroundColor: colors.paper }}>
            <div className="flex">
              <div className="w-20 flex-shrink-0" />
              {viewMode === 'room' ? (
                rooms.length === 0 ? (
                  <div className="flex-1 text-center py-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)', border: '1px dashed rgba(200, 160, 160, 0.4)' }}>
                    <p className="text-sm" style={{ color: colors.muted }}>No rooms configured. Set up rooms in Settings.</p>
                  </div>
                ) : (
                  rooms.map(room => (
                    <div key={room.id} className="flex-1 px-2">
                      <div className="rounded-2xl px-4 py-3 text-center" style={{ background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)', border: '1px solid rgba(255, 200, 200, 0.3)' }}>
                        <EtchedText size="sm">{room.name}</EtchedText>
                      </div>
                    </div>
                  ))
                )
              ) : (
                teachers.length === 0 ? (
                  <div className="flex-1 text-center py-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)', border: '1px dashed rgba(200, 160, 160, 0.4)' }}>
                    <p className="text-sm" style={{ color: colors.muted }}>No teachers configured. Add staff first.</p>
                  </div>
                ) : (
                  teachers.map(teacher => (
                    <div key={teacher.id} className="flex-1 px-2">
                      <div className="rounded-2xl px-4 py-3 text-center" style={{ background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)', border: '1px solid rgba(255, 200, 200, 0.3)' }}>
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
                  <div className="w-20 flex-shrink-0 pr-4 -mt-2 text-right">
                    <span className="text-[11px] font-medium" style={{ color: colors.muted, opacity: 0.6 }}>{formatTime(hour)}</span>
                  </div>
                  <div className="absolute left-20 right-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${colors.border} 5%, ${colors.border} 95%, transparent 100%)`, opacity: 0.4 }} />
                  {(viewMode === 'room' ? rooms : teachers).map(item => (
                    <div key={item.id} className="flex-1 px-2 relative" />
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
                        {dayClasses.filter(cls => cls.room === room.name).map(cls => (
                          <Link
                            key={cls.id}
                            to={`${createPageUrl('ClassDetail')}?id=${cls.id}`}
                            className="absolute left-2 right-2 rounded-2xl p-3 transition-all cursor-pointer block hover:scale-[1.02] flex items-center justify-center"
                            style={{
                              ...getClassStyle(cls),
                              background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.98) 0%, rgba(252, 231, 231, 0.95) 100%)',
                              border: '1px solid rgba(255, 200, 200, 0.4)',
                              boxShadow: '0 4px 16px rgba(180, 120, 120, 0.12)',
                            }}
                          >
                            <EtchedText size="sm" className="block truncate text-center">{cls.title}</EtchedText>
                          </Link>
                        ))}
                      </div>
                    ))
                  ) : (
                    teachers.map((teacher) => (
                      <div key={teacher.id} className="flex-1 px-2 relative pointer-events-auto">
                        {dayClasses.filter(cls => cls.teacher === teacher.name).map(cls => (
                          <Link
                            key={cls.id}
                            to={`${createPageUrl('ClassDetail')}?id=${cls.id}`}
                            className="absolute left-2 right-2 rounded-2xl p-3 transition-all cursor-pointer block hover:scale-[1.02] flex items-center justify-center"
                            style={{
                              ...getClassStyle(cls),
                              background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.98) 0%, rgba(252, 231, 231, 0.95) 100%)',
                              border: '1px solid rgba(255, 200, 200, 0.4)',
                              boxShadow: '0 4px 16px rgba(180, 120, 120, 0.12)',
                            }}
                          >
                            <EtchedText size="sm" className="block truncate text-center">{cls.title}</EtchedText>
                          </Link>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}