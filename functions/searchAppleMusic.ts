import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query } = await req.json();

        if (!query) {
            return Response.json({ error: 'Search query is required' }, { status: 400 });
        }

        const developerTokenResponse = await base44.functions.invoke('generateAppleMusicToken', {});
        const tokenData = developerTokenResponse.data || developerTokenResponse;
        const developerToken = tokenData.token;

        if (!developerToken) {
            return Response.json({ error: 'Failed to retrieve developer token' }, { status: 500 });
        }

        // Catalog search only requires developer token, no user token needed
        const appleMusicApiUrl = `https://api.music.apple.com/v1/catalog/us/search?term=${encodeURIComponent(query)}&types=songs&limit=5`;
        
        console.log('Making request to Apple Music with token:', developerToken.substring(0, 50) + '...');
        
        const response = await fetch(appleMusicApiUrl, {
            headers: {
                'Authorization': `Bearer ${developerToken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Apple Music API error status:', response.status);
            console.error('Apple Music API error body:', errorText);
            return Response.json({ error: `Apple Music API error: ${response.statusText}`, details: errorText }, { status: response.status });
        }

        const data = await response.json();
        
        const songs = data.results.songs?.data.map(song => ({
            id: song.id,
            song_title: song.attributes.name,
            artist: song.attributes.artistName,
            album_artwork_url: song.attributes.artwork.url.replace('{w}', '200').replace('{h}', '200'),
            apple_music_preview_url: song.attributes.previews?.[0]?.url || null,
            itunes_buy_link: song.attributes.url,
        })) || [];

        return Response.json({ songs });

    } catch (error) {
        console.error('Error in searchAppleMusic:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});