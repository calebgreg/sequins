import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Plus, Download, Mail, User, Phone, Edit, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { createPageUrl } from '../utils';
import { Link, useLocation } from 'react-router-dom';
import StudentProfileView from '../components/teacher/StudentProfileView';
import FamilyProfileView from '../components/crm/FamilyProfileView';
import StudentFormModal from '../components/crm/StudentFormModal';
import MessageStudentModal from '../components/crm/MessageStudentModal';
import NaturalLanguageSearch from '../components/crm/NaturalLanguageSearch';
import BulkActionBar from '../components/crm/BulkActionBar';
import { motion, AnimatePresence } from 'framer-motion';

// Design tokens
const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  warm: '#f5f3ef',
  muted: '#8a8478',
  border: '#e8e6e1',
  frost: '#fef7f7',
  frostShadow: 'rgba(180, 120, 120, 0.08)',
  frostDeep: 'rgba(180, 120, 120, 0.05)',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
};

// Etched text component
const EtchedText = ({ children, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };
  
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

export default function Students() {
  const location = useLocation();
  const [view, setView] = useState('list'); // 'list' or 'families'
  const [search, setSearch] = useState(''); // Legacy simple search
  const [aiFilter, setAiFilter] = useState(null); // New AI smart filter
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [studentToMessage, setStudentToMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'prospect'
  const [billingFilter, setBillingFilter] = useState('all'); // 'all', 'auto_pay', 'manual'
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list('-created_date', 1000),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
    enabled: !!aiFilter?.class_filters // Only fetch if we need to filter by class
  });

  // Handle direct student links via URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const studentId = params.get('id');
    if (studentId && students.length > 0) {
      const studentToSelect = students.find(s => s.id === studentId);
      if (studentToSelect) {
        setSelectedStudent(studentToSelect);
      }
    }
  }, [location.search, students]);

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
                    if (s.age === null || s.age === undefined || s.age === '' || isNaN(studentAge)) {
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

  const filteredFamilies = families.filter(f => {
    const matchesSearch = f.parent_name.toLowerCase().includes(search.toLowerCase()) || 
                          f.email?.toLowerCase().includes(search.toLowerCase());

    if (!aiFilter) return matchesSearch;

    // Check if ANY student in the family matches the AI filter
    const hasMatchingStudent = f.students.some(s => {
        let studentMatchesAi = true;

        if (aiFilter.filters) {
            const af = aiFilter.filters;
            if (af.name && !s.name.toLowerCase().includes(af.name.toLowerCase())) studentMatchesAi = false;
            if (af.status && s.status !== af.status) studentMatchesAi = false;
            if (af.billing_method && s.billing_method !== af.billing_method) studentMatchesAi = false;
            if (af.level && s.level.toLowerCase() !== af.level.toLowerCase()) studentMatchesAi = false;
            if (af.age) {
                const currentStudentAge = Number(s.age);
                if (af.age.$eq !== undefined) {
                    const targetAge = Number(af.age.$eq);
                    if (s.age === null || s.age === undefined || s.age === '' || isNaN(currentStudentAge) || 
                        currentStudentAge < targetAge || currentStudentAge >= targetAge + 1) {
                        studentMatchesAi = false;
                    }
                }
                if (af.age.$gt !== undefined && currentStudentAge <= Number(af.age.$gt)) studentMatchesAi = false;
                if (af.age.$gte !== undefined && currentStudentAge < Number(af.age.$gte)) studentMatchesAi = false;
                if (af.age.$lt !== undefined && currentStudentAge >= Number(af.age.$lt)) studentMatchesAi = false;
                if (af.age.$lte !== undefined && currentStudentAge > Number(af.age.$lte)) studentMatchesAi = false;
            }
            if (af.tags && af.tags.length > 0) {
                 const hasTags = af.tags.every(tag => s.tags?.some(t => t.toLowerCase().includes(tag.toLowerCase())));
                 if (!hasTags) studentMatchesAi = false;
            }
        }

        if (aiFilter.class_filters && studentMatchesAi) {
            const cf = aiFilter.class_filters;
            const matchingClasses = classes.filter(c => {
                let match = true;
                if (cf.day && c.day !== cf.day) match = false;
                if (cf.style && !c.style?.toLowerCase().includes(cf.style.toLowerCase())) match = false;
                if (cf.teacher && !c.teacher?.toLowerCase().includes(cf.teacher.toLowerCase())) match = false;
                return match;
            });
            const isEnrolled = matchingClasses.some(c => c.student_names?.includes(s.name));
            if (!isEnrolled) studentMatchesAi = false;
        }

        return studentMatchesAi;
    });

    return matchesSearch && hasMatchingStudent;
  });

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

  const toggleStudentSelection = (e, studentId) => {
    e.stopPropagation();
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const clearSelection = () => {
    setSelectedStudentIds([]);
  };

  if (selectedStudent) {
    return (
      <StudentProfileView 
        student={selectedStudent} 
        teacherName={currentUser?.full_name || "Admin Staff"} 
        onBack={() => setSelectedStudent(null)}
        onViewFamily={() => {
            const family = families.find(f => f.email === selectedStudent.parent_email);
            if (family) {
                setSelectedStudent(null);
                setSelectedFamily(family);
            }
        }}
      />
    );
  }

  if (selectedFamily) {
    return (
      <FamilyProfileView 
        family={selectedFamily} 
        onBack={() => setSelectedFamily(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8 font-sans" style={{ backgroundColor: colors.paper }}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Frosted Header */}
        <div 
          className="px-6 py-5 rounded-3xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
          style={{
            background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 200, 200, 0.3)',
            boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
          }}
        >
          <div>
            <div className="flex items-center gap-2 text-sm mb-1" style={{ color: colors.muted }}>
               <Link to={createPageUrl('Home')} className="hover:opacity-70 transition-opacity">Dashboard</Link>
               <span>/</span>
               <span style={{ color: colors.etchDark }}>CRM</span>
            </div>
            <EtchedText size="xl">Student Directory</EtchedText>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
             <div 
               className="rounded-2xl px-5 py-3 text-center min-w-[100px]"
               style={{
                 background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
                 boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
               }}
             >
               <EtchedText size="lg">{activeStudents}</EtchedText>
               <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Active</div>
             </div>
             <div 
               className="rounded-2xl px-5 py-3 text-center min-w-[100px]"
               style={{
                 background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
                 boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
               }}
             >
               <EtchedText size="lg">{prospects}</EtchedText>
               <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Prospects</div>
             </div>
             <Button 
               onClick={handleCreate}
               className="h-auto rounded-2xl px-6 transition-all hover:scale-105"
               style={{ 
                 backgroundColor: colors.ink, 
                 color: '#fff',
                 boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
               }}
             >
               <div className="flex flex-col items-center gap-1 py-2">
                 <Plus className="w-5 h-5" />
                 <span className="text-[10px] font-bold uppercase tracking-wider">New Student</span>
               </div>
             </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div 
          className="p-5 rounded-3xl space-y-5"
          style={{
            background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 200, 200, 0.3)',
            boxShadow: `inset 0 2px 12px ${colors.frostShadow}, 0 4px 24px ${colors.frostDeep}`,
          }}
        >
          {/* Top: Search Area */}
          <div className="w-full">
              <NaturalLanguageSearch 
                onFilterChange={setAiFilter} 
                onSearchChange={setSearch}
              />
          </div>

          {/* Bottom: Filter Chips & View Toggles */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-2">
               {/* Primary View Toggle */}
               <div 
                 className="flex gap-1 p-1 rounded-full mr-2"
                 style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
               >
                 <button 
                   onClick={() => setView('list')}
                   className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
                   style={{
                     backgroundColor: view === 'list' ? colors.ink : 'transparent',
                     color: view === 'list' ? '#fff' : colors.muted,
                     boxShadow: view === 'list' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                   }}
                 >
                   Students
                 </button>
                 <button 
                   onClick={() => setView('families')}
                   className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
                   style={{
                     backgroundColor: view === 'families' ? colors.ink : 'transparent',
                     color: view === 'families' ? '#fff' : colors.muted,
                     boxShadow: view === 'families' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                   }}
                 >
                   Families
                 </button>
               </div>

               {/* Divider */}
               <div className="w-px h-6 hidden sm:block mx-1" style={{ backgroundColor: 'rgba(200,180,170,0.2)' }}></div>

               {/* Quick Filters */}
               <button 
                 onClick={() => setStatusFilter(current => current === 'active' ? 'all' : 'active')}
                 className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                 style={{
                   backgroundColor: statusFilter === 'active' ? colors.ink : 'rgba(255,255,255,0.6)',
                   color: statusFilter === 'active' ? '#fff' : colors.muted,
                   boxShadow: statusFilter === 'active' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                 }}
               >
                 Active
               </button>
               <button 
                 onClick={() => setStatusFilter(current => current === 'prospect' ? 'all' : 'prospect')}
                 className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                 style={{
                   backgroundColor: statusFilter === 'prospect' ? colors.ink : 'rgba(255,255,255,0.6)',
                   color: statusFilter === 'prospect' ? '#fff' : colors.muted,
                   boxShadow: statusFilter === 'prospect' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                 }}
               >
                 Prospects
               </button>
               <button 
                 onClick={() => setBillingFilter(current => current === 'auto_pay' ? 'all' : 'auto_pay')}
                 className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                 style={{
                   backgroundColor: billingFilter === 'auto_pay' ? colors.ink : 'rgba(255,255,255,0.6)',
                   color: billingFilter === 'auto_pay' ? '#fff' : colors.muted,
                   boxShadow: billingFilter === 'auto_pay' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                 }}
               >
                 Auto-Pay
               </button>
               <button 
                 onClick={() => setBillingFilter(current => current === 'manual' ? 'all' : 'manual')}
                 className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                 style={{
                   backgroundColor: billingFilter === 'manual' ? colors.ink : 'rgba(255,255,255,0.6)',
                   color: billingFilter === 'manual' ? '#fff' : colors.muted,
                   boxShadow: billingFilter === 'manual' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                 }}
               >
                 Manual
               </button>
            </div>

            <button 
              className="p-2.5 rounded-full transition-all hover:scale-105"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
            >
               <Download className="w-4 h-4" style={{ color: colors.etchDark }} />
            </button>
          </div>
        </div>

        {/* Main Content View */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            {view === 'list' ? (
              <motion.div
                key="list-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 gap-4"
              >
                {filteredStudents.length === 0 ? (
                  <div 
                    className="text-center py-20 rounded-3xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
                      color: colors.muted,
                      border: '1px solid rgba(255, 200, 200, 0.3)',
                    }}
                  >
                    No students found matching your search.
                  </div>
                ) : (
                  <div 
                    className="rounded-3xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.98) 0%, rgba(252, 231, 231, 0.95) 100%)',
                      border: '1px solid rgba(255, 200, 200, 0.3)',
                      boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
                    }}
                  >
                    {/* Mobile Card View (hidden on lg and up) */}
                    <div className="block lg:hidden space-y-3 p-4" style={{ backgroundColor: colors.paper }}>
                      {filteredStudents.map((student) => {
                         const isSelected = selectedStudentIds.includes(student.id);
                         return (
                         <div 
                           key={student.id} 
                           className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01]"
                           style={{
                             background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
                             boxShadow: '0 4px 16px -4px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,0.8)',
                             border: '1px solid rgba(255, 200, 200, 0.2)',
                           }}
                           onClick={() => setSelectedStudent(student)}
                         >
                               <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                     <div 
                                       onClick={(e) => toggleStudentSelection(e, student.id)}
                                       className="relative w-10 h-10 cursor-pointer transition-all duration-150"
                                       style={{
                                         transform: isSelected ? 'translateY(1px) scale(0.97)' : 'translateY(0) scale(1)',
                                       }}
                                     >
                                       {/* Outer glow ring */}
                                       {isSelected && (
                                         <div 
                                           className="absolute inset-[-6px] rounded-full pointer-events-none"
                                           style={{
                                             background: 'radial-gradient(circle, rgba(255,150,180,0.5) 50%, rgba(255,120,160,0.25) 70%, transparent 90%)',
                                             filter: 'blur(6px)',
                                           }}
                                         />
                                       )}
                                       {/* Glowing border ring */}
                                       {isSelected && (
                                         <div 
                                           className="absolute inset-0 rounded-full pointer-events-none"
                                           style={{
                                             border: '2px solid #ff9ec0',
                                             boxShadow: '0 0 8px #ff9ec0, 0 0 16px #ff80b0, inset 0 0 8px rgba(255,150,180,0.3)',
                                           }}
                                         />
                                       )}
                                       {/* Main avatar */}
                                       <Avatar 
                                         className="w-10 h-10 relative"
                                         style={{
                                           boxShadow: isSelected ? 'none' : '0 2px 8px rgba(180,150,140,0.2)',
                                           border: isSelected ? '2px solid transparent' : '2px solid rgba(255,255,255,0.8)',
                                         }}
                                       >
                                          <AvatarFallback 
                                            style={{ 
                                              background: `linear-gradient(145deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`, 
                                              color: isSelected ? '#ff90b8' : '#fff',
                                              textShadow: isSelected 
                                                ? '0 0 4px #ff90b8, 0 0 8px #ff70a0, 0 0 16px #ff5090, 0 0 24px #ff3080' 
                                                : 'none',
                                              fontWeight: '500',
                                            }}
                                          >
                                            {student.name.charAt(0)}
                                          </AvatarFallback>
                                       </Avatar>
                                     </div>
                                     <div>
                                        <EtchedText size="sm">{student.name}</EtchedText>
                                        <div className="text-xs" style={{ color: colors.muted }}>{student.age} yrs • {student.level}</div>
                                     </div>
                                  </div>
                                  <span 
                                    className="px-2 py-1 rounded-full text-[10px] font-semibold capitalize"
                                    style={{
                                      backgroundColor: student.status === 'active' ? 'rgba(134, 239, 172, 0.3)' : 'rgba(200,180,170,0.2)',
                                      color: student.status === 'active' ? '#166534' : colors.muted,
                                    }}
                                  >
                                     {student.status}
                                  </span>
                               </div>
                               
                               <div className="flex flex-wrap gap-1.5 mb-3">
                                  {student.billing_method === 'auto_pay' && (
                                     <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'rgba(199, 210, 254, 0.4)', color: '#4338ca' }}>Auto-Pay</span>
                                  )}
                                  {student.tags?.slice(0, 3).map((tag, i) => (
                                     <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: colors.ink, color: '#fff' }}>{tag}</span>
                                  ))}
                               </div>

                               <div className="flex items-center justify-between text-sm pt-3" style={{ borderTop: '1px solid rgba(200,180,170,0.15)', color: colors.muted }}>
                                  {student.parent_email ? (
                                     <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                                        <Mail className="w-3 h-3" /> <span className="truncate">{student.parent_email}</span>
                                     </div>
                                  ) : <span>No contact</span>}
                                  <div className="flex items-center gap-2">
                                      <button 
                                        className="p-1.5 rounded-full transition-all"
                                        style={{ backgroundColor: 'rgba(199, 210, 254, 0.3)' }}
                                        onClick={(e) => handleMessage(e, student)}
                                      >
                                        <Mail className="w-3.5 h-3.5" style={{ color: '#4338ca' }} />
                                      </button>
                                      <ArrowRight className="w-4 h-4" style={{ color: colors.border }} />
                                  </div>
                               </div>
                         </div>
                      );})}
                    </div>

                    {/* Desktop Table View (hidden on mobile/tablet) */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(200,180,170,0.15)' }}>
                            <th className="p-5 text-[10px] uppercase tracking-wider font-bold" style={{ color: colors.muted }}>Student Name</th>
                            <th className="p-5 text-[10px] uppercase tracking-wider font-bold" style={{ color: colors.muted }}>Status</th>
                            <th className="p-5 text-[10px] uppercase tracking-wider font-bold hidden sm:table-cell" style={{ color: colors.muted }}>Level / Age</th>
                            <th className="p-5 text-[10px] uppercase tracking-wider font-bold hidden lg:table-cell" style={{ color: colors.muted }}>Parent Contact</th>
                            <th className="p-5 text-[10px] uppercase tracking-wider font-bold text-right" style={{ color: colors.muted }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map((student) => {
                            const isSelected = selectedStudentIds.includes(student.id);
                            return (
                            <motion.tr 
                              key={student.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="group transition-colors cursor-pointer"
                              style={{ 
                                borderBottom: '1px solid rgba(200,180,170,0.1)',
                              }}
                              whileHover={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                              onClick={() => setSelectedStudent(student)}
                            >
                              <td className="p-5">
                                <div className="flex items-center gap-4">
                                  <div 
                                    onClick={(e) => toggleStudentSelection(e, student.id)}
                                    className="relative w-10 h-10 cursor-pointer transition-all duration-150"
                                    style={{
                                      transform: isSelected ? 'translateY(1px) scale(0.97)' : 'translateY(0) scale(1)',
                                    }}
                                  >
                                    {/* Outer glow ring */}
                                    {isSelected && (
                                      <div 
                                        className="absolute inset-[-6px] rounded-full pointer-events-none"
                                        style={{
                                          background: 'radial-gradient(circle, rgba(255,150,180,0.5) 50%, rgba(255,120,160,0.25) 70%, transparent 90%)',
                                          filter: 'blur(6px)',
                                        }}
                                      />
                                    )}
                                    {/* Glowing border ring */}
                                    {isSelected && (
                                      <div 
                                        className="absolute inset-0 rounded-full pointer-events-none"
                                        style={{
                                          border: '2px solid #ff9ec0',
                                          boxShadow: '0 0 8px #ff9ec0, 0 0 16px #ff80b0, inset 0 0 8px rgba(255,150,180,0.3)',
                                        }}
                                      />
                                    )}
                                    {/* Main avatar */}
                                    <Avatar 
                                      className="w-10 h-10 relative"
                                      style={{
                                        boxShadow: isSelected ? 'none' : '0 2px 8px rgba(180,150,140,0.2)',
                                        border: isSelected ? '2px solid transparent' : '2px solid rgba(255,255,255,0.8)',
                                      }}
                                    >
                                      <AvatarFallback 
                                        style={{ 
                                          background: `linear-gradient(145deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`, 
                                          color: isSelected ? '#ff90b8' : '#fff',
                                          textShadow: isSelected 
                                            ? '0 0 4px #ff90b8, 0 0 8px #ff70a0, 0 0 16px #ff5090, 0 0 24px #ff3080' 
                                            : 'none',
                                          fontWeight: '500',
                                        }}
                                      >
                                        {student.name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <div>
                                    <EtchedText size="sm">{student.name}</EtchedText>
                                    {student.joined_date && <div className="text-xs" style={{ color: colors.muted }}>Joined {student.joined_date}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="p-5">
                                <span 
                                  className="px-3 py-1 rounded-full text-[10px] font-semibold capitalize"
                                  style={{
                                    backgroundColor: student.status === 'active' ? 'rgba(134, 239, 172, 0.3)' : 
                                      student.status === 'prospect' ? 'rgba(253, 224, 71, 0.3)' : 'rgba(200,180,170,0.2)',
                                    color: student.status === 'active' ? '#166534' : 
                                      student.status === 'prospect' ? '#854d0e' : colors.muted,
                                  }}
                                >
                                  {student.status}
                                </span>
                              </td>
                              <td className="p-5 hidden sm:table-cell">
                                <div className="text-sm capitalize" style={{ color: colors.ink }}>{student.level}</div>
                                <div className="text-xs" style={{ color: colors.muted }}>{student.age} years old</div>
                                </td>
                                <td className="p-5 hidden lg:table-cell">
                                <div className="flex flex-col gap-1">
                                  <div className="flex flex-wrap gap-1 mb-1">
                                     {student.billing_method === 'auto_pay' && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'rgba(199, 210, 254, 0.4)', color: '#4338ca' }}>Auto-Pay</span>
                                     )}
                                     {student.tags?.slice(0, 3).map((tag, i) => (
                                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: colors.ink, color: '#fff' }}>
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                  {student.parent_email ? (
                                    <div className="flex items-center gap-2 text-sm" style={{ color: colors.muted }}>
                                      <Mail className="w-3 h-3" /> {student.parent_email}
                                    </div>
                                  ) : <span className="text-xs" style={{ color: colors.border }}>No email</span>}
                                  {student.phone && (
                                    <div className="flex items-center gap-2 text-sm" style={{ color: colors.muted }}>
                                      <Phone className="w-3 h-3" /> {student.phone}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    title="Message Student"
                                    className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
                                    style={{ backgroundColor: 'rgba(199, 210, 254, 0.4)' }}
                                    onClick={(e) => handleMessage(e, student)}
                                  >
                                    <Mail className="w-4 h-4" style={{ color: '#4338ca' }} />
                                  </button>
                                  <button 
                                    className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
                                    onClick={(e) => handleEdit(e, student)}
                                  >
                                    <Edit className="w-4 h-4" style={{ color: colors.etchDark }} />
                                  </button>
                                  <button 
                                    className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
                                  >
                                    <ArrowRight className="w-4 h-4" style={{ color: colors.etchDark }} />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );})}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="families-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div 
                  className="rounded-3xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.98) 0%, rgba(252, 231, 231, 0.95) 100%)',
                    border: '1px solid rgba(255, 200, 200, 0.3)',
                    boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
                  }}
                >
                   <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                         <thead>
                           <tr style={{ borderBottom: '1px solid rgba(200,180,170,0.15)' }}>
                             <th className="p-5 text-[10px] uppercase tracking-wider font-bold" style={{ color: colors.muted }}>Family Name</th>
                             <th className="p-5 text-[10px] uppercase tracking-wider font-bold" style={{ color: colors.muted }}>Students</th>
                             <th className="p-5 text-[10px] uppercase tracking-wider font-bold hidden lg:table-cell" style={{ color: colors.muted }}>Contact Info</th>
                             <th className="p-5 text-[10px] uppercase tracking-wider font-bold text-right" style={{ color: colors.muted }}>Actions</th>
                           </tr>
                         </thead>
                         <tbody>
                           {filteredFamilies.map((family, i) => {
                             const lastName = family.parent_name.split(' ').pop();
                             const familyName = `The ${lastName} Family`;
                             
                             return (
                               <motion.tr 
                                  key={family.email || i}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: i * 0.05 }}
                                  onClick={() => setSelectedFamily(family)}
                                  className="group transition-colors cursor-pointer"
                                  style={{ borderBottom: '1px solid rgba(200,180,170,0.1)' }}
                                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                               >
                                  <td className="p-5 align-top">
                                     <EtchedText size="md" className="block mb-1">{familyName}</EtchedText>
                                     <div className="flex items-center gap-2 text-sm" style={{ color: colors.muted }}>
                                        <User className="w-3.5 h-3.5 opacity-70" />
                                        <span>{family.parent_name}</span>
                                     </div>
                                  </td>
                                  <td className="p-5 align-top">
                                     <div className="flex flex-col gap-2">
                                        {family.students.map(s => (
                                           <div key={s.id} className="flex items-center gap-2">
                                              <Avatar 
                                                className="w-6 h-6"
                                                style={{
                                                  boxShadow: '0 1px 4px rgba(180,150,140,0.2)',
                                                  border: '1px solid rgba(255,255,255,0.8)',
                                                }}
                                              >
                                                 <AvatarFallback className="text-[10px]" style={{ background: `linear-gradient(145deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`, color: '#fff' }}>{s.name.charAt(0)}</AvatarFallback>
                                              </Avatar>
                                              <span className="text-sm" style={{ color: colors.ink }}>{s.name}</span>
                                              <span className="text-xs" style={{ color: colors.muted }}>({s.age} yrs • {s.level})</span>
                                           </div>
                                        ))}
                                     </div>
                                  </td>
                                  <td className="p-5 hidden lg:table-cell align-top">
                                     <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2 text-sm" style={{ color: colors.muted }}>
                                           <Mail className="w-3.5 h-3.5" style={{ color: colors.etchDark }} />
                                           <span>{family.email}</span>
                                        </div>
                                        {family.phone && (
                                           <div className="flex items-center gap-2 text-sm" style={{ color: colors.muted }}>
                                              <Phone className="w-3.5 h-3.5" style={{ color: colors.etchDark }} />
                                              <span>{family.phone}</span>
                                           </div>
                                        )}
                                     </div>
                                  </td>
                                  <td className="p-5 text-right align-top">
                                     <div className="flex items-center justify-end gap-2">
                                        <button 
                                           className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
                                           style={{ backgroundColor: 'rgba(199, 210, 254, 0.4)' }}
                                           onClick={(e) => {
                                              e.stopPropagation();
                                              if (family.students[0]) handleMessage(e, family.students[0]);
                                           }}
                                           title="Message Family"
                                        >
                                           <Mail className="w-4 h-4" style={{ color: '#4338ca' }} />
                                        </button>
                                        <button 
                                           className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
                                           style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
                                           onClick={(e) => {
                                              e.stopPropagation();
                                              if (family.students[0]) handleEdit(e, family.students[0]);
                                           }}
                                           title="Edit Family Details"
                                        >
                                           <Edit className="w-4 h-4" style={{ color: colors.etchDark }} />
                                        </button>
                                        <button 
                                           className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
                                           style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
                                        >
                                           <ArrowRight className="w-4 h-4" style={{ color: colors.etchDark }} />
                                        </button>
                                     </div>
                                  </td>
                               </motion.tr>
                             );
                           })}
                         </tbody>
                      </table>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedStudentIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <BulkActionBar 
              selectedIds={selectedStudentIds}
              students={students}
              onClear={clearSelection}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}