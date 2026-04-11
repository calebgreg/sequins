import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as jose from 'npm:jose@5.2.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get Apple Music credentials from environment
        const teamId = Deno.env.get('APPLEMUSIC_TEAM_ID');
        const keyId = Deno.env.get('APPLEMUSIC_KEY_ID');
        let privateKey = Deno.env.get('APPLEMUSIC_PRIVATE_KEY');

        if (!teamId || !keyId || !privateKey) {
            return Response.json({ 
                error: 'Apple Music credentials not configured' 
            }, { status: 500 });
        }

        // Ensure proper formatting of private key
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        // Add headers if missing
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
        }

        // Import the private key for ES256
        const ecPrivateKey = await jose.importPKCS8(privateKey, 'ES256');

        // Generate JWT token valid for 6 months
        const token = await new jose.SignJWT({})
            .setProtectedHeader({ alg: 'ES256', kid: keyId })
            .setIssuedAt()
            .setIssuer(teamId)
            .setExpirationTime('180d')
            .sign(ecPrivateKey);

        const now = Math.floor(Date.now() / 1000);
        const expiry = now + (60 * 60 * 24 * 180); // 180 days

        return Response.json({ 
            token,
            expiresAt: expiry
        });

    } catch (error) {
        console.error('Apple Music token generation error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});