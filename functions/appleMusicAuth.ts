import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as jose from 'npm:jose@5.2.0';

// This function handles Apple Music authorization by returning the auth URL
// and processing the callback
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { action, musicUserToken } = body;

        const teamId = Deno.env.get('APPLEMUSIC_TEAM_ID');
        const keyId = Deno.env.get('APPLEMUSIC_KEY_ID');
        let privateKey = Deno.env.get('APPLEMUSIC_PRIVATE_KEY');

        if (!teamId || !keyId || !privateKey) {
            return Response.json({ 
                error: 'Apple Music credentials not configured',
                configured: false
            }, { status: 400 });
        }

        // Generate developer token
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

        if (action === 'getConfig') {
            // Return configuration for MusicKit initialization
            return Response.json({
                developerToken,
                appName: 'Sequins Dance Studio',
                appBuild: '1.0.0',
                configured: true
            });
        }

        if (action === 'saveUserToken' && musicUserToken) {
            // Save the user token to studio settings
            const settings = await base44.asServiceRole.entities.StudioSettings.list();
            const currentSettings = settings[0];

            if (currentSettings) {
                await base44.asServiceRole.entities.StudioSettings.update(currentSettings.id, {
                    apple_music_user_token: musicUserToken,
                    apple_music_connected_at: new Date().toISOString()
                });
            }

            return Response.json({ success: true });
        }

        if (action === 'disconnect') {
            // Remove the user token
            const settings = await base44.asServiceRole.entities.StudioSettings.list();
            const currentSettings = settings[0];

            if (currentSettings) {
                await base44.asServiceRole.entities.StudioSettings.update(currentSettings.id, {
                    apple_music_user_token: null,
                    apple_music_connected_at: null
                });
            }

            return Response.json({ success: true });
        }

        return Response.json({ 
            developerToken,
            configured: true
        });

    } catch (error) {
        console.error('Apple Music auth error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});