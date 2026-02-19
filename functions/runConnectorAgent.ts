import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONNECTOR AGENT
 * Outcome: Connect with X business owners per week
 * Does: Finds partners, researches contacts, drafts personalized outreach
 * "Connect" means they responded and there's a real relationship
 */

const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");

async function searchGooglePlaces(query, location) {
  if (!SERPAPI_KEY) {
    console.log("No SERPAPI_KEY - skipping external search");
    return [];
  }
  
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

    const { studio_id, mode = 'research' } = await req.json();
    
    if (!studio_id) {
      return Response.json({ error: 'studio_id required' }, { status: 400 });
    }

    // Get studio info for location context
    const studios = await base44.entities.Studio.filter({ id: studio_id });
    const studio = studios[0];
    const studioLocation = studio?.address || "local area";

    // Get existing partners to avoid duplicates
    const existingPartners = await base44.entities.Partner.filter({ studio_id });
    const existingNames = new Set(existingPartners.map(p => p.name.toLowerCase()));

    // Get current week's outcome progress
    const outcomes = await base44.entities.GrowthOutcome.filter({ 
      studio_id, 
      agent: 'connector' 
    });
    const connectOutcome = outcomes.find(o => o.name.includes('Connect'));
    const weeklyTarget = connectOutcome?.target_count || 4;

    // Count this week's connections
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const recentPartners = existingPartners.filter(p => 
      p.status === 'connected' && 
      new Date(p.updated_date) >= weekStart
    );
    const currentProgress = recentPartners.length;

    const results = {
      mode,
      studio_id,
      weekly_target: weeklyTarget,
      current_progress: currentProgress,
      actions_created: 0,
      partners_found: 0,
      research_performed: []
    };

    if (mode === 'research') {
      // RESEARCH MODE: Find new potential partners
      const partnerCategories = [
        { type: 'daycare', query: 'daycare preschool childcare' },
        { type: 'pediatrician', query: 'pediatrician children doctor' },
        { type: 'gym', query: 'family gym fitness center' },
        { type: 'salon', query: 'kids hair salon family salon' },
        { type: 'church', query: 'church family ministry' },
        { type: 'school', query: 'elementary school private school' }
      ];

      for (const category of partnerCategories) {
        const places = await searchGooglePlaces(category.query, studioLocation);
        
        for (const place of places.slice(0, 3)) {
          if (existingNames.has(place.title?.toLowerCase())) continue;

          // Create as prospect first
          await base44.asServiceRole.entities.Partner.create({
            studio_id,
            name: place.title,
            type: category.type,
            address: place.address,
            phone: place.phone,
            website: place.website,
            status: 'identified',
            ai_research: {
              source: 'google_places',
              rating: place.rating,
              reviews: place.reviews,
              found_at: new Date().toISOString()
            }
          });
          
          results.partners_found++;
        }
        
        results.research_performed.push(category.type);
      }
    }

    if (mode === 'outreach' || mode === 'full') {
      // OUTREACH MODE: Draft messages for identified partners
      const identifiedPartners = await base44.entities.Partner.filter({ 
        studio_id, 
        status: 'identified' 
      });

      // Use LLM to generate personalized outreach
      for (const partner of identifiedPartners.slice(0, 5)) {
        const prompt = `You are a friendly dance studio owner reaching out to a local ${partner.type} for a potential partnership.

Business: ${partner.name}
Type: ${partner.type}
Location: ${partner.address || 'nearby'}
${partner.ai_research?.rating ? `Rating: ${partner.ai_research.rating} stars` : ''}

Write a short, warm email introducing yourself and suggesting a simple partnership:
- For daycares/schools: offer a free demo class for their kids
- For pediatricians: offer to leave flyers about movement benefits
- For gyms/salons: suggest cross-promotion
- For churches: offer a free workshop

Keep it under 100 words. Be genuine, not salesy. Focus on how you can help THEM.

Return JSON: { "subject": "...", "body": "...", "suggested_offer": "..." }`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              body: { type: "string" },
              suggested_offer: { type: "string" }
            }
          }
        });

        // Create a GrowthAction for owner review
        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id,
          outcome_id: connectOutcome?.id,
          agent: 'connector',
          action_type: 'email',
          status: 'pending_review',
          priority: 'medium',
          target_type: 'business',
          target_id: partner.id,
          target_name: partner.name,
          target_email: partner.email,
          title: `Connect with ${partner.name}`,
          summary: `Reach out to this ${partner.type} to start a partnership`,
          subject: llmResponse.subject,
          content: llmResponse.body,
          context: {
            partner_type: partner.type,
            suggested_offer: llmResponse.suggested_offer,
            partner_rating: partner.ai_research?.rating
          }
        });

        results.actions_created++;
      }
    }

    // Log agent activity
    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'connector',
      outcome_id: connectOutcome?.id,
      event_type: mode === 'research' ? 'research' : 'draft',
      summary: `Found ${results.partners_found} partners, created ${results.actions_created} outreach drafts`,
      details: results
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