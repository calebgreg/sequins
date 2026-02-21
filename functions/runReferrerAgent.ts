import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REFERRER AGENT
 * Generates outbound referrals to partners and identifies shareable moments
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
    const partners = await base44.asServiceRole.entities.Partner.filter({ studio_id });
    const activePartners = partners.filter(p => p.relationship_status === 'connected' || p.relationship_status === 'active_partner');
    const families = await base44.asServiceRole.entities.Family.filter({ studio_id });
    const students = await base44.asServiceRole.entities.Student.filter({ studio_id, status: 'active' });
    const studentNotes = await base44.asServiceRole.entities.StudentNote.filter({ studio_id });
    const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const recentNotes = studentNotes.filter(n => new Date(n.date || n.created_date) >= twoWeeksAgo);
    const referrals = await base44.asServiceRole.entities.Referral.filter({ studio_id });

    const outcomes = await base44.asServiceRole.entities.GrowthOutcome.filter({ studio_id, agent: 'referrer' });
    const referOutcome = outcomes.find(o => o.name?.toLowerCase().includes('refer'));

    const results = { mode, studio_id, matches_found: 0, moments_found: 0, actions_created: 0, errors: [] };

    const senderFirst = (user?.full_name && !user.full_name.includes('@') ? user.full_name.split(' ')[0] : null) || studioName.split(' ')[0];

    // MATCH FAMILIES TO PARTNERS
    if (mode === 'match' || mode === 'full') {
      const partnersOwed = activePartners.filter(p => (p.referral_balance || 0) < 0).sort((a, b) => (a.referral_balance || 0) - (b.referral_balance || 0));

      for (const partner of partnersOwed.slice(0, 3)) {
        try {
          const matches = await base44.integrations.Core.InvokeLLM({
            prompt: `Match families to this partner's services:
PARTNER: ${partner.name} (${partner.category})
FAMILIES: ${families.slice(0, 10).map(f => { const fs = students.filter(s => s.parent_email === f.parent_email); return `- ${f.parent_name}: ${fs.map(s => `${s.name} (${s.age || '?'})`).join(', ')}`; }).join('\n')}
Return JSON: { "recommended_families": [{ "parent_name": "name", "reason": "why", "talking_point": "what to say" }] }`,
            response_json_schema: { type: "object", properties: { recommended_families: { type: "array", items: { type: "object", properties: { parent_name: { type: "string" }, reason: { type: "string" }, talking_point: { type: "string" } } } } } }
          });

          for (const match of matches.recommended_families?.slice(0, 2) || []) {
            const family = families.find(f => f.parent_name?.toLowerCase().includes(match.parent_name?.toLowerCase()));
            if (!family) continue;
            results.matches_found++;

            const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, agent: 'referrer', target_id: family.id, status: 'pending_review' });
            if (existingActions.length > 0) continue;

            await base44.asServiceRole.entities.GrowthAction.create({
              studio_id, outcome_id: referOutcome?.id, agent: 'referrer', action_type: 'task',
              status: 'pending_review', priority: 'medium', target_type: 'family', target_id: family.id, target_name: family.parent_name,
              title: `Refer ${family.parent_name} to ${partner.name}`, summary: match.reason, content: match.talking_point,
              context: { action_subtype: 'outbound_referral', partner_id: partner.id, partner_name: partner.name }
            });
            results.actions_created++;
          }
        } catch (err) { console.error(`Error: ${err.message}`); results.errors.push(err.message); }
      }
    }

    // SHAREABLE MOMENTS
    if (mode === 'moments' || mode === 'full') {
      const shareableNotes = recentNotes.filter(n => n.sentiment === 'positive' && (n.content?.length > 30) &&
        (n.content?.toLowerCase().includes('first') || n.content?.toLowerCase().includes('amazing') || n.content?.toLowerCase().includes('breakthrough') || n.content?.toLowerCase().includes('nailed') || n.content?.toLowerCase().includes('beautiful')));

      for (const note of shareableNotes.slice(0, 3)) {
        const student = students.find(s => s.name === note.student_name);
        if (!student) continue;
        results.moments_found++;

        const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, agent: 'referrer', target_id: note.id, status: 'pending_review' });
        if (existingActions.length > 0) continue;

        try {
          const moment = await base44.integrations.Core.InvokeLLM({
            prompt: `Write a quick text to ${student.parent_name || 'a parent'} celebrating their kid ${student.name}'s win: "${note.content}". Then add a natural referral nudge. MAX 3 sentences. No URLs. No sign-off.
Return JSON: { "message": "the text" }`,
            response_json_schema: { type: "object", properties: { message: { type: "string" } } }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id, outcome_id: referOutcome?.id, agent: 'referrer', action_type: 'sms',
            status: 'pending_review', priority: 'low', target_type: 'student', target_id: note.id, target_name: student.name,
            target_email: student.parent_email,
            title: `Share ${student.name}'s moment`, summary: note.content?.slice(0, 100), content: moment.message,
            context: { action_subtype: 'shareable_moment', student_name: student.name, note_content: note.content }
          });
          results.actions_created++;
        } catch (err) { console.error(`Error: ${err.message}`); results.errors.push(err.message); }
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id, agent: 'referrer', outcome_id: referOutcome?.id, event_type: 'action',
      summary: `Found ${results.matches_found} referral matches, ${results.moments_found} shareable moments, created ${results.actions_created} actions`,
      details: results
    });

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('Referrer agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});