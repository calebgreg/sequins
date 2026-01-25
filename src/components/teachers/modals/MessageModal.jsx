import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function MessageModal({ isOpen, onClose, recipients, staffList, onSend }) {
  const [message, setMessage] = useState('');

  const recipientNames = Array.from(recipients)
    .map(id => staffList.find(s => s.id === id)?.name)
    .filter(Boolean);

  const handleSend = () => {
    if (message.trim()) {
      onSend(Array.from(recipients), message);
      setMessage('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#1a1a1a]">
            Send Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs font-medium text-[#374151] mb-2 block">
              To
            </Label>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-[#e5e5e5] bg-[#fafafa] min-h-[46px]">
              {recipientNames.map((name, i) => (
                <span
                  key={i}
                  className="bg-[#e5e5e5] px-3 py-1 rounded-full text-xs text-[#374151]"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-[#374151] mb-2 block">
              Message
            </Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              rows={5}
              autoFocus
              className="w-full p-3 rounded-lg border border-[#e5e5e5] text-sm font-sans"
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
              onClick={handleSend}
              className="px-5 py-3 rounded-lg bg-[#1a1a1a] hover:bg-black text-white text-sm font-medium"
            >
              Send Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}