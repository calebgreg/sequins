import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ATTENDER AGENT
 * Outcome: Attend X community events per month
 * Does: Discovers events, evaluates fit, tracks deadlines, suggests registration
 */

const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");

async function searchEvents(query, location) {
  if (!SERPAPI_KEY) {
    console.log("No SERPAPI_KEY - skipping external search");
    return [];
  }
  
  const params = new URLSearchParams({
    q: query,
    location: location,
    api_key: SERPAPI_KEY,
    engine: "google_events"
  });
  
  const response = await fetch(`https://serpapi.com/search?${params}`);
  const data = await response.json();
  return data.events_results || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studio_id, mode = 'discover' } = await req.json();
    
    if (!studio_id) {
      return Response.json({ error: 'studio_id required' }, { status: 400 });
    }

    // Get studio info
    const studios = await base44.entities.Studio.filter({ id: studio_id });
    const studio = studios[0];
    const studioLocation = studio?.address || "local area";

    // Get existing events to avoid duplicates
    const existingEvents = await base44.entities.CommunityEvent.filter({ studio_id });
    const existingNames = new Set(existingEvents.map(e => e.name.toLowerCase()));

    // Get outcome for tracking
    const outcomes = await base44.entities.GrowthOutcome.filter({ 
      studio_id, 
      agent: 'attender' 
    });
    const attendOutcome = outcomes.find(o => o.name.includes('Attend'));
    const monthlyTarget = attendOutcome?.target_count || 2;

    // Count this month's attended events
    const monthStart = new Date();
    monthStart.setDate(1);
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
      actions_created: 0
    };

    if (mode === 'discover') {
      // DISCOVER MODE: Find upcoming community events
      const eventQueries = [
        'family festival',
        'kids fair',
        'school carnival',
        'community event children',
        'library kids event'
      ];

      const allEvents = [];
      
      for (const query of eventQueries.slice(0, 3)) {
        const events = await searchEvents(query, studioLocation);
        allEvents.push(...events);
      }

      // Use LLM to evaluate and structure events
      if (allEvents.length > 0) {
        const prompt = `You are evaluating community events for a dance studio to attend with a booth/presence.

Events found:
${JSON.stringify(allEvents.slice(0, 10), null, 2)}

For each relevant event (family-friendly, good for promoting kids dance classes), extract:
- name: event name
- date: best guess at date (or "TBD")
- venue: location if known
- fit_score: 1-10 how good a fit for a dance studio
- fit_reason: why it's a good/bad fit
- registration_urgency: "urgent", "soon", or "plenty_of_time"

Return JSON: { "events": [...] }

Only include events with fit_score >= 6.`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              events: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    date: { type: "string" },
                    venue: { type: "string" },
                    fit_score: { type: "number" },
                    fit_reason: { type: "string" },
                    registration_urgency: { type: "string" }
                  }
                }
              }
            }
          }
        });

        for (const event of llmResponse.events || []) {
          if (existingNames.has(event.name.toLowerCase())) continue;

          await base44.asServiceRole.entities.CommunityEvent.create({
            studio_id,
            name: event.name,
            event_type: 'community',
            date: event.date !== 'TBD' ? event.date : null,
            venue: event.venue,
            status: 'discovered',
            ai_research: {
              fit_score: event.fit_score,
              fit_reason: event.fit_reason,
              registration_urgency: event.registration_urgency,
              found_at: new Date().toISOString()
            }
          });
          
          results.events_found++;
        }
      }
    }

    if (mode === 'recommend' || mode === 'full') {
      // RECOMMEND MODE: Create actions for discovered events worth attending
      const discoveredEvents = await base44.entities.CommunityEvent.filter({ 
        studio_id, 
        status: 'discovered' 
      });

      const prioritized = discoveredEvents
        .filter(e => e.ai_research?.fit_score >= 7)
        .sort((a, b) => {
          const urgencyOrder = { urgent: 0, soon: 1, plenty_of_time: 2 };
          return (urgencyOrder[a.ai_research?.registration_urgency] || 2) - 
                 (urgencyOrder[b.ai_research?.registration_urgency] || 2);
        });

      for (const event of prioritized.slice(0, 3)) {
        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id,
          outcome_id: attendOutcome?.id,
          agent: 'attender',
          action_type: 'event',
          status: 'pending_review',
          priority: event.ai_research?.registration_urgency === 'urgent' ? 'high' : 'medium',
          target_type: 'event',
          target_id: event.id,
          target_name: event.name,
          title: `Register for ${event.name}`,
          summary: event.ai_research?.fit_reason,
          content: `Event: ${event.name}\nDate: ${event.date || 'TBD'}\nVenue: ${event.venue || 'TBD'}`,
          context: {
            fit_score: event.ai_research?.fit_score,
            urgency: event.ai_research?.registration_urgency
          }
        });

        results.actions_created++;
      }
    }

    // Log agent activity
    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'attender',
      outcome_id: attendOutcome?.id,
      event_type: mode === 'discover' ? 'research' : 'strategy',
      summary: `Discovered ${results.events_found} events, created ${results.actions_created} recommendations`,
      details: results
    });

    return Response.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Attender agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});