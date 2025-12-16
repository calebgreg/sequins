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
        STRICT VALIDATION REQUIRED:
        - Spotify: URL MUST contain '/track/'. REJECT '/album/' links.
        - Apple Music: URL MUST be a deep link to the song (usually contains '?i=' parameter). REJECT generic album pages.
        - If you only find an album, LOOK INSIDE for the specific track link.
        - If no specific song link is found, return null. DO NOT fallback to an album link.
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