import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * TRIAL BOOKING — Backend Function
 * 
 * Called by the public trial booking form.
 * Creates a Lead, adds child to class roster as trial, sends confirmation SMS.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      studio_id,
      child_name,
      child_age,
      parent_name,
      parent_phone,
      parent_email,
      how_heard,
      referral_name,
      dance_experience,
      interests,
      class_id,
      trial_date,
    } = body;

    if (!studio_id || !child_name || !parent_name || !class_id || !trial_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get studio info
    const allStudios = await base44.asServiceRole.entities.Studio.list();
    const studio = allStudios.find(s => s.id === studio_id);
    if (!studio) return Response.json({ error: 'Studio not found' }, { status: 404 });

    // Get the selected class
    const allClasses = await base44.asServiceRole.entities.DanceClass.filter({ studio_id });
    const selectedClass = allClasses.find(c => c.id === class_id);
    if (!selectedClass) return Response.json({ error: 'Class not found' }, { status: 404 });

    // Determine source from how_heard
    const sourceMap = {
      'friend': 'referral',
      'social_media': 'social',
      'google': 'website',
      'event': 'event',
      'other': 'inquiry',
    };

    // 1. Create the Lead
    const lead = await base44.asServiceRole.entities.Lead.create({
      studio_id,
      source: sourceMap[how_heard] || 'inquiry',
      source_detail: how_heard === 'friend' && referral_name ? `Referred by ${referral_name}` : how_heard,
      parent_name,
      parent_email: parent_email || '',
      parent_phone: parent_phone || '',
      child_name,
      child_age: child_age ? Number(child_age) : undefined,
      child_interests: interests || [],
      dance_experience: dance_experience || 'none',
      how_heard: how_heard || 'other',
      referral_name: referral_name || '',
      funnel_status: 'trial_scheduled',
      trial_class_id: class_id,
      trial_date,
      last_contact_date: new Date().toISOString().split('T')[0],
    });

    // 2. Add child to class roster as trial student
    const currentTrialNames = selectedClass.trial_student_names || [];
    const currentStudentNames = selectedClass.student_names || [];
    
    // Add to both student_names (for roster display) and trial_student_names (for tagging)
    if (!currentStudentNames.includes(child_name)) {
      await base44.asServiceRole.entities.DanceClass.update(class_id, {
        student_names: [...currentStudentNames, child_name],
        trial_student_names: [...currentTrialNames, child_name],
      });
    } else if (!currentTrialNames.includes(child_name)) {
      await base44.asServiceRole.entities.DanceClass.update(class_id, {
        trial_student_names: [...currentTrialNames, child_name],
      });
    }

    // 3. Send confirmation SMS via Twilio
    if (parent_phone) {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioMsgSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

      if (twilioSid && twilioAuth && twilioMsgSid) {
        const dayNames = { M: 'Monday', T: 'Tuesday', W: 'Wednesday', R: 'Thursday', F: 'Friday', S: 'Saturday', U: 'Sunday' };
        const classDay = dayNames[selectedClass.day] || selectedClass.day;
        const classHour = Math.floor(selectedClass.start_time);
        const classMin = Math.round((selectedClass.start_time % 1) * 60);
        const ampm = classHour >= 12 ? 'PM' : 'AM';
        const displayHour = classHour > 12 ? classHour - 12 : classHour === 0 ? 12 : classHour;
        const timeStr = `${displayHour}:${classMin.toString().padStart(2, '0')} ${ampm}`;

        const msgBody = `You're all set! ${child_name} is booked for ${selectedClass.title} on ${classDay} at ${timeStr}. See you there! 💃\n\n— ${studio.name}`;

        const formData = new URLSearchParams();
        formData.append('MessagingServiceSid', twilioMsgSid);
        formData.append('To', parent_phone);
        formData.append('Body', msgBody);

        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });
      }
    }

    // 4. If referral, log for referrer agent
    if (how_heard === 'friend' && referral_name) {
      // The Lead entity already captures referral_name and source=referral
      // The Referrer agent will pick this up automatically
      console.log(`[BookTrial] Referral logged: ${referral_name} referred ${child_name}`);
    }

    return Response.json({
      success: true,
      lead_id: lead.id,
      message: `${child_name} is booked for ${selectedClass.title}!`,
    });

  } catch (error) {
    console.error('BookTrial error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});