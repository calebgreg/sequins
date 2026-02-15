import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Clock, Users, MapPin, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  muted: '#8a8478',
  border: '#e8e6e1',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
  green: '#7eb89a',
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
        textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
        filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
      }}
    >
      {children}
    </span>
  );
};

export default function NowMode({ classes, students, teachers, rooms }) {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const dayMap = ['U', 'M', 'T', 'W', 'R', 'F', 'S'];
  const todayDayCode = dayMap[now.getDay()];

  // Get classes for today that are relevant (ongoing, upcoming within 2 hours, or ended within 1 hour)
  const relevantClasses = classes.filter(cls => {
    if (cls.day !== todayDayCode) return false;
    const classEnd = cls.start_time + (cls.duration || 1);
    // Show if: starts within next 2 hours OR is currently happening OR ended within last hour
    return (cls.start_time <= currentHour + 2 && classEnd >= currentHour - 1);
  }).sort((a, b) => a.start_time - b.start_time);

  const getStatus = (cls) => {
    const classEnd = cls.start_time + (cls.duration || 1);
    if (currentHour >= cls.start_time && currentHour < classEnd) return 'ongoing';
    if (currentHour < cls.start_time) return 'upcoming';
    return 'finished';
  };

  const formatClassTime = (hour) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return format(date, 'h:mm a');
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h2 className="text-xl font-bold mb-6" style={{ color: colors.ink }}>What's Happening Now</h2>

      {relevantClasses.length === 0 ? (
        <div className="text-center py-20">
          <Clock size={48} className="mx-auto mb-4" style={{ color: colors.etchLight }} />
          <p className="text-lg" style={{ color: colors.muted }}>No classes currently or coming up soon.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {relevantClasses.map(cls => {
            const status = getStatus(cls);
            // Count students that actually exist in the database
            const studentCount = students.filter(s => cls.student_names?.includes(s.name)).length;
            const classStartTime = formatClassTime(cls.start_time);
            const classEndTime = formatClassTime(cls.start_time + (cls.duration || 1));
            const roomName = cls.room || 'Unassigned';

            return (
              <Link
                key={cls.id}
                to={`${createPageUrl('ClassDetail')}?id=${cls.id}`}
                className="rounded-2xl p-6 shadow-sm border block hover:scale-[1.02] transition-transform"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(252,231,231,0.95) 100%)',
                  borderColor: status === 'ongoing' ? colors.green : colors.border,
                  boxShadow: status === 'ongoing' ? '0 4px 16px rgba(126, 184, 154, 0.2)' : 'none',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      status === 'ongoing' ? 'bg-green-100 text-green-700' : 
                      status === 'upcoming' ? 'bg-gray-100 text-gray-600' :
                      'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {status === 'ongoing' ? 'Ongoing' : status === 'upcoming' ? 'Upcoming' : 'Finished'}
                  </div>
                  <div className="text-sm font-medium" style={{ color: colors.muted }}>
                    {classStartTime} - {classEndTime}
                  </div>
                </div>
                <EtchedText size="lg" className="block mb-2">{cls.title}</EtchedText>
                <p className="text-sm" style={{ color: colors.muted }}>
                  <span className="font-semibold">{cls.teacher || 'No teacher assigned'}</span>
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm" style={{ color: colors.muted }}>
                  <div className="flex items-center gap-1">
                    <MapPin size={16} />
                    <span>{roomName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>{studentCount} Students</span>
                  </div>
                  {status === 'ongoing' && (
                    <div className="flex items-center gap-1 text-green-700 font-semibold">
                      <Sparkles size={16} />
                      <span>Live</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}