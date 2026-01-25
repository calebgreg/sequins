import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '../utils';
import { ArrowLeft, Users, Clock, MapPin, User, CheckCircle2, Trash2, Edit } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import AttendanceModal from '../components/manager/AttendanceModal';
import { toast } from 'sonner';

const DAY_NAMES = { M: 'Monday', T: 'Tuesday', W: 'Wednesday', R: 'Thursday', F: 'Friday', S: 'Saturday', U: 'Sunday' };

const formatTime = (hour) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const minutes = (hour % 1) * 60;
  return minutes > 0 ? `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}` : `${displayHour}:00 ${period}`;
};

export default function ClassDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  
  const classId = new URLSearchParams(location.search).get('id');

  const { data: classData, isLoading } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const classes = await base44.entities.DanceClass.list();
      return classes.find(c => c.id === classId);
    },
    enabled: !!classId
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
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
      <div className="min-h-screen bg-[#F4F4F6] p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const enrolledStudents = students.filter(s => classData.student_names?.includes(s.name));
  const endTime = classData.start_time + classData.duration;

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Link to={createPageUrl('ClassManager')}>
              <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:bg-gray-50">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-serif text-[#333333] mb-2">{classData.title}</h1>
              <div className="flex items-center gap-4 text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{DAY_NAMES[classData.day]} • {formatTime(classData.start_time)} - {formatTime(endTime)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{classData.room}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsAttendanceOpen(true)}
              className="bg-[#333333] hover:bg-black text-white rounded-full gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Take Attendance
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => deleteMutation.mutate()}
              className="rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-white rounded-[24px] border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#F4F4F6] flex items-center justify-center">
                <User className="w-5 h-5 text-[#333333]" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Instructor</div>
                <div className="font-medium text-[#333333]">{classData.teacher || 'Unassigned'}</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-[24px] border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#F4F4F6] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#333333]" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Enrollment</div>
                <div className="font-medium text-[#333333]">{enrolledStudents.length} Students</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-[24px] border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#F4F4F6] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#333333]" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Duration</div>
                <div className="font-medium text-[#333333]">{classData.duration * 60} minutes</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Student Roster */}
        <Card className="p-8 bg-white rounded-[32px] border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif text-[#333333]">Class Roster</h2>
            <span className="text-sm text-gray-500">{enrolledStudents.length} enrolled</span>
          </div>

          {enrolledStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No students enrolled yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {enrolledStudents.map((student) => (
                <Link 
                  key={student.id} 
                  to={`${createPageUrl('Students')}?id=${student.id}`}
                  className="flex items-center gap-3 p-4 rounded-2xl hover:bg-[#F4F4F6] transition-colors cursor-pointer group"
                >
                  <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                    <AvatarFallback 
                      className="text-white font-medium"
                      style={{ backgroundColor: student.color || '#333333' }}
                    >
                      {student.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#333333] truncate group-hover:text-black">
                      {student.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {student.level || 'Level not set'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

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