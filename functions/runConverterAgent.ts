import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONVERTER AGENT
 * Analyzes trial attendance, generates personalized follow-ups
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const studio_id = body.studio_id;
    const mode = body.mode || 'analyze';
    if (!studio_id) return Response.json({ error: 'studio_id is required' }, { status: 400 });

    const allStudios = await base44.asServiceRole.entities.Studio.list();
    const studio = allStudios.find(s => s.id === studio_id);
    if (!studio) return Response.json({ error: 'Studio not found' }, { status: 404 });

    const studioName = studio.name;
    const leads = await base44.asServiceRole.entities.Lead.filter({ studio_id });
    const attendance = await base44.asServiceRole.entities.Attendance.filter({ studio_id });
    const studentNotes = await base44.asServiceRole.entities.StudentNote.filter({ studio_id });

    const outcomes = await base44.asServiceRole.entities.GrowthOutcome.filter({ studio_id, agent: 'converter' });
    const convertOutcome = outcomes.find(o => o.name?.toLowerCase().includes('convert'));

    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const conversionsThisWeek = leads.filter(l => l.funnel_status === 'enrolled' && new Date(l.updated_date) >= weekStart).length;

    const results = { mode, studio_id, trials_analyzed: 0, actions_created: 0, errors: [] };

    // Get studio owner name
    let senderFirst = studioName.split(' ')[0];
    if (studio.owner_email) {
      const users = await base44.asServiceRole.entities.User.list();
      const owner = users.find(u => u.email === studio.owner_email);
      if (owner?.full_name && !owner.full_name.includes('@')) senderFirst = owner.full_name.split(' ')[0];
    }

    const trialCompletedNotEnrolled = leads.filter(l => l.funnel_status === 'trial_completed' || (l.funnel_status === 'offer_made' && l.trial_outcome === 'attended'));
    const noShows = leads.filter(l => l.trial_outcome === 'no_show' || (l.funnel_status === 'trial_scheduled' && l.trial_date && new Date(l.trial_date) < new Date()));
    const upcomingTrials = leads.filter(l => l.funnel_status === 'trial_scheduled' && l.trial_date && new Date(l.trial_date) >= new Date());

    if (mode === 'analyze' || mode === 'full') {
      // PATH 1: Feel Special (attended trial)
      // Fetch all classes once for trial matching
      const classes = await base44.asServiceRole.entities.DanceClass.filter({ studio_id });

      for (const lead of trialCompletedNotEnrolled.slice(0, 5)) {
        const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, target_id: lead.id, agent: 'converter', status: 'pending_review' });
        if (existingActions.length > 0) continue;

        try {
          // --- STEP 1: Pull trial data ---
          const trialClass = lead.trial_class_id 
            ? classes.find(c => c.id === lead.trial_class_id) 
            : null;
          const trialClassName = trialClass?.title || lead.teacher_notes?.match(/class:\s*(.+)/i)?.[1] || null;
          const trialTeacher = trialClass?.teacher || null;
          const trialDate = lead.trial_date || null;
          const trialStyle = trialClass?.style || trialClass?.title || null;

          // --- STEP 2: Pull attendance record for this trial ---
          const childNameLower = (lead.child_name || '').toLowerCase();
          const trialAttendance = trialDate 
            ? attendance.find(a => 
                a.student_name?.toLowerCase() === childNameLower && 
                a.date === trialDate
              ) 
            : null;

          // --- STEP 3: Pull teacher notes about this child ---
          const childNotes = studentNotes.filter(n => {
            if (n.student_name?.toLowerCase() !== childNameLower) return false;
            // Prefer notes from around the trial date, but accept any
            return true;
          });
          // Sort: notes closest to trial date first
          if (trialDate) {
            const trialTime = new Date(trialDate).getTime();
            childNotes.sort((a, b) => {
              const aDiff = Math.abs(new Date(a.date || a.created_date).getTime() - trialTime);
              const bDiff = Math.abs(new Date(b.date || b.created_date).getTime() - trialTime);
              return aDiff - bDiff;
            });
          }

          // --- STEP 4: Gate on having real observations ---
          const hasTeacherNotes = childNotes.length > 0;
          const hasLeadTeacherNotes = lead.teacher_notes && lead.teacher_notes.trim().length > 0;

          if (!hasTeacherNotes && !hasLeadTeacherNotes) {
            // Flag it — can't send a "feel special" message without something real
            console.log(`[Converter] Skipping ${lead.child_name} — no teacher notes found, flagging for teacher input`);
            await base44.asServiceRole.entities.GrowthAction.create({
              studio_id, outcome_id: convertOutcome?.id, agent: 'converter',
              action_type: 'task', status: 'pending_review', priority: 'high',
              target_type: 'lead', target_id: lead.id, target_name: lead.parent_name,
              title: `⚠️ Need teacher notes for ${lead.child_name}'s trial`,
              summary: `Trial on ${trialDate || 'unknown date'}${trialClassName ? ` in ${trialClassName}` : ''}${trialTeacher ? ` with ${trialTeacher}` : ''} — no observations recorded yet`,
              content: `${lead.child_name} completed a trial${trialClassName ? ` in ${trialClassName}` : ''}${trialTeacher ? ` with ${trialTeacher}` : ''} on ${trialDate || 'a recent date'}, but there are no teacher notes to personalize the follow-up.\n\nPlease ask ${trialTeacher || 'the teacher'} to add a quick note about ${lead.child_name}'s trial — what they noticed, any standout moments. Once that's in, the follow-up message can be drafted.`,
              context: { follow_up_type: 'needs_teacher_notes', child_name: lead.child_name, trial_date: trialDate, trial_class: trialClassName, teacher: trialTeacher }
            });
            results.trials_analyzed++;
            results.actions_created++;
            continue;
          }

          // --- STEP 5: Synthesize context for Claude ---
          const notesSummary = childNotes.slice(0, 3).map(n => {
            const teacher = n.teacher_name ? `${n.teacher_name}` : 'Teacher';
            const category = n.category && n.category !== 'general' ? ` (${n.category})` : '';
            return `${teacher}${category}: "${n.content}"`;
          }).join('\n');

          const trialContext = [
            trialClassName ? `CLASS: ${trialClassName}` : null,
            trialStyle ? `STYLE: ${trialStyle}` : null,
            trialTeacher ? `TEACHER: ${trialTeacher}` : null,
            trialDate ? `DATE: ${trialDate}` : null,
            trialAttendance?.notes ? `ATTENDANCE NOTE: ${trialAttendance.notes}` : null,
          ].filter(Boolean).join('\n');

          const allObservations = [
            notesSummary,
            hasLeadTeacherNotes ? `Lead notes: "${lead.teacher_notes}"` : null,
          ].filter(Boolean).join('\n');

          const { data: analysis } = await base44.asServiceRole.functions.invoke('callClaudeService', {
            prompt: `Write a follow-up text from ${senderFirst} at ${studioName} to ${lead.parent_name} after their kid ${lead.child_name}'s trial class.

TRIAL INFO:
${trialContext || 'Recent trial class'}

TEACHER OBSERVATIONS (use these — they're the whole point):
${allObservations}

RULES:
- Reference something SPECIFIC the teacher noticed about ${lead.child_name}. This is what makes it real.
- MAX 3-4 sentences. One clear next step (suggest enrolling or coming back).
- Sound like ${senderFirst} texting a parent, not a business.
- No formal sign-off. No URLs.
Return JSON: { "message": "the complete message" }`,
            response_json_schema: { type: "object", properties: { message: { type: "string" } } }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id, outcome_id: convertOutcome?.id, agent: 'converter',
            action_type: lead.parent_phone ? 'sms' : 'email', status: 'pending_review', priority: 'high',
            target_type: 'lead', target_id: lead.id, target_name: lead.parent_name,
            target_email: lead.parent_email, target_phone: lead.parent_phone,
            title: `Convert ${lead.child_name || lead.parent_name} - Feel Special`,
            summary: `Trial${trialClassName ? ` in ${trialClassName}` : ''}${trialTeacher ? ` with ${trialTeacher}` : ''} on ${trialDate || 'recent'} — ${childNotes.length} teacher note(s) used`,
            content: analysis.message,
            context: { 
              follow_up_type: 'feel_special', child_name: lead.child_name, trial_date: trialDate,
              trial_class: trialClassName, teacher: trialTeacher,
              notes_used: childNotes.length, had_lead_notes: hasLeadTeacherNotes
            }
          });
          results.trials_analyzed++; results.actions_created++;
        } catch (err) { console.error(`Error: ${err.message}`); results.errors.push(err.message); }
      }

      // PATH 2: No-Shows
      for (const lead of noShows.slice(0, 3)) {
        const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, target_id: lead.id, agent: 'converter', status: 'pending_review' });
        if (existingActions.length > 0) continue;

        try {
          const { data: noShowAnalysis } = await base44.asServiceRole.functions.invoke('callClaudeService', {
            prompt: `Write a casual follow-up text from ${senderFirst} at ${studioName} after ${lead.parent_name}'s family no-showed their trial on ${lead.trial_date}. Child: ${lead.child_name}. Zero guilt. Make rescheduling easy. MAX 2-3 sentences. No URLs. No sign-off.
Return JSON: { "message": "the complete text message" }`,
            response_json_schema: { type: "object", properties: { message: { type: "string" } } }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id, outcome_id: convertOutcome?.id, agent: 'converter',
            action_type: 'email', status: 'pending_review', priority: 'medium',
            target_type: 'lead', target_id: lead.id, target_name: lead.parent_name,
            target_email: lead.parent_email,
            title: `Re-engage ${lead.child_name || lead.parent_name} - No Show`,
            summary: `Missed trial on ${lead.trial_date}`, content: noShowAnalysis.message,
            context: { follow_up_type: 'no_show_value', child_name: lead.child_name, original_trial_date: lead.trial_date }
          });
          results.trials_analyzed++; results.actions_created++;
        } catch (err) { console.error(`Error: ${err.message}`); results.errors.push(err.message); }
      }

      // PATH 3: Upcoming trial prep
      for (const lead of upcomingTrials.slice(0, 3)) {
        const daysUntil = Math.ceil((new Date(lead.trial_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 1 || daysUntil > 3) continue;

        const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, target_id: lead.id, agent: 'converter', status: 'pending_review' });
        if (existingActions.length > 0) continue;

        try {
          const { data: prep } = await base44.asServiceRole.functions.invoke('callClaudeService', {
            prompt: `Write a trial-prep reminder text from ${senderFirst} at ${studioName} to ${lead.parent_name}. Child: ${lead.child_name}, trial in ${daysUntil} days. Be practical (what to wear), build excitement, confirm casually. MAX 3 sentences. No URLs. No sign-off.
Return JSON: { "message": "the complete text" }`,
            response_json_schema: { type: "object", properties: { message: { type: "string" } } }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id, outcome_id: convertOutcome?.id, agent: 'converter',
            action_type: 'sms', status: 'pending_review', priority: 'high',
            target_type: 'lead', target_id: lead.id, target_name: lead.parent_name, target_phone: lead.parent_phone,
            title: `Prep ${lead.child_name || lead.parent_name} for trial`,
            summary: `Trial in ${daysUntil} days`, content: prep.message,
            context: { follow_up_type: 'trial_prep', child_name: lead.child_name, trial_date: lead.trial_date, days_until: daysUntil }
          });
          results.trials_analyzed++; results.actions_created++;
        } catch (err) { console.error(`Error: ${err.message}`); results.errors.push(err.message); }
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id, agent: 'converter', outcome_id: convertOutcome?.id, event_type: 'action',
      summary: `Analyzed ${results.trials_analyzed} trial families, created ${results.actions_created} actions`,
      details: results
    });

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('Converter agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});