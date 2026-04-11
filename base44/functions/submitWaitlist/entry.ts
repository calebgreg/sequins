import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, source } = await req.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return Response.json({ success: false, error: 'Invalid email' }, { status: 400 });
    }

    // Save to database first
    try {
      await base44.asServiceRole.entities.Waitlist.create({
        email,
        source
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return Response.json({ success: false, error: 'Failed to save submission' }, { status: 500 });
    }

    // Send notification email (non-blocking - fire and forget)
    const adminEmail = Deno.env.get('WAITLIST_ADMIN_EMAIL');
    if (adminEmail) {
      try {
        await base44.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `New waitlist signup: ${email}`,
          body: `A new person joined the waitlist!\n\nEmail: ${email}\nSource: ${source || 'unknown'}\n\nTimestamp: ${new Date().toISOString()}`
        });
      } catch (emailError) {
        console.error('Email notification failed (non-blocking):', emailError.message);
        // Don't return error - email failure shouldn't block user signup
      }
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return Response.json({ success: false, error: 'Server error' }, { status: 500 });
  }
});