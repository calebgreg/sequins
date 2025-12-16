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

        CRITICAL: 
        1. You MUST find the link to the *Individual Track/Song*, not the full album.
        2. **NO FAKE LINKS**: If you cannot find a working, verifiable link, return null. Do NOT output placeholder IDs like "12345", "3J0J0J", or "example". 

        Search Strategy:
        1. Search specifically for "${song_title} ${artist} spotify track" to find the /track/ URL.
        2. Search specifically for "${song_title} ${artist} apple music song" to find the song deep link.

        Validation:
        - Spotify Link: MUST be a real link. Example: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
        - Apple Music Link: MUST point to the song (usually contains '?i=' parameter).

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
            // Spotify IDs are typically 22 alphanumeric chars. 
            // We'll use a regex that looks for /track/ followed by at least 20 alphanumeric chars.
            // This filters out "3J0J0J0J0J0J0J0J0J0J0" and other repeated garbage or short placeholders.
            const isValidId = /\/track\/[a-zA-Z0-9]{20,30}/.test(response.spotify_link);
            const isGarbage = /0J0J|12345|example/.test(response.spotify_link);
            
            if (!isValidId || isGarbage) {
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