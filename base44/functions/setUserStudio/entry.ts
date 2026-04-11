import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can set studio for other users
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { user_email, studio_id } = await req.json();

    if (!user_email || !studio_id) {
      return Response.json({ error: 'user_email and studio_id are required' }, { status: 400 });
    }

    // Find the user
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];
    
    // Update the user's data with studio_id
    const updatedData = {
      ...(targetUser.data || {}),
      studio_id: studio_id
    };

    await base44.asServiceRole.entities.User.update(targetUser.id, {
      data: updatedData
    });

    return Response.json({ 
      success: true, 
      message: `Set studio_id for ${user_email}`,
      studio_id 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});