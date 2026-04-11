import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Links a Teacher to their User record by syncing the studio_id.
 * Called either:
 * 1. From entity automation when Teacher is created/updated
 * 2. Directly from the frontend when inviting a user (with email, studio_id, name in payload)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    // Support both automation payload (event/data) and direct call (email/studio_id)
    const { event, data } = payload;
    
    // Direct call from frontend: { email, studio_id, name }
    const directEmail = payload.email;
    const directStudioId = payload.studio_id;
    
    const teacherEmail = (directEmail || data?.email)?.toLowerCase();
    const studioId = directStudioId || data?.studio_id;
    
    if (!teacherEmail || !studioId) {
      return Response.json({ skipped: true, reason: 'No email or studio_id provided' });
    }
    
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
    if (existingStudioId === studioId) {
      return Response.json({ 
        synced: false, 
        reason: 'User already has correct studio_id',
        email: teacherEmail
      });
    }

    // Update the User record with the studio_id
    await base44.asServiceRole.entities.User.update(matchingUser.id, {
      studio_id: studioId
    });

    console.log(`Linked user ${teacherEmail} to studio ${studioId}`);

    return Response.json({ 
      synced: true, 
      user_email: teacherEmail,
      studio_id: studioId
    });

  } catch (error) {
    console.error('linkTeacherToUser error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});