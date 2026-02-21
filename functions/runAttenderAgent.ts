import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ATTENDER AGENT
 * Finds local family events, evaluates fit, recommends registration
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const studio_id = body.studio_id;
    const mode = body.mode || 'research';
    if (!studio_id) return Response.json({ error: 'studio_id is required' }, { status: 400 });

    const allStudios = await base44.asServiceRole.entities.Studio.list();
    const studio = allStudios.find(s => s.id === studio_id);
    if (!studio) return Response.json({ error: 'Studio not found' }, { status: 404 });

    const studioName = studio.name;
    const studioLocation = studio.address || "local area";

    const existingEvents = await base44.asServiceRole.entities.CommunityEvent.filter({ studio_id });
    const existingNames = new Set(existingEvents.map(e => e.name?.toLowerCase()));

    const outcomes = await base44.asServiceRole.entities.GrowthOutcome.filter({ studio_id, agent: 'attender' });
    const attendOutcome = outcomes.find(o => o.name?.toLowerCase().includes('attend'));

    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const attendedThisMonth = existingEvents.filter(e => e.status === 'attended' && new Date(e.date) >= monthStart).length;

    const results = { mode, studio_id, events_found: 0, events_evaluated: 0, actions_created: 0, errors: [] };

    // RESEARCH
    if (mode === 'research' || mode === 'full') {
      const now = new Date();
      const months = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
      }

      try {
        const research = await base44.integrations.Core.InvokeLLM({
          prompt: `Find family-friendly community events near ${studioLocation} happening in ${months.join(', ')}. Look for school carnivals, city festivals, library events, church events, sports sign-up days, farmer's markets with kid activities. Find at least 5-10 real events.
Return JSON: { "events": [{ "name": "event name", "type": "carnival|festival|fair|library|school|community|sports|other", "date": "YYYY-MM-DD or TBD", "time": "time", "location": "venue", "expected_attendance": 100, "booth_cost": null, "registration_deadline": null, "source": "where found", "fit_reasoning": "why good for dance studio" }] }`,
          add_context_from_internet: true,
          response_json_schema: { type: "object", properties: { events: { type: "array", items: { type: "object", properties: { name: { type: "string" }, type: { type: "string" }, date: { type: "string" }, time: { type: "string" }, location: { type: "string" }, expected_attendance: { type: "number" }, booth_cost: { type: "number" }, registration_deadline: { type: "string" }, source: { type: "string" }, fit_reasoning: { type: "string" } } } } } }
        });

        for (const event of research.events || []) {
          if (existingNames.has(event.name?.toLowerCase())) continue;
          await base44.asServiceRole.entities.CommunityEvent.create({
            studio_id, name: event.name, type: event.type || 'other',
            date: event.date?.includes('TBD') ? null : event.date, time: event.time,
            location: event.location, expected_attendance: event.expected_attendance,
            booth_cost: event.booth_cost, registration_deadline: event.registration_deadline,
            discovery_source: event.source || 'ai_research', status: 'identified', fit_reasoning: event.fit_reasoning
          });
          existingNames.add(event.name?.toLowerCase());
          results.events_found++;
        }
      } catch (err) { console.error("Event research error:", err.message); results.errors.push(err.message); }
    }

    // EVALUATE
    if (mode === 'evaluate' || mode === 'full') {
      const identifiedEvents = await base44.asServiceRole.entities.CommunityEvent.filter({ studio_id, status: 'identified' });
      for (const event of identifiedEvents) {
        if (event.fit_score) continue;
        try {
          const evaluation = await base44.integrations.Core.InvokeLLM({
            prompt: `Evaluate this event for a dance studio: ${event.name}, ${event.type}, date: ${event.date || 'TBD'}, attendance: ${event.expected_attendance || 'unknown'}, cost: ${event.booth_cost ? '$' + event.booth_cost : 'unknown'}. Score 0-100.
Return JSON: { "fit_score": 75, "recommendation": "register|maybe|skip", "reasoning": "one sentence" }`,
            response_json_schema: { type: "object", properties: { fit_score: { type: "number" }, recommendation: { type: "string" }, reasoning: { type: "string" } } }
          });

          await base44.asServiceRole.entities.CommunityEvent.update(event.id, {
            fit_score: evaluation.fit_score, fit_reasoning: evaluation.reasoning,
            status: evaluation.recommendation === 'skip' ? 'skipped' : 'evaluating'
          });
          results.events_evaluated++;
        } catch (err) { console.error(`Eval error: ${err.message}`); results.errors.push(err.message); }
      }
    }

    // ACTION
    if (mode === 'action' || mode === 'full') {
      const evaluatedEvents = await base44.asServiceRole.entities.CommunityEvent.filter({ studio_id, status: 'evaluating' });
      const recommended = evaluatedEvents.filter(e => e.fit_score >= 60).sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0));

      for (const event of recommended.slice(0, 5)) {
        const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, target_id: event.id, status: 'pending_review' });
        if (existingActions.length > 0) continue;

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id, outcome_id: attendOutcome?.id, agent: 'attender', action_type: 'task',
          status: 'pending_review', priority: event.fit_score >= 80 ? 'high' : 'medium',
          target_type: 'event', target_id: event.id, target_name: event.name,
          title: `Register for ${event.name}`, summary: event.fit_reasoning,
          content: `Date: ${event.date || 'TBD'}\nLocation: ${event.location}\nAttendance: ${event.expected_attendance || 'Unknown'}\nCost: ${event.booth_cost ? '$' + event.booth_cost : 'TBD'}`,
          context: { event_type: event.type, fit_score: event.fit_score, booth_cost: event.booth_cost }
        });
        results.actions_created++;
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id, agent: 'attender', outcome_id: attendOutcome?.id,
      event_type: mode === 'research' ? 'research' : 'action',
      summary: `Found ${results.events_found} events, evaluated ${results.events_evaluated}, created ${results.actions_created} actions`,
      details: results
    });

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('Attender agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});