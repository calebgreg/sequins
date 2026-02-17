import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Entity automation: When a User is created, find their matching Teacher record
 * and copy the studio_id to the User record.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { event, data } = payload;
    
    if (event?.type !== 'create' || !data?.email) {
      return Response.json({ skipped: true, reason: 'Not a user create event or no email' });
    }

    const userEmail = data.email.toLowerCase();
    
    // Find a Teacher record matching this email
    const allTeachers = await base44.asServiceRole.entities.Teacher.filter({});
    const matchingTeacher = allTeachers.find(t => t.email?.toLowerCase() === userEmail);
    
    if (!matchingTeacher?.studio_id) {
      return Response.json({ 
        synced: false, 
        reason: 'No matching teacher record with studio_id found',
        email: userEmail
      });
    }

    // Update the User record with the studio_id
    await base44.asServiceRole.entities.User.update(data.id, {
      studio_id: matchingTeacher.studio_id
    });

    console.log(`Linked user ${userEmail} to studio ${matchingTeacher.studio_id} via teacher ${matchingTeacher.name}`);

    return Response.json({ 
      synced: true, 
      user_email: userEmail,
      studio_id: matchingTeacher.studio_id,
      teacher_name: matchingTeacher.name 
    });

  } catch (error) {
    console.error('onUserCreated error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});