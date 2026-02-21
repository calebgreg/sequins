import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONNECTOR AGENT — Circles of Influence
 * 
 * Mission: Find PEOPLE who influence the families we want.
 * 
 * Pipeline:
 * 1. DISCOVER — Find businesses near the studio that serve families with kids
 * 2. EVALUATE — Why this circle? How many families? Why does it matter?
 * 3. IDENTIFY THE PERSON — Who's at the center?
 * 4. FIND THE ANGLE — What's the genuine way in?
 * 5. DRAFT THE FIRST STEP — A message ready for the owner to approve
 */

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

async function searchNearbyPlaces(query, location) {
  if (!GOOGLE_MAPS_API_KEY) return [];
  
  const textQuery = `${query} near ${location}`;
  console.log(`[Places] Searching: "${textQuery}"`);
  
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.businessStatus,places.websiteUri,places.nationalPhoneNumber'
    },
    body: JSON.stringify({ textQuery, maxResultCount: 8 })
  });
  const data = await res.json();
  
  return (data.places || []).map(p => ({
    place_id: p.id,
    name: p.displayName?.text || '',
    address: p.formattedAddress || '',
    website: p.websiteUri || '',
    phone: p.nationalPhoneNumber || '',
    types: p.types,
  }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Try to get authenticated user; for scheduled automations there may be none
    let body = {};
    try { body = await req.json(); } catch (_) {}

    const studio_id = body.studio_id;
    if (!studio_id) return Response.json({ error: 'studio_id is required' }, { status: 400 });

    // === GATHER CONTEXT ===
    const allStudios = await base44.asServiceRole.entities.Studio.list();
    const studio = allStudios.find(s => s.id === studio_id);
    if (!studio) return Response.json({ error: 'Studio not found' }, { status: 404 });

    const studioName = studio.name;
    const studioLocation = studio.address || "local area";

    // Get studio owner name from the Studio record
    const ownerEmail = studio.owner_email;
    let ownerName = studioName.split(' ')[0];
    if (ownerEmail) {
      const users = await base44.asServiceRole.entities.User.list();
      const owner = users.find(u => u.email === ownerEmail);
      if (owner?.full_name && !owner.full_name.includes('@')) {
        ownerName = owner.full_name.split(' ')[0];
      }
    }

    // Get existing partners to avoid duplicates
    const existingPartners = await base44.asServiceRole.entities.Partner.filter({ studio_id });
    const existingNamesLower = new Set(existingPartners.map(p => (p.name || '').toLowerCase().trim()));

    // Get students/families for context
    const students = await base44.asServiceRole.entities.Student.filter({ studio_id });
    const studioContext = {
      student_count: students.length,
      age_range: students.length > 0 
        ? `${Math.min(...students.filter(s => s.age).map(s => s.age))||3}-${Math.max(...students.filter(s => s.age).map(s => s.age))||12}`
        : '3-12',
      styles: [...new Set(students.flatMap(s => s.interests || []))].slice(0, 5),
    };

    // Self-detection
    const studioNameLower = studioName.toLowerCase();
    const studioAddrLower = (studioLocation || '').toLowerCase();
    const isOwnStudio = (name, addr) => {
      const n = (name || '').toLowerCase();
      const a = (addr || '').toLowerCase();
      if (studioNameLower && n && (n.includes(studioNameLower) || studioNameLower.includes(n))) return true;
      if (studioAddrLower && a && a.includes(studioAddrLower)) return true;
      return false;
    };

    // Get outcome tracking
    const outcomes = await base44.asServiceRole.entities.GrowthOutcome.filter({ studio_id, agent: 'connector' });
    const connectOutcome = outcomes.find(o => o.is_active);

    // === DISCOVER — Find circles of influence ===
    const circleCategories = [
      { type: 'daycare', query: 'daycare preschool childcare', why: 'Parents drop off kids daily — deep trust with staff' },
      { type: 'pediatrician', query: 'pediatrician children doctor', why: 'Parents ask their pediatrician for activity recommendations' },
      { type: 'school', query: 'elementary school private school montessori', why: 'Teachers and administrators see hundreds of families weekly' },
      { type: 'sports_league', query: 'youth sports gymnastics martial arts soccer', why: 'Same parents, different activity — natural cross-pollination' },
      { type: 'church', query: 'church family ministry', why: 'Community hub where families gather and trust leadership' },
      { type: 'salon', query: 'kids haircut children salon', why: 'Regular visits, casual conversation, recommendation-friendly' },
    ];

    const discovered = [];

    for (const cat of circleCategories) {
      const places = await searchNearbyPlaces(cat.query, studioLocation);
      
      for (const place of places.slice(0, 4)) {
        if (isOwnStudio(place.name, place.address)) continue;
        if (existingNamesLower.has(place.name.toLowerCase().trim())) continue;
        
        discovered.push({
          ...place,
          category: cat.type,
          circle_reason: cat.why,
        });
      }
    }

    console.log(`[Connector] Discovered ${discovered.length} potential circles of influence`);

    // === EVALUATE + IDENTIFY + ANGLE + DRAFT ===
    const toProcess = discovered.slice(0, 6);
    const results = { processed: 0, actions_created: 0, partners_created: 0 };

    for (const prospect of toProcess) {
      try {
        const fullAnalysis = await base44.integrations.Core.InvokeLLM({
          prompt: `You are helping a dance studio owner find circles of influence — people who already have trusted relationships with families the studio wants to reach.

ABOUT THE STUDIO:
- Name: ${studioName}
- Location: ${studioLocation}
- Owner's first name: ${ownerName}
- Students: ~${studioContext.student_count} students, ages ${studioContext.age_range}
- Styles: ${studioContext.styles.join(', ') || 'various dance styles'}

PROSPECT BUSINESS:
- Name: ${prospect.name}
- Category: ${prospect.category}
- Address: ${prospect.address}
- Website: ${prospect.website || 'none found'}
- Phone: ${prospect.phone || 'none found'}
- Why this type of business matters: ${prospect.circle_reason}

YOUR JOB — answer ALL of these:

1. CIRCLE SIZE ESTIMATE: How many families with kids does a typical ${prospect.category} like "${prospect.name}" in this area likely touch? Give a rough number.

2. THE PERSON: Who is the most likely decision-maker or center of influence at this business? Give your best guess at their likely ROLE and why THEY specifically have influence over parents.

3. THE ANGLE: What is the genuine, non-transactional reason ${ownerName} should reach out? NOT "let's do a cross-referral partnership."

4. FIRST STEP MESSAGE: Draft a short message (email or Instagram DM) from ${ownerName}. Rules:
   - MAX 4 sentences
   - Written like a text from a neighbor
   - Low commitment ask: coffee, a quick hello
   - No buzzwords
   - Sign off with just "${ownerName}"

Return JSON with these exact fields.`,
          add_context_from_internet: !!prospect.website,
          response_json_schema: {
            type: "object",
            properties: {
              circle_size_estimate: { type: "number" },
              circle_reasoning: { type: "string" },
              person_role: { type: "string" },
              person_name: { type: "string" },
              person_why: { type: "string" },
              angle: { type: "string" },
              channel: { type: "string", enum: ["email", "instagram_dm", "in_person_drop_by"] },
              message_subject: { type: "string" },
              message_body: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] }
            }
          }
        });

        if (fullAnalysis.confidence === 'low') {
          console.log(`[Connector] Skipping ${prospect.name} — low confidence`);
          continue;
        }

        const partner = await base44.asServiceRole.entities.Partner.create({
          studio_id,
          name: prospect.name,
          category: prospect.category,
          address: prospect.address,
          phone: prospect.phone,
          website: prospect.website,
          relationship_status: 'identified',
          notes: fullAnalysis.circle_reasoning,
          ai_research: {
            source: 'connector_agent',
            found_at: new Date().toISOString(),
            circle_size: fullAnalysis.circle_size_estimate,
            circle_reasoning: fullAnalysis.circle_reasoning,
            person_role: fullAnalysis.person_role,
            person_name: fullAnalysis.person_name,
            person_why: fullAnalysis.person_why,
            angle: fullAnalysis.angle,
            channel: fullAnalysis.channel,
            confidence: fullAnalysis.confidence,
          }
        });
        results.partners_created++;

        if (fullAnalysis.person_name) {
          await base44.asServiceRole.entities.Contact.create({
            studio_id,
            partner_id: partner.id,
            name: fullAnalysis.person_name,
            role: fullAnalysis.person_role,
            email: '',
            phone: prospect.phone,
            background: fullAnalysis.person_why,
            common_ground: fullAnalysis.angle,
          });
        }

        const channelToActionType = { email: 'email', instagram_dm: 'message', in_person_drop_by: 'task' };

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id,
          outcome_id: connectOutcome?.id || '',
          agent: 'connector',
          action_type: channelToActionType[fullAnalysis.channel] || 'email',
          status: 'pending_review',
          priority: fullAnalysis.confidence === 'high' ? 'high' : 'medium',
          target_type: 'business',
          target_id: partner.id,
          target_name: prospect.name,
          title: `Reach out to ${fullAnalysis.person_name || fullAnalysis.person_role} at ${prospect.name}`,
          summary: fullAnalysis.circle_reasoning,
          subject: fullAnalysis.message_subject || '',
          content: fullAnalysis.message_body,
          context: {
            circle_size: fullAnalysis.circle_size_estimate,
            person_role: fullAnalysis.person_role,
            person_name: fullAnalysis.person_name,
            angle: fullAnalysis.angle,
            channel: fullAnalysis.channel,
            confidence: fullAnalysis.confidence,
          }
        });
        results.actions_created++;
        results.processed++;

      } catch (err) {
        console.error(`[Connector] Error processing ${prospect.name}:`, err.message);
      }
    }

    // === LOG ===
    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'connector',
      outcome_id: connectOutcome?.id || '',
      event_type: 'strategy',
      summary: `Found ${results.partners_created} circles of influence, drafted ${results.actions_created} first-step messages for owner approval`,
      details: results,
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Connector agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});