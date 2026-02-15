import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const classes = await base44.asServiceRole.entities.DanceClass.list();

        const updatedClasses = [];
        for (const cls of classes) {
            // Remove patterns like "1401.F2601" or "0090.P2506" from titles
            const cleanedTitle = cls.title.replace(/\s*-?\s*\d+\.[A-Z]?\d+\s*/gi, '').trim();

            if (cleanedTitle !== cls.title && cleanedTitle.length > 0) {
                await base44.asServiceRole.entities.DanceClass.update(cls.id, { title: cleanedTitle });
                updatedClasses.push({ id: cls.id, oldTitle: cls.title, newTitle: cleanedTitle });
            }
        }

        return Response.json({
            message: `Cleaned ${updatedClasses.length} class titles.`,
            updatedClasses
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});