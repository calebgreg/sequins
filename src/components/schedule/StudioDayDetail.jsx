import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { ChevronLeft, AlertTriangle, Users, UserX, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";

const DAY_NAMES_FULL = { M: 'Monday', T: 'Tuesday', W: 'Wednesday', R: 'Thursday', F: 'Friday', S: 'Saturday', U: 'Sunday' };
const STUDIO_HOURS = { start: 9, end: 21 };

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

const formatTime = (hour) => {
  const period = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const minutes = Math.round((hour % 1) * 60);
  return minutes > 0 ? `${displayHour}:${minutes.toString().padStart(2, '0')}${period}` : `${displayHour}${period}`;
};

export default function StudioDayDetail({ room, metrics, selectedDay, students, teachers, onBack, activeFilter }) {
  const { classes: roomClasses, conflicts, unstaffed, lowEnrollment, gaps } = metrics || { 
    classes: [], conflicts: [], unstaffed: [], lowEnrollment: [], gaps: [] 
  };

  // Just use the classes directly, sorted by start time
  const sortedClasses = [...roomClasses].sort((a, b) => a.start_time - b.start_time);

  // Check if a class has issues
  const hasConflict = (cls) => conflicts.some(c => c.classA.id === cls.id || c.classB.id === cls.id);
  const isUnstaffed = (cls) => unstaffed.some(c => c.id === cls.id);
  const isLowEnrollment = (cls) => lowEnrollment.some(c => c.id === cls.id);

  // Filter highlighting
  const shouldHighlight = (cls) => {
    if (!activeFilter) return false;
    if (activeFilter === 'conflicts') return hasConflict(cls);
    if (activeFilter === 'unstaffed') return isUnstaffed(cls);
    if (activeFilter === 'low_enrollment') return isLowEnrollment(cls);
    return false;
  };



  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div 
        className="px-6 py-4 flex-shrink-0 flex items-center gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
          borderBottom: '1px solid rgba(255, 200, 200, 0.3)',
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="rounded-full gap-2"
        >
          <ChevronLeft size={18} />
          Back
        </Button>
        <div>
          <h2 className="text-lg font-bold" style={{ color: colors.ink }}>{room.name}</h2>
          <p className="text-xs" style={{ color: colors.muted }}>{DAY_NAMES_FULL[selectedDay]}</p>
        </div>
      </div>

      {/* Schedule List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-2">
          {sortedClasses.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={32} className="mx-auto mb-3" style={{ color: colors.etchLight }} />
              <p style={{ color: colors.muted }}>No classes scheduled in this studio today.</p>
            </div>
          ) : (
            sortedClasses.map((cls) => {
              const enrolled = cls.student_names?.length || 0;
              const capacity = 15;
              const enrollmentPercent = Math.round((enrolled / capacity) * 100);
              const highlighted = shouldHighlight(cls);

              return (
                <Link
                  key={cls.id}
                  to={`${createPageUrl('ClassDetail')}?id=${cls.id}`}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.01] block ${
                    highlighted ? 'ring-2 ring-amber-400' : ''
                  }`}
                  style={{ 
                    backgroundColor: highlighted ? 'rgba(251, 191, 36, 0.05)' : 'transparent',
                  }}
                >
                  <div className="w-16 text-right">
                    <span className="text-sm font-medium" style={{ color: colors.ink }}>
                      {formatTime(cls.start_time)}
                    </span>
                  </div>
                  <div 
                    className="flex-1 p-4 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(252, 245, 245, 0.95) 100%)',
                      border: '1px solid rgba(200, 160, 160, 0.25)',
                      boxShadow: '0 2px 8px rgba(180, 120, 120, 0.06)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold" style={{ color: colors.ink }}>{cls.title}</h3>
                        <p className="text-sm mt-0.5" style={{ color: colors.muted }}>
                          {cls.teacher || <span className="text-amber-600 flex items-center gap-1"><UserX size={12} /> No teacher</span>}
                          {cls.teacher && ` · ${enrolled}/${capacity} students`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasConflict(cls) && (
                          <span 
                            className="p-1.5 rounded-full"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                            title="Scheduling conflict"
                          >
                            <AlertTriangle size={14} style={{ color: colors.danger }} />
                          </span>
                        )}
                        {isUnstaffed(cls) && (
                          <span 
                            className="p-1.5 rounded-full"
                            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                            title="No teacher assigned"
                          >
                            <UserX size={14} style={{ color: colors.warning }} />
                          </span>
                        )}
                        {isLowEnrollment(cls) && (
                          <span 
                            className="p-1.5 rounded-full"
                            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                            title="Low enrollment"
                          >
                            <Users size={14} style={{ color: colors.warning }} />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Enrollment bar */}
                    <div className="mt-3 flex items-center gap-2">
                      <div 
                        className="flex-1 h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'rgba(200, 160, 160, 0.15)' }}
                      >
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${enrollmentPercent}%`,
                            backgroundColor: enrollmentPercent >= 70 ? colors.success : enrollmentPercent >= 50 ? colors.etchDark : colors.warning,
                          }}
                        />
                      </div>
                      <span 
                        className="text-xs font-medium"
                        style={{ 
                          color: enrollmentPercent >= 70 ? colors.success : enrollmentPercent >= 50 ? colors.muted : colors.warning 
                        }}
                      >
                        {enrollmentPercent}%
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}