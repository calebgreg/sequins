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

        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=establishment|geocode&key=${apiKey}`;
        
        const googleRes = await fetch(url);
        const data = await googleRes.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            console.error('Google API error:', data);
            return Response.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
        }

        const suggestions = (data.predictions || []).map(p => ({
            description: p.description,
            place_id: p.place_id,
            main_text: p.structured_formatting?.main_text || p.description,
            secondary_text: p.structured_formatting?.secondary_text || ''
        }));

        return Response.json({ suggestions });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});