import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CATEGORY_COLORS } from './GrowthActionCard';

const STAGE_COLORS = {
  stuck:     { color: '#C88888', glow: 'rgba(200,136,136,0.4)' },
  ready:     { color: '#88AAC8', glow: 'rgba(136,170,200,0.4)' },
  sent:      { color: '#A8B898', glow: 'rgba(168,184,152,0.4)' },
  replied:   { color: '#C8B888', glow: 'rgba(200,184,136,0.5)' },
  connected: { color: '#88C898', glow: 'rgba(136,200,152,0.5)' },
};

export { STAGE_COLORS };

export default function GrowthOverlay({ item, type, category, onClose }) {
  const [editedContent, setEditedContent] = useState('');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (item?.content) setEditedContent(item.content);
    else if (item?.draft) setEditedContent(item.draft || '');
    else setEditedContent('');
  }, [item]);

  useEffect(() => {
    if (inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [item]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!item) return null;

  const handleCommand = async () => {
    const cmd = inputValue.toLowerCase().trim();
    if (!cmd) return;

    if (cmd.includes('send') || cmd === 'yes' || cmd === 'go' || cmd.includes('looks good') || cmd === 'approve') {
      if (type === 'action') {
        const updateData = { status: 'approved', approved_at: new Date().toISOString() };
        if (editedContent) updateData.content = editedContent;
        await base44.entities.GrowthAction.update(item.id, updateData);
        queryClient.invalidateQueries(['growthActions']);
        toast.success('Sent');
      }
      onClose();
    } else if (cmd.includes('skip') || cmd.includes('later') || cmd.includes('not now') || cmd === 'no') {
      if (type === 'action') {
        await base44.entities.GrowthAction.update(item.id, { status: 'dismissed' });
        queryClient.invalidateQueries(['growthActions']);
        toast('Skipped');
      }
      onClose();
    }
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommand(); }
  };

  const glow = type === 'action'
    ? (CATEGORY_COLORS[category] || CATEGORY_COLORS.Other).glow
    : (STAGE_COLORS[item.stage] || STAGE_COLORS.ready).glow;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,9,0.9)', backdropFilter: 'blur(30px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 700,
          background: 'rgba(255,252,250,0.05)', backdropFilter: 'blur(60px)',
          borderRadius: 32, border: '1px solid rgba(255,250,248,0.08)',
          padding: '48px', boxShadow: `0 60px 120px rgba(0,0,0,0.5), 0 0 100px ${glow}`,
          maxHeight: '90vh', overflow: 'auto', position: 'relative',
          fontFamily: "'DM Sans', -apple-system, sans-serif",
        }}
      >
        <button onClick={onClose} style={{
          position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,250,248,0.06)', border: 'none', color: 'rgba(255,240,235,0.5)',
          fontSize: 20, cursor: 'pointer',
        }}>x</button>

        {type === 'action' && <ActionContent item={item} category={category} editedContent={editedContent} setEditedContent={setEditedContent} inputValue={inputValue} setInputValue={setInputValue} inputRef={inputRef} handleKeyDown={handleKeyDown} handleCommand={handleCommand} onClose={onClose} />}
        {type === 'pipeline' && <PipelineContent item={item} editedContent={editedContent} setEditedContent={setEditedContent} inputValue={inputValue} setInputValue={setInputValue} inputRef={inputRef} handleKeyDown={handleKeyDown} queryClient={queryClient} onClose={onClose} />}
      </div>
    </div>
  );
}

function ActionContent({ item, category, editedContent, setEditedContent, inputValue, setInputValue, inputRef, handleKeyDown }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
  const context = [item.target_name, item.context?.partner_category, item.context?.circle_size ? `~${item.context.circle_size} families` : null].filter(Boolean).join(' · ');

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: colors.bg, borderRadius: 24, marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.text }}>{category}</span>
      </div>

      <div style={{ fontSize: 36, fontWeight: 600, color: 'rgba(255,248,244,0.95)', marginBottom: 10 }}>{item.title}</div>
      <div style={{ fontSize: 15, color: 'rgba(255,240,235,0.45)', marginBottom: 28 }}>{context}</div>

      {item.summary && (
        <div style={{ fontSize: 15, color: 'rgba(255,238,232,0.4)', marginBottom: 32, lineHeight: 1.65, fontStyle: 'italic', paddingLeft: 16, borderLeft: `2px solid ${colors.text}44` }}>
          {item.summary}
        </div>
      )}

      {item.subject && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,235,230,0.3)', marginBottom: 8 }}>Subject</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,248,244,0.8)' }}>{item.subject}</div>
        </div>
      )}

      {(item.content || editedContent) && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '28px', marginBottom: 28, border: '1px solid rgba(255,250,248,0.08)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,235,230,0.3)', marginBottom: 16 }}>
            Draft{item.action_type ? ` · ${item.action_type}` : ''}
          </div>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            style={{ width: '100%', minHeight: 100, fontSize: 17, color: 'rgba(255,248,244,0.9)', lineHeight: 1.7, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
          />
        </div>
      )}

      {item.context?.partner_website && (
        <a href={item.context.partner_website} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: 12, fontWeight: 500, color: colors.text, textDecoration: 'underline', textUnderlineOffset: 3, marginBottom: 24 }}>
          view website
        </a>
      )}

      <CommandInput inputRef={inputRef} inputValue={inputValue} setInputValue={setInputValue} handleKeyDown={handleKeyDown} placeholder="send · skip · shorter..." glowColor={colors.glow} borderColor={colors.text} />
    </>
  );
}

