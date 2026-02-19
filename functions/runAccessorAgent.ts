import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ACCESSOR AGENT
 * Outcome: Gain access to X family-dense groups per month
 * Does: Finds high-leverage groups (daycares, schools, leagues), identifies gatekeepers
 * "Access" means permission to reach their families (flyers, demos, newsletter, etc.)
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

  return (placesData.results || []).map(place => ({
    place_id: place.place_id,
    name: place.name,
    address: place.vicinity,
    rating: place.rating,
    reviews_count: place.user_ratings_total
  }));
}

async function getPlaceDetails(placeId) {
  if (!GOOGLE_MAPS_API_KEY || !placeId) return null;

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  return data.result || null;
}

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

    const existingGroups = await base44.entities.AccessGroup.filter({ studio_id });
    const existingNames = new Set(existingGroups.map(g => g.name?.toLowerCase()));

    const outcomes = await base44.entities.GrowthOutcome.filter({ 
      studio_id, 
      agent: 'accessor' 
    });
    const accessOutcome = outcomes.find(o => o.name?.toLowerCase().includes('access'));
    const monthlyTarget = accessOutcome?.target_count || 2;

    const monthStart = new Date();
    monthStart.setDate(1);
    
    const accessGrantedThisMonth = existingGroups.filter(g => 
      g.access_status === 'granted' && 
      new Date(g.access_granted_date) >= monthStart
    ).length;

    const results = {
      mode,
      studio_id,
      monthly_target: monthlyTarget,
      current_progress: accessGrantedThisMonth,
      groups_found: 0,
      groups_enriched: 0,
      actions_created: 0,
      errors: []
    };

    // =========================================
    // STEP 2: RESEARCH MODE
    // Find high-leverage family groups via Google Maps
    // =========================================
    
    if (mode === 'research' || mode === 'full') {
      console.log("Starting access group research...");

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

            const details = await getPlaceDetails(place.place_id);

            await base44.asServiceRole.entities.AccessGroup.create({
              studio_id,
              name: place.name,
              type: category.type,
              estimated_families: category.families_multiplier,
              access_status: 'identified',
              notes: `Found via Google Maps. Rating: ${place.rating || 'N/A'}`
            });

            // Also create a Contact placeholder for the gatekeeper
            await base44.asServiceRole.entities.Contact.create({
              studio_id,
              name: 'Director/Manager',
              role: category.type === 'school' ? 'Principal' : category.type === 'daycare' ? 'Director' : 'Coordinator',
              notes: `Gatekeeper for ${place.name} - needs enrichment`
            });

            existingNames.add(place.name?.toLowerCase());
            results.groups_found++;
          }
        } catch (err) {
          console.error(`Error researching ${category.type}:`, err.message);
          results.errors.push(`Research ${category.type}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 3: ENRICH MODE
    // Find gatekeeper info via LLM + web context
    // =========================================
    
    if (mode === 'enrich' || mode === 'full') {
      console.log("Starting gatekeeper enrichment...");

      const groupsToEnrich = await base44.entities.AccessGroup.filter({
        studio_id,
        access_status: 'identified'
      });

      for (const group of groupsToEnrich.slice(0, 5)) {
        try {
          const enrichPrompt = `Research this organization to find the gatekeeper (decision-maker) for partnership/access:

Organization: ${group.name}
Type: ${group.type}
Location: ${studioLocation}

Find:
1. Who is the director, principal, coordinator, or decision-maker?
2. Their email or contact method if available
3. Best way to approach them (email, call, visit)
4. What would motivate them to give a dance studio access to their families?
5. Any recent news or initiatives that suggest partnership opportunities

Return JSON: {
  "gatekeeper": {
    "name": "full name if found, otherwise 'Director' or role",
    "title": "their title",
    "email": "email if found, otherwise null",
    "phone": "phone if found, otherwise null"
  },
  "approach_strategy": "how to best reach them",
  "motivation": "what would make them say yes",
  "access_type_suggested": "flyers|newsletter|demo|presentation|event|partnership",
  "talking_points": ["point 1", "point 2", "point 3"]
}`;

          const enrichment = await base44.integrations.Core.InvokeLLM({
            prompt: enrichPrompt,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                gatekeeper: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    title: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" }
                  }
                },
                approach_strategy: { type: "string" },
                motivation: { type: "string" },
                access_type_suggested: { type: "string" },
                talking_points: { type: "array", items: { type: "string" } }
              }
            }
          });

          // Update or create the gatekeeper contact
          const gk = enrichment.gatekeeper;
          const contactData = {
            studio_id,
            name: gk.name || 'Director',
            role: gk.title,
            email: gk.email,
            phone: gk.phone,
            notes: `Gatekeeper for ${group.name}. Approach: ${enrichment.approach_strategy}`
          };

          const contact = await base44.asServiceRole.entities.Contact.create(contactData);

          // Update the access group
          await base44.asServiceRole.entities.AccessGroup.update(group.id, {
            gatekeeper_contact_id: contact.id,
            gatekeeper_name: gk.name,
            access_type: enrichment.access_type_suggested,
            access_status: 'pursuing',
            notes: `${group.notes || ''}\n\nApproach: ${enrichment.approach_strategy}\nMotivation: ${enrichment.motivation}\nTalking points: ${enrichment.talking_points?.join(', ')}`
          });

          results.groups_enriched++;
        } catch (err) {
          console.error(`Error enriching ${group.name}:`, err.message);
          results.errors.push(`Enrich ${group.name}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 4: ACTION MODE
    // Create GrowthActions for gatekeeper outreach
    // =========================================
    
    if (mode === 'action' || mode === 'full') {
      console.log("Creating gatekeeper outreach actions...");

      const pursuingGroups = await base44.entities.AccessGroup.filter({
        studio_id,
        access_status: 'pursuing'
      });

      for (const group of pursuingGroups.slice(0, 5)) {
        const existingActions = await base44.entities.GrowthAction.filter({
          studio_id,
          target_id: group.id,
          status: 'pending_review'
        });
        
        if (existingActions.length > 0) continue;

        try {
          // Draft the outreach message
          const draftPrompt = `Write a brief, friendly outreach message to a ${group.type} gatekeeper for a dance studio partnership.

Studio: ${studioName}
Organization: ${group.name}
Gatekeeper: ${group.gatekeeper_name || 'Director'}
Suggested Access: ${group.access_type || 'demo class or flyers'}
Estimated Families: ${group.estimated_families}

Write a short message (under 100 words) that:
1. Shows you know what they do
2. Offers something valuable to THEIR families
3. Asks for a simple next step (quick call, stop by, etc.)

Return JSON: {
  "subject": "email subject",
  "body": "the message",
  "offer": "what you're offering",
  "ask": "the specific ask"
}`;

          const draft = await base44.integrations.Core.InvokeLLM({
            prompt: draftPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                subject: { type: "string" },
                body: { type: "string" },
                offer: { type: "string" },
                ask: { type: "string" }
              }
            }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id,
            outcome_id: accessOutcome?.id,
            agent: 'accessor',
            action_type: 'email',
            status: 'pending_review',
            priority: group.estimated_families >= 100 ? 'high' : 'medium',
            target_type: 'access_group',
            target_id: group.id,
            target_name: group.name,
            title: `Get access to ${group.name}`,
            summary: `Reach ${group.estimated_families} families via ${group.access_type || 'partnership'}`,
            subject: draft.subject,
            content: draft.body,
            context: {
              group_type: group.type,
              gatekeeper_name: group.gatekeeper_name,
              estimated_families: group.estimated_families,
              access_type: group.access_type,
              offer: draft.offer,
              ask: draft.ask
            }
          });

          results.actions_created++;
        } catch (err) {
          console.error(`Action error for ${group.name}:`, err.message);
          results.errors.push(`Action ${group.name}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 5: Log activity
    // =========================================
    
    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'accessor',
      outcome_id: accessOutcome?.id,
      event_type: mode === 'research' ? 'research' : 'action',
      summary: `Found ${results.groups_found} groups, enriched ${results.groups_enriched}, created ${results.actions_created} gatekeeper outreach actions`,
      details: results
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Accessor agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});