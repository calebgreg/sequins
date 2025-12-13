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

        // New Places API (v1) - Get Details
        // FieldMask is required to specify which fields to return
        const fields = 'id,displayName,formattedAddress,location';
        const url = `https://places.googleapis.com/v1/places/${place_id}`;
        
        const googleRes = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': fields
            }
        });

        const data = await googleRes.json();

        if (!googleRes.ok) {
            console.error('Google API error:', data);
            return Response.json({ error: data.error?.message || 'Failed to fetch place details' }, { status: googleRes.status });
        }

        // Map response to our entity structure
        const venueDetails = {
            venue_name: data.displayName?.text || '',
            formatted_address: data.formattedAddress || '',
            place_id: data.id,
            lat: data.location?.latitude,
            lng: data.location?.longitude
        };

        return Response.json(venueDetails);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});