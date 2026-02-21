import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import moment from 'moment';
import OpportunityPartnerDetail from './OpportunityPartnerDetail';
import OpportunityLeadDetail from './OpportunityLeadDetail';
import OpportunityAccessDetail from './OpportunityAccessDetail';

const CATEGORY_LABEL = {
  daycare: 'Daycare', pediatrician: 'Pediatrician', gym: 'Gym / Athletics',
  salon: 'Salon', church: 'Church', school: 'School', sports_league: 'Youth Sports',
  sports: 'Youth Sports', other: 'Business',
};

const ACCESS_TYPE_LABEL = {
  daycare: 'Daycare', school: 'School', league: 'League',
  church_group: 'Church Group', mommy_group: 'Mom Group', other: 'Group',
};

const LEAD_STATUS_LABEL = {
  new: 'New inquiry', contacted: 'Reached out', trial_scheduled: 'Trial booked',
  trial_completed: 'Did their trial', offer_made: 'Offer sent', enrolled: 'Enrolled',
};

export default function OpportunityFeed({ partners, accessGroups, leads, actions, agentLogs }) {
  const [expandedId, setExpandedId] = useState(null);
  const queryClient = useQueryClient();

  // Action handlers — same as ActionQueue but embedded inline
  const handleActionApprove = async (action, editedContent) => {
    const updateData = { status: 'approved', approved_at: new Date().toISOString() };
    if (editedContent !== undefined) updateData.content = editedContent;
    await base44.entities.GrowthAction.update(action.id, updateData);
    queryClient.invalidateQueries(['growthActions']);
    toast.success(`Approved: ${action.title}`);
  };

  const handleActionDismiss = async (action) => {
    await base44.entities.GrowthAction.update(action.id, { status: 'dismissed' });
    queryClient.invalidateQueries(['growthActions']);
    toast('Dismissed');
  };

  // Build unified items with the RAW entity attached so detail views can use everything
  const items = [];

  partners.forEach(p => {
    const data = p.data || p;
    const research = data.ai_research || {};
    const age = moment().diff(moment(p.created_date), 'hours');
    const relatedActions = actions.filter(a => (a.target_name === data.name || a.target_id === p.id));
    const hasPending = relatedActions.some(a => a.status === 'pending_review');

    // Show the agent's reasoning, not just "Daycare"
    const circleSize = research.circle_size;
    const personRole = research.person_role;
    const detail = circleSize 
      ? `~${circleSize} families · ${personRole || CATEGORY_LABEL[data.category] || data.category}`
      : CATEGORY_LABEL[data.category] || data.category || 'Business';
    
    // Subdetail = the angle or the reasoning, not the address
    const subdetail = research.angle 
      || research.circle_reasoning 
      || data.notes
      || data.address?.split(',').slice(0, 2).join(',');

    items.push({
      type: 'partner',
      id: p.id,
      raw: p,
      name: data.name,
      detail,
      subdetail,
      status: data.relationship_status,
      statusLabel: data.relationship_status?.replace(/_/g, ' '),
      isNew: age < 72,
      hasPending,
      relatedActions,
      sortScore: hasPending ? 100 : age < 72 ? 50 : 0,
      sortDate: p.created_date,
    });
  });

  accessGroups.forEach(ag => {
    const data = ag.data || ag;
    const relatedActions = actions.filter(a => (a.target_name === data.name || a.target_id === ag.id));
    const hasPending = relatedActions.some(a => a.status === 'pending_review');

    items.push({
      type: 'access',
      id: ag.id,
      raw: ag,
      name: data.name,
      detail: `${ACCESS_TYPE_LABEL[data.type] || data.type} · ~${data.estimated_families || '?'} families`,
      subdetail: data.gatekeeper_name ? `Contact: ${data.gatekeeper_name}` : null,
      status: data.access_status,
      statusLabel: data.access_status?.replace(/_/g, ' '),
      isNew: moment().diff(moment(ag.created_date), 'hours') < 72,
      hasPending,
      relatedActions,
      sortScore: hasPending ? 100 : 0,
      sortDate: ag.created_date,
    });
  });

  leads.forEach(l => {
    const data = l.data || l;
    if (data.funnel_status === 'lost') return;
    const relatedActions = actions.filter(a => (a.target_name === (data.child_name || data.parent_name) || a.target_id === l.id));
    const hasPending = relatedActions.some(a => a.status === 'pending_review');
    const isHot = ['trial_scheduled', 'trial_completed', 'offer_made'].includes(data.funnel_status);

    items.push({
      type: 'lead',
      id: l.id,
      raw: l,
      name: data.child_name || data.parent_name,
      detail: LEAD_STATUS_LABEL[data.funnel_status] || data.funnel_status,
      subdetail: data.source_detail || (data.source === 'referral' ? 'Via referral' : data.source === 'website' ? 'From your website' : data.source === 'social' ? 'Social media' : null),
      status: data.funnel_status,
      statusLabel: LEAD_STATUS_LABEL[data.funnel_status] || data.funnel_status,
      isNew: moment().diff(moment(l.created_date), 'hours') < 72,
      isHot,
      hasPending,
      relatedActions,
      sortScore: (isHot ? 80 : 0) + (hasPending ? 100 : 0),
      sortDate: l.updated_date || l.created_date,
    });
  });

  // Sort: actionable first, then hot, then newest
  items.sort((a, b) => {
    if (a.sortScore !== b.sortScore) return b.sortScore - a.sortScore;
    return new Date(b.sortDate) - new Date(a.sortDate);
  });

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.slice(0, 30).map((item, i) => (
        <OpportunityRow
          key={item.id}
          item={item}
          index={i}
          isExpanded={expandedId === item.id}
          onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
          onActionApprove={handleActionApprove}
          onActionDismiss={handleActionDismiss}
        />
      ))}
    </div>
  );
}

