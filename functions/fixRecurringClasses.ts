import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    const studioId = user.studio_id;
    if (!studioId) {
      return Response.json({ error: 'No studio_id found for user' }, { status: 400 });
    }

    // Fetch all classes for this studio
    const allClasses = await base44.asServiceRole.entities.DanceClass.filter({ studio_id: studioId });

    // Day mapping from common formats to our single-letter format
    const dayMap = {
      'M': 'M', 'Mo': 'M', 'Mon': 'M', 'Monday': 'M',
      'T': 'T', 'Tu': 'T', 'Tue': 'T', 'Tues': 'T', 'Tuesday': 'T',
      'W': 'W', 'We': 'W', 'Wed': 'W', 'Wednesday': 'W',
      'R': 'R', 'Th': 'R', 'Thu': 'R', 'Thur': 'R', 'Thurs': 'R', 'Thursday': 'R',
      'F': 'F', 'Fr': 'F', 'Fri': 'F', 'Friday': 'F',
      'S': 'S', 'Sa': 'S', 'Sat': 'S', 'Saturday': 'S',
      'U': 'U', 'Su': 'U', 'Sun': 'U', 'Sunday': 'U'
    };

    const validSingleDays = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];

    const results = {
      processed: 0,
      split: 0,
      created: [],
      deleted: [],
      errors: []
    };

    for (const cls of allClasses) {
      const dayField = cls.day?.trim();

      // Skip if no day or already a valid single day
      if (!dayField || validSingleDays.includes(dayField)) {
        continue;
      }

      results.processed++;

      // Parse multiple days from formats like "Tu Th", "M W F", "Tu/Th", "T/R"
      const dayParts = dayField.split(/[\s\/,]+/).filter(Boolean);
      const parsedDays = [];

      for (const part of dayParts) {
        const normalized = dayMap[part];
        if (normalized && !parsedDays.includes(normalized)) {
          parsedDays.push(normalized);
        }
      }

      if (parsedDays.length <= 1) {
        // Could not parse multiple days, skip or try single day normalization
        if (parsedDays.length === 1 && parsedDays[0] !== cls.day) {
          // Just normalize the single day
          await base44.asServiceRole.entities.DanceClass.update(cls.id, { day: parsedDays[0] });
        }
        continue;
      }

      // Calculate duration per occurrence
      // If duration was combined (e.g., 2.5 hours for a class that meets twice), divide it
      // But more likely, the duration is per session - we'll keep it as-is per day
      const durationPerDay = cls.duration;

      // Create a new class record for each day
      const newClasses = [];
      for (const day of parsedDays) {
        const newClass = {
          studio_id: cls.studio_id,
          title: cls.title,
          type: cls.type || 'class',
          style: cls.style,
          day: day,
          start_time: cls.start_time,
          duration: durationPerDay,
          student_names: cls.student_names || [],
          teacher: cls.teacher,
          room: cls.room,
          color: cls.color,
          tuition_cost: cls.tuition_cost || 0
        };
        newClasses.push(newClass);
      }

      try {
        // Create the new split classes
        const created = await base44.asServiceRole.entities.DanceClass.bulkCreate(newClasses);
        results.created.push(...created.map(c => ({ id: c.id, title: c.title, day: c.day })));

        // Delete the original consolidated class
        await base44.asServiceRole.entities.DanceClass.delete(cls.id);
        results.deleted.push({ id: cls.id, title: cls.title, originalDay: dayField });

        results.split++;
      } catch (err) {
        results.errors.push({ classId: cls.id, title: cls.title, error: err.message });
      }
    }

    return Response.json({
      success: true,
      message: `Processed ${results.processed} classes, split ${results.split} recurring classes.`,
      details: results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});