import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { place_id } = await req.json();
        if (!place_id) {
            return Response.json({ error: 'place_id is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
        if (!apiKey) {
            return Response.json({ error: 'Google Maps API key not configured' }, { status: 500 });
        }

        // Fetch details: name, formatted_address, geometry (lat, lng)
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,formatted_address,geometry&key=${apiKey}`;
        
        const googleRes = await fetch(url);
        const data = await googleRes.json();

        if (data.status !== 'OK') {
            console.error('Google API error:', data);
            return Response.json({ error: 'Failed to fetch place details' }, { status: 500 });
        }

        const result = data.result;
        
        const venueDetails = {
            venue_name: result.name,
            formatted_address: result.formatted_address,
            place_id: place_id,
            lat: result.geometry?.location?.lat,
            lng: result.geometry?.location?.lng
        };

        return Response.json(venueDetails);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});