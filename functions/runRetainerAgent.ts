import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RETAINER AGENT
 * Outcomes:
 * - Make X at-risk families feel seen per week
 * - Celebrate X student wins per week
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
    const families = await base44.entities.Family.filter({ studio_id });

    const outcomes = await base44.entities.GrowthOutcome.filter({ studio_id, agent: 'retainer' });
    const atRiskOutcome = outcomes.find(o => o.name.includes('at-risk'));
    const celebrateOutcome = outcomes.find(o => o.name.includes('Celebrate') || o.name.includes('win'));

    const results = {
      mode,
      studio_id,
      at_risk_found: 0,
      wins_found: 0,
      actions_created: 0
    };

    const studentAttendanceMap = {};
    const activeStudents = students.filter(s => s.status === 'active');

    for (const student of activeStudents) {
      const studentAttendance = attendance.filter(a => a.student_name === student.name);
      const last30Days = studentAttendance.filter(a => {
        const date = new Date(a.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return date >= thirtyDaysAgo;
      });

      const present = last30Days.filter(a => a.status === 'present').length;
      const total = last30Days.length;
      const rate = total > 0 ? (present / total) * 100 : 100;

      const last14Days = last30Days.filter(a => {
        const date = new Date(a.date);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        return date >= fourteenDaysAgo;
      });
      const recentRate = last14Days.length > 0 
        ? (last14Days.filter(a => a.status === 'present').length / last14Days.length) * 100 
        : 100;

      studentAttendanceMap[student.name] = {
        student,
        attendanceRate: rate,
        recentRate,
        isAtRisk: rate < 70 || (recentRate < rate - 20),
        isDeclining: recentRate < rate - 20
      };
    }

    if (mode === 'at_risk' || mode === 'full') {
      const atRiskStudents = Object.values(studentAttendanceMap)
        .filter(data => data.isAtRisk)
        .sort((a, b) => a.attendanceRate - b.attendanceRate);

      for (const data of atRiskStudents.slice(0, 5)) {
        const { student, attendanceRate, isDeclining } = data;
        const family = families.find(f => f.parent_email === student.parent_email);

        const prompt = `A student's attendance has dropped. Help the studio reach out with care, not guilt.

Student: ${student.name}, age ${student.age || 'unknown'}
Attendance rate: ${attendanceRate.toFixed(0)}%
Pattern: ${isDeclining ? 'Recent decline' : 'Consistently low'}

Write a caring check-in that shows you care, asks if everything is okay, and makes it easy to reconnect.
Be warm and genuine. Don't mention specific attendance numbers.
Keep it under 80 words.

Return JSON: {
  "subject": "email subject",
  "message": "the message",
  "care_angle": "how you're showing you care"
}`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              message: { type: "string" },
              care_angle: { type: "string" }
            }
          }
        });

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id,
          outcome_id: atRiskOutcome?.id,
          agent: 'retainer',
          action_type: 'email',
          status: 'pending_review',
          priority: isDeclining ? 'high' : 'medium',
          target_type: 'family',
          target_id: family?.id || student.id,
          target_name: student.name,
          target_email: student.parent_email,
          title: `Check in on ${student.name}`,
          summary: `Attendance at ${attendanceRate.toFixed(0)}% - ${isDeclining ? 'declining' : 'low'}`,
          subject: llmResponse.subject,
          content: llmResponse.message,
          context: {
            attendance_rate: attendanceRate,
            is_declining: isDeclining,
            outcome_type: 'at_risk'
          }
        });

        results.at_risk_found++;
        results.actions_created++;
      }
    }

    if (mode === 'celebrate' || mode === 'full') {
      const studentsWithWins = [];
      
      for (const student of activeStudents) {
        const positiveNotes = notes
          .filter(n => n.student_name === student.name && n.sentiment === 'positive')
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        const recentPositive = positiveNotes.find(n => {
          const d = new Date(n.date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return d >= weekAgo;
        });

        if (recentPositive) {
          studentsWithWins.push({ student, wins: [recentPositive] });
        }
      }

      // Also check for attendance streaks
      for (const student of activeStudents) {
        const studentAttendance = attendance
          .filter(a => a.student_name === student.name)
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        let streak = 0;
        for (const record of studentAttendance) {
          if (record.status === 'present') streak++;
          else break;
        }

        if (streak >= 4) {
          const existing = studentsWithWins.find(w => w.student.id === student.id);
          if (existing) {
            existing.streak = streak;
          } else {
            studentsWithWins.push({ student, wins: [], streak });
          }
        }
      }

      for (const data of studentsWithWins.slice(0, 5)) {
        const { student, wins, streak } = data;

        const prompt = `Celebrate a student's win with their family!

Student: ${student.name}, age ${student.age || 'unknown'}
${wins.length > 0 ? `Recent teacher observations: ${wins.map(w => w.content).join('; ')}` : ''}
${streak ? `Attendance streak: ${streak} classes in a row!` : ''}

Write a celebration message that highlights something specific and makes the parent proud.
Keep it under 70 words.

Return JSON: {
  "subject": "email subject",
  "message": "the message",
  "win_highlighted": "what you're celebrating"
}`;

        const llmResponse = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              message: { type: "string" },
              win_highlighted: { type: "string" }
            }
          }
        });

        await base44.asServiceRole.entities.GrowthAction.create({
          studio_id,
          outcome_id: celebrateOutcome?.id,
          agent: 'retainer',
          action_type: 'email',
          status: 'pending_review',
          priority: 'medium',
          target_type: 'student',
          target_id: student.id,
          target_name: student.name,
          target_email: student.parent_email,
          title: `Celebrate ${student.name}'s win`,
          summary: llmResponse.win_highlighted,
          subject: llmResponse.subject,
          content: llmResponse.message,
          context: {
            win_type: streak ? 'attendance_streak' : 'teacher_observation',
            streak: streak,
            outcome_type: 'celebrate'
          }
        });

        results.wins_found++;
        results.actions_created++;
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'retainer',
      event_type: 'draft',
      summary: `Found ${results.at_risk_found} at-risk, ${results.wins_found} wins, created ${results.actions_created} actions`,
      details: results
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Retainer agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});