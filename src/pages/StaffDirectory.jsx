import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Download, X, ChevronDown, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import StaffMessageModal from '../components/staff/StaffMessageModal';

export default function StaffDirectory() {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const navigate = useNavigate();

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
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

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const selectTeam = (teamId, e) => {
    e.stopPropagation();
    const teamMembers = teachers.filter(t => t.team_ids?.includes(teamId));
    const newSelected = new Set(selectedIds);
    
    // If all team members are selected, deselect them. Otherwise, select all.
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

  const StaffCard = ({ staff, level = 0 }) => {
    const isSelected = selectedIds.has(staff.id);
    const isExpanded = expandedNodes.has(staff.id);
    const hasReports = staff.reports && staff.reports.length > 0;

    return (
      <div className="relative">
        <Card 
          className={`
            cursor-pointer transition-all duration-200 hover:shadow-md group
            ${isSelected ? 'ring-2 ring-indigo-500 shadow-md' : 'hover:ring-1 hover:ring-gray-200'}
          `}
          onClick={() => navigate(createPageUrl('Teachers') + '?id=' + staff.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <div 
                className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => toggleSelect(staff.id, e)}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all
                  ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 hover:border-indigo-400'}`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>

              <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                {staff.avatar_url && <AvatarImage src={staff.avatar_url} />}
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-serif">
                  {staff.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{staff.name}</h4>
                <p className="text-sm text-gray-500 truncate">{staff.title || 'Staff Member'}</p>
                {staff.email && (
                  <p className="text-xs text-gray-400 truncate mt-1">{staff.email}</p>
                )}
              </div>

              {hasReports && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-gray-600"
                  onClick={(e) => toggleExpand(staff.id, e)}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Direct Reports */}
        {hasReports && isExpanded && (
          <div className="ml-8 mt-4 space-y-4 border-l-2 border-gray-200 pl-4">
            {staff.reports.map(report => (
              <StaffCard key={report.id} staff={report} level={level + 1} />
            ))}
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
        <div>
          <h1 className="text-4xl font-serif text-[#333333] mb-2">Staff Directory</h1>
          <p className="text-gray-500">Organization chart and team structure</p>
        </div>

        {/* Org Chart */}
        <div className="space-y-6">
          <h2 className="text-2xl font-serif text-[#333333]">Org chart</h2>
          <div className="space-y-4">
            {orgChart.map(staff => (
              <StaffCard key={staff.id} staff={staff} />
            ))}
          </div>
        </div>

        {/* Teams */}
        {teams.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-serif text-[#333333]">Teams</h2>
              <span className="text-sm text-gray-400">View all ({teams.length})</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map(team => {
                const teamMembers = teachers.filter(t => t.team_ids?.includes(team.id));
                const allSelected = teamMembers.length > 0 && teamMembers.every(tm => selectedIds.has(tm.id));
                
                return (
                  <Card 
                    key={team.id}
                    className="cursor-pointer hover:shadow-md transition-all group"
                    onClick={(e) => selectTeam(team.id, e)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{team.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {teamMembers.length} {teamMembers.length === 1 ? 'person' : 'people'}
                            </Badge>
                          </div>
                          {team.description && (
                            <p className="text-sm text-gray-500">{team.description}</p>
                          )}
                        </div>
                        
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                          ${allSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300 group-hover:border-indigo-400'}`}
                        >
                          {allSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
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
    </div>
  );
}