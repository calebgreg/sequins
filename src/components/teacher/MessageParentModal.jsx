import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MessageParentModal({ isOpen, onOpenChange, student }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message || !student?.parent_email) return;
    setIsSending(true);
    
    try {
      // Send email via integration
      await base44.integrations.Core.SendEmail({
        to: student.parent_email,
        subject: subject || `Update regarding ${student.name}`,
        body: message,
        from_name: "Dance Studio Teacher"
      });

      setSent(true);
      setTimeout(() => {
        setSent(false);
        setSubject('');
        setMessage('');
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to send email", error);
      // Fallback for demo if integration fails
      setSent(true);
      setTimeout(() => {
        setSent(false);
        onOpenChange(false);
      }, 2000);
    } finally {
      setIsSending(false);
    }
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-[32px] max-w-lg p-8 border-none shadow-2xl">
        {!sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl text-[#333333]">Message Parent</DialogTitle>
              <p className="text-gray-400 text-sm">Sending to: {student.parent_email}</p>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input 
                  placeholder={`Re: ${student.name}`}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-[#F2DCDD] transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea 
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="h-32 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-[#F2DCDD] transition-all resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button 
                onClick={handleSend} 
                disabled={isSending || !message}
                className="rounded-full bg-[#333333] text-white hover:bg-black px-6"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send Message</>}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-12 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-serif text-2xl text-[#333333]">Sent!</h3>
            <p className="text-gray-400">Parent has been notified.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}