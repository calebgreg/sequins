import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Known recurring class patterns based on the imported schedule
// Format: { title pattern -> [days it should occur, correct duration per session] }
const RECURRING_CLASS_CORRECTIONS = {
  'Pre-Pro Ballet A': { days: ['T', 'R'], duration: 2.916666666666668, start_time: 16.5 },
  'Pre-Pro Ballet B': { days: ['M', 'W'], duration: 2.916666666666668, start_time: 18.0 },
  'Pre-Pro Ballet C': { days: ['T', 'R'], duration: 2.916666666666668, start_time: 16.5 },
  'Pre-Pro Ballet D': { days: ['M', 'W'], duration: 2.916666666666668, start_time: 18.0 },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get studio_id from request body or fall back to user's studio
    const body = await req.json().catch(() => ({}));
    const studioId = body.studio_id || user.studio_id;
    
    if (!studioId) {
      return Response.json({ error: 'No studio_id provided or found for user' }, { status: 400 });
    }

    // Fetch all classes for this studio
    const allClasses = await base44.asServiceRole.entities.DanceClass.filter({ studio_id: studioId });

    const results = {
      processed: 0,
      split: 0,
      created: [],
      deleted: [],
      skipped: [],
      errors: []
    };

    for (const cls of allClasses) {
      // Check if this class matches any of our known recurring patterns
      const correction = RECURRING_CLASS_CORRECTIONS[cls.title];
      
      if (!correction) {
        continue; // Not a class we need to fix
      }

      results.processed++;

      // Check if this class already exists on all required days
      const existingDaysForTitle = allClasses
        .filter(c => c.title === cls.title && c.studio_id === studioId)
        .map(c => c.day);

      // If class already exists on all required days, skip
      const missingDays = correction.days.filter(d => !existingDaysForTitle.includes(d));
      
      if (missingDays.length === 0) {
        results.skipped.push({ title: cls.title, reason: 'Already has all days' });
        continue;
      }

      // Create missing day entries
      const newClasses = [];
      for (const day of missingDays) {
        const newClass = {
          studio_id: cls.studio_id,
          title: cls.title,
          type: cls.type || 'class',
          style: cls.style,
          day: day,
          start_time: correction.start_time,
          duration: correction.duration,
          student_names: cls.student_names || [],
          teacher: cls.teacher,
          room: cls.room,
          color: cls.color,
          tuition_cost: cls.tuition_cost || 0
        };
        newClasses.push(newClass);
      }

      if (newClasses.length > 0) {
        try {
          const created = await base44.asServiceRole.entities.DanceClass.bulkCreate(newClasses);
          results.created.push(...created.map(c => ({ id: c.id, title: c.title, day: c.day })));
          results.split++;
        } catch (err) {
          results.errors.push({ classId: cls.id, title: cls.title, error: err.message });
        }
      }
    }

    return Response.json({
      success: true,
      message: `Processed ${results.processed} classes, created ${results.created.length} new class entries.`,
      details: results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});