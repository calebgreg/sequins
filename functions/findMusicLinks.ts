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

        const prompt = `Find the official Spotify and Apple Music links for the **specific single track** "${song_title}"${artist ? ` by "${artist}"` : ''}. 
        
        The goal is to get a link that plays the song immediately, not an album view.
        - Spotify: Please return a link containing '/track/'.
        - Apple Music: Please return a link that highlights or plays the specific song (often has '?i=' parameter, but not always). 
        
        If you find the song inside an album (e.g. "Best of"), that is okay, BUT the link must point to the specific track, not just the album overview.
        
        Return them in a JSON object with keys 'spotify_link' and 'apple_music_link'.`;

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