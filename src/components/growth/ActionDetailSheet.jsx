import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X, Mail, MessageSquare, Phone, ExternalLink, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

const AGENT_EMOJI = {
  connector: '🤝', attender: '🎪', accessor: '🚪', offerer: '🎁',
  converter: '✨', retainer: '💜', referrer: '📣',
};

export default function ActionDetailSheet({ action, open, onClose }) {
  const [isApproving, setIsApproving] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const queryClient = useQueryClient();

  if (!action) return null;

  const handleApprove = async () => {
    setIsApproving(true);
    await base44.entities.GrowthAction.update(action.id, { 
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries(['growthActions']);
    toast.success('Action approved');
    setIsApproving(false);
    onClose();
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    await base44.entities.GrowthAction.update(action.id, { status: 'dismissed' });
    queryClient.invalidateQueries(['growthActions']);
    toast('Action dismissed');
    setIsDismissing(false);
    onClose();
  };

  const emoji = AGENT_EMOJI[action.agent] || '🤝';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" style={{ background: '#fffaf9' }}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span>{emoji}</span>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#b5a599' }}>
              {action.agent} · {action.action_type}
            </span>
          </div>
          <DialogTitle style={{ color: '#5A4A46' }}>{action.title}</DialogTitle>
        </DialogHeader>

        {/* Target info */}
        {action.target_name && (
          <div 
            className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.6)' }}
          >
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: '#5A4A46' }}>{action.target_name}</div>
              {action.target_email && (
                <div className="text-xs mt-0.5" style={{ color: '#b5a599' }}>{action.target_email}</div>
              )}
            </div>
            {action.context?.partner_website && (
              <a 
                href={action.context.partner_website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-white/50 transition"
              >
                <ExternalLink className="w-4 h-4" style={{ color: '#b5a599' }} />
              </a>
            )}
          </div>
        )}

        {/* Subject line */}
        {action.subject && (
          <div className="mt-2">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#c4b5ab' }}>Subject</div>
            <div className="text-sm font-medium" style={{ color: '#5A4A46' }}>{action.subject}</div>
          </div>
        )}

        {/* Content preview */}
        {action.content && (
          <div className="mt-3">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#c4b5ab' }}>Message</div>
            <div 
              className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
              style={{ background: 'rgba(255,255,255,0.7)', color: '#5A4A46' }}
            >
              {action.content}
            </div>
          </div>
        )}

        {/* Summary / reasoning */}
        {action.summary && (
          <div className="mt-3">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#c4b5ab' }}>Why</div>
            <p className="text-sm" style={{ color: '#8b7d72' }}>{action.summary}</p>
          </div>
        )}

        {/* Action buttons */}
        {action.status === 'pending_review' && (
          <div className="flex gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgba(220,200,196,0.2)' }}>
            <Button
              variant="ghost"
              onClick={handleDismiss}
              disabled={isDismissing}
              className="flex-1 h-12 rounded-xl"
              style={{ color: '#b5a599' }}
            >
              {isDismissing ? 'Dismissing...' : 'Dismiss'}
            </Button>
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="flex-1 h-12 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                background: 'linear-gradient(145deg, rgba(126,184,154,0.9) 0%, rgba(110,170,140,0.85) 100%)',
                color: '#fff',
                boxShadow: '0 4px 16px -4px rgba(126,184,154,0.4)',
              }}
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}