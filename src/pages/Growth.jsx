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
  const fillColor = status === 'ahead' ? '#7BAE7F' : status === 'behind' ? '#D4A59A' : '#C4A98C';
  
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: '#6B5A4A' }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: '600', color: status === 'behind' ? '#9A6B5A' : '#6B5A4A' }}>
          {actual}/{target}
        </span>
      </div>
      <div style={{ height: '4px', background: 'rgba(200, 180, 160, 0.2)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: fillColor, borderRadius: '2px', transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

// Category Card
function CategoryCard({ title, outcomes, color }) {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      border: `1px solid ${color.light}40`,
      padding: '16px',
      marginBottom: '12px',
    }}>
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: expanded ? '12px' : 0 }}
        onClick={() => setExpanded(!expanded)}
      >
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: color.accent, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
          {title}
        </h3>
        <span style={{ color: color.accent }}>{expanded ? '−' : '+'}</span>
      </div>
      {expanded && (
        <div>
          {Object.values(outcomes).map((o, i) => (
            <ProgressMini key={i} label={o.label} actual={o.actual} target={o.target} status={o.status} />
          ))}
        </div>
      )}
    </div>
  );
}

// Action Card
function ActionCard({ action, onSend, onEdit, onSkip }) {
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState(false);
  
  const color = categoryColors[action.category] || categoryColors.acquisition;
  const agentColor = agentColors[action.agent] || agentColors.connector;
  const urgencyColor = action.urgency === 'now' ? '#D4A59A' : action.urgency === 'soon' ? '#C4A98C' : '#A89080';

  return (
    <div
      style={{
        background: 'rgba(255, 252, 250, 0.9)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '12px',
        border: '1px solid rgba(200, 180, 160, 0.2)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover ? '0 8px 30px rgba(180, 150, 130, 0.15)' : 'none',
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
          padding: '4px 8px',
          borderRadius: '6px',
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
          color: color.accent,
        }}>
          {action.category}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: '18px', fontWeight: '600', color: '#6B5A4A', marginBottom: '4px' }}>
        {action.title}
      </div>
      {action.target_name && (
        <div style={{ fontSize: '14px', color: '#A89080', marginBottom: '12px' }}>{action.target_name}</div>
      )}

      {/* Reasoning */}
      {action.summary && (
        <div style={{
          fontSize: '14px',
          color: '#8B7A6A',
          lineHeight: '1.5',
          marginBottom: '12px',
          padding: '12px',
          background: 'rgba(200, 180, 160, 0.1)',
          borderRadius: '10px',
        }}>
          {action.summary}
        </div>
      )}

      {/* Draft (expanded) */}
      {expanded && action.content && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          border: '1px solid rgba(200, 180, 160, 0.2)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#A89080', marginBottom: '8px' }}>
            {action.action_type === 'email' ? 'Email' : action.action_type === 'sms' ? 'Text' : 'Message'}
          </div>
          {action.subject && (
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#6B5A4A', marginBottom: '8px' }}>
              Subject: {action.subject}
            </div>
          )}
          <div style={{ fontSize: '14px', color: '#6B5A4A', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {action.content}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
        {action.content ? (
          <>
            <button style={{
              background: 'linear-gradient(135deg, #8B7355 0%, #6B5A4A 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }} onClick={onSend}>
              Send this
            </button>
            <button style={{
              background: 'rgba(200, 180, 160, 0.2)',
              color: '#6B5A4A',
              border: '1px solid rgba(200, 180, 160, 0.3)',
              borderRadius: '10px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }} onClick={onEdit}>
              Edit first
            </button>
          </>
        ) : (
          <button style={{
            background: 'linear-gradient(135deg, #8B7355 0%, #6B5A4A 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }} onClick={onSend}>
            Do this
          </button>
        )}
        <button style={{
          background: 'rgba(200, 180, 160, 0.2)',
          color: '#6B5A4A',
          border: '1px solid rgba(200, 180, 160, 0.3)',
          borderRadius: '10px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
        }} onClick={onSkip}>
          Skip
        </button>
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

  const handleEdit = (action) => {
    toast.info('Edit feature coming soon');
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
        background: 'linear-gradient(135deg, rgba(212, 165, 154, 0.3) 0%, rgba(196, 169, 140, 0.3) 100%)',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '24px',
        border: '1px solid rgba(212, 165, 154, 0.3)',
      }}>
        <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#A89080', marginBottom: '4px' }}>
          Today's Focus
        </div>
        <div style={{ fontSize: '16px', color: '#6B5A4A', fontWeight: '500' }}>{focusReason}</div>
      </div>

      {/* Do Today */}
      {nowActions.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 4px 30px rgba(180, 150, 130, 0.1)',
          padding: '20px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#A89080', marginBottom: '16px' }}>
            Do Today
          </div>
          {nowActions.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              onSend={() => handleSend(action)}
              onEdit={() => handleEdit(action)}
              onSkip={() => handleSkip(action)}
            />
          ))}
        </div>
      )}

      {/* Do This Week */}
      {soonActions.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 4px 30px rgba(180, 150, 130, 0.1)',
          padding: '20px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#A89080', marginBottom: '16px' }}>
            Do This Week
          </div>
          {soonActions.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              onSend={() => handleSend(action)}
              onEdit={() => handleEdit(action)}
              onSkip={() => handleSkip(action)}
            />
          ))}
        </div>
      )}

      {/* Empty state for actions */}
      {nowActions.length === 0 && soonActions.length === 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
        }}>
          <p style={{ color: '#A89080', fontSize: '16px', marginBottom: '8px' }}>No pending actions</p>
          <p style={{ color: '#C4A98C', fontSize: '14px' }}>Your agents will generate actions as they identify opportunities.</p>
        </div>
      )}
    </div>
  );
}