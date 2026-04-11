import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * This function syncs the studio_id from a matching Teacher record to the current user.
 * Call this on user login/app load to ensure teachers have the correct studio_id.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has a studio_id
    const existingStudioId = user.studio_id || user.data?.studio_id || user.data?.data?.studio_id;
    if (existingStudioId) {
      return Response.json({ 
        synced: false, 
        reason: 'User already has studio_id',
        studio_id: existingStudioId 
      });
    }

    // Find a Teacher record matching this user's email (case-insensitive)
    const allTeachers = await base44.asServiceRole.entities.Teacher.filter({});
    const userEmailLower = user.email.toLowerCase();
    const matchingTeacher = allTeachers.find(t => t.email?.toLowerCase() === userEmailLower);

    if (!matchingTeacher || !matchingTeacher.studio_id) {
      return Response.json({ 
        synced: false, 
        reason: 'No matching teacher record with studio_id found' 
      });
    }

    // Update the user's data with the studio_id from the Teacher record
    await base44.auth.updateMe({ studio_id: matchingTeacher.studio_id });

    return Response.json({ 
      synced: true, 
      studio_id: matchingTeacher.studio_id,
      teacher_name: matchingTeacher.name 
    });

  } catch (error) {
    console.error('syncUserStudioId error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});