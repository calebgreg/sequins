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
        Also find a high-resolution URL for the album artwork.
        Return them in a JSON object with keys 'spotify_link', 'apple_music_link', and 'album_art_url'. 
        If you can't find a specific item, return null for that key.`;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    spotify_link: { type: ["string", "null"] },
                    apple_music_link: { type: ["string", "null"] },
                    album_art_url: { type: ["string", "null"], description: "URL to the album artwork image" }
                }
            }
        });

        return Response.json(response);

    } catch (error) {
        console.error("Error finding music links:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});