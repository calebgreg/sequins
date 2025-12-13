import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query } = await req.json();
        if (!query || query.length < 3) {
            return Response.json({ suggestions: [] });
        }

        const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
        if (!apiKey) {
            return Response.json({ error: 'Google Maps API key not configured' }, { status: 500 });
        }

        // New Places API (v1)
        const url = 'https://places.googleapis.com/v1/places:autocomplete';
        
        const googleRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey
            },
            body: JSON.stringify({
                input: query,
                // Optional: Restrict to establishments or geocodes if needed, 
                // but for general venue search, default is usually fine.
                // We can also add session tokens if we were managing sessions.
            })
        });

        const data = await googleRes.json();

        if (!googleRes.ok) {
            console.error('Google API error:', data);
            return Response.json({ error: data.error?.message || 'Failed to fetch suggestions' }, { status: googleRes.status });
        }

        // Map the new API response format to our frontend expectation
        const suggestions = (data.suggestions || []).map(item => {
            const p = item.placePrediction;
            return {
                description: p.text?.text, // Full text
                place_id: p.placeId,
                main_text: p.structuredFormat?.mainText?.text || p.text?.text,
                secondary_text: p.structuredFormat?.secondaryText?.text || ''
            };
        });

        return Response.json({ suggestions });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});