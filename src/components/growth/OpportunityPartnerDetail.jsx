import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function OpportunityPartnerDetail({ partner, relatedActions, onActionApprove, onActionDismiss }) {
  const data = partner.data || partner;
  const research = data.ai_research || {};
  const pendingAction = relatedActions.find(a => a.status === 'pending_review');
  const sentAction = relatedActions.find(a => a.status === 'approved' || a.status === 'sent');
  const [editingContent, setEditingContent] = useState(pendingAction?.content || '');

  const statusStory = {
    identified: 'Your Connector found this business nearby. No one has reached out yet.',
    contacted: 'An outreach email was sent. Waiting for a response.',
    connected: "They responded — there's a relationship forming here.",
    active_partner: "This is an active referral partner. They're sending you families.",
    dormant: "This partnership has gone quiet. Might be time to re-engage.",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-5 pb-5 pt-1"
    >
      <div className="h-px mb-4" style={{ background: 'rgba(200,180,170,0.12)' }} />

      {/* The story — why this matters */}
      <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b7d72' }}>
        {statusStory[data.relationship_status] || 'This business was found by your growth agents.'}
      </p>

      {/* What we know — the research card */}
      <div 
        className="rounded-xl p-4 mb-4 space-y-2.5"
        style={{ 
          background: 'rgba(254,250,249,0.7)',
          boxShadow: 'inset 0 1px 2px rgba(180,150,140,0.05)',
        }}
      >
        {data.address && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Where</span>
            <span className="text-sm" style={{ color: '#6A5A56' }}>{data.address}</span>
          </div>
        )}
        {data.phone && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Phone</span>
            <a href={`tel:${data.phone}`} className="text-sm" style={{ color: '#6A5A56', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{data.phone}</a>
          </div>
        )}
        {data.website && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Web</span>
            <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-sm truncate" style={{ color: '#7eb89a', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              {data.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
            </a>
          </div>
        )}
        {(research.rating || research.reviews_count) && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Rating</span>
            <span className="text-sm" style={{ color: '#6A5A56' }}>
              {research.rating && `${research.rating} stars`}{research.reviews_count ? ` from ${research.reviews_count} reviews` : ''}
            </span>
          </div>
        )}
        {research.summary && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Intel</span>
            <span className="text-sm leading-relaxed" style={{ color: '#6A5A56' }}>{research.summary}</span>
          </div>
        )}
        {research.why_good_fit && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Fit</span>
            <span className="text-sm leading-relaxed" style={{ color: '#6A5A56' }}>{research.why_good_fit}</span>
          </div>
        )}
      </div>

      {/* If there's a pending email — show it and let them act */}
      {pendingAction && (
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#c4b5ab' }}>
            {pendingAction.action_type === 'email' ? 'Draft email ready' : `Draft ${pendingAction.action_type} ready`}
          </div>
          {pendingAction.subject && (
            <div className="text-sm font-medium mb-2" style={{ color: '#6A5A56' }}>
              Subject: {pendingAction.subject}
            </div>
          )}
          <textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            className="w-full rounded-xl p-4 text-sm leading-relaxed max-h-[250px] overflow-y-auto resize-none outline-none border-none"
            style={{
              background: 'rgba(254,250,249,0.8)',
              boxShadow: 'inset 0 1px 3px rgba(180,150,140,0.06)',
              color: '#6A5A56',
            }}
            rows={Math.min(10, (editingContent || '').split('\n').length + 2)}
          />
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => onActionDismiss(pendingAction)}
              className="flex-1 h-11 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
              style={{
                background: 'rgba(255,255,255,0.6)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 8px rgba(180,150,140,0.08)',
                color: '#a8998e',
              }}
            >
              Not now
            </button>
            <button
              onClick={() => onActionApprove(pendingAction, editingContent)}
              className="flex-1 h-11 rounded-xl text-sm font-bold tracking-tight transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(145deg, rgba(254,247,247,0.95) 0%, rgba(252,231,231,0.9) 50%, rgba(248,225,220,0.85) 100%)',
                boxShadow: '0 6px 20px -4px rgba(180,150,140,0.3), inset 0 1px 2px rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,220,210,0.5)',
                color: '#8a7070',
              }}
            >
              Approve & send
            </button>
          </div>
        </div>
      )}

      {/* If outreach was already sent, show that */}
      {!pendingAction && sentAction && (
        <div 
          className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: 'rgba(120,184,154,0.08)' }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#7eb89a' }} />
          <span className="text-sm" style={{ color: '#6A5A56' }}>
            Outreach sent — waiting for response
          </span>
        </div>
      )}

      {/* If nothing has been done yet and no action exists */}
      {!pendingAction && !sentAction && data.relationship_status === 'identified' && (
        <div 
          className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: 'rgba(200,180,170,0.06)' }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#d4c4ba' }} />
          <span className="text-sm" style={{ color: '#a8998e' }}>
            Identified — outreach coming soon
          </span>
        </div>
      )}
    </motion.div>
  );
}