function PipelineContent({ item, editedContent, setEditedContent, inputValue, setInputValue, inputRef, handleKeyDown, queryClient, onClose }) {
  const stage = item.stage || 'ready';
  const sc = STAGE_COLORS[stage] || STAGE_COLORS.ready;
  const data = item.data || item;
  const research = data.ai_research || {};

  const name = research.person_name || data.gatekeeper_name || data.name || item.name || '';
  const businessName = data.name || '';
  const category = data.category || '';
  const reach = research.circle_size ? `~${research.circle_size} families` : '';
  const personRole = research.person_role || '';

  const stageLabels = { stuck: 'Stuck', ready: 'Ready to send', sent: 'Sent', replied: 'Replied', connected: 'Connected' };

  // Handle saving contact info for stuck items
  const handleSaveContactInfo = async (field, value) => {
    if (!value.trim() || !data.id) return;
    const update = {};
    update[field] = value.trim();
    await base44.entities.Partner.update(data.id, update);
    queryClient.invalidateQueries(['partners']);
    toast.success('Contact info saved');
  };

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: `${sc.color}22`, borderRadius: 24, marginBottom: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: sc.color }}>{stageLabels[stage] || stage}</span>
      </div>

      <div style={{ fontSize: 36, fontWeight: 600, color: 'rgba(255,248,244,0.95)', marginBottom: 10 }}>{name}</div>
      <div style={{ fontSize: 15, color: 'rgba(255,240,235,0.45)', marginBottom: 28 }}>
        {[personRole, businessName, category?.replace(/_/g, ' '), reach].filter(Boolean).join(' · ')}
      </div>

      {/* STUCK STAGE — show what we found, what we tried, ask for contact info */}
      {stage === 'stuck' && <StuckContent data={data} research={research} sc={sc} onSaveContact={handleSaveContactInfo} />}

      {/* READY STAGE — show research + draft */}
      {stage === 'ready' && <ReadyContent data={data} research={research} sc={sc} editedContent={editedContent} setEditedContent={setEditedContent} />}

      {/* SENT STAGE — show sent message + follow-up draft if stale */}
      {stage === 'sent' && <SentContent data={data} sc={sc} editedContent={editedContent} setEditedContent={setEditedContent} />}

      {/* REPLIED STAGE — show their reply + suggested response */}
      {stage === 'replied' && <RepliedContent data={data} sc={sc} editedContent={editedContent} setEditedContent={setEditedContent} />}

      {/* CONNECTED STAGE — show referral stats + families */}
      {stage === 'connected' && <ConnectedContent data={data} sc={sc} />}

      <CommandInput inputRef={inputRef} inputValue={inputValue} setInputValue={setInputValue} handleKeyDown={handleKeyDown} placeholder="send · skip · shorter..." glowColor={sc.glow} borderColor={sc.color} />
    </>
  );
}