const STATUS_COLOR = {
  identified: '#a48bc4', contacted: '#d4a574', connected: '#7eb89a',
  active_partner: '#7eb89a', pursuing: '#d4a574', granted: '#7eb89a',
  active: '#7eb89a', expired: '#e08080', dormant: '#c4b5ab',
  new: '#e08080', trial_scheduled: '#e08080', trial_completed: '#c9a99c',
  offer_made: '#d4a574', enrolled: '#7eb89a',
};

const TYPE_LETTER = { partner: 'P', access: 'A', lead: 'L' };

function OpportunityRow({ item, index, isExpanded, onToggle, onActionApprove, onActionDismiss }) {
  const color = STATUS_COLOR[item.status] || '#b5a599';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: isExpanded ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
        boxShadow: isExpanded
          ? 'inset 0 1px 1px rgba(255,255,255,0.7), 0 12px 40px -12px rgba(180,150,140,0.15)'
          : 'inset 0 1px 1px rgba(255,255,255,0.6)',
      }}
    >
      {/* Clickable summary row */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        className="w-full text-left p-4 md:px-5 md:py-4 flex items-center gap-3.5 cursor-pointer"
      >
        {/* Type indicator — just a letter, frosted */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{
            background: `${color}12`,
            color: color,
          }}
        >
          {TYPE_LETTER[item.type]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate" style={{ color: '#5A4A46' }}>
              {item.name}
            </span>
            {item.hasPending && (
              <span 
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(120,184,154,0.12)', color: '#7eb89a' }}
              >
                action ready
              </span>
            )}
            {item.isHot && !item.hasPending && (
              <span 
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(224,128,128,0.1)', color: '#e08080' }}
              >
                hot
              </span>
            )}
            {item.isNew && !item.hasPending && !item.isHot && (
              <span 
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(164,139,196,0.1)', color: '#a48bc4' }}
              >
                new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs" style={{ color: '#b5a599' }}>{item.detail}</span>
            {item.subdetail && (
              <>
                <span className="text-xs" style={{ color: '#d4c4ba' }}>·</span>
                <span className="text-xs truncate" style={{ color: '#c4b5ab' }}>{item.subdetail}</span>
              </>
            )}
          </div>
        </div>

        {/* Status + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div 
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg capitalize hidden sm:block"
            style={{ color, background: `${color}10` }}
          >
            {item.statusLabel}
          </div>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="#d4c4ba" viewBox="0 0 24 24" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded detail — the REAL content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {item.type === 'partner' && (
              <OpportunityPartnerDetail
                partner={item.raw}
                relatedActions={item.relatedActions}
                onActionApprove={onActionApprove}
                onActionDismiss={onActionDismiss}
              />
            )}
            {item.type === 'lead' && (
              <OpportunityLeadDetail
                lead={item.raw}
                relatedActions={item.relatedActions}
                onActionApprove={onActionApprove}
                onActionDismiss={onActionDismiss}
              />
            )}
            {item.type === 'access' && (
              <OpportunityAccessDetail
                accessGroup={item.raw}
                relatedActions={item.relatedActions}
                onActionApprove={onActionApprove}
                onActionDismiss={onActionDismiss}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}