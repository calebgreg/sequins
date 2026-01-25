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

export default function AddStaffModal({
  isOpen,
  onClose,
  onAdd,
  reportsToId,
  staffList,
}) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');

  const reportsTo = staffList.find(s => s.id === reportsToId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && title) {
      onAdd({ name, title, email, manager_id: reportsToId });
      setName('');
      setTitle('');
      setEmail('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#1a1a1a]">
            Add Staff Member
          </DialogTitle>
          <p className="text-sm text-[#6b7280] mt-2">
            {reportsTo
              ? `Adding to ${reportsTo.name}'s team`
              : 'Add to organization'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div>
            <Label className="text-xs font-medium text-[#374151] mb-2 block">
              Full Name
            </Label>
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
            <Label className="text-xs font-medium text-[#374151] mb-2 block">
              Title / Role
            </Label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lead Instructor - Ballet"
              className="w-full px-3.5 py-3 rounded-lg border border-[#e5e5e5] text-sm"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-[#374151] mb-2 block">
              Email
            </Label>
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
}