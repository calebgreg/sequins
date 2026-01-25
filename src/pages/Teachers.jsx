import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Download, X, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import StaffMessageModal from '../components/staff/StaffMessageModal';
import TeacherDetailSheet from '../components/manager/TeacherDetailSheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SmartTeacherIntake from '../components/manager/SmartTeacherIntake';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function Teachers() {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.DanceClass.list(),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const createTeacherMutation = useMutation({
    mutationFn: (data) => base44.entities.Teacher.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsAddOpen(false);
    }
  });

  // Build org chart hierarchy
  const orgChart = useMemo(() => {
    const rootStaff = teachers.filter(t => !t.manager_id);
    
    const buildTree = (staffId) => {
      const staff = teachers.find(t => t.id === staffId);
      if (!staff) return null;
      
      const reports = teachers.filter(t => t.manager_id === staffId);
      return {
        ...staff,
        reports: reports.map(r => buildTree(r.id)).filter(Boolean)
      };
    };

    return rootStaff.map(s => buildTree(s.id)).filter(Boolean);
  }, [teachers]);

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectTeam = (teamId, e) => {
    e.stopPropagation();
    const teamMembers = teachers.filter(t => t.team_ids?.includes(teamId));
    const newSelected = new Set(selectedIds);
    
    const allSelected = teamMembers.every(tm => newSelected.has(tm.id));
    
    if (allSelected) {
      teamMembers.forEach(tm => newSelected.delete(tm.id));
    } else {
      teamMembers.forEach(tm => newSelected.add(tm.id));
    }
    
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    const selectedStaff = teachers.filter(t => selectedIds.has(t.id));
    const csv = [
      ['Name', 'Email', 'Title', 'Phone'].join(','),
      ...selectedStaff.map(s => [s.name, s.email, s.title || '', s.phone || ''].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff-export.csv';
    a.click();
  };

  const handleViewDetails = (teacher) => {
    setViewingTeacher(teacher);
    setIsDetailOpen(true);
  };

  const OrgNode = ({ staff, level = 0 }) => {
    const isSelected = selectedIds.has(staff.id);
    const hasReports = staff.reports && staff.reports.length > 0;

    return (
      <div className="flex flex-col items-center">
        {/* Staff Card */}
        <div className="relative group">
          <Card 
            className={`
              w-56 cursor-pointer transition-all duration-200 hover:shadow-lg bg-white border-2
              ${isSelected ? 'ring-2 ring-indigo-500 shadow-lg border-indigo-500' : 'border-gray-200'}
              ${level === 0 ? 'border-indigo-600' : ''}
            `}
            onClick={() => handleViewDetails(staff)}
          >
            <CardContent className="p-6 flex flex-col items-center text-center">
              {/* Checkbox */}
              <div 
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(staff.id, e);
                }}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all
                  ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 hover:border-indigo-400'}`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>

              {level === 0 && (
                <Badge className="absolute top-3 left-3 bg-indigo-600 text-white text-xs px-2 py-0.5">
                  Leader
                </Badge>
              )}

              <Avatar className="w-20 h-20 border-2 border-gray-100 shadow-sm mb-3">
                {staff.avatar_url && <AvatarImage src={staff.avatar_url} />}
                <AvatarFallback className="bg-gray-900 text-white font-serif text-xl">
                  {staff.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>

              <h4 className="font-semibold text-gray-900 text-base mb-1">{staff.name}</h4>
              <p className="text-sm text-gray-500 mb-3">{staff.title || 'Staff Member'}</p>
              
              <div className="flex gap-2 flex-wrap justify-center">
                {staff.styles && staff.styles.length > 0 && (
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                    {staff.styles[0]}
                  </Badge>
                )}
                {hasReports && (
                  <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700">
                    {staff.reports.length} report{staff.reports.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connecting Lines and Reports */}
        {hasReports && (
          <div className="flex flex-col items-center mt-16">
            {/* Vertical Line Down */}
            <div className="w-0.5 h-16 bg-gradient-to-b from-indigo-400 to-gray-300"></div>
            
            {/* Horizontal Connector Section */}
            <div className="flex items-start relative">
              {/* Horizontal Line spanning all reports */}
              {staff.reports.length > 1 && (
                <div className="h-0.5 bg-gray-300 absolute top-0 left-0 right-0"></div>
              )}
              
              {/* Direct Reports */}
              <div className="flex pt-16 gap-x-24">
                {staff.reports.map((report) => (
                  <div key={report.id} className="relative flex flex-col items-center">
                    {/* Vertical Line Up to horizontal connector */}
                    <div className="w-0.5 h-16 bg-gray-300 absolute left-1/2 -top-16 -translate-x-1/2"></div>
                    <OrgNode staff={report} level={level + 1} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const selectedStaff = teachers.filter(t => selectedIds.has(t.id));

  return (
    <div className="min-h-screen bg-[#F4F4F6] p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-serif text-[#333333] mb-2">Staff Directory</h1>
            <p className="text-gray-500">Organization chart and team structure</p>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#333333] text-white rounded-2xl px-6 hover:bg-black shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
              </DialogHeader>
              <SmartTeacherIntake 
                onSave={(data) => createTeacherMutation.mutate(data)}
                isSaving={createTeacherMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Org Chart */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-500">Org chart</h2>
            <button className="text-sm text-gray-400 hover:text-gray-600">Full screen</button>
          </div>
          
          <div className="bg-white rounded-3xl shadow-sm p-12 overflow-x-auto">
            <div className="flex justify-center gap-x-20">
              {orgChart.map(staff => (
                <OrgNode key={staff.id} staff={staff} />
              ))}
            </div>
          </div>
        </div>

        {/* Teams */}
        {teams.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-medium text-gray-500">Teams</h2>
              <button className="text-sm text-gray-400 hover:text-gray-600">View all ({teams.length})</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {teams.map(team => {
                const teamMembers = teachers.filter(t => t.team_ids?.includes(team.id));
                const allSelected = teamMembers.length > 0 && teamMembers.every(tm => selectedIds.has(tm.id));
                
                return (
                  <Card 
                    key={team.id}
                    className="cursor-pointer hover:shadow-lg transition-all group border border-gray-200 bg-white"
                    onClick={(e) => selectTeam(team.id, e)}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-gray-900 text-sm">{team.name}</h4>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
                            ${allSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 group-hover:border-indigo-400'}`}
                          >
                            {allSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {teamMembers.length} people · {teamMembers.filter(tm => tm.styles?.includes('Ballet')).length || 0} jobs
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-[#333333] text-white rounded-full shadow-2xl px-6 py-4 flex items-center gap-4">
              <span className="font-medium">
                {selectedIds.size} selected
              </span>
              
              <div className="w-px h-6 bg-white/20" />
              
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 h-8"
                onClick={() => setMessageModalOpen(true)}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 h-8"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/10"
                onClick={clearSelection}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <StaffMessageModal 
        isOpen={messageModalOpen}
        onOpenChange={setMessageModalOpen}
        recipients={selectedStaff}
      />

      <TeacherDetailSheet
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        teacher={viewingTeacher}
        classes={classes}
        attendance={attendance}
      />
    </div>
  );
}