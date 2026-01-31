import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const queryClient = useQueryClient();

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const createTeacherMutation = useMutation({
    mutationFn: (data) => base44.entities.Teacher.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setAddModalOpen(false);
      setAddReportsTo(null);
      toast.success('Staff member added');
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
    // Navigate to teacher detail or profile
  }, []);

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
        <div className="text-xs" style={{ color: '#8a8478' }}>Org chart</div>
        <button 
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            color: '#8a8478',
            border: '1px solid rgba(255, 200, 200, 0.3)',
          }}
        >
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