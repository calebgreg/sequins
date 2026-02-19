import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ATTENDER AGENT
 * Outcome: Attend X community events per month
 * Does: Finds local family events, evaluates fit, recommends registration
 * "Attend" means studio had a booth/presence and collected leads
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studio_id, mode = 'research' } = await req.json();
    
    if (!studio_id) {
      return Response.json({ error: 'studio_id required' }, { status: 400 });
    }

    // =========================================
    // STEP 1: Gather context
    // =========================================
    
    const studios = await base44.entities.Studio.filter({ id: studio_id });
    const studio = studios[0];
    
    if (!studio) {
      return Response.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    const studioName = studio.name;
    const studioLocation = studio.address || "local area";

    // Get existing events to avoid duplicates
    const existingEvents = await base44.entities.CommunityEvent.filter({ studio_id });
    const existingNames = new Set(existingEvents.map(e => e.name?.toLowerCase()));

    // Get outcome for tracking
    const outcomes = await base44.entities.GrowthOutcome.filter({ 
      studio_id, 
      agent: 'attender' 
    });
    const attendOutcome = outcomes.find(o => o.name?.toLowerCase().includes('attend'));
    const monthlyTarget = attendOutcome?.target_count || 2;

    // Count this month's attended events
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const attendedThisMonth = existingEvents.filter(e => 
      e.status === 'attended' && 
      new Date(e.date) >= monthStart
    ).length;

    const results = {
      mode,
      studio_id,
      monthly_target: monthlyTarget,
      current_progress: attendedThisMonth,
      events_found: 0,
      events_evaluated: 0,
      actions_created: 0,
      errors: []
    };

    // =========================================
    // STEP 2: RESEARCH MODE
    // Find local family events via LLM + web context
    // =========================================
    
    if (mode === 'research' || mode === 'full') {
      console.log("Starting event research...");

      // Get current month and next 2 months
      const now = new Date();
      const months = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
      }

      const researchPrompt = `Find family-friendly community events near ${studioLocation} happening in ${months.join(', ')}.

Look for:
- School carnivals and fairs
- City/town festivals
- Library events for kids
- Church community events
- Sports league sign-up days
- Farmer's markets with kid activities
- Mall or shopping center family events
- Eventbrite family events in the area

For each event, provide:
- Event name
- Date (as specific as possible)
- Location/venue
- Expected attendance (estimate)
- Cost to participate (booth fee if known)
- Why it's good for a dance studio

Return JSON: {
  "events": [
    {
      "name": "event name",
      "type": "carnival|festival|fair|library|school|community|sports|other",
      "date": "YYYY-MM-DD or 'TBD Month'",
      "time": "time if known",
      "location": "venue and address",
      "expected_attendance": number estimate,
      "booth_cost": number or null,
      "registration_deadline": "YYYY-MM-DD or null",
      "source": "where you found this",
      "fit_reasoning": "why this is good for a dance studio"
    }
  ]
}

Find at least 5-10 events. Be specific with real events, not generic suggestions.`;

      try {
        const research = await base44.integrations.Core.InvokeLLM({
          prompt: researchPrompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              events: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                    date: { type: "string" },
                    time: { type: "string" },
                    location: { type: "string" },
                    expected_attendance: { type: "number" },
                    booth_cost: { type: "number" },
                    registration_deadline: { type: "string" },
                    source: { type: "string" },
                    fit_reasoning: { type: "string" }
                  }
                }
              }
            }
          }
        });

        for (const event of research.events || []) {
          if (existingNames.has(event.name?.toLowerCase())) continue;

          await base44.asServiceRole.entities.CommunityEvent.create({
            studio_id,
            name: event.name,
            type: event.type || 'other',
            date: event.date?.includes('TBD') ? null : event.date,
            time: event.time,
            location: event.location,
            expected_attendance: event.expected_attendance,
            booth_cost: event.booth_cost,
            registration_deadline: event.registration_deadline,
            discovery_source: event.source || 'ai_research',
            status: 'identified',
            fit_reasoning: event.fit_reasoning
          });

          existingNames.add(event.name?.toLowerCase());
          results.events_found++;
        }
      } catch (err) {
        console.error("Event research error:", err.message);
        results.errors.push(`Research: ${err.message}`);
      }
    }

    // =========================================
    // STEP 3: EVALUATE MODE
    // Score events by fit, cost, attendance, timing
    // =========================================
    
    if (mode === 'evaluate' || mode === 'full') {
      console.log("Starting event evaluation...");

      const identifiedEvents = await base44.entities.CommunityEvent.filter({
        studio_id,
        status: 'identified'
      });

      for (const event of identifiedEvents) {
        if (event.fit_score) continue; // Already evaluated

        try {
          const evalPrompt = `Evaluate this event for a dance studio booth/presence:

Event: ${event.name}
Type: ${event.type}
Date: ${event.date || 'TBD'}
Location: ${event.location}
Expected Attendance: ${event.expected_attendance || 'unknown'}
Booth Cost: ${event.booth_cost ? '$' + event.booth_cost : 'unknown'}
Registration Deadline: ${event.registration_deadline || 'unknown'}

Score this event 0-100 based on:
- Family attendance likelihood (40 points)
- Cost efficiency (20 points)
- Timing/lead time (20 points)
- Competition from other vendors (10 points)
- Brand alignment (10 points)

Return JSON: {
  "fit_score": number 0-100,
  "score_breakdown": {
    "family_attendance": number,
    "cost_efficiency": number,
    "timing": number,
    "competition": number,
    "brand_alignment": number
  },
  "recommendation": "register|maybe|skip",
  "reasoning": "one sentence summary"
}`;

          const evaluation = await base44.integrations.Core.InvokeLLM({
            prompt: evalPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                fit_score: { type: "number" },
                score_breakdown: {
                  type: "object",
                  properties: {
                    family_attendance: { type: "number" },
                    cost_efficiency: { type: "number" },
                    timing: { type: "number" },
                    competition: { type: "number" },
                    brand_alignment: { type: "number" }
                  }
                },
                recommendation: { type: "string" },
                reasoning: { type: "string" }
              }
            }
          });

          await base44.asServiceRole.entities.CommunityEvent.update(event.id, {
            fit_score: evaluation.fit_score,
            fit_reasoning: evaluation.reasoning,
            status: evaluation.recommendation === 'skip' ? 'skipped' : 'evaluating'
          });

          results.events_evaluated++;
        } catch (err) {
          console.error(`Evaluation error for ${event.name}:`, err.message);
          results.errors.push(`Evaluate ${event.name}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 4: ACTION MODE
    // Create GrowthActions for recommended events
    // =========================================
    
    if (mode === 'action' || mode === 'full') {
      console.log("Creating event registration actions...");

      const evaluatedEvents = await base44.entities.CommunityEvent.filter({
        studio_id,
        status: 'evaluating'
      });

      // Prioritize by fit score
      const recommended = evaluatedEvents
        .filter(e => e.fit_score >= 60)
        .sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0));

      for (const event of recommended.slice(0, 5)) {
        // Check for existing action
        const existingActions = await base44.entities.GrowthAction.filter({
          studio_id,
          target_id: event.id,
          status: 'pending_review'
        });
        
        if (existingActions.length > 0) continue;

        try {
          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id,
            outcome_id: attendOutcome?.id,
            agent: 'attender',
            action_type: 'register',
            status: 'pending_review',
            priority: event.fit_score >= 80 ? 'high' : 'medium',
            target_type: 'event',
            target_id: event.id,
            target_name: event.name,
            title: `Register for ${event.name}`,
            summary: event.fit_reasoning,
            content: `Event Date: ${event.date || 'TBD'}\nLocation: ${event.location}\nExpected Attendance: ${event.expected_attendance || 'Unknown'}\nBooth Cost: ${event.booth_cost ? '$' + event.booth_cost : 'TBD'}\nDeadline: ${event.registration_deadline || 'Check website'}`,
            context: {
              event_type: event.type,
              fit_score: event.fit_score,
              booth_cost: event.booth_cost,
              expected_attendance: event.expected_attendance,
              registration_deadline: event.registration_deadline
            }
          });

          results.actions_created++;
        } catch (err) {
          console.error(`Action error for ${event.name}:`, err.message);
          results.errors.push(`Action ${event.name}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 5: Log activity
    // =========================================
    
    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'attender',
      outcome_id: attendOutcome?.id,
      event_type: mode === 'research' ? 'research' : 'action',
      summary: `Found ${results.events_found} events, evaluated ${results.events_evaluated}, created ${results.actions_created} registration actions`,
      details: results
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Attender agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});