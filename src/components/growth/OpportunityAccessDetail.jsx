import React, { useState } from 'react';
import { motion } from 'framer-motion';
import moment from 'moment';

export default function OpportunityAccessDetail({ accessGroup, relatedActions, onActionApprove, onActionDismiss }) {
  const data = accessGroup.data || accessGroup;
  const pendingAction = relatedActions.find(a => a.status === 'pending_review');
  const [editingContent, setEditingContent] = useState(pendingAction?.content || '');

  const typeLabel = {
    daycare: 'Daycare',
    school: 'School',
    league: 'Sports League',
    church_group: 'Church Group',
    mommy_group: 'Mom Group',
    other: 'Group',
  };

  const statusStory = {
    identified: `This ${(typeLabel[data.type] || 'group').toLowerCase()} has ${data.estimated_families ? `around ${data.estimated_families} families` : 'families'} you could reach. No one has approached them yet.`,
    pursuing: `You're working on getting access here. ${data.gatekeeper_name ? `${data.gatekeeper_name} is the person to talk to.` : ''}`,
    granted: `You have access. ${data.access_type === 'flyers' ? 'They let you put up flyers.' : data.access_type === 'newsletter' ? "They'll feature you in their newsletter." : data.access_type === 'demo' ? 'You can do a demo class.' : data.access_type === 'presentation' ? 'You can present to their group.' : data.access_type === 'event' ? 'You can attend their events.' : data.access_type === 'partnership' ? "It's a full partnership." : ''} Time to activate it.`,
    active: "This channel is live and sending families your way.",
    expired: "Your access here has expired. Time to renew.",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-5 pb-5 pt-1"
    >
      <div className="h-px mb-4" style={{ background: 'rgba(200,180,170,0.12)' }} />

      <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b7d72' }}>
        {statusStory[data.access_status] || `A ${(typeLabel[data.type] || 'group').toLowerCase()} your agents identified as a growth channel.`}
      </p>

      <div 
        className="rounded-xl p-4 mb-4 space-y-2.5"
        style={{ 
          background: 'rgba(254,250,249,0.7)',
          boxShadow: 'inset 0 1px 2px rgba(180,150,140,0.05)',
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider w-20 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Type</span>
          <span className="text-sm" style={{ color: '#6A5A56' }}>{typeLabel[data.type] || data.type}</span>
        </div>
        {data.estimated_families && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-20 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Reach</span>
            <span className="text-sm" style={{ color: '#6A5A56' }}>~{data.estimated_families} families</span>
          </div>
        )}
        {data.gatekeeper_name && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-20 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Contact</span>
            <span className="text-sm" style={{ color: '#6A5A56' }}>{data.gatekeeper_name}</span>
          </div>
        )}
        {data.access_type && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-20 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Access</span>
            <span className="text-sm capitalize" style={{ color: '#6A5A56' }}>{data.access_type?.replace(/_/g, ' ')}</span>
          </div>
        )}
        {data.leads_generated > 0 && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-20 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Leads</span>
            <span className="text-sm font-medium" style={{ color: '#7eb89a' }}>{data.leads_generated} generated</span>
          </div>
        )}
        {data.access_expiration && (
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider w-20 flex-shrink-0 pt-0.5" style={{ color: '#c4b5ab' }}>Expires</span>
            <span className="text-sm" style={{ color: moment(data.access_expiration).isBefore() ? '#e08080' : '#6A5A56' }}>
              {moment(data.access_expiration).format('MMM D, YYYY')}
              {moment(data.access_expiration).isBefore() ? ' — expired' : ''}
            </span>
          </div>
        )}
      </div>

      {pendingAction && (
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#c4b5ab' }}>
            {pendingAction.action_type === 'email' ? 'Outreach email ready' : `Draft ${pendingAction.action_type} ready`}
          </div>
          {pendingAction.subject && (
            <div className="text-sm font-medium mb-2" style={{ color: '#6A5A56' }}>Subject: {pendingAction.subject}</div>
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