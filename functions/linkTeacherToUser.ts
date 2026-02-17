import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Entity automation: When a Teacher is created or updated, find their matching User record
 * and copy the studio_id to the User record.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { event, data } = payload;
    
    if (!data?.email || !data?.studio_id) {
      return Response.json({ skipped: true, reason: 'Teacher has no email or studio_id' });
    }

    const teacherEmail = data.email.toLowerCase();
    
    // Find a User record matching this email
    const allUsers = await base44.asServiceRole.entities.User.filter({});
    const matchingUser = allUsers.find(u => u.email?.toLowerCase() === teacherEmail);
    
    if (!matchingUser) {
      return Response.json({ 
        synced: false, 
        reason: 'No matching user record found (not invited yet)',
        email: teacherEmail
      });
    }

    // Check if user already has this studio_id
    const existingStudioId = matchingUser.studio_id || matchingUser.data?.studio_id;
    if (existingStudioId === data.studio_id) {
      return Response.json({ 
        synced: false, 
        reason: 'User already has correct studio_id',
        email: teacherEmail
      });
    }

    // Update the User record with the studio_id
    await base44.asServiceRole.entities.User.update(matchingUser.id, {
      studio_id: data.studio_id
    });

    console.log(`Linked user ${teacherEmail} to studio ${data.studio_id} via teacher ${data.name}`);

    return Response.json({ 
      synced: true, 
      user_email: teacherEmail,
      studio_id: data.studio_id,
      teacher_name: data.name 
    });

  } catch (error) {
    console.error('linkTeacherToUser error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});