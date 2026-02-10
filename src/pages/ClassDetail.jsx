import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '../utils';
import { ArrowLeft, Users, Clock, MapPin, User, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import AttendanceModal from '../components/manager/AttendanceModal';
import { toast } from 'sonner';

const DAY_NAMES = { M: 'Monday', T: 'Tuesday', W: 'Wednesday', R: 'Thursday', F: 'Friday', S: 'Saturday', U: 'Sunday' };

const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  muted: '#8a8478',
  border: '#e8e6e1',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
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

const formatTime = (hour) => {
  const period = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const minutes = Math.round((hour % 1) * 60);
  return minutes > 0 ? `${displayHour}:${minutes.toString().padStart(2, '0')}${period}` : `${displayHour}${period}`;
};

export default function ClassDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  
  const classId = new URLSearchParams(location.search).get('id');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id;

  const { data: classData, isLoading } = useQuery({
    queryKey: ['class', classId, studioId],
    queryFn: async () => {
      const classes = await base44.entities.DanceClass.filter({ studio_id: studioId });
      return classes.find(c => c.id === classId);
    },
    enabled: !!classId && !!studioId
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students', studioId],
    queryFn: () => base44.entities.Student.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.DanceClass.delete(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class deleted');
      navigate(createPageUrl('ClassManager'));
    },
  });

  if (isLoading || !classData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.paper }}>
        <p style={{ color: colors.muted }}>Loading...</p>
      </div>
    );
  }

  const enrolledStudents = students.filter(s => classData.student_names?.includes(s.name));
  const endTime = classData.start_time + (classData.duration || 1);

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.paper }}>
      {/* Header */}
      <div 
        className="px-6 py-5 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 200, 200, 0.3)',
          boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
        }}
      >
        <div className="flex items-center gap-4">
          <Link 
            to={createPageUrl('ClassManager')} 
            className="p-2 rounded-full transition-all hover:scale-105"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: colors.etchDark }} />
          </Link>
          <div>
            <EtchedText size="xl">{classData.title}</EtchedText>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" style={{ color: colors.muted }} />
                <span className="text-xs" style={{ color: colors.muted }}>
                  {DAY_NAMES[classData.day]} · {formatTime(classData.start_time)} – {formatTime(endTime)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" style={{ color: colors.muted }} />
                <span className="text-xs" style={{ color: colors.muted }}>{classData.room || 'No room'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsAttendanceOpen(true)}
            size="sm"
            className="rounded-full gap-2 font-semibold"
            style={{ backgroundColor: colors.ink, color: '#fff' }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Attendance
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => deleteMutation.mutate()}
            className="rounded-full hover:bg-red-50"
            style={{ color: colors.etchDark }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Info Row */}
        <div className="flex gap-4">
          <div 
            className="flex-1 p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(252, 245, 245, 0.9) 100%)',
              border: '1px solid rgba(200, 160, 160, 0.2)',
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(200, 160, 160, 0.15)' }}
              >
                <User className="w-5 h-5" style={{ color: colors.etchDark }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: colors.muted }}>Instructor</p>
                <p className="font-semibold text-sm" style={{ color: colors.ink }}>
                  {classData.teacher || 'Unassigned'}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="flex-1 p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(252, 245, 245, 0.9) 100%)',
              border: '1px solid rgba(200, 160, 160, 0.2)',
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(200, 160, 160, 0.15)' }}
              >
                <Users className="w-5 h-5" style={{ color: colors.etchDark }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: colors.muted }}>Enrollment</p>
                <p className="font-semibold text-sm" style={{ color: colors.ink }}>
                  {enrolledStudents.length} students
                </p>
              </div>
            </div>
          </div>

          <div 
            className="flex-1 p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(252, 245, 245, 0.9) 100%)',
              border: '1px solid rgba(200, 160, 160, 0.2)',
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(200, 160, 160, 0.15)' }}
              >
                <Clock className="w-5 h-5" style={{ color: colors.etchDark }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: colors.muted }}>Duration</p>
                <p className="font-semibold text-sm" style={{ color: colors.ink }}>
                  {(classData.duration || 1) * 60} min
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Roster */}
        <div 
          className="p-6 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(252, 245, 245, 0.95) 100%)',
            border: '1px solid rgba(200, 160, 160, 0.2)',
            boxShadow: '0 4px 16px rgba(180, 120, 120, 0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <EtchedText size="md">Roster</EtchedText>
            <span className="text-xs" style={{ color: colors.muted }}>{enrolledStudents.length} enrolled</span>
          </div>

          {enrolledStudents.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-10 h-10 mx-auto mb-2" style={{ color: colors.etchLight, opacity: 0.5 }} />
              <p className="text-sm" style={{ color: colors.muted }}>No students enrolled</p>
            </div>
          ) : (
            <div className="space-y-2">
              {enrolledStudents.map((student) => (
                <Link 
                  key={student.id} 
                  to={`${createPageUrl('Students')}?id=${student.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01]"
                  style={{ backgroundColor: 'rgba(200, 160, 160, 0.06)' }}
                >
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                    style={{ 
                      background: `linear-gradient(135deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
                    }}
                  >
                    {student.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: colors.ink }}>
                      {student.name}
                    </p>
                    <p className="text-xs" style={{ color: colors.muted }}>
                      {student.level || 'No level set'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <AttendanceModal 
        isOpen={isAttendanceOpen}
        onOpenChange={setIsAttendanceOpen}
        classData={classData}
        students={students}
      />
    </div>
  );
}