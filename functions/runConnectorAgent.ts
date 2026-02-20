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

  // Use Places API (New) - Text Search with location string directly (no geocoding needed)
  const textQuery = `${query} near ${location}`;
  console.log(`[Places] Searching: "${textQuery}"`);

  const placesRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.businessStatus'
    },
    body: JSON.stringify({
      textQuery: textQuery,
      maxResultCount: 10
    })
  });
  const placesData = await placesRes.json();

  console.log(`[Places] Results: ${placesData.places?.length || 0}`);
  if (placesData.error) {
    console.log(`[Places] API Error: ${JSON.stringify(placesData.error)}`);
  }

  return (placesData.places || []).map(place => ({
    place_id: place.id,
    name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    rating: place.rating,
    reviews_count: place.userRatingCount,
    types: place.types,
    business_status: place.businessStatus
  }));
}

/**
 * Get detailed info about a place using Place Details API
 */
async function getPlaceDetails(placeId) {
  if (!GOOGLE_MAPS_API_KEY || !placeId) return null;

  // Places API (New) IDs are like "places/ChIJ..." - ensure correct format
  const resourceName = placeId.startsWith('places/') ? placeId : `places/${placeId}`;

  try {
    const res = await fetch(`https://places.googleapis.com/v1/${resourceName}`, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'displayName,formattedAddress,nationalPhoneNumber,websiteUri,regularOpeningHours,reviews'
      }
    });
    const text = await res.text();
    if (!text) return null;
    const data = JSON.parse(text);

    if (data.displayName) {
      return {
        name: data.displayName?.text,
        address: data.formattedAddress,
        phone: data.nationalPhoneNumber,
        website: data.websiteUri,
        hours: data.regularOpeningHours?.weekdayDescriptions,
        reviews: data.reviews?.slice(0, 3).map(r => ({ text: r.text?.text }))
      };
    }
  } catch (err) {
    console.log(`[PlaceDetails] Error for ${placeId}: ${err.message}`);
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
    const allStudios = await base44.entities.Studio.list();
    const studio = allStudios.find(s => s.id === studio_id);
    
    if (!studio) {
      return Response.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    const studioName = studio.name;
    const studioLocation = studio.address || "local area";

    // Normalize a name for comparison (lowercase, strip punctuation, collapse whitespace)
    const normalizeName = (n) => (n || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    
    // Check if a discovered place is actually the studio itself
    const studioNameNorm = normalizeName(studioName);
    const studioAddressNorm = normalizeName(studioLocation);
    
    const isOwnStudio = (placeName, placeAddress) => {
      const nameNorm = normalizeName(placeName);
      const addrNorm = normalizeName(placeAddress);
      // Match if names are very similar (one contains the other) or same address
      if (studioNameNorm && nameNorm && (nameNorm.includes(studioNameNorm) || studioNameNorm.includes(nameNorm))) return true;
      if (studioAddressNorm && addrNorm && addrNorm.includes(studioAddressNorm)) return true;
      return false;
    };

    // Get existing partners to avoid duplicates
    const existingPartners = await base44.entities.Partner.filter({ studio_id });
    const existingNames = new Set(existingPartners.map(p => normalizeName(p.name)));

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
      p.relationship_status === 'connected' && 
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
          console.log(`Searching ${category.type} near: "${studioLocation}"`);
          const places = await searchNearbyPlaces(category.query, studioLocation);
          console.log(`Found ${places.length} places for ${category.type}`);
          results.research_performed = results.research_performed || [];
          results.research_performed.push({ type: category.type, found: places.length });
          
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
              category: category.type,
              address: details?.address || place.address,
              phone: details?.phone,
              website: details?.website,
              relationship_status: 'identified',
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
        relationship_status: 'identified' 
      });

      for (const partner of partnersToEnrich.slice(0, 5)) {
        // Skip if already enriched
        if (partner.ai_research?.enriched) continue;

        try {
          // Use LLM with web context to research the business
          const enrichPrompt = `Research this business for a dance studio partnership opportunity:

Business: ${partner.name}
Type: ${partner.category}
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
        relationship_status: 'identified' 
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

          // Get the owner's real first name
          const ownerFirstName = (() => {
            const name = user.full_name || '';
            // If it looks like an email, use studio name instead
            if (name.includes('@') || name.includes('.')) return null;
            return name.split(' ')[0];
          })();
          const senderFirstName = ownerFirstName || studioName.split(' ')[0];

          const outreachPrompt = `Write a cold outreach email from a dance studio owner to a local business.

SENDER: ${senderFirstName}, who owns ${studioName} (a dance studio nearby)

RECIPIENT: ${contactName || 'the owner'} at ${partner.name} (a ${partner.category} in the area)
${research.values ? `What they care about: ${research.values}` : ''}
${hook ? `Interesting detail: ${hook}` : ''}
${angle ? `Why they'd be a fit: ${angle}` : ''}

CRITICAL RULES — violating any of these means the email is rejected:
- Write AS ${senderFirstName}, a real person. NEVER say "My name is ${studioName}" or "I am ${studioName}". 
- First person singular only. "I run ${studioName}" or "I own a dance studio nearby" — not "we at ${studioName} believe..."
- MAX 4-5 sentences total. Seriously. Count them.
- NO bullet points, NO numbered lists, NO asterisks
- NO URLs, NO links, NO website mentions (kills email deliverability)
- NO "Sincerely", NO "Best regards", NO "Thank you for your time and consideration"
- NO corporate buzzwords: "synergy", "partnership opportunity", "win-win", "enriching", "collaborate"
- NO describing what your studio does or believes. They don't care yet.
- Sign off with just the first name: "${senderFirstName}"
- The email should feel like something you'd actually send from your phone

TONE: You're a neighbor who noticed their business and had a genuine idea. That's it. Casual, warm, human. Think "hey I had an idea" not "I'd like to propose a strategic partnership."

STRUCTURE:
1. One sentence that shows you actually know something about THEIR business (not generic flattery)
2. One sentence with a specific, low-commitment idea (not "let's explore a partnership")  
3. One sentence asking if they'd be up for a quick chat or coffee
4. Sign off with just "${senderFirstName}"

Return JSON: {
  "subject": "short, casual subject line — like a text message preview, lowercase ok",
  "body": "the complete email ready to send, no placeholders, no brackets",
  "suggested_offer": "the specific thing you're offering",
  "why_them": "one sentence on why this partner"
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
              partner_type: partner.category,
              contact_name: contactName,
              suggested_offer: draft.suggested_offer,
              partner_rating: research.rating,
              outreach_hook: hook,
              partner_website: partner.website
            }
          });

          // Update partner status
          await base44.asServiceRole.entities.Partner.update(partner.id, {
            relationship_status: 'contacted'
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