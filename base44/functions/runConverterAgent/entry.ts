import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONVERTER AGENT — Backend Function
 * 
 * TRIGGER: Daily sweep or event trigger when trial ends
 * 
 * PROCESS:
 * 1. Find trial students from the last 48 hours
 * 2. For each, determine the right path:
 *    A) Feel Special — attended trial, within 24h, uses teacher notes
 *    B) No-Show Value — didn't show, tell them what they missed
 *    C) Reason to Come Back — 24-72h after trial, find a specific hook
 * 3. Save all as GrowthActions with pending_review
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const studio_id = body.studio_id;
    if (!studio_id) return Response.json({ error: 'studio_id is required' }, { status: 400 });

    const allStudios = await base44.asServiceRole.entities.Studio.list();
    const studio = allStudios.find(s => s.id === studio_id);
    if (!studio) return Response.json({ error: 'Studio not found' }, { status: 404 });

    const studioName = studio.name;

    // Get studio owner name
    let senderFirst = studioName.split(' ')[0];
    if (studio.owner_email) {
      const users = await base44.asServiceRole.entities.User.list();
      const owner = users.find(u => u.email === studio.owner_email);
      if (owner?.full_name && !owner.full_name.includes('@') && !owner.full_name.includes('.')) {
        senderFirst = owner.full_name.split(' ')[0];
      }
    }

    // === GATHER ALL DATA ===
    const leads = await base44.asServiceRole.entities.Lead.filter({ studio_id });
    const classes = await base44.asServiceRole.entities.DanceClass.filter({ studio_id });
    const studentNotes = await base44.asServiceRole.entities.StudentNote.filter({ studio_id });
    const attendance = await base44.asServiceRole.entities.Attendance.filter({ studio_id });
    const outcomes = await base44.asServiceRole.entities.GrowthOutcome.filter({ studio_id, agent: 'converter' });
    const convertOutcome = outcomes.find(o => o.is_active);

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const results = {
      studio_id,
      feel_special: { processed: 0, actions: 0, flagged_for_notes: 0 },
      no_show: { processed: 0, actions: 0 },
      reason_to_return: { processed: 0, actions: 0 },
      errors: []
    };

    // Helper: check if lead already has a pending converter action
    async function hasPendingAction(leadId) {
      const existing = await base44.asServiceRole.entities.GrowthAction.filter({
        studio_id, target_id: leadId, agent: 'converter', status: 'pending_review'
      });
      return existing.length > 0;
    }

    // Helper: get teacher notes for a child
    function getChildNotes(childName, trialDate) {
      const nameLower = (childName || '').toLowerCase();
      const notes = studentNotes.filter(n => n.student_name?.toLowerCase() === nameLower);
      
      if (trialDate) {
        const trialTime = new Date(trialDate).getTime();
        notes.sort((a, b) => {
          const aDiff = Math.abs(new Date(a.date || a.created_date).getTime() - trialTime);
          const bDiff = Math.abs(new Date(b.date || b.created_date).getTime() - trialTime);
          return aDiff - bDiff;
        });
      }
      return notes;
    }

    // Helper: get trial class info
    function getTrialClass(lead) {
      const trialClass = lead.trial_class_id ? classes.find(c => c.id === lead.trial_class_id) : null;
      return {
        class: trialClass,
        className: trialClass?.title || null,
        teacher: trialClass?.teacher || null,
        style: trialClass?.style || trialClass?.title || null,
        date: lead.trial_date || null
      };
    }

    // =====================================================
    // PATH A: FEEL SPECIAL — Attended trial within 24 hours
    // =====================================================
    const recentTrialAttended = leads.filter(l =>
      l.trial_outcome === 'attended' &&
      (l.funnel_status === 'trial_completed' || l.funnel_status === 'offer_made') &&
      l.trial_date && new Date(l.trial_date) >= fortyEightHoursAgo &&
      new Date(l.trial_date) <= now
    );

    for (const lead of recentTrialAttended) {
      if (await hasPendingAction(lead.id)) continue;

      try {
        const trial = getTrialClass(lead);
        const childNotes = getChildNotes(lead.child_name, trial.date);
        const hasNotes = childNotes.length > 0;
        const hasLeadNotes = lead.teacher_notes && lead.teacher_notes.trim().length > 0;

        // GATE: No teacher notes → flag, don't draft
        if (!hasNotes && !hasLeadNotes) {
          console.log(`[Converter] No teacher notes for ${lead.child_name} — flagging`);
          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id, outcome_id: convertOutcome?.id, agent: 'converter',
            action_type: 'task', status: 'pending_review', priority: 'high',
            target_type: 'lead', target_id: lead.id, target_name: lead.parent_name,
            title: `⚠️ Need teacher notes for ${lead.child_name}'s trial`,
            summary: `Trial on ${trial.date || 'unknown'}${trial.className ? ` in ${trial.className}` : ''}${trial.teacher ? ` with ${trial.teacher}` : ''} — no observations recorded`,
            content: `${lead.child_name} completed a trial${trial.className ? ` in ${trial.className}` : ''}${trial.teacher ? ` with ${trial.teacher}` : ''} on ${trial.date || 'a recent date'}, but there are no teacher notes.\n\nPlease ask ${trial.teacher || 'the teacher'} to add a quick note about ${lead.child_name} — what they noticed, any standout moments. Once notes are in, a follow-up can be drafted.`,
            context: { follow_up_type: 'needs_teacher_notes', child_name: lead.child_name, trial_date: trial.date, trial_class: trial.className, teacher: trial.teacher }
          });
          results.feel_special.flagged_for_notes++;
          results.feel_special.processed++;
          continue;
        }

        // Synthesize notes for Claude
        const notesSummary = childNotes.slice(0, 3).map(n => {
          const teacher = n.teacher_name || 'Teacher';
          const cat = n.category && n.category !== 'general' ? ` (${n.category})` : '';
          return `${teacher}${cat}: "${n.content}"`;
        }).join('\n');

        const trialContext = [
          trial.className ? `CLASS: ${trial.className}` : null,
          trial.style ? `STYLE: ${trial.style}` : null,
          trial.teacher ? `TEACHER: ${trial.teacher}` : null,
          trial.date ? `DATE: ${trial.date}` : null,
        ].filter(Boolean).join('\n');

        const allObservations = [
          notesSummary,
          hasLeadNotes ? `Lead notes: "${lead.teacher_notes}"` : null,
        ].filter(Boolean).join('\n');

        const channel = lead.parent_phone ? 'text' : 'email';
        const { data: draft } = await base44.asServiceRole.functions.invoke('callClaudeService', {
          prompt: `You are writing a message from a dance teacher to a parent after their child's trial class.

CONTEXT:
Child: ${lead.child_name}
Parent: ${lead.parent_name}
Class: ${trial.className || 'trial class'}
Teacher notes: ${allObservations}
Channel: ${channel}

YOUR JOB:
Turn the teacher's observation into a short, warm message that makes the parent feel like their child was truly seen.

RULES:
- 2-3 sentences max
- Use the teacher's observation but make it conversational, not a report
- Sound like a teacher who was genuinely delighted
- This is NOT a sales follow-up - don't ask them to enroll, don't mention pricing
- Just share what you noticed. That's it.
- Match the channel (text = casual, email = slightly more polished)
- Emojis OK but max 1

OUTPUT:
Just the message. No explanation.
Return JSON: { "message": "the complete message" }`,
          response_json_schema: { type: "object", properties: { message: { type: "string" } } }
        });

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id, outcome_id: convertOutcome?.id, agent: 'converter',
          action_type: lead.parent_phone ? 'sms' : 'email',
          status: 'pending_review', priority: 'high',
          target_type: 'lead', target_id: lead.id, target_name: lead.parent_name,
          target_email: lead.parent_email, target_phone: lead.parent_phone,
          title: `Feel Special: ${lead.child_name}`,
          summary: `Trial${trial.className ? ` in ${trial.className}` : ''}${trial.teacher ? ` with ${trial.teacher}` : ''} — ${childNotes.length} teacher note(s) used`,
          content: draft.message,
          context: {
            follow_up_type: 'feel_special', child_name: lead.child_name,
            trial_date: trial.date, trial_class: trial.className,
            teacher: trial.teacher, notes_used: childNotes.length
          }
        });
        results.feel_special.actions++;
        results.feel_special.processed++;

      } catch (err) {
        console.error(`[Converter] Feel Special error for ${lead.child_name}:`, err.message);
        results.errors.push(`Feel Special ${lead.child_name}: ${err.message}`);
      }
    }

    // =====================================================
    // PATH B: NO-SHOW VALUE — Tell them what they missed
    // =====================================================
    const recentNoShows = leads.filter(l =>
      (l.trial_outcome === 'no_show' ||
        (l.funnel_status === 'trial_scheduled' && l.trial_date && new Date(l.trial_date) < now && !l.trial_outcome)
      ) &&
      l.trial_date && new Date(l.trial_date) >= fortyEightHoursAgo
    );

    for (const lead of recentNoShows) {
      if (await hasPendingAction(lead.id)) continue;

      try {
        const trial = getTrialClass(lead);

        // Pull what the class worked on that day
        const classAttendance = trial.date
          ? attendance.filter(a => a.date === trial.date && a.class_id === lead.trial_class_id)
          : [];
        const classNotes = trial.date
          ? studentNotes.filter(n => {
              const noteDate = n.date || '';
              return noteDate === trial.date && (
                n.class_name?.toLowerCase() === trial.className?.toLowerCase() ||
                (trial.teacher && n.teacher_name === trial.teacher)
              );
            })
          : [];

        const classContext = classNotes.length > 0
          ? `WHAT THE CLASS WORKED ON:\n${classNotes.slice(0, 3).map(n => `- ${n.content}`).join('\n')}`
          : trial.className ? `CLASS: ${trial.className} (${trial.style || 'dance'})` : '';

        const channel = lead.parent_phone ? 'text' : 'email';
        const { data: draft } = await base44.asServiceRole.functions.invoke('callClaudeService', {
          prompt: `You are writing a message to a family who signed up for a trial class but didn't show up. No guilt. No pressure. Just show them what they missed and make it easy to reschedule.

CONTEXT:
Child: ${lead.child_name || 'their child'}
Parent: ${lead.parent_name}
Class they missed: ${trial.className || 'trial class'}
What the class worked on: ${classContext || 'a fun dance session'}
Channel: ${channel}

RULES:
- 2-3 sentences max
- NO guilt: never "we missed you" or "sorry you couldn't make it"
- Show them something fun that happened so they feel FOMO, not shame
- Make rescheduling dead simple - "want me to save a spot for next Saturday?"
- Warm and light, zero pressure

OUTPUT:
Just the message. No explanation.
Return JSON: { "message": "the complete text message" }`,
          response_json_schema: { type: "object", properties: { message: { type: "string" } } }
        });

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id, outcome_id: convertOutcome?.id, agent: 'converter',
          action_type: lead.parent_phone ? 'sms' : 'email',
          status: 'pending_review', priority: 'medium',
          target_type: 'lead', target_id: lead.id, target_name: lead.parent_name,
          target_email: lead.parent_email, target_phone: lead.parent_phone,
          title: `No-Show: ${lead.child_name || lead.parent_name}`,
          summary: `Missed trial on ${trial.date}${trial.className ? ` in ${trial.className}` : ''}`,
          content: draft.message,
          context: {
            follow_up_type: 'no_show_value', child_name: lead.child_name,
            original_trial_date: trial.date, trial_class: trial.className,
            class_notes_available: classNotes.length
          }
        });
        results.no_show.actions++;
        results.no_show.processed++;

      } catch (err) {
        console.error(`[Converter] No-Show error for ${lead.child_name}:`, err.message);
        results.errors.push(`No-Show ${lead.child_name}: ${err.message}`);
      }
    }

    // =====================================================
    // PATH C: REASON TO COME BACK — 24-72 hours after trial
    // =====================================================
    const reasonToReturnLeads = leads.filter(l =>
      l.trial_outcome === 'attended' &&
      (l.funnel_status === 'trial_completed' || l.funnel_status === 'offer_made') &&
      l.trial_date &&
      new Date(l.trial_date) < twentyFourHoursAgo &&
      new Date(l.trial_date) >= seventyTwoHoursAgo
    );

    for (const lead of reasonToReturnLeads) {
      if (await hasPendingAction(lead.id)) continue;

      // Also skip if they already got a feel-special message (check completed/sent actions)
      const pastActions = await base44.asServiceRole.entities.GrowthAction.filter({
        studio_id, target_id: lead.id, agent: 'converter'
      });
      const alreadySent = pastActions.some(a =>
        a.context?.follow_up_type === 'reason_to_return' &&
        (a.status === 'sent' || a.status === 'completed' || a.status === 'approved')
      );
      if (alreadySent) continue;

      try {
        const trial = getTrialClass(lead);
        const childNotes = getChildNotes(lead.child_name, trial.date);

        // Find specific hooks: friends in class, available classes, skill connections
        const trialClassStudents = trial.class?.student_names || [];
        const availableClasses = classes.filter(c =>
          c.style?.toLowerCase() === trial.style?.toLowerCase() ||
          c.title?.toLowerCase().includes(trial.style?.toLowerCase() || '')
        );

        const notesSummary = childNotes.slice(0, 3).map(n => {
          const teacher = n.teacher_name || 'Teacher';
          return `${teacher}: "${n.content}"`;
        }).join('\n');

        // Build specific reason from available hooks
        const hooks = [];
        if (trialClassStudents.length > 0) hooks.push(`A connection with other students in class: ${trialClassStudents.slice(0, 3).join(', ')}`);
        if (childNotes.some(n => n.category === 'progress' || n.category === 'technique')) hooks.push(`A skill they're ready to develop: ${childNotes.find(n => n.category === 'progress' || n.category === 'technique')?.content}`);
        if (availableClasses.length > 0) hooks.push(`A class that fits: ${availableClasses.slice(0, 2).map(c => `${c.title} on ${c.day}`).join(', ')}`);
        if (lead.child_interests?.length > 0) hooks.push(`Their interests: ${lead.child_interests.join(', ')}`);
        const specificReason = hooks.join('\n') || 'Based on teacher observations from the trial';

        const channel = lead.parent_phone ? 'text' : 'email';
        const { data: draft } = await base44.asServiceRole.functions.invoke('callClaudeService', {
          prompt: `You are writing a message to a trial family giving them a specific reason their child should continue. Not a generic "we'd love to have you back" - a REAL reason tied to THIS child.

CONTEXT:
Child: ${lead.child_name}
Parent: ${lead.parent_name}
Teacher notes: ${notesSummary || 'No specific notes available'}
Specific reason: ${specificReason}
Channel: ${channel}

RULES:
- 2-4 sentences max
- The reason must be SPECIFIC to this child:
  - A skill they're ready to develop
  - A connection they made with another student
  - A class that fits their personality
  - Timing (recital coming up, session starting)
- Sound like a teacher who sees potential, not a salesperson closing a deal
- Warm and encouraging, not pressuring
- End with easy next step, not hard sell

OUTPUT:
Just the message. No explanation.
Return JSON: { "message": "the complete message", "hook_used": "brief description of the hook" }`,
          response_json_schema: { type: "object", properties: { message: { type: "string" }, hook_used: { type: "string" } } }
        });

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id, outcome_id: convertOutcome?.id, agent: 'converter',
          action_type: lead.parent_phone ? 'sms' : 'email',
          status: 'pending_review', priority: 'medium',
          target_type: 'lead', target_id: lead.id, target_name: lead.parent_name,
          target_email: lead.parent_email, target_phone: lead.parent_phone,
          title: `Reason to Return: ${lead.child_name}`,
          summary: `Hook: ${draft.hook_used || 'personalized reason'}`,
          content: draft.message,
          context: {
            follow_up_type: 'reason_to_return', child_name: lead.child_name,
            trial_date: trial.date, trial_class: trial.className,
            hook_used: draft.hook_used, notes_available: childNotes.length
          }
        });
        results.reason_to_return.actions++;
        results.reason_to_return.processed++;

      } catch (err) {
        console.error(`[Converter] Reason to Return error for ${lead.child_name}:`, err.message);
        results.errors.push(`Reason to Return ${lead.child_name}: ${err.message}`);
      }
    }

    // === LOG ===
    const totalActions = results.feel_special.actions + results.no_show.actions + results.reason_to_return.actions;
    const totalProcessed = results.feel_special.processed + results.no_show.processed + results.reason_to_return.processed;

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id, agent: 'converter', outcome_id: convertOutcome?.id,
      event_type: totalActions > 0 ? 'action' : 'research',
      summary: `Processed ${totalProcessed} trial families: ${results.feel_special.actions} feel-special, ${results.no_show.actions} no-show, ${results.reason_to_return.actions} reason-to-return (${results.feel_special.flagged_for_notes} flagged for notes)`,
      details: results
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Converter agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});