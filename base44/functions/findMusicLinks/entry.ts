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

        // Use the real Apple Music API via searchAppleMusic function
        const searchQuery = artist ? `${song_title} ${artist}` : song_title;
        
        const searchResponse = await base44.functions.invoke('searchAppleMusic', {
            query: searchQuery
        });

        // searchResponse is an axios response, so data is in searchResponse.data
        const searchData = searchResponse.data || searchResponse;

        if (searchData.error) {
            console.error('Apple Music search error:', searchData.error);
            return Response.json({ 
                apple_music_link: null,
                album_artwork_url: null,
                apple_music_preview_url: null,
                itunes_buy_link: null
            });
        }

        const songs = searchData.songs || [];
        
        if (songs.length === 0) {
            return Response.json({ 
                apple_music_link: null,
                album_artwork_url: null,
                apple_music_preview_url: null,
                itunes_buy_link: null
            });
        }

        // Return the first (best) match
        const bestMatch = songs[0];
        
        return Response.json({
            apple_music_link: bestMatch.itunes_buy_link || null,
            album_artwork_url: bestMatch.album_artwork_url || null,
            apple_music_preview_url: bestMatch.apple_music_preview_url || null,
            itunes_buy_link: bestMatch.itunes_buy_link || null
        });

    } catch (error) {
        console.error("Error finding music links:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});