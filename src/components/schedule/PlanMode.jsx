import React, { useState } from 'react';
import { AlertTriangle, Users, UserX, Clock, ChevronLeft, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import StudioDayDetail from './StudioDayDetail';

const DAY_NAMES = { M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri', S: 'Sat', U: 'Sun' };
const STUDIO_HOURS = { start: 9, end: 21 }; // 9am to 9pm = 12 hours of potential use

const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  muted: '#8a8478',
  border: '#e8e6e1',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
  warning: '#f59e0b',
  danger: '#ef4444',
  success: '#22c55e',
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
        className="px-6 py-3 flex items-center gap-6 border-b"
        style={{ backgroundColor: 'rgba(255,255,255,0.5)', borderColor: colors.border }}
      >
        <button
          onClick={() => setActiveFilter(activeFilter === 'conflicts' ? null : 'conflicts')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeFilter === 'conflicts' ? 'ring-2 ring-red-300' : ''
          }`}
          style={{ 
            backgroundColor: totalConflicts > 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
            color: totalConflicts > 0 ? colors.danger : colors.muted 
          }}
        >
          <AlertTriangle size={14} />
          {totalConflicts} conflicts
        </button>
        <button
          onClick={() => setActiveFilter(activeFilter === 'unstaffed' ? null : 'unstaffed')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeFilter === 'unstaffed' ? 'ring-2 ring-orange-300' : ''
          }`}
          style={{ 
            backgroundColor: totalUnstaffed > 0 ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
            color: totalUnstaffed > 0 ? colors.warning : colors.muted 
          }}
        >
          <UserX size={14} />
          {totalUnstaffed} unstaffed
        </button>
        <button
          onClick={() => setActiveFilter(activeFilter === 'low_enrollment' ? null : 'low_enrollment')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeFilter === 'low_enrollment' ? 'ring-2 ring-orange-300' : ''
          }`}
          style={{ 
            backgroundColor: totalLowEnrollment > 0 ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
            color: totalLowEnrollment > 0 ? colors.warning : colors.muted 
          }}
        >
          <Users size={14} />
          {totalLowEnrollment} low enrollment
        </button>
        <button
          onClick={() => setActiveFilter(activeFilter === 'gaps' ? null : 'gaps')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeFilter === 'gaps' ? 'ring-2 ring-gray-300' : ''
          }`}
          style={{ color: colors.muted }}
        >
          <Clock size={14} />
          {totalGaps} empty slots
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
          <div className="space-y-3">
            {roomMetrics.map(({ room, utilization, conflicts, unstaffed, lowEnrollment, classes: roomClasses }) => {
              // Determine if this row should be highlighted based on active filter
              const isHighlighted = 
                (activeFilter === 'conflicts' && conflicts.length > 0) ||
                (activeFilter === 'unstaffed' && unstaffed.length > 0) ||
                (activeFilter === 'low_enrollment' && lowEnrollment.length > 0);

              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedStudio(room)}
                  className={`w-full p-4 rounded-2xl text-left transition-all hover:scale-[1.01] ${
                    isHighlighted ? 'ring-2 ring-amber-400' : ''
                  }`}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(252, 245, 245, 0.9) 100%)',
                    border: '1px solid rgba(200, 160, 160, 0.2)',
                    boxShadow: '0 2px 8px rgba(180, 120, 120, 0.06)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold" style={{ color: colors.ink }}>{room.name}</span>
                        <span className="text-xs" style={{ color: colors.muted }}>
                          {roomClasses.length} classes
                        </span>
                      </div>

                      {/* Utilization Bar */}
                      <div className="flex items-center gap-3">
                        <div 
                          className="flex-1 h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'rgba(200, 160, 160, 0.15)' }}
                        >
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${utilization}%`,
                              backgroundColor: utilization > 80 ? colors.success : utilization > 50 ? colors.etchDark : colors.warning,
                            }}
                          />
                        </div>
                        <span 
                          className="text-xs font-medium w-12 text-right"
                          style={{ color: utilization > 80 ? colors.success : utilization > 50 ? colors.muted : colors.warning }}
                        >
                          {utilization}%
                        </span>
                      </div>
                    </div>

                    {/* Issue Badges */}
                    <div className="flex items-center gap-2 ml-4">
                      {conflicts.length > 0 && (
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: colors.danger }}
                        >
                          <AlertTriangle size={12} />
                          {conflicts.length}
                        </span>
                      )}
                      {unstaffed.length > 0 && (
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                          style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: colors.warning }}
                        >
                          <UserX size={12} />
                          {unstaffed.length}
                        </span>
                      )}
                      {lowEnrollment.length > 0 && (
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                          style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: colors.warning }}
                        >
                          <Users size={12} />
                          {lowEnrollment.length}
                        </span>
                      )}
                      <ArrowRight size={16} style={{ color: colors.muted }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}