import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as jose from 'npm:jose@5.2.0';

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

        // Generate the developer token directly here instead of calling another function
        const teamId = Deno.env.get('APPLEMUSIC_TEAM_ID');
        const keyId = Deno.env.get('APPLEMUSIC_KEY_ID');
        let privateKey = Deno.env.get('APPLEMUSIC_PRIVATE_KEY');

        if (!teamId || !keyId || !privateKey) {
            return Response.json({ error: 'Apple Music credentials not configured' }, { status: 500 });
        }

        privateKey = privateKey.replace(/\\n/g, '\n');
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
        }

        const ecPrivateKey = await jose.importPKCS8(privateKey, 'ES256');
        const developerToken = await new jose.SignJWT({})
            .setProtectedHeader({ alg: 'ES256', kid: keyId })
            .setIssuedAt()
            .setIssuer(teamId)
            .setExpirationTime('180d')
            .sign(ecPrivateKey);

        // Catalog search only requires developer token
        const appleMusicApiUrl = `https://api.music.apple.com/v1/catalog/us/search?term=${encodeURIComponent(query)}&types=songs&limit=5`;
        
        const response = await fetch(appleMusicApiUrl, {
            headers: {
                'Authorization': `Bearer ${developerToken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Apple Music API error:', response.status, errorText);
            return Response.json({ error: `Apple Music API error: ${response.statusText}`, details: errorText }, { status: response.status });
        }

        const data = await response.json();
        
        const songs = data.results?.songs?.data?.map(song => ({
            id: song.id,
            song_title: song.attributes.name,
            artist: song.attributes.artistName,
            album_artwork_url: song.attributes.artwork?.url?.replace('{w}', '200').replace('{h}', '200'),
            apple_music_preview_url: song.attributes.previews?.[0]?.url || null,
            itunes_buy_link: song.attributes.url,
        })) || [];

        return Response.json({ songs });

    } catch (error) {
        console.error('Error in searchAppleMusic:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});