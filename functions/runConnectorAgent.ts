import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONNECTOR AGENT
 * Outcome: Connect with X business owners per week
 * Does: Finds partners, researches contacts, drafts personalized outreach
 * "Connect" means they responded and there's a real relationship
 * 
 * Modes:
 * - research: Find new potential partners via Google Maps API
 * - enrich: Use LLM + web to gather more info about identified partners
 * - outreach: Draft personalized emails for identified partners
 * - full: Run all modes in sequence
 */

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

/**
 * Search for local businesses using Google Places API (Nearby Search)
 */
async function searchNearbyPlaces(query, location, radius = 10000) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.log("No GOOGLE_MAPS_API_KEY - skipping place search");
    return [];
  }

  // First, geocode the location to get lat/lng
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${GOOGLE_MAPS_API_KEY}`;
  const geocodeRes = await fetch(geocodeUrl);
  const geocodeData = await geocodeRes.json();
  
  if (!geocodeData.results?.[0]?.geometry?.location) {
    console.log("Could not geocode location:", location);
    return [];
  }
  
  const { lat, lng } = geocodeData.results[0].geometry.location;

  // Search for places
  const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
  const placesRes = await fetch(placesUrl);
  const placesData = await placesRes.json();

  return (placesData.results || []).map(place => ({
    place_id: place.place_id,
    name: place.name,
    address: place.vicinity,
    rating: place.rating,
    reviews_count: place.user_ratings_total,
    types: place.types,
    business_status: place.business_status
  }));
}

/**
 * Get detailed info about a place using Place Details API
 */
async function getPlaceDetails(placeId) {
  if (!GOOGLE_MAPS_API_KEY || !placeId) return null;

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,reviews&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.result) {
    return {
      name: data.result.name,
      address: data.result.formatted_address,
      phone: data.result.formatted_phone_number,
      website: data.result.website,
      hours: data.result.opening_hours?.weekday_text,
      reviews: data.result.reviews?.slice(0, 3) // Top 3 reviews for context
    };
  }
  return null;
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
    
    // Get studio info for location context
    const studios = await base44.entities.Studio.filter({ id: studio_id });
    const studio = studios[0];
    
    if (!studio) {
      return Response.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    const studioName = studio.name;
    const studioLocation = studio.address || "local area";

    // Get existing partners to avoid duplicates
    const existingPartners = await base44.entities.Partner.filter({ studio_id });
    const existingNames = new Set(existingPartners.map(p => p.name?.toLowerCase()));

    // Get current week's outcome for tracking
    const outcomes = await base44.entities.GrowthOutcome.filter({ 
      studio_id, 
      agent: 'connector' 
    });
    const connectOutcome = outcomes.find(o => o.name?.toLowerCase().includes('connect'));
    const weeklyTarget = connectOutcome?.target_count || 4;

    // Count this week's connections (status = 'connected')
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const connectionsThisWeek = existingPartners.filter(p => 
      p.status === 'connected' && 
      new Date(p.updated_date) >= weekStart
    ).length;

    // Initialize results
    const results = {
      mode,
      studio_id,
      studio_name: studioName,
      weekly_target: weeklyTarget,
      current_progress: connectionsThisWeek,
      partners_found: 0,
      partners_enriched: 0,
      actions_created: 0,
      errors: []
    };

    // =========================================
    // STEP 2: RESEARCH MODE
    // Find new potential partners via Google Maps
    // =========================================
    
    if (mode === 'research' || mode === 'full') {
      console.log("Starting research mode...");
      
      // Partner categories with search queries
      const partnerCategories = [
        { type: 'daycare', query: 'daycare preschool childcare center' },
        { type: 'pediatrician', query: 'pediatrician children doctor pediatric' },
        { type: 'gym', query: 'gym fitness center family workout' },
        { type: 'salon', query: 'kids haircut salon children hair' },
        { type: 'church', query: 'church family ministry children' },
        { type: 'school', query: 'elementary school private school preschool' },
        { type: 'sports', query: 'youth sports gymnastics martial arts' }
      ];

      for (const category of partnerCategories) {
        try {
          const places = await searchNearbyPlaces(category.query, studioLocation);
          
          for (const place of places.slice(0, 5)) { // Top 5 per category
            // Skip if already exists
            if (existingNames.has(place.name?.toLowerCase())) {
              continue;
            }

            // Get detailed info
            const details = await getPlaceDetails(place.place_id);

            // Create partner record with status 'identified'
            await base44.asServiceRole.entities.Partner.create({
              studio_id,
              name: place.name,
              type: category.type,
              address: details?.address || place.address,
              phone: details?.phone,
              website: details?.website,
              status: 'identified',
              ai_research: {
                source: 'google_places',
                place_id: place.place_id,
                rating: place.rating,
                reviews_count: place.reviews_count,
                sample_reviews: details?.reviews?.map(r => r.text?.slice(0, 200)),
                hours: details?.hours,
                found_at: new Date().toISOString()
              }
            });
            
            existingNames.add(place.name?.toLowerCase()); // Prevent duplicates in same run
            results.partners_found++;
          }
        } catch (err) {
          console.error(`Error searching ${category.type}:`, err.message);
          results.errors.push(`${category.type}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 3: ENRICH MODE
    // Use LLM + web context to learn more about partners
    // =========================================
    
    if (mode === 'enrich' || mode === 'full') {
      console.log("Starting enrich mode...");
      
      // Get partners that need enrichment (identified but no contact strategy yet)
      const partnersToEnrich = await base44.entities.Partner.filter({ 
        studio_id, 
        status: 'identified' 
      });

      for (const partner of partnersToEnrich.slice(0, 5)) {
        // Skip if already enriched
        if (partner.ai_research?.enriched) continue;

        try {
          // Use LLM with web context to research the business
          const enrichPrompt = `Research this business for a dance studio partnership opportunity:

Business: ${partner.name}
Type: ${partner.type}
Location: ${partner.address}
Website: ${partner.website || 'unknown'}

Find out:
1. Who is the owner or decision-maker? (name and title if possible)
2. What's their mission or values?
3. Do they have any existing partnerships with activity providers?
4. What would appeal to them about a dance studio partnership?
5. Any recent news or community involvement?

Return JSON: {
  "decision_maker": { "name": "...", "title": "...", "confidence": "high|medium|low" },
  "values": "what they care about",
  "existing_partnerships": "any activity providers they work with",
  "partnership_angle": "why they'd want to partner with a dance studio",
  "recent_news": "anything notable",
  "outreach_hook": "specific thing to mention in first contact"
}`;

          const enrichment = await base44.integrations.Core.InvokeLLM({
            prompt: enrichPrompt,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                decision_maker: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    title: { type: "string" },
                    confidence: { type: "string" }
                  }
                },
                values: { type: "string" },
                existing_partnerships: { type: "string" },
                partnership_angle: { type: "string" },
                recent_news: { type: "string" },
                outreach_hook: { type: "string" }
              }
            }
          });

          // Update partner with enriched data
          await base44.asServiceRole.entities.Partner.update(partner.id, {
            contact_name: enrichment.decision_maker?.name,
            contact_title: enrichment.decision_maker?.title,
            ai_research: {
              ...partner.ai_research,
              enriched: true,
              enriched_at: new Date().toISOString(),
              decision_maker: enrichment.decision_maker,
              values: enrichment.values,
              existing_partnerships: enrichment.existing_partnerships,
              partnership_angle: enrichment.partnership_angle,
              recent_news: enrichment.recent_news,
              outreach_hook: enrichment.outreach_hook
            }
          });

          results.partners_enriched++;
        } catch (err) {
          console.error(`Error enriching ${partner.name}:`, err.message);
          results.errors.push(`Enrich ${partner.name}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 4: OUTREACH MODE
    // Draft personalized emails for owner approval
    // =========================================
    
    if (mode === 'outreach' || mode === 'full') {
      console.log("Starting outreach mode...");
      
      // Get enriched partners ready for outreach
      const partnersForOutreach = await base44.entities.Partner.filter({ 
        studio_id, 
        status: 'identified' 
      });

      // Prioritize enriched partners, then by rating
      const prioritized = partnersForOutreach
        .filter(p => p.ai_research?.enriched || p.ai_research?.rating >= 4)
        .sort((a, b) => {
          if (a.ai_research?.enriched && !b.ai_research?.enriched) return -1;
          if (!a.ai_research?.enriched && b.ai_research?.enriched) return 1;
          return (b.ai_research?.rating || 0) - (a.ai_research?.rating || 0);
        });

      for (const partner of prioritized.slice(0, 5)) {
        // Check if we already have a pending action for this partner
        const existingActions = await base44.entities.GrowthAction.filter({
          studio_id,
          target_id: partner.id,
          status: 'pending_review'
        });
        
        if (existingActions.length > 0) continue; // Already has pending action

        try {
          // Build context for the LLM
          const research = partner.ai_research || {};
          const contactName = partner.contact_name || research.decision_maker?.name;
          const hook = research.outreach_hook;
          const angle = research.partnership_angle;

          const outreachPrompt = `You are ${studioName}, a local dance studio, writing a partnership outreach email.

RECIPIENT:
- Business: ${partner.name}
- Type: ${partner.type}
- Contact: ${contactName || 'Owner/Manager'}
- Location: ${partner.address || 'nearby'}
${research.values ? `- Their values: ${research.values}` : ''}
${hook ? `- Outreach hook: ${hook}` : ''}
${angle ? `- Why they'd care: ${angle}` : ''}

PARTNERSHIP OFFER BY TYPE:
- Daycare/School: Free demo class for their kids, movement benefits handout
- Pediatrician: Leave flyers about physical development through dance
- Gym/Sports: Cross-promotion, shared family audience
- Salon: Recital hair styling partnership, cross-referrals
- Church: Free community workshop, family event collaboration

WRITE:
A short, warm email that:
1. Opens with something specific about THEM (not about you)
2. Suggests ONE simple next step
3. Feels like a neighbor reaching out, not a sales pitch
4. Is under 100 words

Return JSON: {
  "subject": "email subject line - personal, not corporate",
  "body": "the email body",
  "suggested_offer": "what you're offering them",
  "why_them": "one sentence on why this partner specifically"
}`;

          const draft = await base44.integrations.Core.InvokeLLM({
            prompt: outreachPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                subject: { type: "string" },
                body: { type: "string" },
                suggested_offer: { type: "string" },
                why_them: { type: "string" }
              }
            }
          });

          // Create GrowthAction for owner review
          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id,
            outcome_id: connectOutcome?.id,
            agent: 'connector',
            action_type: 'email',
            status: 'pending_review',
            priority: research.enriched ? 'high' : 'medium',
            target_type: 'business',
            target_id: partner.id,
            target_name: partner.name,
            target_email: partner.email, // May be null - owner can add
            title: `Connect with ${partner.name}`,
            summary: draft.why_them,
            subject: draft.subject,
            content: draft.body,
            context: {
              partner_type: partner.type,
              contact_name: contactName,
              suggested_offer: draft.suggested_offer,
              partner_rating: research.rating,
              outreach_hook: hook,
              partner_website: partner.website
            }
          });

          // Update partner status
          await base44.asServiceRole.entities.Partner.update(partner.id, {
            status: 'contacted'
          });

          results.actions_created++;
        } catch (err) {
          console.error(`Error drafting for ${partner.name}:`, err.message);
          results.errors.push(`Outreach ${partner.name}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 5: Log agent activity
    // =========================================
    
    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'connector',
      outcome_id: connectOutcome?.id,
      event_type: mode === 'research' ? 'research' : mode === 'enrich' ? 'research' : 'draft',
      summary: `Found ${results.partners_found} partners, enriched ${results.partners_enriched}, created ${results.actions_created} outreach drafts`,
      details: results,
      tokens_used: 0 // Could track this if needed
    });

    return Response.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Connector agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});