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

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: colors.paper }}>
      {/* Header with Mode Toggle */}
      <div 
        className="px-4 py-2 flex-shrink-0 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link 
            to={createPageUrl('Home')} 
            className="p-1.5 rounded-full transition-all hover:scale-105"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: colors.etchDark }} />
          </Link>
          {/* Display Mode Toggle */}
          <div 
            className="flex items-center p-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
          >
            <button
              onClick={() => setDisplayMode('now')}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: displayMode === 'now' ? colors.ink : 'transparent',
                color: displayMode === 'now' ? '#fff' : colors.muted,
              }}
            >
              Now
            </button>
            <button
              onClick={() => setDisplayMode('plan')}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: displayMode === 'plan' ? colors.ink : 'transparent',
                color: displayMode === 'plan' ? '#fff' : colors.muted,
              }}
            >
              Plan
            </button>
          </div>
        </div>
      </div>

      {displayMode === 'now' ? (
        <NowMode 
          classes={classes} 
          students={students} 
          teachers={teachers} 
          rooms={rooms} 
        />
      ) : (
        <PlanMode 
          classes={classes}
          rooms={rooms}
          students={students}
          teachers={teachers}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          setIsImportOpen={setIsImportOpen}
          DAYS={DAYS}
        />
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