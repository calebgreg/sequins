import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';

const AGENT_VERB = {
  connector: 'found',
  attender: 'spotted',
  accessor: 'opened a door to',
  offerer: 'has an offer for',
  converter: 'is following up with',
  retainer: 'is watching over',
  referrer: 'wants to connect',
};

const STATUS_GLOW = {
  identified: 'rgba(160,140,200,0.08)',
  contacted: 'rgba(120,184,154,0.08)',
  connected: 'rgba(120,184,154,0.15)',
  active_partner: 'rgba(120,184,154,0.2)',
  pursuing: 'rgba(212,165,116,0.1)',
  granted: 'rgba(120,184,154,0.15)',
};

export default function OpportunityFeed({ partners, accessGroups, leads, actions, agentLogs }) {
  // Build a unified timeline of real things happening
  const items = [];

  // Partners that were recently found — these are real businesses
  partners.forEach(p => {
    const data = p.data || p;
    const age = moment().diff(moment(p.created_date), 'hours');
    const isNew = age < 72;
    const hasOutreach = actions.some(a => 
      (a.data || a).target_name === data.name && 
      ((a.data || a).status === 'pending_review' || (a.data || a).status === 'approved')
    );
    
    items.push({
      type: 'partner',
      id: p.id,
      name: data.name,
      detail: data.category === 'daycare' ? 'Daycare' :
              data.category === 'pediatrician' ? 'Pediatrician' :
              data.category === 'gym' ? 'Gym / Athletics' :
              data.category === 'salon' ? 'Salon' :
              data.category === 'church' ? 'Church' :
              data.category === 'school' ? 'School' :
              data.category === 'sports' ? 'Youth Sports' :
              data.category || 'Business',
      subdetail: data.address?.split(',').slice(0, 2).join(','),
      status: data.relationship_status,
      isNew,
      hasOutreach,
      rating: data.ai_research?.rating,
      reviews: data.ai_research?.reviews_count,
      website: data.website,
      phone: data.phone,
      date: p.created_date,
      sortDate: p.created_date,
      glow: STATUS_GLOW[data.relationship_status] || 'rgba(200,180,170,0.05)',
    });
  });

  // Access groups — these represent many families behind one door
  accessGroups.forEach(ag => {
    const data = ag.data || ag;
    items.push({
      type: 'access',
      id: ag.id,
      name: data.name,
      detail: `${data.type === 'daycare' ? 'Daycare' : data.type === 'school' ? 'School' : data.type === 'league' ? 'League' : data.type === 'church_group' ? 'Church Group' : data.type === 'mommy_group' ? 'Mom Group' : data.type} — ~${data.estimated_families || '?'} families`,
      subdetail: data.gatekeeper_name ? `Gatekeeper: ${data.gatekeeper_name}` : null,
      status: data.access_status,
      isNew: moment().diff(moment(ag.created_date), 'hours') < 72,
      date: ag.created_date,
      sortDate: ag.created_date,
      glow: STATUS_GLOW[data.access_status] || 'rgba(160,140,200,0.08)',
    });
  });

  // Leads coming through the funnel
  leads.forEach(l => {
    const data = l.data || l;
    const statusLabel = {
      new: 'New inquiry',
      contacted: 'Reached out',
      trial_scheduled: 'Trial booked',
      trial_completed: 'Did their trial',
      offer_made: 'Offer sent',
      enrolled: '✓ Enrolled',
      lost: 'Lost',
    };
    if (data.funnel_status === 'lost') return;
    
    items.push({
      type: 'lead',
      id: l.id,
      name: data.child_name || data.parent_name,
      detail: statusLabel[data.funnel_status] || data.funnel_status,
      subdetail: data.source_detail || (data.source === 'referral' ? 'Via referral' : data.source === 'website' ? 'From your website' : data.source === 'social' ? 'Social media' : null),
      status: data.funnel_status,
      isHot: ['trial_scheduled', 'trial_completed', 'offer_made'].includes(data.funnel_status),
      date: l.created_date,
      sortDate: l.updated_date || l.created_date,
      glow: data.funnel_status === 'trial_scheduled' ? 'rgba(224,128,128,0.12)' :
            data.funnel_status === 'trial_completed' ? 'rgba(120,184,154,0.12)' :
            data.funnel_status === 'enrolled' ? 'rgba(120,184,154,0.2)' :
            'rgba(200,180,170,0.06)',
    });
  });

  // Sort: hot leads first, then newest
  items.sort((a, b) => {
    if (a.isHot && !b.isHot) return -1;
    if (!a.isHot && b.isHot) return 1;
    if (a.hasOutreach && !b.hasOutreach) return -1;
    if (!a.hasOutreach && b.hasOutreach) return 1;
    return new Date(b.sortDate) - new Date(a.sortDate);
  });

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {items.slice(0, 25).map((item, i) => (
          <OpportunityRow key={item.id} item={item} index={i} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function OpportunityRow({ item, index }) {
  const typeIcon = {
    partner: '🏪',
    access: '🚪',
    lead: '👋',
  };

  const statusColor = {
    identified: '#a48bc4',
    contacted: '#d4a574',
    connected: '#7eb89a',
    active_partner: '#7eb89a',
    pursuing: '#d4a574',
    granted: '#7eb89a',
    new: '#e08080',
    trial_scheduled: '#e08080',
    trial_completed: '#c9a99c',
    offer_made: '#d4a574',
    enrolled: '#7eb89a',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="rounded-2xl p-4 md:px-5 md:py-4 flex items-center gap-4"
      style={{
        background: item.glow,
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
      }}
    >
      <span className="text-lg flex-shrink-0">{typeIcon[item.type]}</span>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate" style={{ color: '#5A4A46' }}>
            {item.name}
          </span>
          {item.isNew && (
            <span 
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(224,128,128,0.1)', color: '#e08080' }}
            >
              new
            </span>
          )}
          {item.isHot && (
            <span 
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(224,128,128,0.12)', color: '#e08080' }}
            >
              hot
            </span>
          )}
          {item.hasOutreach && (
            <span 
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(120,184,154,0.12)', color: '#7eb89a' }}
            >
              email ready
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: '#b5a599' }}>{item.detail}</span>
          {item.rating && (
            <>
              <span className="text-xs" style={{ color: '#d4c4ba' }}>·</span>
              <span className="text-xs" style={{ color: '#b5a599' }}>
                ★ {item.rating} ({item.reviews})
              </span>
            </>
          )}
        </div>
        {item.subdetail && (
          <div className="text-[11px] mt-0.5" style={{ color: '#c4b5ab' }}>{item.subdetail}</div>
        )}
      </div>

      <div 
        className="text-[11px] font-medium px-2.5 py-1 rounded-lg flex-shrink-0"
        style={{ 
          color: statusColor[item.status] || '#b5a599',
          background: `${statusColor[item.status] || '#b5a599'}12`,
        }}
      >
        {item.status?.replace(/_/g, ' ')}
      </div>
    </motion.div>
  );
}