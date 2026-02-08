import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Design tokens matching the Billing page aesthetic
const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  warm: '#f5f3ef',
  muted: '#8a8478',
  border: '#e8e6e1',
  frost: '#fef7f7',
  frostShadow: 'rgba(180, 120, 120, 0.08)',
  frostDeep: 'rgba(180, 120, 120, 0.05)',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
};

// Category colors
const categoryColors = {
  acquisition: { bg: 'rgba(196, 169, 140, 0.15)', accent: '#8B7355', light: '#C4A98C' },
  conversion: { bg: 'rgba(140, 169, 196, 0.15)', accent: '#456577', light: '#8CA9C4' },
  retention: { bg: 'rgba(169, 196, 140, 0.15)', accent: '#577745', light: '#A9C48C' },
  referral: { bg: 'rgba(196, 140, 169, 0.15)', accent: '#774565', light: '#C48CA9' },
};

// Etched text component for large numbers
const EtchedText = ({ children, size = 'md', className = '' }) => {
  const sizes = {
    sm: { fontSize: '14px' },
    md: { fontSize: '18px' },
    lg: { fontSize: '24px' },
    xl: { fontSize: '32px' },
    '2xl': { fontSize: '48px' },
  };
  
  return (
    <span
      className={className}
      style={{
        ...sizes[size],
        fontWeight: '700',
        letterSpacing: '-0.02em',
        color: 'transparent',
        backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        textShadow: '0 2px 3px rgba(255,255,255,0.7), 0 -1px 1px rgba(120,80,80,0.15)',
        filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.5))',
      }}
    >
      {children}
    </span>
  );
};

// Agent badge colors
const agentColors = {
  connector: { bg: 'rgba(196, 169, 140, 0.3)', text: '#7A6545' },
  attender: { bg: 'rgba(140, 180, 196, 0.3)', text: '#456577' },
  accessor: { bg: 'rgba(180, 169, 196, 0.3)', text: '#5A4577' },
  offerer: { bg: 'rgba(196, 180, 140, 0.3)', text: '#776545' },
  converter: { bg: 'rgba(140, 169, 196, 0.3)', text: '#456577' },
  retainer: { bg: 'rgba(169, 196, 140, 0.3)', text: '#577745' },
  referrer: { bg: 'rgba(196, 140, 169, 0.3)', text: '#774565' },
};

