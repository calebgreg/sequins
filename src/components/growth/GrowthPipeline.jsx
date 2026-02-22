import React, { useState } from 'react';
import { STAGE_COLORS } from './GrowthOverlay';

const STAGES = [
  { id: 'stuck', label: 'Stuck', description: 'Needs your help' },
  { id: 'ready', label: 'Ready', description: 'Approve to send' },
  { id: 'sent', label: 'Sent', description: 'Awaiting reply' },
  { id: 'replied', label: 'Replied', description: 'They responded' },
  { id: 'connected', label: 'Connected', description: 'Relationship started' },
];

function mapPartnerToStage(partner) {
  const status = partner.relationship_status || 'identified';
  // If stuck_reason or what_we_tried exists, it's stuck
  if (partner.stuck_reason || (partner.what_we_tried && partner.what_we_tried.length > 0)) return 'stuck';
  if (status === 'active_partner') return 'connected';
  // If they replied, it's replied
  if (partner.their_reply) return 'replied';
  // If we sent a message, it's sent
  if (status === 'contacted' || partner.sent_message) return 'sent';
  if (status === 'connected') return 'connected';
  return 'ready'; // identified or other
}

function mapAccessGroupToStage(ag) {
  const status = ag.access_status || 'identified';
  if (status === 'active' || status === 'granted') return 'connected';
  if (status === 'pursuing') return 'sent';
  return 'ready';
}

function mapLeadToStage(lead) {
  const status = lead.funnel_status || 'new';
  if (status === 'enrolled') return 'connected';
  if (status === 'offer_made' || status === 'trial_completed') return 'replied';
  if (status === 'trial_scheduled' || status === 'contacted') return 'sent';
  return 'ready';
}

export default function GrowthPipeline({ partners, accessGroups, leads, onItemClick }) {
  const [selectedStage, setSelectedStage] = useState(null);

  // Build unified pipeline items
  const items = [];

  partners.forEach(p => {
    const stage = mapPartnerToStage(p);
    const research = p.ai_research || {};
    items.push({
      id: p.id, type: 'partner', stage, raw: p, data: p,
      name: research.person_name || p.name,
      business: p.name,
      role: research.person_role || p.category?.replace(/_/g, ' ') || '',
      reach: research.circle_size ? `~${research.circle_size} families` : '',
      detail: research.angle || p.notes || '',
    });
  });

  accessGroups.forEach(ag => {
    const stage = mapAccessGroupToStage(ag);
    items.push({
      id: ag.id, type: 'access', stage, raw: ag, data: ag,
      name: ag.gatekeeper_name || ag.name,
      business: ag.name,
      role: ag.type?.replace(/_/g, ' ') || '',
      reach: ag.estimated_families ? `~${ag.estimated_families} families` : '',
      detail: '',
    });
  });

  leads.forEach(l => {
    if (l.funnel_status === 'lost') return;
    const stage = mapLeadToStage(l);
    items.push({
      id: l.id, type: 'lead', stage, raw: l, data: l,
      name: l.child_name || l.parent_name,
      business: '',
      role: l.funnel_status?.replace(/_/g, ' ') || '',
      reach: l.source || '',
      detail: l.source_detail || '',
    });
  });

  const stageCounts = STAGES.map(s => ({ ...s, count: items.filter(i => i.stage === s.id).length, ...(STAGE_COLORS[s.id] || {}) }));
  const selectedItems = selectedStage ? items.filter(i => i.stage === selectedStage) : [];

  return (
    <div style={{ padding: '0 48px 48px' }}>
      {/* Stage circles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 48, position: 'relative' }}>
        {/* Connecting line */}
        <div style={{ position: 'absolute', top: 24, left: 60, right: 60, height: 2, background: 'linear-gradient(90deg, rgba(200,136,136,0.2), rgba(136,200,152,0.3))' }} />

        {stageCounts.map(stage => {
          const isSelected = selectedStage === stage.id;
          const hasItems = stage.count > 0;
          return (
            <div key={stage.id} onClick={() => hasItems && setSelectedStage(isSelected ? null : stage.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: hasItems ? 'pointer' : 'default', opacity: hasItems ? 1 : 0.35, position: 'relative' }}>
              <div style={{
                width: isSelected ? 56 : 48, height: isSelected ? 56 : 48, borderRadius: '50%',
                background: isSelected ? `${stage.color}22` : 'rgba(255,250,248,0.04)',
                border: `2px solid ${isSelected ? stage.color : 'rgba(255,250,248,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isSelected ? 20 : 16, fontWeight: 600,
                color: isSelected ? stage.color : 'rgba(255,240,235,0.5)',
                marginBottom: 12, transition: 'all 0.3s ease',
                boxShadow: isSelected ? `0 0 30px ${stage.glow}` : 'none',
              }}>
                {stage.count}
              </div>
              <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? 'rgba(255,245,240,0.9)' : 'rgba(255,240,235,0.4)' }}>{stage.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,235,230,0.25)', marginTop: 4 }}>{stage.description}</div>
            </div>
          );
        })}
      </div>

      {/* Stage content */}
      {!selectedStage ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 250, color: 'rgba(255,235,230,0.25)' }}>
          <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>&#8593;</div>
          Click a stage to see prospects
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {selectedItems.map(prospect => {
            const sc = STAGE_COLORS[prospect.stage] || STAGE_COLORS.ready;
            return (
              <div key={prospect.id} onClick={() => onItemClick?.(prospect)}
                style={{
                  padding: '22px 26px', background: 'rgba(255,252,250,0.03)', borderRadius: 18,
                  cursor: 'pointer', transition: 'all 0.2s ease', borderLeft: `3px solid ${sc.color}`,
                  border: `1px solid rgba(255,250,248,0.04)`, borderLeftWidth: 3, borderLeftColor: sc.color,
                }}>
                <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,248,244,0.9)', marginBottom: 6 }}>
                  {prospect.name}
                </div>
                {prospect.business && prospect.business !== prospect.name && (
                  <div style={{ fontSize: 14, color: sc.color, marginBottom: 6 }}>{prospect.business}</div>
                )}
                <div style={{ fontSize: 12, color: 'rgba(255,240,235,0.35)' }}>
                  {[prospect.role, prospect.reach].filter(Boolean).join(' · ')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}