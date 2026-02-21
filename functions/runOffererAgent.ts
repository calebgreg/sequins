import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * OFFERER AGENT
 * Matches leads/prospects to best current offer, crafts personalized invitations
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const studio_id = body.studio_id;
    const mode = body.mode || 'match';
    if (!studio_id) return Response.json({ error: 'studio_id is required' }, { status: 400 });

    const allStudios = await base44.asServiceRole.entities.Studio.list();
    const studio = allStudios.find(s => s.id === studio_id);
    if (!studio) return Response.json({ error: 'Studio not found' }, { status: 404 });

    const studioName = studio.name;
    const leads = await base44.asServiceRole.entities.Lead.filter({ studio_id });
    let prospects = [];
    try { prospects = await base44.asServiceRole.entities.Prospect.filter({ studio_id }); } catch (_) {}
    const classes = await base44.asServiceRole.entities.DanceClass.filter({ studio_id });

    const outcomes = await base44.asServiceRole.entities.GrowthOutcome.filter({ studio_id, agent: 'offerer' });
    const offerOutcome = outcomes.find(o => o.name?.toLowerCase().includes('offer'));
    const weeklyTarget = offerOutcome?.target_count || 5;

    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const offersThisWeek = leads.filter(l => (l.funnel_status === 'trial_scheduled' || l.funnel_status === 'trial_completed') && new Date(l.updated_date) >= weekStart).length;

    const results = { mode, studio_id, weekly_target: weeklyTarget, current_progress: offersThisWeek, leads_processed: 0, actions_created: 0, errors: [] };

    const styleMap = {};
    for (const cls of classes) {
      if (cls.type === 'admin') continue;
      const style = cls.style || cls.title?.split(' ')[0] || 'Dance';
      if (!styleMap[style]) styleMap[style] = [];
      styleMap[style].push({ id: cls.id, title: cls.title, day: cls.day, time: cls.start_time, spots: (cls.student_names?.length || 0) < 12 });
    }

    if (mode === 'match' || mode === 'full') {
      const leadsNeedingOffer = leads.filter(l => l.funnel_status === 'new' || l.funnel_status === 'contacted');
      const allProspects = [...leadsNeedingOffer, ...prospects.filter(p => !p.converted_to_lead)];

      // Get studio owner name for messages
      let inviteSender = studioName.split(' ')[0];
      if (studio.owner_email) {
        const users = await base44.asServiceRole.entities.User.list();
        const owner = users.find(u => u.email === studio.owner_email);
        if (owner?.full_name && !owner.full_name.includes('@')) inviteSender = owner.full_name.split(' ')[0];
      }

      for (const lead of allProspects.slice(0, 10)) {
        const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, target_id: lead.id, agent: 'offerer', status: 'pending_review' });
        if (existingActions.length > 0) continue;

        try {
          const match = await base44.asServiceRole.functions.invoke('callClaudeService', {
            prompt: `Match this lead to the best offer from a dance studio:
LEAD: Parent: ${lead.parent_name}, Child: ${lead.child_name || 'Unknown'}, Age: ${lead.child_age || 'Unknown'}, Interests: ${lead.child_interests?.join(', ') || 'Not specified'}, Source: ${lead.source}, Status: ${lead.funnel_status}
AVAILABLE: Free Trial Class (styles: ${Object.keys(styleMap).join(', ')}), Open House Visit
Return JSON: { "recommended_offer": "trial_class or open_house", "recommended_style": "style or null", "personal_hook": "something specific", "confidence": "high/medium/low" }`,
            response_json_schema: { type: "object", properties: { recommended_offer: { type: "string" }, recommended_style: { type: "string" }, personal_hook: { type: "string" }, confidence: { type: "string" } } }
          });

          results.leads_processed++;
          if (match.confidence === 'low') continue;

          const invitation = await base44.asServiceRole.functions.invoke('callClaudeService', {
            prompt: `Write an invitation from ${inviteSender} at ${studioName} to ${lead.parent_name} for their child ${lead.child_name || 'their child'} (age ${lead.child_age || 'unknown'}).
Offer: ${match.recommended_offer === 'trial_class' ? 'Free Trial Class' : 'Open House Visit'}${match.recommended_style ? ` in ${match.recommended_style}` : ''}
SMS VERSION (under 160 chars, casual). EMAIL VERSION (under 4 sentences, sign with "${inviteSender}"). No URLs. No formal sign-off.
Return JSON: { "sms": "text", "email_subject": "subject", "email_body": "email" }`,
            response_json_schema: { type: "object", properties: { sms: { type: "string" }, email_subject: { type: "string" }, email_body: { type: "string" } } }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id, outcome_id: offerOutcome?.id, agent: 'offerer',
            action_type: lead.parent_phone ? 'sms' : 'email', status: 'pending_review',
            priority: match.confidence === 'high' ? 'high' : 'medium',
            target_type: 'lead', target_id: lead.id, target_name: lead.parent_name,
            target_email: lead.parent_email, target_phone: lead.parent_phone,
            title: `Invite ${lead.child_name || lead.parent_name} to ${match.recommended_offer === 'trial_class' ? 'trial' : 'open house'}`,
            summary: match.personal_hook, subject: invitation.email_subject,
            content: lead.parent_phone ? invitation.sms : invitation.email_body,
            context: { child_name: lead.child_name, recommended_offer: match.recommended_offer, recommended_style: match.recommended_style, sms_version: invitation.sms, email_version: invitation.email_body }
          });
          results.actions_created++;
        } catch (err) {
          console.error(`Error processing ${lead.parent_name}:`, err.message);
          results.errors.push(`Match ${lead.parent_name}: ${err.message}`);
        }
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id, agent: 'offerer', outcome_id: offerOutcome?.id, event_type: 'action',
      summary: `Processed ${results.leads_processed} leads, created ${results.actions_created} invitation actions`,
      details: results
    });

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('Offerer agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});