// Progress Mini Card
function ProgressMini({ label, actual, target, status }) {
  const percent = Math.min((actual / target) * 100, 100);
  const fillColor = status === 'ahead' ? '#7eb89a' : status === 'behind' ? colors.etchLight : colors.etchDark;
  
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', color: colors.muted }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: '600', color: status === 'behind' ? colors.etchLight : colors.ink }}>
          {actual}/{target}
        </span>
      </div>
      <div style={{ height: '4px', background: 'rgba(200, 180, 170, 0.15)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: fillColor, borderRadius: '2px', transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

// Unified Outcomes Card with Tabs
function OutcomesCard({ acquisitionData, conversionData, retentionData, referralData }) {
  const [activeTab, setActiveTab] = useState('acquisition');
  
  const tabs = [
    { key: 'acquisition', label: 'Acquisition', data: acquisitionData },
    { key: 'conversion', label: 'Conversion', data: conversionData },
    { key: 'retention', label: 'Retention', data: retentionData },
    { key: 'referral', label: 'Referral', data: referralData },
  ].filter(t => Object.keys(t.data).length > 0);

  const activeData = tabs.find(t => t.key === activeTab)?.data || {};
  
  // Calculate stats per category
  const getStats = (data) => {
    const outcomes = Object.values(data);
    const total = outcomes.length;
    const onTrack = outcomes.filter(o => o.status === 'ahead' || o.status === 'on_track').length;
    return { total, onTrack };
  };

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
      backdropFilter: 'blur(16px)',
      borderRadius: '24px',
      border: '1px solid rgba(255, 200, 200, 0.2)',
      boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08), inset 0 1px 1px rgba(255,255,255,0.8)',
      overflow: 'hidden',
    }}>
      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(200, 180, 170, 0.15)',
        background: 'rgba(255, 252, 250, 0.5)',
      }}>
        {tabs.map((tab) => {
          const stats = getStats(tab.data);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '16px 12px',
                border: 'none',
                background: isActive ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: isActive ? colors.etchDark : colors.muted,
                marginBottom: '4px',
              }}>
                {tab.label}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: isActive ? colors.etchDark : colors.muted,
              }}>
                {stats.onTrack}/{stats.total}
              </div>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '20%',
                  right: '20%',
                  height: '3px',
                  background: `linear-gradient(90deg, ${colors.etchLight}, ${colors.etchDark})`,
                  borderRadius: '3px 3px 0 0',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {Object.values(activeData).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: colors.muted }}>
            No outcomes in this category
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.values(activeData).map((o, i) => (
              <OutcomeRow key={i} outcome={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Single outcome row with visual progress
function OutcomeRow({ outcome }) {
  const percent = Math.min((outcome.actual / outcome.target) * 100, 100);
  const isComplete = percent >= 100;
  const isBehind = outcome.status === 'behind';
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 16px',
      borderRadius: '12px',
      background: isComplete 
        ? 'rgba(126, 184, 154, 0.1)' 
        : isBehind 
          ? 'rgba(196, 160, 160, 0.08)' 
          : 'rgba(255, 255, 255, 0.5)',
      border: `1px solid ${isComplete ? 'rgba(126, 184, 154, 0.3)' : 'rgba(200, 180, 170, 0.1)'}`,
    }}>
      {/* Progress Circle */}
      <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
        <svg width="44" height="44" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="rgba(200, 180, 170, 0.2)"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke={isComplete ? '#7eb89a' : isBehind ? colors.etchLight : colors.etchDark}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(percent / 100) * 113} 113`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: '700',
          color: isComplete ? '#5a9a7a' : isBehind ? colors.etchLight : colors.etchDark,
        }}>
          {outcome.actual}
        </div>
      </div>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '500',
          color: colors.ink,
          lineHeight: '1.3',
        }}>
          {outcome.label}
        </div>
        <div style={{
          fontSize: '12px',
          color: colors.muted,
          marginTop: '2px',
        }}>
          {isComplete ? '✓ Complete' : `${outcome.target - outcome.actual} to go`}
        </div>
      </div>

      {/* Target */}
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: colors.muted,
      }}>
        /{outcome.target}
      </div>
    </div>
  );
}

// Action Card
function ActionCard({ action, onSend, onEdit, onSkip }) {
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(action.content || '');
  const [editedSubject, setEditedSubject] = useState(action.subject || '');
  
  const color = categoryColors[action.category] || categoryColors.acquisition;
  const agentColor = agentColors[action.agent] || agentColors.connector;
  const urgencyColor = action.urgency === 'now' ? colors.etchLight : action.urgency === 'soon' ? colors.etchDark : colors.muted;

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '12px',
        border: '1px solid rgba(255, 200, 200, 0.2)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover 
          ? '0 8px 30px rgba(180, 120, 120, 0.12), inset 0 1px 1px rgba(255,255,255,0.8)' 
          : '0 4px 16px -4px rgba(180,150,140,0.1), inset 0 1px 1px rgba(255,255,255,0.8)',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: urgencyColor, flexShrink: 0 }} />
        <span style={{
          fontSize: '10px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          padding: '4px 10px',
          borderRadius: '8px',
          background: agentColor.bg,
          color: agentColor.text,
        }}>
          {action.agent}
        </span>
        <span style={{
          fontSize: '10px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: colors.muted,
        }}>
          {action.category}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: '18px', fontWeight: '600', color: colors.ink, marginBottom: '4px' }}>
        {action.title}
      </div>
      {action.target_name && (
        <div style={{ fontSize: '14px', color: colors.muted, marginBottom: '12px' }}>{action.target_name}</div>
      )}

      {/* Reasoning */}
      {action.summary && (
        <div style={{
          fontSize: '14px',
          color: colors.muted,
          lineHeight: '1.5',
          marginBottom: '12px',
          padding: '12px 14px',
          background: 'rgba(200, 180, 170, 0.08)',
          borderRadius: '12px',
        }}>
          {action.summary}
        </div>
      )}

      {/* Draft (expanded) */}
      {expanded && action.content && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          border: '1px solid rgba(200, 180, 170, 0.15)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.muted, marginBottom: '8px' }}>
            {action.action_type === 'email' ? 'Email' : action.action_type === 'sms' ? 'Text' : 'Message'}
          </div>
          {isEditing ? (
            <>
              {action.action_type === 'email' && (
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  placeholder="Subject line..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(200, 180, 170, 0.3)',
                    fontSize: '14px',
                    fontWeight: '500',
                    outline: 'none',
                  }}
                />
              )}
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '150px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(200, 180, 170, 0.3)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </>
          ) : (
            <>
              {action.subject && (
                <div style={{ fontSize: '13px', fontWeight: '500', color: colors.ink, marginBottom: '8px' }}>
                  Subject: {action.subject}
                </div>
              )}
              <div style={{ fontSize: '14px', color: colors.ink, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {action.content}
              </div>
            </>
          )}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
        {action.content ? (
          <>
            {isEditing ? (
              <>
                <button style={{
                  background: colors.ink,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }} onClick={() => {
                  onEdit(editedContent, editedSubject);
                  setIsEditing(false);
                }}>
                  Save & Send
                </button>
                <button style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  color: colors.muted,
                  border: '1px solid rgba(200, 180, 170, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }} onClick={() => {
                  setEditedContent(action.content || '');
                  setEditedSubject(action.subject || '');
                  setIsEditing(false);
                }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button style={{
                  background: colors.ink,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }} onClick={onSend}>
                  Send this
                </button>
                <button style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  color: colors.ink,
                  border: '1px solid rgba(200, 180, 170, 0.2)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }} onClick={() => {
                  setExpanded(true);
                  setIsEditing(true);
                }}>
                  Edit first
                </button>
              </>
            )}
          </>
        ) : (
          <button style={{
            background: colors.ink,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }} onClick={onSend}>
            Do this
          </button>
        )}
        {!isEditing && (
          <button style={{
            background: 'rgba(255, 255, 255, 0.6)',
            color: colors.muted,
            border: '1px solid rgba(200, 180, 170, 0.2)',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }} onClick={onSkip}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

// Main Dashboard
export default function Growth() {
  // Fetch outcomes and actions from database
  const { data: outcomes = [] } = useQuery({
    queryKey: ['growthOutcomes'],
    queryFn: () => base44.entities.GrowthOutcome.filter({ is_active: true }),
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['growthActions'],
    queryFn: () => base44.entities.GrowthAction.filter({ status: 'pending_review' }, '-created_date'),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['growthProgress'],
    queryFn: () => base44.entities.GrowthPeriodProgress.list('-period_start', 20),
  });

  // Build outcome data by category
  const buildCategoryData = (category) => {
    const categoryOutcomes = outcomes.filter(o => o.category === category);
    const result = {};
    
    categoryOutcomes.forEach((outcome, index) => {
      const progressRecord = progress.find(p => p.outcome_id === outcome.id);
      const actual = progressRecord?.current_count || 0;
      const target = outcome.target_count;
      const percent = target > 0 ? actual / target : 0;
      
      // Use outcome ID as key to allow multiple outcomes per agent
      result[outcome.id] = {
        label: outcome.name.replace(/^\d+\s*/, '').replace(/per (week|month)$/i, '').trim(),
        actual,
        target,
        status: percent >= 1 ? 'ahead' : percent >= 0.6 ? 'on_track' : 'behind',
        agent: outcome.agent,
      };
    });
    
    return result;
  };

  const acquisitionData = buildCategoryData('acquisition');
  const conversionData = buildCategoryData('conversion');
  const retentionData = buildCategoryData('retention');
  const referralData = buildCategoryData('referral');

  // Calculate focus
  const behindOutcomes = outcomes.filter(o => {
    const p = progress.find(pr => pr.outcome_id === o.id);
    const percent = p ? p.current_count / o.target_count : 0;
    return percent < 0.6;
  });

  const focusCategory = behindOutcomes.length > 0 ? behindOutcomes[0]?.category : 'acquisition';
  const focusReason = behindOutcomes.length > 0 
    ? `You're behind on ${behindOutcomes.length} outcome${behindOutcomes.length > 1 ? 's' : ''}. Let's focus there.`
    : "You're on track! Keep the momentum going.";

  // Map actions to display format
  const mappedActions = actions.map(a => ({
    ...a,
    urgency: a.priority === 'high' ? 'now' : 'soon',
    category: outcomes.find(o => o.id === a.outcome_id)?.category || 'acquisition',
  }));

  const nowActions = mappedActions.filter(a => a.urgency === 'now');
  const soonActions = mappedActions.filter(a => a.urgency === 'soon');

  const handleSend = async (action) => {
    await base44.entities.GrowthAction.update(action.id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
    toast.success('Action approved!');
  };

  const handleSkip = async (action) => {
    await base44.entities.GrowthAction.update(action.id, { status: 'dismissed' });
    toast.success('Action skipped');
  };

  const handleEdit = async (action, newContent, newSubject) => {
    await base44.entities.GrowthAction.update(action.id, {
      content: newContent,
      subject: newSubject,
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
    toast.success('Saved and approved!');
  };

  const hasOutcomes = Object.keys(acquisitionData).length > 0 || 
                      Object.keys(conversionData).length > 0 ||
                      Object.keys(retentionData).length > 0 ||
                      Object.keys(referralData).length > 0;

  // Calculate total outcomes and progress stats
  const totalOutcomes = outcomes.length;
  const onTrackCount = outcomes.filter(o => {
    const p = progress.find(pr => pr.outcome_id === o.id);
    const percent = p ? p.current_count / o.target_count : 0;
    return percent >= 0.6;
  }).length;
  const behindCount = totalOutcomes - onTrackCount;

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.paper,
      padding: '24px',
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Hero Stats Card - Matching Billing aesthetic */}
        <div
          style={{
            padding: '32px',
            borderRadius: '24px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 200, 200, 0.3)',
            boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: colors.muted, marginBottom: '8px' }}>
              {totalOutcomes} outcomes
            </p>
            <EtchedText size="2xl">{onTrackCount} on track</EtchedText>
            
            {/* Sub-stats */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '12px', 
              marginTop: '24px',
              flexWrap: 'wrap',
            }}>
              <div
                style={{
                  padding: '16px 32px',
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
                  boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
                  minWidth: '120px',
                }}
              >
                <EtchedText size="lg">{Object.keys(acquisitionData).length}</EtchedText>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.muted, marginTop: '4px' }}>
                  Acquisition
                </div>
              </div>
              <div
                style={{
                  padding: '16px 32px',
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
                  boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
                  minWidth: '120px',
                }}
              >
                <EtchedText size="lg">{Object.keys(conversionData).length}</EtchedText>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.muted, marginTop: '4px' }}>
                  Conversion
                </div>
              </div>
              <div
                style={{
                  padding: '16px 32px',
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,252,250,0.85) 100%)',
                  boxShadow: '0 4px 16px -4px rgba(180,150,140,0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
                  minWidth: '120px',
                }}
              >
                <EtchedText size="lg">{behindCount}</EtchedText>
                <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.muted, marginTop: '4px' }}>
                  Need Focus
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Outcomes Grid */}
        {hasOutcomes ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {Object.keys(acquisitionData).length > 0 && (
              <CategoryCard title="Acquisition" outcomes={acquisitionData} color={categoryColors.acquisition} />
            )}
            {Object.keys(conversionData).length > 0 && (
              <CategoryCard title="Conversion" outcomes={conversionData} color={categoryColors.conversion} />
            )}
            {Object.keys(retentionData).length > 0 && (
              <CategoryCard title="Retention" outcomes={retentionData} color={categoryColors.retention} />
            )}
            {Object.keys(referralData).length > 0 && (
              <CategoryCard title="Referral" outcomes={referralData} color={categoryColors.referral} />
            )}
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
            borderRadius: '24px',
            padding: '40px',
            textAlign: 'center',
            marginBottom: '24px',
            border: '1px solid rgba(255, 200, 200, 0.3)',
          }}>
            <p style={{ color: colors.muted, fontSize: '16px' }}>Loading outcomes...</p>
          </div>
        )}

        {/* Focus Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
          borderRadius: '20px',
          padding: '20px 24px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 200, 200, 0.3)',
          boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.muted, marginBottom: '4px' }}>
            Today's Focus
          </div>
          <div style={{ fontSize: '16px', color: colors.ink, fontWeight: '500' }}>{focusReason}</div>
        </div>

        {/* Do Today */}
        {nowActions.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 200, 200, 0.3)',
            boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
            padding: '24px',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.muted, marginBottom: '16px' }}>
              Do Today
            </div>
            {nowActions.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                onSend={() => handleSend(action)}
                onEdit={(content, subject) => handleEdit(action, content, subject)}
                onSkip={() => handleSkip(action)}
              />
            ))}
          </div>
        )}

        {/* Do This Week */}
        {soonActions.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 200, 200, 0.3)',
            boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
            padding: '24px',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.muted, marginBottom: '16px' }}>
              Do This Week
            </div>
            {soonActions.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                onSend={() => handleSend(action)}
                onEdit={(content, subject) => handleEdit(action, content, subject)}
                onSkip={() => handleSkip(action)}
              />
            ))}
          </div>
        )}

        {/* Empty state for actions */}
        {nowActions.length === 0 && soonActions.length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(254, 247, 247, 0.95) 0%, rgba(252, 231, 231, 0.9) 100%)',
            borderRadius: '24px',
            padding: '48px',
            textAlign: 'center',
            border: '1px solid rgba(255, 200, 200, 0.3)',
          }}>
            <p style={{ color: colors.muted, fontSize: '16px', marginBottom: '8px' }}>No pending actions</p>
            <p style={{ color: colors.etchLight, fontSize: '14px' }}>Your agents will generate actions as they identify opportunities.</p>
          </div>
        )}
      </div>
    </div>
  );
}