/* ─── STUCK ─── */
function StuckContent({ data, research, sc, onSaveContact }) {
  const [contactInput, setContactInput] = useState('');
  const whatWeFound = data.what_we_found || research.what_we_found || [];
  const whatWeTried = data.what_we_tried || research.what_we_tried || [];
  const stuckReason = data.stuck_reason || research.stuck_reason || 'No contact information found';

  return (
    <>
      {/* Stuck reason */}
      <div style={{ padding: '16px 20px', background: `${sc.color}15`, borderRadius: 14, border: `1px solid ${sc.color}33`, marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: sc.color, fontWeight: 500 }}>{stuckReason}</div>
      </div>

      {/* What we found */}
      {whatWeFound.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>What we found</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {whatWeFound.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(136,200,152,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <span style={{ color: '#88C898', fontSize: 12 }}>&#10003;</span>
                </div>
                <span style={{ fontSize: 15, color: 'rgba(255,245,240,0.7)', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What we tried */}
      {whatWeTried.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>What we tried</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {whatWeTried.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(200,136,136,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <span style={{ color: '#C88888', fontSize: 12 }}>&#10007;</span>
                </div>
                <span style={{ fontSize: 15, color: 'rgba(255,240,235,0.5)', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact info input */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Paste their email, LinkedIn, or Instagram</SectionLabel>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={contactInput}
            onChange={(e) => setContactInput(e.target.value)}
            placeholder="email@example.com or profile URL..."
            style={{
              flex: 1, padding: '16px 20px', fontSize: 15, color: 'rgba(255,248,244,0.9)',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,250,248,0.08)',
              borderRadius: 14, outline: 'none', fontFamily: 'inherit',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && contactInput.trim()) {
                const val = contactInput.trim();
                if (val.includes('@') && !val.includes('/')) onSaveContact('email', val);
                else if (val.includes('linkedin')) onSaveContact('linkedin', val);
                else if (val.includes('instagram') || val.startsWith('@')) onSaveContact('instagram', val);
                else onSaveContact('email', val);
                setContactInput('');
              }
            }}
          />
          <button
            onClick={() => {
              if (!contactInput.trim()) return;
              const val = contactInput.trim();
              if (val.includes('@') && !val.includes('/')) onSaveContact('email', val);
              else if (val.includes('linkedin')) onSaveContact('linkedin', val);
              else if (val.includes('instagram') || val.startsWith('@')) onSaveContact('instagram', val);
              else onSaveContact('email', val);
              setContactInput('');
            }}
            style={{
              padding: '16px 24px', background: `${sc.color}22`, border: `1px solid ${sc.color}44`,
              borderRadius: 14, color: sc.color, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── READY ─── */
function ReadyContent({ data, research, sc, editedContent, setEditedContent }) {
  const angle = research.angle || data.notes || '';

  return (
    <>
      {(research.what_they_do || research.what_we_found) && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>What we found</SectionLabel>
          <div style={{ fontSize: 15, color: 'rgba(255,245,240,0.7)', lineHeight: 1.65 }}>
            {research.what_they_do || research.what_we_found}
          </div>
        </div>
      )}

      {angle && (
        <div style={{ fontSize: 15, color: 'rgba(255,238,232,0.4)', marginBottom: 28, lineHeight: 1.65, fontStyle: 'italic', paddingLeft: 16, borderLeft: `2px solid ${sc.color}44` }}>
          {angle}
        </div>
      )}

      {editedContent && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 28, marginBottom: 28, border: '1px solid rgba(255,250,248,0.08)' }}>
          <SectionLabel>Draft message</SectionLabel>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            style={{ width: '100%', minHeight: 100, fontSize: 17, color: 'rgba(255,248,244,0.9)', lineHeight: 1.7, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
          />
        </div>
      )}
    </>
  );
}

/* ─── SENT ─── */
function SentContent({ data, sc, editedContent, setEditedContent }) {
  const sentMessage = data.sent_message || '';
  const sentDate = data.sent_date ? new Date(data.sent_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const followUpDraft = data.follow_up_draft || '';
  const daysSinceSent = data.sent_date ? Math.floor((Date.now() - new Date(data.sent_date).getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isStale = daysSinceSent !== null && daysSinceSent > 5;

  return (
    <>
      {/* Original sent message */}
      {sentMessage && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Sent{sentDate ? ` · ${sentDate}` : ''}{daysSinceSent !== null ? ` · ${daysSinceSent} days ago` : ''}</SectionLabel>
          <div style={{
            padding: '20px 24px', background: 'rgba(255,255,255,0.03)', borderRadius: 16,
            border: '1px solid rgba(255,250,248,0.06)', fontSize: 15,
            color: 'rgba(255,245,240,0.6)', lineHeight: 1.65, whiteSpace: 'pre-wrap',
          }}>
            {sentMessage}
          </div>
        </div>
      )}

      {/* Follow-up draft if stale */}
      {isStale && followUpDraft && (
        <div style={{ background: `${sc.color}08`, borderRadius: 20, padding: 28, marginBottom: 28, border: `1px solid ${sc.color}22` }}>
          <SectionLabel>Follow-up draft · No reply in {daysSinceSent} days</SectionLabel>
          <textarea
            value={editedContent || followUpDraft}
            onChange={(e) => setEditedContent(e.target.value)}
            style={{ width: '100%', minHeight: 80, fontSize: 17, color: 'rgba(255,248,244,0.9)', lineHeight: 1.7, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
          />
        </div>
      )}

      {!sentMessage && !followUpDraft && (
        <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,240,235,0.3)', fontSize: 14 }}>
          Waiting for a reply...
        </div>
      )}
    </>
  );
}

/* ─── REPLIED ─── */
function RepliedContent({ data, sc, editedContent, setEditedContent }) {
  const theirReply = data.their_reply || '';
  const replyDate = data.reply_date ? new Date(data.reply_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const suggestedResponse = data.suggested_response || '';

  return (
    <>
      {/* Their reply */}
      {theirReply && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Their reply{replyDate ? ` · ${replyDate}` : ''}</SectionLabel>
          <div style={{
            padding: '20px 24px', background: `${sc.color}12`, borderRadius: 16,
            border: `1px solid ${sc.color}33`, fontSize: 15,
            color: sc.color, lineHeight: 1.65, whiteSpace: 'pre-wrap', fontWeight: 500,
          }}>
            {theirReply}
          </div>
        </div>
      )}

      {/* Suggested response */}
      {suggestedResponse && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 28, marginBottom: 28, border: '1px solid rgba(255,250,248,0.08)' }}>
          <SectionLabel>Suggested response</SectionLabel>
          <textarea
            value={editedContent || suggestedResponse}
            onChange={(e) => setEditedContent(e.target.value)}
            style={{ width: '100%', minHeight: 80, fontSize: 17, color: 'rgba(255,248,244,0.9)', lineHeight: 1.7, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
          />
        </div>
      )}
    </>
  );
}

/* ─── CONNECTED ─── */
function ConnectedContent({ data, sc }) {
  const families = data.families_from_partner || [];
  const totalRevenue = families.reduce((sum, f) => sum + (f.monthly_revenue || 0), 0);

  return (
    <>
      {/* Referral stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        <StatBox label="Sent to them" value={data.referrals_sent || 0} bg="rgba(255,255,255,0.03)" border="rgba(255,250,248,0.06)" valueColor="rgba(255,248,244,0.9)" labelColor="rgba(255,240,235,0.35)" />
        <StatBox label="Received" value={data.referrals_received || 0} bg="rgba(136,200,152,0.08)" border="rgba(136,200,152,0.15)" valueColor="#88C898" labelColor="rgba(136,200,152,0.6)" />
      </div>

      {/* Families list */}
      {families.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Families from this partner</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {families.map((fam, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: 12,
                border: '1px solid rgba(255,250,248,0.05)',
              }}>
                <span style={{ fontSize: 15, color: 'rgba(255,248,244,0.85)', fontWeight: 500 }}>{fam.family_name}</span>
                <span style={{ fontSize: 14, color: '#88C898', fontWeight: 600 }}>${fam.monthly_revenue || 0}/mo</span>
              </div>
            ))}
          </div>
          {totalRevenue > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,240,235,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Total</span>
              <span style={{ fontSize: 16, color: '#88C898', fontWeight: 700 }}>${totalRevenue}/mo</span>
            </div>
          )}
        </div>
      )}

      {/* Relationship status */}
      {data.relationship_status && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: `${sc.color}15`, borderRadius: 14, border: `1px solid ${sc.color}33`, marginBottom: 28 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc.color }} />
          <span style={{ fontSize: 15, color: sc.color, fontWeight: 500 }}>{data.relationship_status.replace(/_/g, ' ')}</span>
        </div>
      )}
    </>
  );
}

/* ─── Shared Components ─── */
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,240,235,0.3)', marginBottom: 14 }}>
      {children}
    </div>
  );
}

function StatBox({ label, value, bg, border, valueColor, labelColor }) {
  return (
    <div style={{ flex: 1, padding: 20, background: bg, borderRadius: 14, border: `1px solid ${border}`, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 300, color: valueColor, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', color: labelColor }}>{label}</div>
    </div>
  );
}

function CommandInput({ inputRef, inputValue, setInputValue, handleKeyDown, placeholder, glowColor, borderColor }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: 16,
      border: `1px solid ${inputValue ? borderColor + '44' : 'rgba(255,250,248,0.08)'}`,
      overflow: 'hidden', transition: 'all 0.2s',
      boxShadow: inputValue ? `0 0 30px ${glowColor}` : 'none',
    }}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ width: '100%', padding: '22px 28px', fontSize: 17, color: 'rgba(255,248,244,0.9)', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit' }}
      />
    </div>
  );
}