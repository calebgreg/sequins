import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, source } = await req.json();

    // Save to database
    await base44.asServiceRole.entities.Waitlist.create({
      email,
      source
    });

    // Send notification email (non-blocking - don't fail if email fails)
    base44.integrations.Core.SendEmail({
      to: Deno.env.get('WAITLIST_ADMIN_EMAIL'),
      subject: `New waitlist signup: ${email}`,
      body: `A new person joined the waitlist!\n\nEmail: ${email}\nSource: ${source || 'unknown'}\n\nTimestamp: ${new Date().toISOString()}`
    }).catch(err => console.error('Email notification failed:', err));

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});