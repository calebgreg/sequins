import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONVERTER AGENT
 * Analyzes trial attendance, generates personalized follow-ups
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const studio_id = body.studio_id;
    const mode = body.mode || 'analyze';
    if (!studio_id) return Response.json({ error: 'studio_id is required' }, { status: 400 });

    const allStudios = await base44.asServiceRole.entities.Studio.list();
    const studio = allStudios.find(s => s.id === studio_id);
    if (!studio) return Response.json({ error: 'Studio not found' }, { status: 404 });

    const studioName = studio.name;
    const leads = await base44.asServiceRole.entities.Lead.filter({ studio_id });
    const attendance = await base44.asServiceRole.entities.Attendance.filter({ studio_id });
    const studentNotes = await base44.asServiceRole.entities.StudentNote.filter({ studio_id });

    const outcomes = await base44.asServiceRole.entities.GrowthOutcome.filter({ studio_id, agent: 'converter' });
    const convertOutcome = outcomes.find(o => o.name?.toLowerCase().includes('convert'));

    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const conversionsThisWeek = leads.filter(l => l.funnel_status === 'enrolled' && new Date(l.updated_date) >= weekStart).length;

    const results = { mode, studio_id, trials_analyzed: 0, actions_created: 0, errors: [] };

    const senderFirst = (user?.full_name && !user.full_name.includes('@') ? user.full_name.split(' ')[0] : null) || studioName.split(' ')[0];

    const trialCompletedNotEnrolled = leads.filter(l => l.funnel_status === 'trial_completed' || (l.funnel_status === 'offer_made' && l.trial_outcome === 'attended'));
    const noShows = leads.filter(l => l.trial_outcome === 'no_show' || (l.funnel_status === 'trial_scheduled' && l.trial_date && new Date(l.trial_date) < new Date()));
    const upcomingTrials = leads.filter(l => l.funnel_status === 'trial_scheduled' && l.trial_date && new Date(l.trial_date) >= new Date());

    if (mode === 'analyze' || mode === 'full') {
      // PATH 1: Feel Special (attended trial)
      for (const lead of trialCompletedNotEnrolled.slice(0, 5)) {
        const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, target_id: lead.id, agent: 'converter', status: 'pending_review' });
        if (existingActions.length > 0) continue;

        try {
          const childNotes = studentNotes.filter(n => n.student_name?.toLowerCase() === lead.child_name?.toLowerCase());
          const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: `Write a follow-up text from ${senderFirst} at ${studioName} to ${lead.parent_name} after their kid ${lead.child_name}'s trial class (${lead.trial_date}).
${childNotes.length > 0 ? `Teacher observations: ${childNotes.map(n => n.content).join('; ')}` : ''}
MAX 3-4 sentences. One clear next step. No formal sign-off. No URLs.
Return JSON: { "message": "the complete message" }`,
            response_json_schema: { type: "object", properties: { message: { type: "string" } } }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id, outcome_id: convertOutcome?.id, agent: 'converter',
            action_type: lead.parent_phone ? 'sms' : 'email', status: 'pending_review', priority: 'high',
            target_type: 'lead', target_id: lead.id, target_name: lead.parent_name,
            target_email: lead.parent_email, target_phone: lead.parent_phone,
            title: `Convert ${lead.child_name || lead.parent_name} - Feel Special`,
            summary: `Trial completed, not yet enrolled`, content: analysis.message,
            context: { follow_up_type: 'feel_special', child_name: lead.child_name, trial_date: lead.trial_date }
          });
          results.trials_analyzed++; results.actions_created++;
        } catch (err) { console.error(`Error: ${err.message}`); results.errors.push(err.message); }
      }

      // PATH 2: No-Shows
      for (const lead of noShows.slice(0, 3)) {
        const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, target_id: lead.id, agent: 'converter', status: 'pending_review' });
        if (existingActions.length > 0) continue;

        try {
          const noShowAnalysis = await base44.integrations.Core.InvokeLLM({
            prompt: `Write a casual follow-up text from ${senderFirst} at ${studioName} after ${lead.parent_name}'s family no-showed their trial on ${lead.trial_date}. Child: ${lead.child_name}. Zero guilt. Make rescheduling easy. MAX 2-3 sentences. No URLs. No sign-off.
Return JSON: { "message": "the complete text message" }`,
            response_json_schema: { type: "object", properties: { message: { type: "string" } } }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id, outcome_id: convertOutcome?.id, agent: 'converter',
            action_type: 'email', status: 'pending_review', priority: 'medium',
            target_type: 'lead', target_id: lead.id, target_name: lead.parent_name,
            target_email: lead.parent_email,
            title: `Re-engage ${lead.child_name || lead.parent_name} - No Show`,
            summary: `Missed trial on ${lead.trial_date}`, content: noShowAnalysis.message,
            context: { follow_up_type: 'no_show_value', child_name: lead.child_name, original_trial_date: lead.trial_date }
          });
          results.trials_analyzed++; results.actions_created++;
        } catch (err) { console.error(`Error: ${err.message}`); results.errors.push(err.message); }
      }

      // PATH 3: Upcoming trial prep
      for (const lead of upcomingTrials.slice(0, 3)) {
        const daysUntil = Math.ceil((new Date(lead.trial_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 1 || daysUntil > 3) continue;

        const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, target_id: lead.id, agent: 'converter', status: 'pending_review' });
        if (existingActions.length > 0) continue;

        try {
          const prep = await base44.integrations.Core.InvokeLLM({
            prompt: `Write a trial-prep reminder text from ${senderFirst} at ${studioName} to ${lead.parent_name}. Child: ${lead.child_name}, trial in ${daysUntil} days. Be practical (what to wear), build excitement, confirm casually. MAX 3 sentences. No URLs. No sign-off.
Return JSON: { "message": "the complete text" }`,
            response_json_schema: { type: "object", properties: { message: { type: "string" } } }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id, outcome_id: convertOutcome?.id, agent: 'converter',
            action_type: 'sms', status: 'pending_review', priority: 'high',
            target_type: 'lead', target_id: lead.id, target_name: lead.parent_name, target_phone: lead.parent_phone,
            title: `Prep ${lead.child_name || lead.parent_name} for trial`,
            summary: `Trial in ${daysUntil} days`, content: prep.message,
            context: { follow_up_type: 'trial_prep', child_name: lead.child_name, trial_date: lead.trial_date, days_until: daysUntil }
          });
          results.trials_analyzed++; results.actions_created++;
        } catch (err) { console.error(`Error: ${err.message}`); results.errors.push(err.message); }
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id, agent: 'converter', outcome_id: convertOutcome?.id, event_type: 'action',
      summary: `Analyzed ${results.trials_analyzed} trial families, created ${results.actions_created} actions`,
      details: results
    });

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('Converter agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});