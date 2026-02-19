import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ACCESSOR AGENT
 * Outcome: Access X new groups per month
 * Does: Identifies high-leverage groups, finds gatekeepers, strategizes access path
 * Groups = daycares, schools, leagues that give access to many families at once
 */

const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");

async function searchGroups(query, location) {
  if (!SERPAPI_KEY) return [];
  
  const params = new URLSearchParams({
    q: query,
    location: location,
    api_key: SERPAPI_KEY,
    engine: "google_maps"
  });
  
  const response = await fetch(`https://serpapi.com/search?${params}`);
  const data = await response.json();
  return data.local_results || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studio_id, mode = 'identify' } = await req.json();
    
    if (!studio_id) {
      return Response.json({ error: 'studio_id required' }, { status: 400 });
    }

    const studios = await base44.entities.Studio.filter({ id: studio_id });
    const studio = studios[0];
    const studioLocation = studio?.address || "local area";

    const existingGroups = await base44.entities.AccessGroup.filter({ studio_id });
    const existingNames = new Set(existingGroups.map(g => g.name.toLowerCase()));

    const outcomes = await base44.entities.GrowthOutcome.filter({ 
      studio_id, 
      agent: 'accessor' 
    });
    const accessOutcome = outcomes.find(o => o.name.includes('Access'));
    const monthlyTarget = accessOutcome?.target_count || 1;

    const monthStart = new Date();
    monthStart.setDate(1);
    const accessedThisMonth = existingGroups.filter(g => 
      g.status === 'active' && 
      new Date(g.updated_date) >= monthStart
    ).length;

    const results = {
      mode,
      studio_id,
      monthly_target: monthlyTarget,
      current_progress: accessedThisMonth,
      groups_found: 0,
      actions_created: 0
    };

    if (mode === 'identify') {
      const groupTypes = [
        { type: 'daycare', query: 'daycare center preschool', leverage: 'high' },
        { type: 'school', query: 'elementary school private school', leverage: 'high' },
        { type: 'league', query: 'youth sports league soccer baseball', leverage: 'medium' },
        { type: 'church', query: 'church children ministry', leverage: 'medium' }
      ];

      for (const groupType of groupTypes) {
        const places = await searchGroups(groupType.query, studioLocation);
        
        for (const place of places.slice(0, 3)) {
          if (existingNames.has(place.title?.toLowerCase())) continue;

          let estimatedFamilies = 50;
          if (groupType.type === 'school') estimatedFamilies = 200;
          if (groupType.type === 'daycare') estimatedFamilies = 75;

          await base44.asServiceRole.entities.AccessGroup.create({
            studio_id,
            name: place.title,
            group_type: groupType.type,
            address: place.address,
            phone: place.phone,
            website: place.website,
            status: 'identified',
            estimated_families: estimatedFamilies,
            ai_research: {
              leverage: groupType.leverage,
              rating: place.rating,
              found_at: new Date().toISOString()
            }
          });
          
          results.groups_found++;
        }
      }
    }

    if (mode === 'strategize' || mode === 'full') {
      const identifiedGroups = await base44.entities.AccessGroup.filter({ 
        studio_id, 
        status: 'identified' 
      });

      const prioritized = identifiedGroups
        .sort((a, b) => (b.estimated_families || 0) - (a.estimated_families || 0));

      for (const group of prioritized.slice(0, 3)) {
        const prompt = `You are helping a dance studio gain access to distribute information at a ${group.group_type}.

Organization: ${group.name}
Type: ${group.group_type}
Estimated Families: ${group.estimated_families}

Devise a strategy to get permission to leave flyers, get in newsletter, or do a demo class.

Return JSON: {
  "gatekeeper_role": "likely role of decision maker",
  "value_proposition": "what's in it for them",
  "initial_ask": "start small - what to ask first",
  "draft_message": "short intro message"
}`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              gatekeeper_role: { type: "string" },
              value_proposition: { type: "string" },
              initial_ask: { type: "string" },
              draft_message: { type: "string" }
            }
          }
        });

        await base44.asServiceRole.entities.AccessGroup.update(group.id, {
          gatekeeper_role: llmResponse.gatekeeper_role,
          ai_research: { ...group.ai_research, strategy: llmResponse }
        });

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id,
          outcome_id: accessOutcome?.id,
          agent: 'accessor',
          action_type: 'task',
          status: 'pending_review',
          priority: group.ai_research?.leverage === 'high' ? 'high' : 'medium',
          target_type: 'community_group',
          target_id: group.id,
          target_name: group.name,
          title: `Get access to ${group.name}`,
          summary: llmResponse.value_proposition,
          content: llmResponse.draft_message,
          context: {
            gatekeeper: llmResponse.gatekeeper_role,
            initial_ask: llmResponse.initial_ask,
            estimated_families: group.estimated_families
          }
        });

        results.actions_created++;
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'accessor',
      outcome_id: accessOutcome?.id,
      event_type: mode === 'identify' ? 'research' : 'strategy',
      summary: `Found ${results.groups_found} groups, created ${results.actions_created} access strategies`,
      details: results
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Accessor agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});