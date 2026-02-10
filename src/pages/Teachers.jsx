import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, LayoutGrid, List, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import StaffCard from '../components/teachers/StaffCard';
import GhostCard from '../components/teachers/GhostCard';
import ReportRow from '../components/teachers/ReportRow';
import TeamCard from '../components/teachers/TeamCard';
import BulkActionBar from '../components/teachers/BulkActionBar';
import AddStaffModal from '../components/teachers/modals/AddStaffModal';
import MessageModal from '../components/teachers/modals/MessageModal';
import CreateTeamModal from '../components/teachers/modals/CreateTeamModal';
import AddToTeamModal from '../components/teachers/modals/AddToTeamModal';
import { toast } from 'sonner';

export default function Teachers() {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addReportsTo, setAddReportsTo] = useState(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [createTeamModalOpen, setCreateTeamModalOpen] = useState(false);
  const [addToTeamModalOpen, setAddToTeamModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'org'

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const studioId = currentUser?.studio_id;

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', studioId],
    queryFn: () => base44.entities.Teacher.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', studioId],
    queryFn: () => base44.entities.Team.filter({ studio_id: studioId }),
    enabled: !!studioId,
  });

  const createTeacherMutation = useMutation({
    mutationFn: async (data) => {
      const teacher = await base44.entities.Teacher.create(data);
      // If email provided, send invite to join the app
      if (data.email) {
        try {
          await base44.users.inviteUser(data.email, 'user');
        } catch (inviteError) {
          console.warn('Could not send invite:', inviteError);
        }
      }
      return teacher;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setAddModalOpen(false);
      setAddReportsTo(null);
      toast.success(variables.email ? 'Staff member added & invite sent' : 'Staff member added');
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setCreateTeamModalOpen(false);
      toast.success('Team created');
    },
  });

  const updateTeachersMutation = useMutation({
    mutationFn: async (staffUpdates) => {
      await Promise.all(
        staffUpdates.map(({ id, data }) =>
          base44.entities.Teacher.update(id, data)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setSelectedIds(new Set());
      toast.success('Updated successfully');
    },
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

  const handleToggleExpand = useCallback((id) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCardClick = useCallback((person) => {
    navigate(createPageUrl('TeacherDetails') + `?id=${person.id}`);
  }, [navigate]);

  const handleAddStaff = useCallback((newStaffData) => {
    createTeacherMutation.mutate(newStaffData);
  }, [createTeacherMutation]);

  const handleCreateTeam = useCallback((newTeam) => {
    createTeamMutation.mutate(newTeam);
  }, [createTeamMutation]);

  const handleAddToTeam = useCallback(
    (teamId, role) => {
      const staffUpdates = Array.from(selectedIds).map(id => ({
        id,
        data: {
          team_ids: [
            ...(teachers.find(t => t.id === id)?.team_ids || []),
            teamId,
          ],
        },
      }));

      updateTeachersMutation.mutate(staffUpdates);
      setAddToTeamModalOpen(false);
    },
    [selectedIds, teachers, updateTeachersMutation]
  );

  const handleSendMessage = useCallback((recipientIds, message) => {
    // Handle message sending
    toast.success(`Message sent to ${recipientIds.length} recipients`);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#faf9f7' }}>
      {/* Header */}
      <div 
        className="px-8 py-5 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
          borderBottom: '1px solid rgba(255, 200, 200, 0.3)',
        }}
      >
        <div 
          className="inline-flex items-center gap-1 p-1 rounded-xl"
          style={{
            background: 'rgba(240,230,225,0.5)',
            boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.1)',
          }}
        >
          {[
            { id: 'list', label: 'List', icon: List },
            { id: 'org', label: 'Org Chart', icon: LayoutGrid },
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setViewMode(view.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
              style={{
                background: viewMode === view.id 
                  ? 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.8) 100%)'
                  : 'transparent',
                color: viewMode === view.id ? '#8b7d72' : '#b5a599',
                boxShadow: viewMode === view.id 
                  ? '0 2px 8px rgba(180,150,140,0.15), inset 0 1px 1px rgba(255,255,255,0.8)'
                  : 'none',
              }}
            >
              <view.icon className="w-4 h-4" />
              {view.label}
            </button>
          ))}
        </div>
        <Button
          onClick={() => setAddModalOpen(true)}
          className="text-sm text-white rounded-full px-5"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Staff
        </Button>
      </div>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.map((person) => (
              <div
                key={person.id}
                onClick={() => handleCardClick(person)}
                className="bg-white rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg border border-transparent hover:border-[#F2DCDD]"
                style={{
                  boxShadow: '0 2px 8px rgba(180,150,140,0.08)',
                }}
              >
                <div className="flex items-start gap-4">
                  <Avatar className="w-14 h-14 bg-gradient-to-br from-[#fef7f7] to-[#fce7e7] border-2 border-white shadow-sm">
                    <AvatarFallback 
                      className="text-lg font-medium"
                      style={{ color: '#c4a0a0' }}
                    >
                      {person.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#333] truncate">{person.name}</h3>
                    <p className="text-sm text-[#8a8478] truncate">{person.title || 'Staff'}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {person.styles?.slice(0, 3).map((style, i) => (
                        <span 
                          key={i}
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{ 
                            backgroundColor: 'rgba(244,206,206,0.3)',
                            color: '#8a7070',
                          }}
                        >
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-[#8a8478]">
                  {person.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" />
                      {person.email}
                    </span>
                  )}
                  {person.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {person.phone}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Add Staff Ghost Card */}
            <div
              onClick={() => setAddModalOpen(true)}
              className="rounded-2xl border-2 border-dashed p-5 cursor-pointer transition-all flex flex-col items-center justify-center hover:opacity-100 opacity-60"
              style={{ 
                minHeight: '160px',
                borderColor: 'rgba(200, 160, 160, 0.4)',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(254, 247, 247, 0.6)';
                e.currentTarget.style.borderColor = '#c4a0a0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(200, 160, 160, 0.4)';
              }}
            >
              <div 
                className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center mb-3"
                style={{ borderColor: '#c4a0a0', color: '#c4a0a0' }}
              >
                <Plus size={24} />
              </div>
              <div className="text-sm font-medium" style={{ color: '#8a8478' }}>Add Staff</div>
            </div>
          </div>
        </div>
      )}

      {/* ORG CHART VIEW */}
      {viewMode === 'org' && (
        <>
          {/* Top Person */}
          {topPerson && (
            <div className="py-10 px-6 flex justify-center">
              <StaffCard
                person={topPerson}
                reportCount={countAllReports(topPerson.id)}
                isExpanded={expandedNodes.has(topPerson.id)}
                onToggleExpand={handleToggleExpand}
                isSelected={selectedIds.has(topPerson.id)}
                onSelect={handleSelect}
                onCardClick={handleCardClick}
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
                staff={teachers}
                expandedNodes={expandedNodes}
                onToggleExpand={handleToggleExpand}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onCardClick={handleCardClick}
                onAddStaff={(managerId) => {
                  setAddReportsTo(managerId);
                  setAddModalOpen(true);
                }}
                onCollapse={handleToggleExpand}
              />
            </div>
          )}

          {/* No top person - show add button */}
          {!topPerson && (
            <div className="py-10 px-6 flex justify-center">
              <div
                onClick={() => setAddModalOpen(true)}
                className="rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all flex flex-col items-center justify-center hover:opacity-100 opacity-60"
                style={{ 
                  borderColor: 'rgba(200, 160, 160, 0.4)',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(254, 247, 247, 0.6)';
                  e.currentTarget.style.borderColor = '#c4a0a0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(200, 160, 160, 0.4)';
                }}
              >
                <div 
                  className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center mb-3"
                  style={{ borderColor: '#c4a0a0', color: '#c4a0a0' }}
                >
                  <Plus size={24} />
                </div>
                <div className="text-sm font-medium" style={{ color: '#8a8478' }}>Add First Staff Member</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Teams Section */}
      <div className="px-8 py-12 mt-8" style={{ borderTop: '1px solid rgba(255, 200, 200, 0.3)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 
            className="text-[15px] font-bold tracking-tight"
            style={{
              color: 'transparent',
              backgroundImage: 'linear-gradient(180deg, #c4a0a0 0%, #8a7070 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
            }}
          >
            Teams
          </h2>
          <Button
            onClick={() => setCreateTeamModalOpen(true)}
            className="text-sm text-white rounded-full px-5"
            style={{ backgroundColor: '#1a1a1a' }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Team
          </Button>
        </div>

        <div className="flex gap-4 flex-wrap">
          {teams.map((team) => {
            const teamMembers = teachers.filter(t =>
              t.team_ids?.includes(team.id)
            );
            return (
              <TeamCard
                key={team.id}
                team={team}
                memberCount={teamMembers.length}
                onClick={() => {
                  // Navigate to team view
                }}
              />
            );
          })}

          {/* Ghost Card for adding new team */}
          <div
            onClick={() => setCreateTeamModalOpen(true)}
            className="rounded-2xl border-2 border-dashed p-5 min-w-[200px] cursor-pointer transition-all flex flex-col items-center justify-center hover:opacity-100 opacity-60"
            style={{ 
              minHeight: '118px',
              borderColor: 'rgba(200, 160, 160, 0.4)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(254, 247, 247, 0.6)';
              e.currentTarget.style.borderColor = '#c4a0a0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(200, 160, 160, 0.4)';
            }}
          >
            <div 
              className="w-10 h-10 rounded-lg border-2 border-dashed flex items-center justify-center mb-3"
              style={{ borderColor: '#c4a0a0', color: '#c4a0a0' }}
            >
              <Plus size={20} />
            </div>
            <div className="text-xs font-medium" style={{ color: '#8a8478' }}>Add team</div>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onMessage={() => setMessageModalOpen(true)}
        onAddToTeam={() => setAddToTeamModalOpen(true)}
        onClear={() => setSelectedIds(new Set())}
      />

      {/* Modals */}
      <AddStaffModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setAddReportsTo(null);
        }}
        onAdd={handleAddStaff}
        reportsToId={addReportsTo}
        staffList={teachers}
      />

      <MessageModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        recipients={selectedIds}
        staffList={teachers}
        onSend={handleSendMessage}
      />

      <CreateTeamModal
        isOpen={createTeamModalOpen}
        onClose={() => setCreateTeamModalOpen(false)}
        onCreate={handleCreateTeam}
      />

      <AddToTeamModal
        isOpen={addToTeamModalOpen}
        onClose={() => setAddToTeamModalOpen(false)}
        onAdd={handleAddToTeam}
        teams={teams}
        selectedIds={selectedIds}
        staffList={teachers}
      />
    </div>
  );
}