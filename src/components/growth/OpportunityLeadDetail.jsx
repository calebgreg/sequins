import React, { useState } from 'react';
import { motion } from 'framer-motion';
import moment from 'moment';

export default function OpportunityLeadDetail({ lead, relatedActions, onActionApprove, onActionDismiss }) {
  const data = lead.data || lead;
  const pendingAction = relatedActions.find(a => a.status === 'pending_review');
  const [editingContent, setEditingContent] = useState(pendingAction?.content || '');

  // Build the lead's story based on where they are
  const buildStory = () => {
    const parts = [];
    
    if (data.child_name && data.parent_name) {
      parts.push(`${data.child_name}'s parent ${data.parent_name}`);
    } else if (data.parent_name) {
      parts.push(data.parent_name);
    }

    if (data.source === 'referral' && data.source_detail) {
      parts.push(`came through a referral from ${data.source_detail}`);
    } else if (data.source === 'event') {
      parts.push(`was met at ${data.source_detail || 'a community event'}`);
    } else if (data.source === 'website') {
      parts.push('found you online');
    } else if (data.source === 'walk_in') {
      parts.push('walked in');
    } else if (data.source === 'social') {
      parts.push('reached out via social media');
    } else if (data.source === 'partner') {
      parts.push(`was referred by partner ${data.source_detail || ''}`);
    } else {
      parts.push('reached out');
    }

    const statusNarrative = {
      new: "and hasn't been contacted yet.",
      contacted: "and has been contacted. Waiting on them.",
      trial_scheduled: data.trial_date 
        ? `and has a trial booked for ${moment(data.trial_date).format('MMM D')}.`
        : 'and has a trial booked.',
      trial_completed: data.trial_outcome === 'attended'
        ? "and completed their trial class. Time to make an offer."
        : data.trial_outcome === 'no_show'
        ? "but didn't show up for their trial."
        : 'and their trial happened.',
      offer_made: "and received an offer. Waiting for their decision.",
      enrolled: "and enrolled!",
    };

    parts.push(statusNarrative[data.funnel_status] || '');
    return parts.join(' ');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-5 pb-5 pt-1"
    >
      <div className="h-px mb-4" style={{ background: 'rgba(200,180,170,0.12)' }} />

      {/* The story */}
      <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b7d72' }}>
        {buildStory()}
      </p>

      {/* What we know */}
      <div 
        className="rounded-xl p-4 mb-4 space-y-2.5"
        style={{ 
          background: 'rgba(254,250,249,0.7)',
          boxShadow: 'inset 0 1px 2px rgba(180,150,140,0.05)',
        }}
      >
        {data.parent_name && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Parent</span>
            <span className="text-sm" style={{ color: '#6A5A56' }}>{data.parent_name}</span>
          </div>
        )}
        {data.child_name && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Child</span>
            <span className="text-sm" style={{ color: '#6A5A56' }}>
              {data.child_name}{data.child_age ? `, age ${data.child_age}` : ''}
            </span>
          </div>
        )}
        {data.child_interests?.length > 0 && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Into</span>
            <span className="text-sm" style={{ color: '#6A5A56' }}>{data.child_interests.join(', ')}</span>
          </div>
        )}
        {data.parent_email && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Email</span>
            <a href={`mailto:${data.parent_email}`} className="text-sm truncate" style={{ color: '#6A5A56', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{data.parent_email}</a>
          </div>
        )}
        {data.parent_phone && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Phone</span>
            <a href={`tel:${data.parent_phone}`} className="text-sm" style={{ color: '#6A5A56', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{data.parent_phone}</a>
          </div>
        )}
        {data.trial_date && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Trial</span>
            <span className="text-sm" style={{ color: '#6A5A56' }}>
              {moment(data.trial_date).format('MMM D, YYYY')}
              {data.trial_outcome === 'attended' ? ' — attended' : data.trial_outcome === 'no_show' ? ' — no show' : data.trial_outcome === 'cancelled' ? ' — cancelled' : ''}
            </span>
          </div>
        )}
        {data.teacher_notes && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Notes</span>
            <span className="text-sm leading-relaxed italic" style={{ color: '#8b7d72' }}>"{data.teacher_notes}"</span>
          </div>
        )}
        {data.next_action && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Next</span>
            <span className="text-sm font-medium" style={{ color: '#6A5A56' }}>{data.next_action}</span>
          </div>
        )}
      </div>

      {/* Pending action to approve */}
      {pendingAction && (
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#c4b5ab' }}>
            {pendingAction.action_type === 'email' ? 'Follow-up email ready' :
             pendingAction.action_type === 'sms' ? 'Text message ready' :
             `${pendingAction.action_type} ready`}
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

      {data.notes && !pendingAction && (
        <div className="text-xs leading-relaxed" style={{ color: '#b5a599' }}>
          {data.notes}
        </div>
      )}
    </motion.div>
  );
}