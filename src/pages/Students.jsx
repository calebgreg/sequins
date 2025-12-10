import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Search, Filter, Plus, Download, Mail, MoreHorizontal, User, Phone, MapPin, Users, Edit, ArrowRight, Activity, CreditCard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import StudentProfileView from '../components/teacher/StudentProfileView';
import StudentFormModal from '../components/crm/StudentFormModal';
import MessageStudentModal from '../components/crm/MessageStudentModal';
import NaturalLanguageSearch from '../components/crm/NaturalLanguageSearch';
import { motion, AnimatePresence } from 'framer-motion';

export default function Students() {
  const [view, setView] = useState('list'); // 'list' or 'families'
  const [search, setSearch] = useState(''); // Legacy simple search
  const [aiFilter, setAiFilter] = useState(null); // New AI smart filter
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [studentToMessage, setStudentToMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'prospect'
  const [billingFilter, setBillingFilter] = useState('all'); // 'all', 'auto_pay', 'manual'

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(null, 1000),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
    enabled: !!aiFilter?.class_filters // Only fetch if we need to filter by class
  });

  // Stats
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'active').length;
  const prospects = students.filter(s => s.status === 'prospect').length;
  
  // Grouping for Families View
  const families = React.useMemo(() => {
    const groups = {};
    students.forEach(s => {
      const key = s.parent_email || 'Unknown';
      if (!groups[key]) {
        groups[key] = {
          email: s.parent_email,
          parent_name: s.parent_name || 'Unknown Parent',
          phone: s.phone,
          students: []
        };
      }
      groups[key].students.push(s);
    });
    return Object.values(groups).filter(g => g.email); // Filter out students with no parent email for the main family list if desired, or keep them
  }, [students]);

  const filteredStudents = students.filter(s => {
    // 1. Base Manual Filters
    const matchesSearch = !search || (
                         s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.parent_email?.toLowerCase().includes(search.toLowerCase()) ||
                         s.parent_name?.toLowerCase().includes(search.toLowerCase()) ||
                         s.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase())));
    
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesBilling = billingFilter === 'all' || s.billing_method === billingFilter;

    // 2. AI Smart Filters (if active)
    let matchesAi = true;
    if (aiFilter) {
        // Direct Student Filters
        if (aiFilter.filters) {
            const f = aiFilter.filters;
            if (f.name && !s.name.toLowerCase().includes(f.name.toLowerCase())) matchesAi = false;
            if (f.status && s.status !== f.status) matchesAi = false;
            if (f.billing_method && s.billing_method !== f.billing_method) matchesAi = false;
            if (f.level && s.level.toLowerCase() !== f.level.toLowerCase()) matchesAi = false;
            if (f.age) {
                // Ensure number comparison to handle potential string data
                // Treat "age X" as the range [X, X+1) (e.g. 9 means 9.0 up to 9.99...)
                if (f.age.$eq !== undefined) {
                    const studentAge = Number(s.age);
                    const targetAge = Number(f.age.$eq);
                    // Exclude students with invalid/missing age (NaN) from matching
                    if (isNaN(studentAge)) {
                        matchesAi = false;
                    } else if (studentAge < targetAge || studentAge >= targetAge + 1) {
                        matchesAi = false;
                    }
                }
                if (f.age.$gt !== undefined && Number(s.age) <= Number(f.age.$gt)) matchesAi = false;
                if (f.age.$gte !== undefined && Number(s.age) < Number(f.age.$gte)) matchesAi = false;
                if (f.age.$lt !== undefined && Number(s.age) >= Number(f.age.$lt)) matchesAi = false;
                if (f.age.$lte !== undefined && Number(s.age) > Number(f.age.$lte)) matchesAi = false;
            }
            if (f.tags && f.tags.length > 0) {
                 // Check if student has ANY of the requested tags (OR logic? or AND?) - usually AND for filters
                 const hasTags = f.tags.every(tag => s.tags?.some(t => t.toLowerCase().includes(tag.toLowerCase())));
                 if (!hasTags) matchesAi = false;
            }
        }

        // Class-based Filters (Indirect)
        if (aiFilter.class_filters && matchesAi) {
            const cf = aiFilter.class_filters;
            // Find all classes that match the criteria
            const matchingClasses = classes.filter(c => {
                let match = true;
                if (cf.day && c.day !== cf.day) match = false;
                if (cf.style && !c.style?.toLowerCase().includes(cf.style.toLowerCase())) match = false;
                if (cf.teacher && !c.teacher?.toLowerCase().includes(cf.teacher.toLowerCase())) match = false;
                return match;
            });
            
            // Check if student is enrolled in ANY of those matching classes
            // DanceClass entity has "student_names" array (which is name based, not ID based in this schema)
            const isEnrolled = matchingClasses.some(c => c.student_names?.includes(s.name));
            if (!isEnrolled) matchesAi = false;
        }
    }

    return matchesSearch && matchesStatus && matchesBilling && matchesAi;
  });

  const filteredFamilies = families.filter(f => 
    f.parent_name.toLowerCase().includes(search.toLowerCase()) || 
    f.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (e, student) => {
    e.stopPropagation();
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingStudent(null);
    setIsFormOpen(true);
  };

  const handleMessage = (e, student) => {
    e.stopPropagation();
    setStudentToMessage(student);
    setMessageModalOpen(true);
  };

  if (selectedStudent) {
    return (
      <StudentProfileView 
        student={selectedStudent} 
        teacherName={currentUser?.full_name || "Admin Staff"} 
        onBack={() => setSelectedStudent(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-6 md:p-12 font-sans text-[#333333]">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Stats */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
               <Link to={createPageUrl('Home')} className="hover:text-[#333333]">Dashboard</Link>
               <span>/</span>
               <span className="text-[#333333]">CRM</span>
            </div>
            <h1 className="text-4xl font-serif text-[#333333]">Student Directory</h1>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
             <Card className="bg-white border-none shadow-sm rounded-2xl w-32">
               <CardContent className="p-4 text-center">
                 <div className="text-2xl font-serif text-[#333333]">{activeStudents}</div>
                 <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Active</div>
               </CardContent>
             </Card>
             <Card className="bg-white border-none shadow-sm rounded-2xl w-32">
               <CardContent className="p-4 text-center">
                 <div className="text-2xl font-serif text-[#333333]">{prospects}</div>
                 <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Prospects</div>
               </CardContent>
             </Card>
             <Button 
               onClick={handleCreate}
               className="h-auto bg-[#333333] text-white rounded-2xl px-6 hover:bg-black shadow-lg transition-transform hover:scale-105"
             >
               <div className="flex flex-col items-center gap-1 py-2">
                 <Plus className="w-6 h-6" />
                 <span className="text-xs font-bold uppercase tracking-wider">New Student</span>
               </div>
             </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-[24px] shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="flex flex-col gap-4 w-full lg:flex-1">
            {/* AI Search Bar Replaces Standard Search for Primary Interaction */}
            <div className="w-full max-w-2xl">
                <NaturalLanguageSearch onFilterChange={setAiFilter} />
            </div>

            <div className="flex items-center gap-4">
              {/* Legacy Search Fallback / Supplement */}
              {!aiFilter && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Filter list by text..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-9 bg-[#F4F4F6] border-none rounded-xl w-full text-sm"
                  />
                </div>
              )}
              
              <div className="flex gap-1 bg-[#F4F4F6] p-1 rounded-xl w-full sm:w-auto self-start">
               <Button 
                 variant="ghost" 
                 size="sm"
                 onClick={() => setView('list')}
                 className={`rounded-lg text-xs font-medium ${view === 'list' ? 'bg-white shadow-sm text-[#333333]' : 'text-gray-400 hover:text-[#333333]'}`}
               >
                 Students
               </Button>
               <Button 
                 variant="ghost" 
                 size="sm"
                 onClick={() => setView('families')}
                 className={`rounded-lg text-xs font-medium ${view === 'families' ? 'bg-white shadow-sm text-[#333333]' : 'text-gray-400 hover:text-[#333333]'}`}
               >
                 Families
               </Button>
            </div>
          </div>
        </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="outline" className={`rounded-xl border-gray-200 gap-2 ${billingFilter !== 'all' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-gray-600'}`}>
                   <CreditCard className="w-4 h-4" />
                   {billingFilter === 'all' ? 'Billing Method' : billingFilter === 'auto_pay' ? 'Method: Auto-Pay' : 'Method: Manual'}
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent>
                 <DropdownMenuItem onClick={() => setBillingFilter('all')}>All Methods</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setBillingFilter('auto_pay')}>Auto-Pay</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setBillingFilter('manual')}>Manual Invoice</DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>

             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="outline" className="rounded-xl border-gray-200 text-gray-600 gap-2">
                   <Filter className="w-4 h-4" />
                   {statusFilter === 'all' ? 'Status' : statusFilter}
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent>
                 <DropdownMenuItem onClick={() => setStatusFilter('all')}>All Status</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setStatusFilter('active')}>Active</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setStatusFilter('prospect')}>Prospect</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>Inactive</DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
             <Button variant="ghost" size="icon" className="text-gray-400 hover:text-[#333333]">
               <Download className="w-5 h-5" />
             </Button>
          </div>
        </div>

        {/* Main Content View */}
        <div className="min-h-[500px]">
          {view === 'list' ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-20 text-gray-400">No students found matching your search.</div>
              ) : (
                <div className="bg-white rounded-[32px] shadow-sm overflow-hidden">
                  {/* Mobile Card View (hidden on lg and up) */}
                  <div className="block lg:hidden space-y-4 p-4 bg-[#F4F4F6]">
                    {filteredStudents.map((student) => (
                       <Card key={student.id} className="border-none shadow-sm rounded-2xl cursor-pointer" onClick={() => setSelectedStudent(student)}>
                          <CardContent className="p-4">
                             <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                   <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                                      <AvatarFallback className="bg-[#333333] text-white font-serif">{student.name.charAt(0)}</AvatarFallback>
                                   </Avatar>
                                   <div>
                                      <div className="font-medium text-[#333333]">{student.name}</div>
                                      <div className="text-xs text-gray-400">{student.age} yrs • {student.level}</div>
                                   </div>
                                </div>
                                <Badge variant="secondary" className={`capitalize font-normal text-xs ${student.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100'}`}>
                                   {student.status}
                                </Badge>
                             </div>
                             
                             <div className="flex flex-wrap gap-2 mb-4">
                                {student.billing_method === 'auto_pay' && (
                                   <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-600 bg-indigo-50">Auto-Pay</Badge>
                                )}
                                {student.tags?.slice(0, 3).map((tag, i) => (
                                   <Badge key={i} variant="secondary" className="text-[10px] bg-[#333333] text-white font-normal border-none">{tag}</Badge>
                                ))}
                             </div>

                             <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                                {student.parent_email ? (
                                   <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                                      <Mail className="w-3 h-3" /> <span className="truncate">{student.parent_email}</span>
                                   </div>
                                ) : <span>No contact</span>}
                                <div className="flex items-center gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                                      onClick={(e) => handleMessage(e, student)}
                                    >
                                      <Mail className="w-4 h-4" />
                                    </Button>
                                    <ArrowRight className="w-4 h-4 text-gray-300" />
                                </div>
                             </div>
                          </CardContent>
                       </Card>
                    ))}
                  </div>

                  {/* Desktop Table View (hidden on mobile/tablet) */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 tracking-wider font-bold">
                          <th className="p-4 md:p-6 font-medium">Student Name</th>
                          <th className="p-4 md:p-6 font-medium">Status</th>
                          <th className="p-4 md:p-6 font-medium hidden sm:table-cell">Level / Age</th>
                          <th className="p-4 md:p-6 font-medium hidden lg:table-cell">Parent Contact</th>
                          <th className="p-4 md:p-6 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => (
                          <motion.tr 
                            key={student.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="group hover:bg-[#F4F4F6] transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                            onClick={() => setSelectedStudent(student)}
                          >
                            <td className="p-4 md:p-6">
                              <div className="flex items-center gap-4">
                                <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                                  <AvatarFallback className="bg-[#333333] text-white font-serif">{student.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-[#333333]">{student.name}</div>
                                  {student.joined_date && <div className="text-xs text-gray-400">Joined {student.joined_date}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 md:p-6">
                              <Badge variant="secondary" className={`
                                capitalize font-normal
                                ${student.status === 'active' ? 'bg-green-50 text-green-700' : 
                                  student.status === 'prospect' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-500'}
                              `}>
                                {student.status}
                              </Badge>
                            </td>
                            <td className="p-4 md:p-6 hidden sm:table-cell">
                              <div className="text-sm text-[#333333] capitalize">{student.level}</div>
                              <div className="text-xs text-gray-400">{student.age} years old</div>
                              </td>
                              <td className="p-4 md:p-6 hidden lg:table-cell">
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap gap-1 mb-1">
                                   {student.billing_method === 'auto_pay' && (
                                      <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-600 bg-indigo-50">Auto-Pay</Badge>
                                   )}
                                   {student.tags?.slice(0, 3).map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] bg-[#333333] text-white font-normal border-none">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                                {student.parent_email ? (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="w-3 h-3" /> {student.parent_email}
                                  </div>
                                ) : <span className="text-xs text-gray-300">No email</span>}
                                {student.phone && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-3 h-3" /> {student.phone}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4 md:p-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title="Message Student"
                                  className="h-8 w-8 text-indigo-500 bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-700 shadow-sm border border-indigo-100"
                                  onClick={(e) => handleMessage(e, student)}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-gray-400 hover:text-[#333333] hover:bg-white shadow-sm"
                                  onClick={(e) => handleEdit(e, student)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-gray-400 hover:text-[#333333] hover:bg-white shadow-sm"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFamilies.map((family, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-[32px] p-8 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                >
                   <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#F4F4F6]">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                   </div>

                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-[#F2DCDD] flex items-center justify-center text-[#333333]">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-serif text-xl text-[#333333]">{family.parent_name}</h3>
                        <p className="text-sm text-gray-400">{family.students.length} Student{family.students.length !== 1 && 's'}</p>
                      </div>
                   </div>

                   <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm text-gray-600 bg-[#F4F4F6] p-3 rounded-xl">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{family.email}</span>
                      </div>
                      {family.phone && (
                        <div className="flex items-center gap-3 text-sm text-gray-600 bg-[#F4F4F6] p-3 rounded-xl">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{family.phone}</span>
                        </div>
                      )}
                   </div>

                   <div>
                     <div className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Children</div>
                     <div className="flex flex-wrap gap-2">
                       {family.students.map(s => (
                         <Badge 
                           key={s.id} 
                           variant="outline" 
                           className="cursor-pointer hover:bg-gray-50 border-gray-200 text-gray-600 font-normal py-1 px-3"
                           onClick={() => setSelectedStudent(s)}
                         >
                           {s.name}
                         </Badge>
                       ))}
                     </div>
                   </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>

      <StudentFormModal 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen}
        studentToEdit={editingStudent}
      />
      
      <MessageStudentModal 
        isOpen={messageModalOpen}
        onOpenChange={setMessageModalOpen}
        student={studentToMessage}
      />
    </div>
  );
}