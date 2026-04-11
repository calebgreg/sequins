import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const NYLAS_API_KEY = Deno.env.get('NYLAS_API_KEY');
    const NYLAS_GRANT_ID = Deno.env.get('NYLAS_GRANT_ID');

    if (!NYLAS_API_KEY || !NYLAS_GRANT_ID) {
      return Response.json({ error: 'Nylas credentials not configured' }, { status: 500 });
    }

    const response = await fetch(`https://api.us.nylas.com/v3/grants/${NYLAS_GRANT_ID}/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: subject,
        body: body,
        to: [{ email: to }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json({ error: 'Failed to send email', details: errorData }, { status: response.status });
    }

    const result = await response.json();
    return Response.json({ success: true, messageId: result.data?.id });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});