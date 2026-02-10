import React, { useState } from 'react';
import { AlertTriangle, Users, UserX, Clock, ChevronLeft, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import StudioDayDetail from './StudioDayDetail';

const DAY_NAMES = { M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri', S: 'Sat', U: 'Sun' };
const STUDIO_HOURS = { start: 9, end: 21 }; // 9am to 9pm = 12 hours of potential use

const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  muted: '#b8a8a8',
  etchLight: '#d4c4c4',
  etchDark: '#a89898',
};

const EtchedText = ({ children, size = 'md', className = '' }) => {
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl', xl: 'text-3xl' };
  return (
    <span
      className={`${sizes[size]} font-bold tracking-tight ${className}`}
      style={{
        color: 'transparent',
        backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
      }}
    >
      {children}
    </span>
  );
};

export default function PlanMode({
  classes, rooms, students, teachers,
  selectedDay, setSelectedDay,
  setIsImportOpen,
  DAYS
}) {
  const [selectedStudio, setSelectedStudio] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null); // 'gaps', 'conflicts', 'low_enrollment', 'unstaffed'

  const dayClasses = classes.filter(c => c.day === selectedDay);
  const totalAvailableHours = STUDIO_HOURS.end - STUDIO_HOURS.start;

  // Calculate metrics for each room
  const roomMetrics = rooms.map(room => {
    const roomClasses = dayClasses.filter(c => c.room === room.name);
    const totalScheduledHours = roomClasses.reduce((sum, c) => sum + (c.duration || 1), 0);
    const utilization = Math.round((totalScheduledHours / totalAvailableHours) * 100);

    // Find conflicts (overlapping classes in same room)
    const conflicts = [];
    for (let i = 0; i < roomClasses.length; i++) {
      for (let j = i + 1; j < roomClasses.length; j++) {
        const a = roomClasses[i];
        const b = roomClasses[j];
        const aEnd = a.start_time + (a.duration || 1);
        const bEnd = b.start_time + (b.duration || 1);
        if (a.start_time < bEnd && b.start_time < aEnd) {
          conflicts.push({ classA: a, classB: b });
        }
      }
    }

    // Find unstaffed classes
    const unstaffed = roomClasses.filter(c => !c.teacher);

    // Find low enrollment classes (less than 50% capacity, assuming 15 max)
    const lowEnrollment = roomClasses.filter(c => {
      const enrolled = c.student_names?.length || 0;
      return enrolled < 8; // Less than ~50% of typical class size
    });

    // Find gaps (empty hour slots)
    const scheduledSlots = new Set();
    roomClasses.forEach(c => {
      const start = Math.floor(c.start_time);
      const end = Math.ceil(c.start_time + (c.duration || 1));
      for (let h = start; h < end; h++) {
        scheduledSlots.add(h);
      }
    });
    const gaps = [];
    for (let h = STUDIO_HOURS.start; h < STUDIO_HOURS.end; h++) {
      if (!scheduledSlots.has(h)) {
        gaps.push(h);
      }
    }

    return {
      room,
      classes: roomClasses,
      utilization,
      conflicts,
      unstaffed,
      lowEnrollment,
      gaps,
      hasIssues: conflicts.length > 0 || unstaffed.length > 0 || lowEnrollment.length > 0,
    };
  });

  // Overall day metrics
  const totalConflicts = roomMetrics.reduce((sum, r) => sum + r.conflicts.length, 0);
  const totalUnstaffed = roomMetrics.reduce((sum, r) => sum + r.unstaffed.length, 0);
  const totalLowEnrollment = roomMetrics.reduce((sum, r) => sum + r.lowEnrollment.length, 0);
  const totalGaps = roomMetrics.reduce((sum, r) => sum + r.gaps.length, 0);

  // If a studio is selected, show the detail view
  if (selectedStudio) {
    const metrics = roomMetrics.find(r => r.room.id === selectedStudio.id);
    return (
      <StudioDayDetail
        room={selectedStudio}
        metrics={metrics}
        selectedDay={selectedDay}
        students={students}
        teachers={teachers}
        onBack={() => setSelectedStudio(null)}
        activeFilter={activeFilter}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day Selector */}
      <div 
        className="px-6 py-4 flex-shrink-0 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
          borderBottom: '1px solid rgba(255, 200, 200, 0.3)',
        }}
      >
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

        <Button
          onClick={() => setIsImportOpen(true)}
          size="sm"
          className="rounded-full px-5 gap-2 font-semibold"
          style={{ backgroundColor: colors.ink, color: '#fff' }}
        >
          Import
        </Button>
      </div>

      {/* Issue Summary Bar */}
      <div 
        className="px-6 py-3 flex items-center gap-3 border-b overflow-x-auto"
        style={{ backgroundColor: 'rgba(255,255,255,0.4)', borderColor: 'rgba(212, 196, 196, 0.2)' }}
      >
        <span className="text-xs font-medium" style={{ color: colors.muted }}>Filter:</span>
        <button
          onClick={() => setActiveFilter(activeFilter === 'conflicts' ? null : 'conflicts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeFilter === 'conflicts' ? 'ring-1 ring-offset-1' : ''
          }`}
          style={{ 
            backgroundColor: activeFilter === 'conflicts' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)',
            color: colors.etchDark,
            boxShadow: '0 2px 8px rgba(168, 152, 152, 0.1)',
          }}
        >
          <AlertTriangle size={12} />
          {totalConflicts} conflicts
        </button>
        <button
          onClick={() => setActiveFilter(activeFilter === 'unstaffed' ? null : 'unstaffed')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeFilter === 'unstaffed' ? 'ring-1 ring-offset-1' : ''
          }`}
          style={{ 
            backgroundColor: activeFilter === 'unstaffed' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)',
            color: colors.etchDark,
            boxShadow: '0 2px 8px rgba(168, 152, 152, 0.1)',
          }}
        >
          <UserX size={12} />
          {totalUnstaffed} unstaffed
        </button>
        <button
          onClick={() => setActiveFilter(activeFilter === 'low_enrollment' ? null : 'low_enrollment')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeFilter === 'low_enrollment' ? 'ring-1 ring-offset-1' : ''
          }`}
          style={{ 
            backgroundColor: activeFilter === 'low_enrollment' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)',
            color: colors.etchDark,
            boxShadow: '0 2px 8px rgba(168, 152, 152, 0.1)',
          }}
        >
          <Users size={12} />
          {totalLowEnrollment} low
        </button>
      </div>

      {/* Studio Overview List */}
      <div className="flex-1 overflow-y-auto p-6">
        {rooms.length === 0 ? (
          <div 
            className="text-center py-16 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
              border: '1px dashed rgba(200, 160, 160, 0.4)',
            }}
          >
            <p style={{ color: colors.muted }}>No studios configured. Set up rooms in Settings.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {roomMetrics.map(({ room, utilization, conflicts, unstaffed, lowEnrollment, classes: roomClasses }) => {
              const isHighlighted = 
                (activeFilter === 'conflicts' && conflicts.length > 0) ||
                (activeFilter === 'unstaffed' && unstaffed.length > 0) ||
                (activeFilter === 'low_enrollment' && lowEnrollment.length > 0);

              const hasIssues = conflicts.length > 0 || unstaffed.length > 0 || lowEnrollment.length > 0;

              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedStudio(room)}
                  className={`group text-left p-5 rounded-3xl transition-all hover:scale-[1.02] ${
                    isHighlighted ? 'ring-2 ring-amber-300' : ''
                  }`}
                  style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    boxShadow: '0 4px 20px rgba(168, 152, 152, 0.1)',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <EtchedText size="md">{room.name}</EtchedText>
                      <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
                        {roomClasses.length} {roomClasses.length === 1 ? 'class' : 'classes'} scheduled
                      </p>
                    </div>
                    <div 
                      className="p-2 rounded-full transition-all group-hover:translate-x-1"
                      style={{ backgroundColor: 'rgba(212, 196, 196, 0.15)' }}
                    >
                      <ArrowRight size={14} style={{ color: colors.etchDark }} />
                    </div>
                  </div>

                  {/* Utilization */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs uppercase tracking-wider" style={{ color: colors.muted }}>Utilization</span>
                      <EtchedText size="sm">{utilization}%</EtchedText>
                    </div>
                    <div 
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'rgba(212, 196, 196, 0.2)' }}
                    >
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${utilization}%`,
                          background: `linear-gradient(90deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Issue Pills */}
                  {hasIssues ? (
                    <div className="flex flex-wrap gap-2">
                      {conflicts.length > 0 && (
                        <span 
                          className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
                          style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.6)', 
                            color: colors.etchDark,
                            boxShadow: '0 2px 8px rgba(168, 152, 152, 0.08)',
                          }}
                        >
                          <AlertTriangle size={11} />
                          {conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'}
                        </span>
                      )}
                      {unstaffed.length > 0 && (
                        <span 
                          className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
                          style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.6)', 
                            color: colors.etchDark,
                            boxShadow: '0 2px 8px rgba(168, 152, 152, 0.08)',
                          }}
                        >
                          <UserX size={11} />
                          {unstaffed.length} unstaffed
                        </span>
                      )}
                      {lowEnrollment.length > 0 && (
                        <span 
                          className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
                          style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.6)', 
                            color: colors.etchDark,
                            boxShadow: '0 2px 8px rgba(168, 152, 152, 0.08)',
                          }}
                        >
                          <Users size={11} />
                          {lowEnrollment.length} low
                        </span>
                      )}
                    </div>
                  ) : (
                    <div 
                      className="text-xs font-medium"
                      style={{ color: colors.etchDark }}
                    >
                      ✓ No issues
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}