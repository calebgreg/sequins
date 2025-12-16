import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { song_title, artist } = await req.json();

        if (!song_title) {
            return Response.json({ error: 'Song title is required' }, { status: 400 });
        }

        const prompt = `Find the official Spotify and Apple Music links for the song "${song_title}"${artist ? ` by "${artist}"` : ''}.

        IMPORTANT: The user input might have typos (e.g. "Belinni" instead of "Bellini", or "Samba Rhythms" instead of "Samba de Janeiro"). 
        1. First, identify the likely correct song and artist if the input seems off.
        2. Then find the links for that corrected song.

        CRITICAL: 
        1. You MUST find the link to the *Individual Track/Song*, not the full album.
        2. **NO FAKE LINKS**: If you cannot find a working, verifiable link, return null. 

        Search Strategy:
        1. Search for "spotify track ${song_title} ${artist || ''}"
        2. Search for "apple music song ${song_title} ${artist || ''}"

        Return JSON: { "spotify_link": "...", "apple_music_link": "..." }`;

        let response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    spotify_link: { type: ["string", "null"] },
                    apple_music_link: { type: ["string", "null"] }
                }
            }
        });

        // Extra Validation Layer to catch hallucinations
        if (response.spotify_link) {
            // Relaxed validation: Just check for spotify.com/track/ and at least some ID chars
            const hasTrackPath = response.spotify_link.includes('spotify.com/track/');
            const isGarbage = /0J0J|12345|example|YOUR_CLIENT_ID/.test(response.spotify_link);

            if (!hasTrackPath || isGarbage) {
                console.log("Discarding invalid/hallucinated Spotify link:", response.spotify_link);
                response.spotify_link = null;
            }
        }

        return Response.json(response);

    } catch (error) {
        console.error("Error finding music links:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});