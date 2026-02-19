import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REFERRER AGENT
 * Outcomes:
 * - Send X referrals to partners per week
 * - Give X happy families a reason to share per week
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studio_id, mode = 'analyze' } = await req.json();
    
    if (!studio_id) {
      return Response.json({ error: 'studio_id required' }, { status: 400 });
    }

    const students = await base44.entities.Student.filter({ studio_id });
    const families = await base44.entities.Family.filter({ studio_id });
    const partners = await base44.entities.Partner.filter({ studio_id });
    const referrals = await base44.entities.Referral.filter({ studio_id });
    const notes = await base44.entities.StudentNote.filter({ studio_id });
    const attendance = await base44.entities.Attendance.filter({ studio_id });

    const outcomes = await base44.entities.GrowthOutcome.filter({ studio_id, agent: 'referrer' });
    const sendToPartnersOutcome = outcomes.find(o => o.name.includes('Send') || o.name.includes('partner'));
    const shareableOutcome = outcomes.find(o => o.name.includes('share') || o.name.includes('Shareable'));

    const results = {
      mode,
      studio_id,
      partner_matches_found: 0,
      shareable_moments_found: 0,
      actions_created: 0
    };

    // Calculate referral balance with each partner
    const partnerBalances = {};
    for (const partner of partners.filter(p => p.status === 'connected')) {
      const sentToThem = referrals.filter(r => r.partner_id === partner.id && r.direction === 'sent').length;
      const receivedFromThem = referrals.filter(r => r.partner_id === partner.id && r.direction === 'received').length;
      partnerBalances[partner.id] = {
        partner,
        sent: sentToThem,
        received: receivedFromThem,
        needsBalancing: receivedFromThem > sentToThem + 2
      };
    }

    if (mode === 'partner_referrals' || mode === 'full') {
      const partnersToRefer = Object.values(partnerBalances)
        .filter(pb => pb.needsBalancing || pb.received > 0)
        .sort((a, b) => b.received - a.received);

      for (const { partner } of partnersToRefer.slice(0, 3)) {
        const prompt = `Find opportunities to refer dance studio families to a partner business.

Partner: ${partner.name}
Type: ${partner.type}

Think about what situations would make a dance family need this type of service.
Generate a strategy for identifying and making referrals.

Return JSON: {
  "referral_opportunities": [
    {
      "situation": "when a family would need this",
      "referral_script": "what to say when referring"
    }
  ],
  "proactive_mention": "how to naturally mention this partner to families"
}`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              referral_opportunities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    situation: { type: "string" },
                    referral_script: { type: "string" }
                  }
                }
              },
              proactive_mention: { type: "string" }
            }
          }
        });

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id,
          outcome_id: sendToPartnersOutcome?.id,
          agent: 'referrer',
          action_type: 'task',
          status: 'pending_review',
          priority: partnerBalances[partner.id]?.needsBalancing ? 'high' : 'medium',
          target_type: 'partner',
          target_id: partner.id,
          target_name: partner.name,
          title: `Send referrals to ${partner.name}`,
          summary: `Balance: sent ${partnerBalances[partner.id]?.sent || 0}, received ${partnerBalances[partner.id]?.received || 0}`,
          content: llmResponse.proactive_mention,
          context: {
            referral_opportunities: llmResponse.referral_opportunities,
            outcome_type: 'partner_referral'
          }
        });

        results.partner_matches_found++;
        results.actions_created++;
      }
    }

    if (mode === 'shareable_moments' || mode === 'full') {
      const happyFamilies = [];
      const activeStudents = students.filter(s => s.status === 'active');

      for (const student of activeStudents) {
        const studentAttendance = attendance.filter(a => a.student_name === student.name);
        const last30 = studentAttendance.filter(a => {
          const d = new Date(a.date);
          const ago = new Date();
          ago.setDate(ago.getDate() - 30);
          return d >= ago;
        });
        const attendanceRate = last30.length > 0 
          ? (last30.filter(a => a.status === 'present').length / last30.length) * 100 
          : 0;

        const positiveNotes = notes
          .filter(n => n.student_name === student.name && n.sentiment === 'positive')
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        const recentWin = positiveNotes.find(n => {
          const d = new Date(n.date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 14);
          return d >= weekAgo;
        });

        if (attendanceRate >= 80 && recentWin) {
          happyFamilies.push({
            student,
            recentWin: recentWin.content,
            family: families.find(f => f.parent_email === student.parent_email)
          });
        }
      }

      for (const data of happyFamilies.slice(0, 5)) {
        const { student, recentWin, family } = data;

        const prompt = `Create a shareable moment for a happy dance family.

Student: ${student.name}, age ${student.age || 'unknown'}
Recent win: ${recentWin}

Create a message that celebrates their progress, includes something shareable, and subtly encourages them to share or refer friends.
Keep it under 80 words.

Return JSON: {
  "subject": "email subject",
  "message": "the message",
  "shareable_hook": "the thing they might share",
  "call_to_action": "what you want them to do"
}`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              message: { type: "string" },
              shareable_hook: { type: "string" },
              call_to_action: { type: "string" }
            }
          }
        });

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id,
          outcome_id: shareableOutcome?.id,
          agent: 'referrer',
          action_type: 'email',
          status: 'pending_review',
          priority: 'medium',
          target_type: 'family',
          target_id: family?.id || student.id,
          target_name: student.name,
          target_email: student.parent_email,
          title: `Give ${family?.parent_name || 'family'} a reason to share`,
          summary: llmResponse.shareable_hook,
          subject: llmResponse.subject,
          content: llmResponse.message,
          context: {
            recent_win: recentWin,
            call_to_action: llmResponse.call_to_action,
            outcome_type: 'shareable_moment'
          }
        });

        results.shareable_moments_found++;
        results.actions_created++;
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'referrer',
      event_type: 'draft',
      summary: `Found ${results.partner_matches_found} partner opportunities, ${results.shareable_moments_found} shareable moments, created ${results.actions_created} actions`,
      details: results
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Referrer agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});