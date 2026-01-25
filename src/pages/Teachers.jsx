import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Download, X, Plus, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import StaffMessageModal from '../components/staff/StaffMessageModal';
import TeacherDetailSheet from '../components/manager/TeacherDetailSheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Teachers() {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addReportsTo, setAddReportsTo] = useState(null);
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
      setAddReportsTo(null);
    }
  });

  const getDirectReports = (managerId) => {
    return teachers.filter(t => t.manager_id === managerId);
  };

  const countAllReports = (managerId) => {
    const direct = getDirectReports(managerId);
    let total = direct.length;
    direct.forEach(person => {
      total += countAllReports(person.id);
    });
    return total;
  };

  const topPerson = useMemo(() => {
    return teachers.find(t => !t.manager_id);
  }, [teachers]);

  const topPersonReports = useMemo(() => {
    return topPerson ? getDirectReports(topPerson.id) : [];
  }, [teachers, topPerson]);

  // Auto-expand top person on mount
  React.useEffect(() => {
    if (topPerson && !expandedNodes.has(topPerson.id)) {
      setExpandedNodes(new Set([topPerson.id]));
    }
  }, [topPerson]);

  const toggleExpand = (id) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectTeam = (teamId) => {
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

  const handleAddReport = (reportsToId) => {
    setAddReportsTo(reportsToId);
    setIsAddOpen(true);
  };

  const StaffCard = ({ person, reportCount, isExpanded, onToggleExpand, isSelected, onSelect, onCardClick, onAddReport, isTopLevel = false }) => {
    const [isHovered, setIsHovered] = useState(false);
    const hasReports = reportCount > 0;

    return (
      <div className="relative flex flex-col items-center">
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => onCardClick(person)}
          className={`relative bg-white rounded-xl border cursor-pointer transition-all duration-150 ${
            isSelected ? 'border-[#1a1a1a] ring-2 ring-[#1a1a1a]' : 'border-[#e5e5e5] hover:shadow-lg'
          } ${isTopLevel ? 'p-6 min-w-[220px]' : 'p-5 min-w-[180px]'}`}
          style={{ boxShadow: isHovered ? '0 4px 20px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          {/* Selection Checkbox */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect(person.id);
            }}
            className={`absolute top-2.5 left-2.5 w-[18px] h-[18px] rounded-full border flex items-center justify-center cursor-pointer transition-all ${
              isSelected ? 'bg-[#1a1a1a] border-[#1a1a1a]' : 'border-[#d1d5db] bg-transparent'
            } ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>

          {/* Avatar */}
          <Avatar className={`${isTopLevel ? 'w-16 h-16' : 'w-[52px] h-[52px]'} mx-auto mb-3 border-2 border-white shadow-sm`}>
            {person.avatar_url && <AvatarImage src={person.avatar_url} />}
            <AvatarFallback className="bg-[#f3f4f6] text-[#6b7280] font-medium" style={{ fontSize: isTopLevel ? '18px' : '15px' }}>
              {person.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          {/* Name */}
          <div className={`font-semibold text-center mb-1 text-[#1a1a1a] ${isTopLevel ? 'text-base' : 'text-sm'}`}>
            {person.name}
          </div>

          {/* Title */}
          <div className={`text-center text-[#6b7280] leading-snug ${isTopLevel ? 'text-sm' : 'text-xs'}`}>
            {person.title || 'Staff Member'}
          </div>

          {/* Add Report Button */}
          {isHovered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddReport(person.id);
              }}
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-md bg-[#f3f4f6] flex items-center justify-center text-[#6b7280] hover:bg-[#e5e7eb]"
              title="Add direct report"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Report Count Badge */}
        {hasReports && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(person.id);
            }}
            className={`flex items-center gap-1 mt-2 px-3 py-1.5 rounded-full border-none text-xs font-medium transition-all ${
              isExpanded ? 'bg-[#1a1a1a] text-white' : 'bg-[#f3f4f6] text-[#1a1a1a]'
            }`}
          >
            {reportCount}
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
    );
  };

  const ReportRow = ({ manager, reports, onCollapse }) => {
    if (reports.length === 0) return null;

    return (
      <div className="mt-0">
        {/* Row Header */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-b border-[#e5e5e5] bg-[#fafafa]">
          <div className="flex items-center gap-2.5">
            <Avatar className="w-7 h-7">
              {manager.avatar_url && <AvatarImage src={manager.avatar_url} />}
              <AvatarFallback className="bg-[#e5e5e5] text-[#6b7280] text-[11px] font-medium">
                {manager.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-[#6b7280]">{manager.name}</span>
          </div>
          <button
            onClick={() => onCollapse(manager.id)}
            className="flex items-center gap-1.5 bg-transparent border-none text-sm text-[#6b7280] cursor-pointer hover:text-[#1a1a1a]"
          >
            Collapse
            <ChevronUp size={14} />
          </button>
        </div>

        {/* Connector Lines */}
        <div className="relative pt-8">
          {/* Vertical line from top */}
          <div className="absolute top-0 left-1/2 w-px h-8 bg-[#e5e5e5]" />

          {/* Horizontal line spanning cards */}
          {reports.length > 1 && (
            <div 
              className="absolute top-8 left-1/2 -translate-x-1/2 h-px bg-[#e5e5e5]" 
              style={{ width: `calc(${(reports.length - 1) * 220}px + 100px)`, maxWidth: 'calc(100% - 100px)' }}
            />
          )}

          {/* Cards Row */}
          <div className="flex justify-center gap-6 px-6 pb-8 flex-wrap">
            {reports.map((person) => {
              const reportCount = countAllReports(person.id);
              return (
                <div key={person.id} className="relative flex flex-col items-center">
                  {/* Vertical line to card */}
                  <div className="absolute -top-8 left-1/2 w-px h-8 bg-[#e5e5e5]" />
                  <StaffCard
                    person={person}
                    reportCount={reportCount}
                    isExpanded={expandedNodes.has(person.id)}
                    onToggleExpand={toggleExpand}
                    isSelected={selectedIds.has(person.id)}
                    onSelect={toggleSelect}
                    onCardClick={setViewingTeacher}
                    onAddReport={handleAddReport}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Nested Report Rows */}
        {reports.map((person) => {
          if (!expandedNodes.has(person.id)) return null;
          const nestedReports = getDirectReports(person.id);
          if (nestedReports.length === 0) return null;
          
          return (
            <ReportRow
              key={`row-${person.id}`}
              manager={person}
              reports={nestedReports}
              onCollapse={toggleExpand}
            />
          );
        })}
      </div>
    );
  };

  const AddStaffModal = ({ isOpen, onClose, reportsToId }) => {
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [email, setEmail] = useState('');
    const reportsTo = teachers.find(s => s.id === reportsToId);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (name && title) {
        createTeacherMutation.mutate({
          name,
          title,
          email,
          manager_id: reportsToId,
        });
        setName('');
        setTitle('');
        setEmail('');
      }
    };

    if (!isOpen) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#1a1a1a]">Add Staff Member</DialogTitle>
            <p className="text-sm text-[#6b7280] mt-2">
              {reportsTo ? `Reporting to ${reportsTo.name}` : 'Add to top of organization'}
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div>
              <Label className="text-xs font-medium text-[#374151] mb-2 block">Full Name</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Mitchell"
                autoFocus
                className="w-full px-3.5 py-3 rounded-lg border border-[#e5e5e5] text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-[#374151] mb-2 block">Title / Role</Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lead Instructor - Ballet"
                className="w-full px-3.5 py-3 rounded-lg border border-[#e5e5e5] text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-[#374151] mb-2 block">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sarah@studio.com"
                className="w-full px-3.5 py-3 rounded-lg border border-[#e5e5e5] text-sm"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="px-5 py-3 rounded-lg text-sm font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-5 py-3 rounded-lg bg-[#1a1a1a] hover:bg-black text-white text-sm font-medium"
              >
                Add Staff
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  const selectedStaff = teachers.filter(t => selectedIds.has(t.id));

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center justify-between">
        <div className="text-xs text-[#6b7280]">Org chart</div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e5e5e5] bg-white text-sm text-[#6b7280]">
          Full screen
        </button>
      </div>

      {/* Top Person */}
      {topPerson && (
        <div className="py-10 px-6 flex justify-center">
          <StaffCard
            person={topPerson}
            reportCount={countAllReports(topPerson.id)}
            isExpanded={expandedNodes.has(topPerson.id)}
            onToggleExpand={toggleExpand}
            isSelected={selectedIds.has(topPerson.id)}
            onSelect={toggleSelect}
            onCardClick={setViewingTeacher}
            onAddReport={handleAddReport}
            isTopLevel={true}
          />
        </div>
      )}

      {/* Direct Reports */}
      {topPerson && expandedNodes.has(topPerson.id) && topPersonReports.length > 0 && (
        <div className="mt-8">
          <ReportRow
            manager={topPerson}
            reports={topPersonReports}
            onCollapse={toggleExpand}
          />
        </div>
      )}

      {/* Teams Section */}
      <div className="px-8 py-12 border-t border-[#e5e5e5] mt-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Teams</h2>
          <button className="text-sm text-[#6b7280]">
            View all ({teams.length})
          </button>
        </div>

        <div className="flex gap-4 flex-wrap">
          {teams.map((team) => {
            const teamMembers = teachers.filter(t => t.team_ids?.includes(team.id));
            return (
              <Card
                key={team.id}
                onClick={() => selectTeam(team.id)}
                className="bg-white rounded-xl border border-[#e5e5e5] p-5 min-w-[200px] cursor-pointer hover:shadow-lg transition-all"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <div className="w-10 h-10 rounded-lg bg-[#f3f4f6] flex items-center justify-center mb-3 text-[#6b7280]">
                  <Users size={16} />
                </div>
                <div className="font-semibold text-sm text-[#1a1a1a] mb-1">{team.name}</div>
                <div className="text-xs text-[#6b7280]">
                  {teamMembers.length} {teamMembers.length === 1 ? 'person' : 'people'}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-[#1a1a1a] text-white rounded-full shadow-2xl px-6 py-4 flex items-center gap-4">
          <span className="font-medium text-sm">{selectedIds.size} selected</span>
          <div className="w-px h-6 bg-white/20" />
          <button
            onClick={() => setMessageModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#1a1a1a] text-sm font-medium"
          >
            <Mail size={16} />
            Send Message
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/20 text-[#9ca3af]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <AddStaffModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setAddReportsTo(null);
        }}
        reportsToId={addReportsTo}
      />

      <StaffMessageModal 
        isOpen={messageModalOpen}
        onOpenChange={setMessageModalOpen}
        recipients={selectedStaff}
      />

      {viewingTeacher && (
        <TeacherDetailSheet
          isOpen={isDetailOpen}
          onOpenChange={(open) => {
            setIsDetailOpen(open);
            if (!open) setViewingTeacher(null);
          }}
          teacher={viewingTeacher}
          classes={classes}
          attendance={attendance}
        />
      )}
    </div>
  );
}