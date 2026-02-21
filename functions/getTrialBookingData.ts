import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PUBLIC endpoint — returns studio info and available classes for trial booking.
 * No authentication required (uses service role).
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { studio_id } = body;

    if (!studio_id) {
      return Response.json({ error: 'Missing studio_id' }, { status: 400 });
    }

    // Fetch studio info using service role (no user auth needed)
    const allStudios = await base44.asServiceRole.entities.Studio.list();
    const studio = allStudios.find(s => s.id === studio_id);

    if (!studio) {
      return Response.json({ error: 'Studio not found' }, { status: 404 });
    }

    // Fetch classes for this studio
    const classes = await base44.asServiceRole.entities.DanceClass.filter({ studio_id });
    const availableClasses = classes
      .filter(c => c.type !== 'admin')
      .map(c => ({
        id: c.id,
        title: c.title,
        day: c.day,
        start_time: c.start_time,
        duration: c.duration,
        teacher: c.teacher,
        style: c.style,
      }));

    return Response.json({
      studio: {
        name: studio.name,
        logo_url: studio.logo_url || null,
        address: studio.address || null,
      },
      classes: availableClasses,
    });

  } catch (error) {
    console.error('getTrialBookingData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});