import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import jwt from 'npm:jsonwebtoken@9.0.2';

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
        const privateKey = Deno.env.get('APPLEMUSIC_PRIVATE_KEY');

        if (!teamId || !keyId || !privateKey) {
            return Response.json({ 
                error: 'Apple Music credentials not configured' 
            }, { status: 500 });
        }

        // Generate JWT token valid for 6 months
        const now = Math.floor(Date.now() / 1000);
        const expiry = now + (60 * 60 * 24 * 180); // 180 days

        const token = jwt.sign({}, privateKey, {
            algorithm: 'ES256',
            expiresIn: '180d',
            issuer: teamId,
            header: {
                alg: 'ES256',
                kid: keyId
            }
        });

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