import React, { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * OpportunityPartnerDetail — shows the agent's THINKING, not a business listing.
 * 
 * What the owner sees:
 * - WHY this circle of influence matters
 * - WHO the person is and why they have pull
 * - WHAT the angle is (the genuine way in)
 * - THE DRAFT — ready to approve and send
 */

export default function OpportunityPartnerDetail({ partner, relatedActions, onActionApprove, onActionDismiss }) {
  const data = partner.data || partner;
  const research = data.ai_research || {};
  const pendingAction = relatedActions.find(a => a.status === 'pending_review');
  const sentAction = relatedActions.find(a => a.status === 'approved' || a.status === 'sent');
  const [editingContent, setEditingContent] = useState(pendingAction?.content || '');

  // The agent's reasoning — pulled from the action context or the research
  const circleSize = pendingAction?.context?.circle_size || research.circle_size;
  const circleReasoning = pendingAction?.summary || research.circle_reasoning;
  const personName = pendingAction?.context?.person_name || research.person_name;
  const personRole = pendingAction?.context?.person_role || research.person_role;
  const personWhy = research.person_why;
  const angle = pendingAction?.context?.angle || research.angle;
  const channel = pendingAction?.context?.channel || research.channel;

  const channelLabel = {
    email: 'Email',
    instagram_dm: 'Instagram DM',
    in_person_drop_by: 'Drop by in person',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-5 pb-5 pt-1"
    >
      <div className="h-px mb-4" style={{ background: 'rgba(200,180,170,0.12)' }} />

      {/* THE REASONING — why this matters */}
      {circleReasoning && (
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#6A5A56' }}>
          {circleReasoning}
        </p>
      )}

      {/* THE CIRCLE — what the agent found */}
      <div 
        className="rounded-xl p-4 mb-4 space-y-3"
        style={{ 
          background: 'rgba(254,250,249,0.7)',
          boxShadow: 'inset 0 1px 2px rgba(180,150,140,0.05)',
        }}
      >
        {circleSize && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-20 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Reach</span>
            <span className="text-sm font-medium" style={{ color: '#6A5A56' }}>
              ~{circleSize} families
            </span>
          </div>
        )}
        {(personName || personRole) && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-20 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Person</span>
            <span className="text-sm" style={{ color: '#6A5A56' }}>
              {personName ? `${personName} — ${personRole}` : personRole}
              {personWhy && (
                <span className="block text-xs mt-0.5" style={{ color: '#a8998e' }}>{personWhy}</span>
              )}
            </span>
          </div>
        )}
        {angle && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-20 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Way in</span>
            <span className="text-sm leading-relaxed" style={{ color: '#6A5A56' }}>{angle}</span>
          </div>
        )}
        {channel && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-20 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Channel</span>
            <span className="text-sm" style={{ color: '#6A5A56' }}>{channelLabel[channel] || channel}</span>
          </div>
        )}
        {data.website && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-20 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Website</span>
            <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-sm truncate" style={{ color: '#7eb89a', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              {data.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
            </a>
          </div>
        )}
      </div>

      {/* THE DRAFT — ready to approve */}
      {pendingAction && (
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#c4b5ab' }}>
            {pendingAction.title || 'Draft ready'}
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
              Not this one
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
              Send it
            </button>
          </div>
        </div>
      )}

      {/* Already sent */}
      {!pendingAction && sentAction && (
        <div 
          className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: 'rgba(120,184,154,0.08)' }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#7eb89a' }} />
          <span className="text-sm" style={{ color: '#6A5A56' }}>
            Message sent — waiting for a response
          </span>
        </div>
      )}

      {/* No action yet and no research — shouldn't happen with new pipeline, but fallback */}
      {!pendingAction && !sentAction && !circleReasoning && (
        <p className="text-sm" style={{ color: '#b5a599' }}>
          The connector agent is still working on this one.
        </p>
      )}
    </motion.div>
  );
}