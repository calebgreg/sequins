import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';

export default function AddToTeamModal({
  isOpen,
  onClose,
  onAdd,
  teams,
  selectedIds,
  staffList,
}) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [role, setRole] = useState('');

  const selectedNames = Array.from(selectedIds)
    .map(id => staffList.find(s => s.id === id)?.name)
    .filter(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedTeam) {
      onAdd(selectedTeam, role);
      setSelectedTeam(null);
      setRole('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#1a1a1a]">
            Add to Team
          </DialogTitle>
          <p className="text-sm text-[#6b7280] mt-2">
            Adding {selectedNames.length}{' '}
            {selectedNames.length === 1 ? 'person' : 'people'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div>
            <Label className="text-xs font-medium text-[#374151] mb-2 block">
              Select Team
            </Label>
            <div className="space-y-2">
              {teams.map(team => (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeam(team.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                    selectedTeam === team.id
                      ? 'border-[#1a1a1a] bg-[#f9fafb]'
                      : 'border-[#e5e5e5] bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#f3f4f6] flex items-center justify-center text-[#6b7280]">
                    <Users size={16} />
                  </div>
                  <span className="text-sm font-medium text-[#1a1a1a]">
                    {team.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-[#374151] mb-2 block">
              Role in Team (optional)
            </Label>
            <Input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Coach, Coordinator, Member"
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
              disabled={!selectedTeam}
              className={`px-5 py-3 rounded-lg text-sm font-medium ${
                selectedTeam
                  ? 'bg-[#1a1a1a] hover:bg-black text-white'
                  : 'bg-[#e5e5e5] text-[#9ca3af] cursor-not-allowed'
              }`}
            >
              Add to Team
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}