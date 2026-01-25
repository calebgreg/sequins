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

export default function CreateTeamModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name) {
      onCreate({ name, description });
      setName('');
      setDescription('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#1a1a1a]">
            Create Team
          </DialogTitle>
          <p className="text-sm text-[#6b7280] mt-2">
            Create a new team to organize your staff
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div>
            <Label className="text-xs font-medium text-[#374151] mb-2 block">
              Team Name
            </Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ballet Faculty"
              autoFocus
              className="w-full px-3.5 py-3 rounded-lg border border-[#e5e5e5] text-sm"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-[#374151] mb-2 block">
              Description
            </Label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. All ballet instructors and assistants"
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
              Create Team
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}