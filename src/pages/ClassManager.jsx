import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '../utils';
import { ArrowLeft } from 'lucide-react';
import ImportScheduleModal from '../components/manager/ImportScheduleModal';
import StudentRecommender from '../components/manager/StudentRecommender';
import AttendanceModal from '../components/manager/AttendanceModal';
import AutoAssignModal from '../components/manager/AutoAssignModal';
import NowMode from '../components/schedule/NowMode';
import PlanMode from '../components/schedule/PlanMode';

const DAYS = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];

const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  muted: '#8a8478',
  etchDark: '#8a7070',
};

export default function ClassManager() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isRecommenderOpen, setIsRecommenderOpen] = useState(false);
  const [isAutoAssignOpen, setIsAutoAssignOpen] = useState(false);
  const [attendanceClass, setAttendanceClass] = useState(null);
  const [displayMode, setDisplayMode] = useState('now'); // 'now' or 'plan'
  
  // Plan mode state
  const dayMap = ['U', 'M', 'T', 'W', 'R', 'F', 'S'];
  const todayIndex = DAYS.indexOf(dayMap[new Date().getDay()]);
  const [selectedDay, setSelectedDay] = useState(DAYS[todayIndex >= 0 ? todayIndex : 0]);
  const [viewMode, setViewMode] = useState('room');
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id;

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', studioId],
    queryFn: () => base44.entities.DanceClass.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', studioId],
    queryFn: () => base44.entities.Room.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students', studioId],
    queryFn: () => base44.entities.Student.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', studioId],
    queryFn: () => base44.entities.Teacher.filter({ studio_id: studioId }),
    enabled: !!studioId,
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

  const getClassStyle = (cls) => {
    const startHour = cls.start_time;
    const duration = cls.duration;
    const top = ((startHour - 6) * HOUR_HEIGHT) + 'px';
    const height = (duration * HOUR_HEIGHT) + 'px';
    return { top, height };
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]" style={{ backgroundColor: colors.paper }}>
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