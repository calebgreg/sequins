import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Send } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from 'sonner';

export default function StaffMessageModal({ isOpen, onOpenChange, recipients = [] }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }

    setSending(true);
    
    try {
      // Send email to each recipient
      await Promise.all(
        recipients.map(recipient => 
          base44.integrations.Core.SendEmail({
            to: recipient.email,
            subject: subject,
            body: message,
            from_name: 'Studio Management'
          })
        )
      );

      toast.success(`Message sent to ${recipients.length} ${recipients.length === 1 ? 'recipient' : 'recipients'}`);
      setSubject('');
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send messages');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Message to Staff
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              To: {recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'}
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
              {recipients.map(recipient => (
                <Badge key={recipient.id} variant="secondary" className="flex items-center gap-1.5 pr-2">
                  <Avatar className="w-5 h-5">
                    {recipient.avatar_url && <AvatarImage src={recipient.avatar_url} />}
                    <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                      {recipient.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span>{recipient.name}</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject..."
              className="w-full"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              className="w-full min-h-[200px]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !message.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {sending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}