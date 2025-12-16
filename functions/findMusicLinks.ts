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

        CRITICAL: The song title is likely the same as the album title. You MUST find the link to the *Individual Track/Song*, not the full album.

        Search Strategy:
        1. Search specifically for "${song_title} ${artist} spotify track" to find the /track/ URL.
        2. Search specifically for "${song_title} ${artist} apple music song" to find the song deep link.

        Validation:
        - Spotify Link: MUST contain '/track/'. (e.g. https://open.spotify.com/track/...) - Do NOT return /album/ links.
        - Apple Music Link: MUST point to the song (usually contains '?i=' parameter).

        If you find an album page, you must look at the tracklist and extract the specific link for the song "${song_title}".

        Return JSON: { "spotify_link": "...", "apple_music_link": "..." }`;

        const response = await base44.integrations.Core.InvokeLLM({
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

        return Response.json(response);

    } catch (error) {
        console.error("Error finding music links:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});