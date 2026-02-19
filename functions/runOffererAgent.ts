import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * OFFERER AGENT
 * Outcome: Make an offer to X new families per week
 * Does: Finds leads/prospects, matches them to the right offer, drafts personalized invitations
 */

const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");

async function searchForProspects(query, location) {
  if (!SERPAPI_KEY) return [];
  
  const params = new URLSearchParams({
    q: query,
    location: location,
    api_key: SERPAPI_KEY,
    engine: "google"
  });
  
  const response = await fetch(`https://serpapi.com/search?${params}`);
  const data = await response.json();
  return data.organic_results || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studio_id, mode = 'find' } = await req.json();
    
    if (!studio_id) {
      return Response.json({ error: 'studio_id required' }, { status: 400 });
    }

    const studios = await base44.entities.Studio.filter({ id: studio_id });
    const studio = studios[0];
    const studioLocation = studio?.address || "local area";

    const leads = await base44.entities.Lead.filter({ studio_id });
    const prospects = await base44.entities.Prospect.filter({ studio_id });
    const classes = await base44.entities.DanceClass.filter({ studio_id });

    const outcomes = await base44.entities.GrowthOutcome.filter({ studio_id, agent: 'offerer' });
    const offerOutcome = outcomes.find(o => o.name.includes('offer'));
    const weeklyTarget = offerOutcome?.target_count || 10;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const actions = await base44.entities.GrowthAction.filter({ studio_id, agent: 'offerer' });
    const offersThisWeek = actions.filter(a => 
      (a.status === 'sent' || a.status === 'completed') &&
      new Date(a.created_date) >= weekStart
    ).length;

    const results = {
      mode,
      studio_id,
      weekly_target: weeklyTarget,
      current_progress: offersThisWeek,
      prospects_found: 0,
      actions_created: 0
    };

    if (mode === 'find') {
      const searchQueries = [
        `"looking for dance classes" kids ${studioLocation}`,
        `"dance studio" review ${studioLocation}`
      ];

      for (const query of searchQueries) {
        const searchResults = await searchForProspects(query, studioLocation);
        
        if (searchResults.length > 0) {
          const prompt = `Analyze these search results for potential dance studio prospects.

Search results:
${JSON.stringify(searchResults.slice(0, 5), null, 2)}

Extract any signals of families looking for dance classes.

Return JSON: {
  "prospects": [
    {
      "source_url": "url where found",
      "original_content": "relevant quote",
      "signal_type": "buying_intent|latent_intent|unhappy_competitor|new_mover",
      "signal_strength": "hot|warm|cool",
      "notes": "why this is a prospect"
    }
  ]
}`;

          const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
              type: "object",
              properties: {
                prospects: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      source_url: { type: "string" },
                      original_content: { type: "string" },
                      signal_type: { type: "string" },
                      signal_strength: { type: "string" },
                      notes: { type: "string" }
                    }
                  }
                }
              }
            }
          });

          for (const prospect of llmResponse.prospects || []) {
            await base44.asServiceRole.entities.Prospect.create({
              studio_id,
              source: 'serp',
              source_detail: prospect.source_url,
              original_content: prospect.original_content,
              signal_type: prospect.signal_type,
              signal_strength: prospect.signal_strength,
              status: 'new',
              agent_notes: prospect.notes
            });
            
            results.prospects_found++;
          }
        }
      }
    }

    if (mode === 'offer' || mode === 'full') {
      const newLeads = leads.filter(l => l.status === 'new' || l.status === 'contacted');
      const availableClasses = classes.filter(c => c.type !== 'admin');

      for (const lead of newLeads.slice(0, 5)) {
        const prompt = `Create a personalized offer for a prospective dance family.

Lead info:
- Name: ${lead.parent_name || 'Parent'}
- Child: ${lead.child_name || 'their child'}, age ${lead.child_age || 'unknown'}
- Interests: ${lead.interests?.join(', ') || 'dance'}
- Source: ${lead.source}

Available classes:
${availableClasses.slice(0, 5).map(c => `- ${c.title}`).join('\n')}

Write a warm, personalized message inviting them to try a class. Keep it under 100 words.

Return JSON: {
  "subject": "email subject",
  "message": "the message",
  "suggested_class": "which class to invite them to",
  "offer_type": "free_trial|discount|open_house|demo"
}`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              message: { type: "string" },
              suggested_class: { type: "string" },
              offer_type: { type: "string" }
            }
          }
        });

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id,
          outcome_id: offerOutcome?.id,
          agent: 'offerer',
          action_type: 'email',
          status: 'pending_review',
          priority: 'high',
          target_type: 'family',
          target_id: lead.id,
          target_name: lead.parent_name || lead.child_name,
          target_email: lead.email,
          target_phone: lead.phone,
          title: `Invite ${lead.child_name || 'family'} to try a class`,
          summary: `${lead.source} lead interested in ${lead.interests?.join(', ') || 'dance'}`,
          subject: llmResponse.subject,
          content: llmResponse.message,
          context: {
            suggested_class: llmResponse.suggested_class,
            offer_type: llmResponse.offer_type,
            lead_source: lead.source
          }
        });

        results.actions_created++;
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'offerer',
      outcome_id: offerOutcome?.id,
      event_type: mode === 'find' ? 'research' : 'draft',
      summary: `Found ${results.prospects_found} prospects, created ${results.actions_created} offers`,
      details: results
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Offerer agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});