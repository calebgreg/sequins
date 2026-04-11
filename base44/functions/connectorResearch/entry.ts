import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * connectorResearch — A tool for the Connector agent.
 * 
 * Given a location and optional search query, finds real businesses via Google Places
 * and scrapes their websites for actual people's names and roles.
 * 
 * The AGENT decides what to search for and what to do with the results.
 * This function just gathers raw intel.
 */

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

async function searchPlaces(query, location, maxResults = 5) {
  if (!GOOGLE_MAPS_API_KEY) return { error: "No Google Maps API key configured" };

  const textQuery = `${query} near ${location}`;

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.reviews,places.regularOpeningHours'
    },
    body: JSON.stringify({ textQuery, maxResultCount: maxResults })
  });
  const data = await res.json();

  return (data.places || []).map(p => ({
    place_id: p.id,
    name: p.displayName?.text || '',
    address: p.formattedAddress || '',
    website: p.websiteUri || '',
    phone: p.nationalPhoneNumber || '',
    rating: p.rating,
    review_count: p.userRatingCount,
    reviews: (p.reviews || []).slice(0, 3).map(r => ({
      text: r.text?.text?.substring(0, 300) || '',
      rating: r.rating,
    })),
    hours: p.regularOpeningHours?.weekdayDescriptions || [],
  }));
}

async function scrapeWebsiteForPeople(websiteUrl) {
  if (!websiteUrl) return { people: [], raw: null };

  // Try common about/team/staff pages
  const urlBase = websiteUrl.replace(/\/$/, '');
  const pagesToTry = [
    urlBase,
    `${urlBase}/about`,
    `${urlBase}/about-us`,
    `${urlBase}/our-team`,
    `${urlBase}/staff`,
    `${urlBase}/team`,
  ];

  const allText = [];

  for (const url of pagesToTry.slice(0, 3)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(url, { 
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' }
      });
      clearTimeout(timeout);

      if (!res.ok) continue;
      
      const html = await res.text();
      
      // Strip HTML tags, get text content
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 3000);
      
      if (text.length > 50) {
        allText.push({ url, text });
      }
    } catch {
      // timeout or fetch error, skip
    }
  }

  return { 
    pages_scraped: allText.length,
    content: allText 
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, query, location, website_url, max_results } = body;

    if (action === 'search_places') {
      if (!query || !location) {
        return Response.json({ error: 'query and location are required' }, { status: 400 });
      }
      const places = await searchPlaces(query, location, max_results || 5);
      return Response.json({ places });
    }

    if (action === 'scrape_website') {
      if (!website_url) {
        return Response.json({ error: 'website_url is required' }, { status: 400 });
      }
      const result = await scrapeWebsiteForPeople(website_url);
      return Response.json(result);
    }

    return Response.json({ 
      error: 'Unknown action. Use "search_places" or "scrape_website".',
      available_actions: {
        search_places: { params: ['query', 'location', 'max_results (optional)'] },
        scrape_website: { params: ['website_url'] },
      }
    }, { status: 400 });

  } catch (error) {
    console.error('connectorResearch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});