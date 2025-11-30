import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, User, Mail, Star, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import StudentProfileView from '../components/teacher/StudentProfileView';

export default function Students() {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  const teacherName = currentUser?.full_name || currentUser?.email || "Staff";

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.level?.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedStudent) {
      return (
          <div className="min-h-screen bg-[#F4F4F6]">
              <StudentProfileView 
                  student={selectedStudent} 
                  teacherName={teacherName} 
                  onBack={() => setSelectedStudent(null)} 
              />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('ClassManager')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-serif text-[#333333]">Students</h1>
              <div className="flex gap-4 text-sm mt-1">
                 <Link to={createPageUrl('ClassManager')} className="text-gray-500 hover:text-gray-900 transition-colors">Schedule</Link>
                 <Link to={createPageUrl('Teachers')} className="text-gray-500 hover:text-gray-900 transition-colors">Teachers</Link>
                 <span className="font-medium text-gray-900 border-b-2 border-black pb-1">Students</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search students..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white border-gray-200 rounded-full w-full md:w-64"
              />
            </div>
          </div>
        </div>

        {/* Student Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredStudents.map((student, i) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedStudent(student)}
                className="bg-white p-6 rounded-[24px] shadow-sm hover:shadow-md transition-all cursor-pointer group border border-transparent hover:border-[#F2DCDD]"
              >
                <div className="flex items-start justify-between mb-4">
                   <div className="flex items-center gap-4">
                      <Avatar className="w-14 h-14 bg-gray-50 border-2 border-white shadow-sm">
                        <AvatarFallback className="text-lg font-serif text-[#333333] bg-[#F4F4F6]">
                          {student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                         <h3 className="text-xl font-serif text-[#333333] group-hover:text-black transition-colors">{student.name}</h3>
                         <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <Badge variant="secondary" className="bg-gray-50 text-gray-500 font-normal hover:bg-gray-100">
                               {student.level}
                            </Badge>
                            <span>• {student.age} yrs</span>
                         </div>
                      </div>
                   </div>
                   {student.attendance_alert && (
                      <div className="text-red-500 bg-red-50 p-2 rounded-full" title="Attendance Alert">
                         <AlertCircle className="w-4 h-4" />
                      </div>
                   )}
                </div>

                <div className="space-y-3">
                   {student.attendance_summary && (
                     <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl leading-relaxed line-clamp-2">
                        "{student.attendance_summary}"
                     </div>
                   )}
                   
                   <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <div className="flex -space-x-2">
                         {/* Placeholder for class avatars or interests */}
                         {student.interests?.slice(0, 3).map((interest, idx) => (
                            <div key={idx} className="h-6 px-2 rounded-full bg-[#F4F4F6] border border-white text-[10px] flex items-center text-gray-500 capitalize">
                               {interest}
                            </div>
                         ))}
                      </div>
                      <div className="text-xs text-gray-400 font-medium group-hover:text-[#333333] transition-colors">
                         View Profile →
                      </div>
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredStudents.length === 0 && (
             <div className="col-span-full text-center py-20 text-gray-400">
                No students found matching "{search}"
             </div>
          )}
        </div>
      </div>
    </div>
  );
}