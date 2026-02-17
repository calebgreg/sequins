import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();
    
    // Only process user creation events
    if (event?.type !== 'create' || event?.entity_name !== 'User') {
      return Response.json({ skipped: true, reason: 'Not a user creation event' });
    }
    
    const userEmail = data?.email?.toLowerCase();
    if (!userEmail) {
      return Response.json({ skipped: true, reason: 'No email found' });
    }
    
    // Find teacher records with matching email (case-insensitive)
    const allTeachers = await base44.asServiceRole.entities.Teacher.filter({});
    const matchingTeachers = allTeachers.filter(t => 
      t.email?.toLowerCase() === userEmail
    );
    
    if (matchingTeachers.length === 0) {
      return Response.json({ skipped: true, reason: 'No matching teacher found' });
    }
    
    // Update each matching teacher's email to the normalized lowercase version
    const updates = await Promise.all(
      matchingTeachers.map(teacher => 
        base44.asServiceRole.entities.Teacher.update(teacher.id, {
          email: userEmail
        })
      )
    );
    
    return Response.json({ 
      success: true, 
      linked: matchingTeachers.length,
      teacherNames: matchingTeachers.map(t => t.name)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});