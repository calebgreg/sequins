import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONVERTER AGENT
 * Outcomes:
 * - Make 100% of trial students feel special
 * - Show value to 100% of no-shows
 * - Give 100% of trial families a reason to return
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studio_id, mode = 'analyze' } = await req.json();
    
    if (!studio_id) {
      return Response.json({ error: 'studio_id required' }, { status: 400 });
    }

    const students = await base44.entities.Student.filter({ studio_id });
    const attendance = await base44.entities.Attendance.filter({ studio_id });
    const notes = await base44.entities.StudentNote.filter({ studio_id });
    const classes = await base44.entities.DanceClass.filter({ studio_id });

    const outcomes = await base44.entities.GrowthOutcome.filter({ studio_id, agent: 'converter' });

    const trialStudents = students.filter(s => s.status === 'prospect');
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const recentAttendance = attendance.filter(a => new Date(a.date) >= lastWeek);

    const results = {
      mode,
      studio_id,
      trials_analyzed: 0,
      no_shows_found: 0,
      actions_created: 0
    };

    const trialAttendees = recentAttendance
      .filter(a => a.status === 'present')
      .filter(a => {
        const student = students.find(s => s.name === a.student_name);
        return student?.status === 'prospect';
      });

    const noShows = recentAttendance.filter(a => a.status === 'absent');

    results.trials_analyzed = trialAttendees.length;
    results.no_shows_found = noShows.length;

    if (mode === 'feel_special' || mode === 'full') {
      for (const attendanceRecord of trialAttendees.slice(0, 10)) {
        const student = students.find(s => s.name === attendanceRecord.student_name);
        if (!student) continue;

        const cls = classes.find(c => c.id === attendanceRecord.class_id);
        const studentNotes = notes.filter(n => n.student_name === student.name);

        const prompt = `You're helping a dance studio make a trial student feel special after their first class.

Student: ${student.name}, age ${student.age || 'unknown'}
Class attended: ${cls?.title || attendanceRecord.class_name}
Teacher notes: ${studentNotes.map(n => `- ${n.content}`).join('\n') || 'No specific notes yet'}

Write a follow-up message that:
1. Mentions something SPECIFIC you noticed about their child
2. Makes the child sound like they have potential
3. Invites them back with enthusiasm

Keep it under 80 words. Be specific, not generic.

Return JSON: {
  "subject": "email subject",
  "message": "the message",
  "specific_observation": "the specific thing you 'noticed'"
}`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              message: { type: "string" },
              specific_observation: { type: "string" }
            }
          }
        });

        const feelSpecialOutcome = outcomes.find(o => o.name.includes('special'));

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id,
          outcome_id: feelSpecialOutcome?.id,
          agent: 'converter',
          action_type: 'email',
          status: 'pending_review',
          priority: 'high',
          target_type: 'student',
          target_id: student.id,
          target_name: student.name,
          target_email: student.parent_email,
          title: `Make ${student.name} feel special`,
          summary: llmResponse.specific_observation,
          subject: llmResponse.subject,
          content: llmResponse.message,
          context: {
            class_attended: cls?.title,
            observation: llmResponse.specific_observation,
            outcome_type: 'feel_special'
          }
        });

        results.actions_created++;
      }
    }

    if (mode === 'no_show_value' || mode === 'full') {
      for (const noShow of noShows.slice(0, 5)) {
        const student = students.find(s => s.name === noShow.student_name);
        const cls = classes.find(c => c.id === noShow.class_id);

        const prompt = `A family missed their scheduled dance class. Write a follow-up that shows value, not guilt.

Student: ${noShow.student_name}
Missed class: ${cls?.title || noShow.class_name}

Write a message that doesn't make them feel bad, shows what they missed, and makes rescheduling easy.
Keep it under 60 words.

Return JSON: {
  "subject": "email subject",
  "message": "the message",
  "what_they_missed": "fun thing that happened"
}`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              message: { type: "string" },
              what_they_missed: { type: "string" }
            }
          }
        });

        const noShowOutcome = outcomes.find(o => o.name.includes('no-show'));

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id,
          outcome_id: noShowOutcome?.id,
          agent: 'converter',
          action_type: 'email',
          status: 'pending_review',
          priority: 'medium',
          target_type: 'student',
          target_id: student?.id,
          target_name: noShow.student_name,
          target_email: student?.parent_email,
          title: `Re-engage ${noShow.student_name} after missed class`,
          summary: llmResponse.what_they_missed,
          subject: llmResponse.subject,
          content: llmResponse.message,
          context: {
            missed_class: cls?.title,
            outcome_type: 'no_show_value'
          }
        });

        results.actions_created++;
      }
    }

    if (mode === 'reason_to_return' || mode === 'full') {
      const trialFamilies = students.filter(s => s.status === 'prospect');
      
      for (const student of trialFamilies.slice(0, 5)) {
        const studentAttendance = attendance.filter(a => a.student_name === student.name);
        const hasAttended = studentAttendance.some(a => a.status === 'present');
        
        if (!hasAttended) continue;

        const studentNotes = notes.filter(n => n.student_name === student.name);

        const prompt = `Create a compelling reason for a trial family to return and enroll.

Student: ${student.name}, age ${student.age || 'unknown'}
Teacher observations: ${studentNotes.map(n => n.content).join('; ') || 'Showed interest'}

Create a message that references their experience, paints what's next, and creates urgency without being pushy.
Keep it under 100 words.

Return JSON: {
  "subject": "email subject",
  "message": "the message",
  "hook": "the compelling reason/urgency"
}`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              message: { type: "string" },
              hook: { type: "string" }
            }
          }
        });

        const returnOutcome = outcomes.find(o => o.name.includes('return'));

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id,
          outcome_id: returnOutcome?.id,
          agent: 'converter',
          action_type: 'email',
          status: 'pending_review',
          priority: 'high',
          target_type: 'student',
          target_id: student.id,
          target_name: student.name,
          target_email: student.parent_email,
          title: `Give ${student.name} a reason to return`,
          summary: llmResponse.hook,
          subject: llmResponse.subject,
          content: llmResponse.message,
          context: { outcome_type: 'reason_to_return' }
        });

        results.actions_created++;
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'converter',
      event_type: 'draft',
      summary: `Analyzed ${results.trials_analyzed} trials, ${results.no_shows_found} no-shows, created ${results.actions_created} actions`,
      details: results
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Converter agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});