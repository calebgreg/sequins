import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ACCESSOR AGENT
 * Finds high-leverage groups, identifies gatekeepers, drafts access requests
 */

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

async function searchNearbyPlaces(query, location, radius = 15000) {
  if (!GOOGLE_MAPS_API_KEY) return [];
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${GOOGLE_MAPS_API_KEY}`;
  const geocodeRes = await fetch(geocodeUrl);
  const geocodeData = await geocodeRes.json();
  if (!geocodeData.results?.[0]?.geometry?.location) return [];
  const { lat, lng } = geocodeData.results[0].geometry.location;
  const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
  const placesRes = await fetch(placesUrl);
  const placesData = await placesRes.json();
  return (placesData.results || []).map(place => ({ place_id: place.place_id, name: place.name, address: place.vicinity, rating: place.rating, reviews_count: place.user_ratings_total }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}

    let body = {};
    try { body = await req.json(); } catch (_) {}

    let studio_id = body.studio_id;
    const mode = body.mode || 'research';

    if (!studio_id) {
      if (user?.studio_id) studio_id = user.studio_id;
      else if (user?.data?.studio_id) studio_id = user.data.studio_id;
      else {
        const allStudios = await base44.asServiceRole.entities.Studio.filter({ status: 'active' });
        if (allStudios.length > 0) studio_id = allStudios[0].id;
      }
    }
    if (!studio_id) return Response.json({ error: 'studio_id could not be determined' }, { status: 400 });

    const allStudios = await base44.asServiceRole.entities.Studio.list();
    const studio = allStudios.find(s => s.id === studio_id);
    if (!studio) return Response.json({ error: 'Studio not found' }, { status: 404 });

    const studioName = studio.name;
    const studioLocation = studio.address || "local area";

    const existingGroups = await base44.asServiceRole.entities.AccessGroup.filter({ studio_id });
    const existingNames = new Set(existingGroups.map(g => g.name?.toLowerCase()));

    const outcomes = await base44.asServiceRole.entities.GrowthOutcome.filter({ studio_id, agent: 'accessor' });
    const accessOutcome = outcomes.find(o => o.name?.toLowerCase().includes('access'));

    const results = { mode, studio_id, groups_found: 0, groups_enriched: 0, actions_created: 0, errors: [] };

    // RESEARCH
    if (mode === 'research' || mode === 'full') {
      const groupCategories = [
        { type: 'daycare', query: 'daycare preschool childcare', families_multiplier: 30 },
        { type: 'school', query: 'elementary school private school', families_multiplier: 200 },
        { type: 'league', query: 'youth sports soccer baseball gymnastics', families_multiplier: 50 },
        { type: 'church_group', query: 'church children ministry', families_multiplier: 40 },
        { type: 'mommy_group', query: 'mommy and me kids play group', families_multiplier: 20 }
      ];

      for (const category of groupCategories) {
        try {
          const places = await searchNearbyPlaces(category.query, studioLocation);
          for (const place of places.slice(0, 5)) {
            if (existingNames.has(place.name?.toLowerCase())) continue;
            await base44.asServiceRole.entities.AccessGroup.create({
              studio_id, name: place.name, type: category.type,
              estimated_families: category.families_multiplier, access_status: 'identified',
              notes: `Found via Google Maps. Rating: ${place.rating || 'N/A'}`
            });
            await base44.asServiceRole.entities.Contact.create({
              studio_id, name: 'Director/Manager',
              role: category.type === 'school' ? 'Principal' : category.type === 'daycare' ? 'Director' : 'Coordinator',
              notes: `Gatekeeper for ${place.name} - needs enrichment`
            });
            existingNames.add(place.name?.toLowerCase());
            results.groups_found++;
          }
        } catch (err) { console.error(`Error: ${err.message}`); results.errors.push(err.message); }
      }
    }

    // ENRICH
    if (mode === 'enrich' || mode === 'full') {
      const groupsToEnrich = await base44.asServiceRole.entities.AccessGroup.filter({ studio_id, access_status: 'identified' });
      for (const group of groupsToEnrich.slice(0, 5)) {
        try {
          const enrichment = await base44.integrations.Core.InvokeLLM({
            prompt: `Research ${group.name} (${group.type}) near ${studioLocation} to find the gatekeeper for partnership. Return JSON: { "gatekeeper": { "name": "name or role", "title": "title", "email": "or null", "phone": "or null" }, "approach_strategy": "how to reach them", "motivation": "what would make them say yes", "access_type_suggested": "flyers|newsletter|demo|presentation|event|partnership" }`,
            add_context_from_internet: true,
            response_json_schema: { type: "object", properties: { gatekeeper: { type: "object", properties: { name: { type: "string" }, title: { type: "string" }, email: { type: "string" }, phone: { type: "string" } } }, approach_strategy: { type: "string" }, motivation: { type: "string" }, access_type_suggested: { type: "string" } } }
          });

          const gk = enrichment.gatekeeper;
          const contact = await base44.asServiceRole.entities.Contact.create({
            studio_id, name: gk.name || 'Director', role: gk.title, email: gk.email, phone: gk.phone,
            notes: `Gatekeeper for ${group.name}. Approach: ${enrichment.approach_strategy}`
          });

          await base44.asServiceRole.entities.AccessGroup.update(group.id, {
            gatekeeper_contact_id: contact.id, gatekeeper_name: gk.name,
            access_type: enrichment.access_type_suggested, access_status: 'pursuing',
            notes: `${group.notes || ''}\nApproach: ${enrichment.approach_strategy}\nMotivation: ${enrichment.motivation}`
          });
          results.groups_enriched++;
        } catch (err) { console.error(`Error: ${err.message}`); results.errors.push(err.message); }
      }
    }

    // OUTREACH
    if (mode === 'outreach' || mode === 'full') {
      const pursuingGroups = await base44.asServiceRole.entities.AccessGroup.filter({ studio_id, access_status: 'pursuing' });
      for (const group of pursuingGroups.slice(0, 5)) {
        const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, target_id: group.id, status: 'pending_review' });
        if (existingActions.length > 0) continue;

        try {
          const draft = await base44.integrations.Core.InvokeLLM({
            prompt: `Write a brief outreach message from ${studioName} to the gatekeeper at ${group.name} (${group.type}). Offer value to their families. Under 100 words. Return JSON: { "subject": "email subject", "body": "the message" }`,
            response_json_schema: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" } } }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id, outcome_id: accessOutcome?.id, agent: 'accessor', action_type: 'email',
            status: 'pending_review', priority: group.estimated_families >= 100 ? 'high' : 'medium',
            target_type: 'community_group', target_id: group.id, target_name: group.name,
            title: `Get access to ${group.name}`, summary: `Reach ${group.estimated_families} families via ${group.access_type || 'partnership'}`,
            subject: draft.subject, content: draft.body,
            context: { group_type: group.type, gatekeeper_name: group.gatekeeper_name, estimated_families: group.estimated_families }
          });
          results.actions_created++;
        } catch (err) { console.error(`Error: ${err.message}`); results.errors.push(err.message); }
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id, agent: 'accessor', outcome_id: accessOutcome?.id,
      event_type: mode === 'research' ? 'research' : 'action',
      summary: `Found ${results.groups_found} groups, enriched ${results.groups_enriched}, created ${results.actions_created} actions`,
      details: results
    });

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('Accessor agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});