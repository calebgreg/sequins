import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RETAINER AGENT
 * Outcome: Retain X% of families (prevent churn) + celebrate wins
 * Does: Identifies at-risk families, finds celebration opportunities
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
    const students = await base44.asServiceRole.entities.Student.filter({ studio_id, status: 'active' });
    const families = await base44.asServiceRole.entities.Family.filter({ studio_id });

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const attendance = await base44.asServiceRole.entities.Attendance.filter({ studio_id });
    const recentAttendance = attendance.filter(a => new Date(a.date) >= sixtyDaysAgo);

    const studentNotes = await base44.asServiceRole.entities.StudentNote.filter({ studio_id });
    const recentNotes = studentNotes.filter(n => {
      const noteDate = new Date(n.date || n.created_date);
      return noteDate >= sixtyDaysAgo;
    });

    const outcomes = await base44.asServiceRole.entities.GrowthOutcome.filter({ studio_id, agent: 'retainer' });
    const retainOutcome = outcomes.find(o => o.name?.toLowerCase().includes('retain'));

    const results = { mode, studio_id, students_analyzed: 0, at_risk_found: 0, wins_found: 0, actions_created: 0, errors: [] };

    // Get studio owner name
    let senderFirst = studioName.split(' ')[0];
    if (studio.owner_email) {
      const users = await base44.asServiceRole.entities.User.list();
      const owner = users.find(u => u.email === studio.owner_email);
      if (owner?.full_name && !owner.full_name.includes('@') && !owner.full_name.includes('.')) {
        senderFirst = owner.full_name.split(' ')[0];
      }
    }

    // AT-RISK FAMILIES
    if (mode === 'analyze' || mode === 'at_risk' || mode === 'full') {
      for (const student of students) {
        results.students_analyzed++;
        const studentAttendance = recentAttendance.filter(a => a.student_name === student.name);
        if (studentAttendance.length < 4) continue;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentRecords = studentAttendance.filter(a => new Date(a.date) >= thirtyDaysAgo);
        const olderRecords = studentAttendance.filter(a => new Date(a.date) < thirtyDaysAgo);
        const recentRate = recentRecords.length > 0 ? recentRecords.filter(a => a.status === 'present').length / recentRecords.length : 1;
        const olderRate = olderRecords.length > 0 ? olderRecords.filter(a => a.status === 'present').length / olderRecords.length : 1;
        const isAtRisk = (olderRate - recentRate > 0.2) || (recentRate < 0.5) || (student.attendance_alert === true);
        if (!isAtRisk) continue;

        results.at_risk_found++;
        const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, target_id: student.id, agent: 'retainer', status: 'pending_review' });
        if (existingActions.length > 0) continue;

        try {
          const family = families.find(f => f.parent_email === student.parent_email);
          const notes = recentNotes.filter(n => n.student_name === student.name);

          const outreach = await base44.asServiceRole.functions.invoke('callClaudeService', {
            prompt: `Write a short check-in text from a dance studio owner to a parent whose kid has been missing class.
SENDER: ${senderFirst} (studio owner)
PARENT: ${student.parent_name || family?.parent_name || 'there'}
CHILD: ${student.name}, age ${student.age || 'unknown'}
CLASSES: ${student.interests?.join(', ') || 'Dance'}
They used to come ${Math.round(olderRate * 100)}% of the time, now it's ${Math.round(recentRate * 100)}%
${notes.length > 0 ? `RECENT TEACHER NOTES:\n${notes.slice(0, 2).map(n => `- ${n.content}`).join('\n')}` : ''}
MAX 3 sentences. Sound like a real person. No formal sign-off. No URLs.
Return JSON: { "message": "the full text message" }`,
            response_json_schema: { type: "object", properties: { message: { type: "string" } } }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id, outcome_id: retainOutcome?.id, agent: 'retainer', action_type: 'email',
            status: 'pending_review', priority: 'high', target_type: 'student', target_id: student.id,
            target_name: student.name, target_email: student.parent_email,
            title: `Check in on ${student.name} - At Risk`,
            summary: `Attendance dropped from ${Math.round(olderRate * 100)}% to ${Math.round(recentRate * 100)}%`,
            content: outreach.message,
            context: { action_subtype: 'at_risk_outreach', student_name: student.name, recent_attendance_rate: Math.round(recentRate * 100), previous_attendance_rate: Math.round(olderRate * 100) }
          });
          results.actions_created++;
        } catch (err) {
          console.error(`Error with at-risk ${student.name}:`, err.message);
          results.errors.push(`At-Risk ${student.name}: ${err.message}`);
        }
      }
    }

    // CELEBRATION OPPORTUNITIES
    if (mode === 'analyze' || mode === 'celebrate' || mode === 'full') {
      const positiveNotes = recentNotes.filter(n =>
        n.sentiment === 'positive' || n.category === 'progress' ||
        n.content?.toLowerCase().includes('great') || n.content?.toLowerCase().includes('amazing') ||
        n.content?.toLowerCase().includes('breakthrough') || n.content?.toLowerCase().includes('improved')
      );

      const studentWins = {};
      for (const note of positiveNotes) {
        if (!studentWins[note.student_name]) studentWins[note.student_name] = note;
      }

      for (const [studentName, note] of Object.entries(studentWins)) {
        const student = students.find(s => s.name === studentName);
        if (!student) continue;
        results.wins_found++;

        const existingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, target_id: student.id, agent: 'retainer', status: 'pending_review' });
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        if (existingActions.filter(a => new Date(a.created_date) >= weekAgo).length > 0) continue;

        try {
          const celebration = await base44.asServiceRole.functions.invoke('callClaudeService', {
            prompt: `Write a quick, excited text from a dance studio to a parent celebrating their kid's win.
SENDER: ${senderFirst}
PARENT: ${student.parent_name || 'there'}
CHILD: ${student.name}
WHAT HAPPENED: "${note.content}"
CLASS: ${note.class_name || 'class'}
MAX 2-3 sentences. Sound genuinely excited. No formal sign-off. No URLs.
Return JSON: { "message": "the full text message" }`,
            response_json_schema: { type: "object", properties: { message: { type: "string" } } }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id, outcome_id: retainOutcome?.id, agent: 'retainer', action_type: 'sms',
            status: 'pending_review', priority: 'medium', target_type: 'student', target_id: student.id,
            target_name: student.name, target_phone: student.phone || families.find(f => f.parent_email === student.parent_email)?.phone,
            title: `Celebrate ${student.name}'s win!`, summary: note.content?.slice(0, 100),
            content: celebration.message,
            context: { action_subtype: 'celebration', student_name: student.name, note_content: note.content, note_id: note.id, teacher_name: note.teacher_name }
          });
          results.actions_created++;
        } catch (err) {
          console.error(`Error celebrating ${studentName}:`, err.message);
          results.errors.push(`Celebrate ${studentName}: ${err.message}`);
        }
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id, agent: 'retainer', outcome_id: retainOutcome?.id, event_type: 'action',
      summary: `Analyzed ${results.students_analyzed} students, found ${results.at_risk_found} at-risk and ${results.wins_found} wins, created ${results.actions_created} actions`,
      details: results
    });

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('Retainer agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});