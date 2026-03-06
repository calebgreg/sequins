import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { name, phone, email, studentCount, expectations, preferPhone, preferEmail, subscribeNewsletter } = await req.json();

    // Validate required fields
    if (!name || !email) {
      return Response.json({ success: false, error: 'Name and email required' }, { status: 400 });
    }

    // Save to database
    try {
      await base44.asServiceRole.entities.Lead.create({
        name,
        phone: phone || '',
        email,
        studentCount: studentCount || '',
        expectations: expectations || '',
        preferPhone: preferPhone || false,
        preferEmail: preferEmail || true,
        subscribeNewsletter: subscribeNewsletter || false,
        source: 'book_demo'
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return Response.json({ success: false, error: 'Failed to save lead' }, { status: 500 });
    }

    // Send email to Cassia via Resend
    const cassia = 'cassia@besequins.com';
    if (RESEND_API_KEY) {
      try {
        const emailBody = `
New Demo Request Received!

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Student Count: ${studentCount || 'Not specified'}
Contact Preference: ${preferPhone && preferEmail ? 'Phone & Email' : preferPhone ? 'Phone' : 'Email'}

What they want to see:
${expectations || 'No specific expectations provided'}

Newsletter: ${subscribeNewsletter ? 'Yes' : 'No'}

Submitted: ${new Date().toLocaleString()}
`;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'noreply@sequins.studio',
            to: cassia,
            subject: `New Demo Request: ${name}`,
            text: emailBody,
          }),
        });

        if (!res.ok) {
          console.error('Resend error:', await res.text());
        }
      } catch (emailError) {
        console.error('Email send failed (non-blocking):', emailError.message);
      }
    }

    return Response.json({ success: true, data: { name: formData.name } }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return Response.json({ success: false, error: 'Server error' }, { status: 500 });
  }
});