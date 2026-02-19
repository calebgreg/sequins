import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RETAINER AGENT
 * Outcome: Retain X% of families (prevent churn) + celebrate wins
 * Does: Identifies at-risk families, finds celebration opportunities
 * Two paths: At-Risk Outreach (declining attendance) + Win Celebrations
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

    // =========================================
    // STEP 1: Gather context
    // =========================================
    
    const studios = await base44.entities.Studio.filter({ id: studio_id });
    const studio = studios[0];
    
    if (!studio) {
      return Response.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    const studioName = studio.name;

    // Get all active students and families
    const students = await base44.entities.Student.filter({ studio_id, status: 'active' });
    const families = await base44.entities.Family.filter({ studio_id });
    
    // Get attendance records (last 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const attendance = await base44.entities.Attendance.filter({ studio_id });
    const recentAttendance = attendance.filter(a => new Date(a.date) >= sixtyDaysAgo);

    // Get student notes for wins
    const studentNotes = await base44.entities.StudentNote.filter({ studio_id });
    const recentNotes = studentNotes.filter(n => {
      const noteDate = new Date(n.date || n.created_date);
      return noteDate >= sixtyDaysAgo;
    });

    // Get outcome tracking
    const outcomes = await base44.entities.GrowthOutcome.filter({ 
      studio_id, 
      agent: 'retainer' 
    });
    const retainOutcome = outcomes.find(o => o.name?.toLowerCase().includes('retain'));

    const results = {
      mode,
      studio_id,
      students_analyzed: 0,
      at_risk_found: 0,
      wins_found: 0,
      actions_created: 0,
      errors: []
    };

    // =========================================
    // STEP 2: IDENTIFY AT-RISK FAMILIES
    // Declining attendance pattern
    // =========================================
    
    if (mode === 'analyze' || mode === 'at_risk' || mode === 'full') {
      console.log("Analyzing attendance patterns...");

      for (const student of students) {
        results.students_analyzed++;

        // Get this student's attendance
        const studentAttendance = recentAttendance.filter(a => 
          a.student_name === student.name
        );

        if (studentAttendance.length < 4) continue; // Need enough data

        // Calculate attendance trend (recent vs older)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentRecords = studentAttendance.filter(a => new Date(a.date) >= thirtyDaysAgo);
        const olderRecords = studentAttendance.filter(a => new Date(a.date) < thirtyDaysAgo);

        const recentRate = recentRecords.length > 0 
          ? recentRecords.filter(a => a.status === 'present').length / recentRecords.length 
          : 1;
        const olderRate = olderRecords.length > 0 
          ? olderRecords.filter(a => a.status === 'present').length / olderRecords.length 
          : 1;

        // Flag if attendance dropped significantly
        const isAtRisk = (olderRate - recentRate > 0.2) || // Dropped 20%+
                         (recentRate < 0.5) || // Under 50% recently
                         (student.attendance_alert === true);

        if (!isAtRisk) continue;

        results.at_risk_found++;

        // Check for existing action
        const existingActions = await base44.entities.GrowthAction.filter({
          studio_id,
          target_id: student.id,
          agent: 'retainer',
          status: 'pending_review'
        });
        
        if (existingActions.length > 0) continue;

        try {
          // Get family info
          const family = families.find(f => f.parent_email === student.parent_email);
          
          // Get recent notes about this student
          const notes = recentNotes.filter(n => n.student_name === student.name);

          const atRiskPrompt = `Craft a caring outreach for an at-risk dance family:

STUDENT:
- Name: ${student.name}, age ${student.age || 'unknown'}
- Level: ${student.level || 'unknown'}
- Classes: ${student.interests?.join(', ') || 'Dance'}

ATTENDANCE PATTERN:
- Recent 30 days: ${Math.round(recentRate * 100)}% attendance
- Previous 30 days: ${Math.round(olderRate * 100)}% attendance
- Pattern: ${recentRate < olderRate ? 'Declining' : 'Consistently low'}

RECENT NOTES:
${notes.length > 0 ? notes.slice(0, 3).map(n => `- ${n.content}`).join('\n') : 'No recent notes'}

PARENT: ${student.parent_name || family?.parent_name || 'Parent'}

Write a message that:
1. Shows we noticed and care (not accusatory)
2. Asks if everything is okay / if we can help
3. Reminds them of something positive about their child
4. Offers flexibility (makeup classes, different time, etc.)

Return JSON: {
  "concern_framing": "how you're framing the concern",
  "positive_reminder": "something good about the child",
  "flexibility_offer": "what flexibility you can offer",
  "message": "the full message (under 120 words)"
}`;

          const outreach = await base44.integrations.Core.InvokeLLM({
            prompt: atRiskPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                concern_framing: { type: "string" },
                positive_reminder: { type: "string" },
                flexibility_offer: { type: "string" },
                message: { type: "string" }
              }
            }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id,
            outcome_id: retainOutcome?.id,
            agent: 'retainer',
            action_type: 'email',
            status: 'pending_review',
            priority: 'high',
            target_type: 'student',
            target_id: student.id,
            target_name: student.name,
            target_email: student.parent_email,
            title: `Check in on ${student.name} - At Risk`,
            summary: `Attendance dropped from ${Math.round(olderRate * 100)}% to ${Math.round(recentRate * 100)}%`,
            content: outreach.message,
            context: {
              action_subtype: 'at_risk_outreach',
              student_name: student.name,
              recent_attendance_rate: Math.round(recentRate * 100),
              previous_attendance_rate: Math.round(olderRate * 100),
              positive_reminder: outreach.positive_reminder,
              flexibility_offer: outreach.flexibility_offer
            }
          });

          results.actions_created++;
        } catch (err) {
          console.error(`Error with at-risk ${student.name}:`, err.message);
          results.errors.push(`At-Risk ${student.name}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 3: FIND CELEBRATION OPPORTUNITIES
    // Positive notes, milestones, achievements
    // =========================================
    
    if (mode === 'analyze' || mode === 'celebrate' || mode === 'full') {
      console.log("Finding celebration opportunities...");

      // Find positive notes worth celebrating
      const positiveNotes = recentNotes.filter(n => 
        n.sentiment === 'positive' || 
        n.category === 'progress' ||
        n.content?.toLowerCase().includes('great') ||
        n.content?.toLowerCase().includes('amazing') ||
        n.content?.toLowerCase().includes('breakthrough') ||
        n.content?.toLowerCase().includes('improved')
      );

      // Group by student, take most recent per student
      const studentWins = {};
      for (const note of positiveNotes) {
        if (!studentWins[note.student_name]) {
          studentWins[note.student_name] = note;
        }
      }

      for (const [studentName, note] of Object.entries(studentWins)) {
        const student = students.find(s => s.name === studentName);
        if (!student) continue;

        results.wins_found++;

        // Check for existing celebration action
        const existingActions = await base44.entities.GrowthAction.filter({
          studio_id,
          target_id: student.id,
          agent: 'retainer',
          context: { action_subtype: 'celebration' },
          status: 'pending_review'
        });
        
        // Only one celebration per student per week
        const recentCelebrations = existingActions.filter(a => {
          const created = new Date(a.created_date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return created >= weekAgo;
        });

        if (recentCelebrations.length > 0) continue;

        try {
          const celebratePrompt = `Create a celebration message for a dance family:

STUDENT: ${student.name}, age ${student.age || 'unknown'}
PARENT: ${student.parent_name || 'Parent'}

WIN TO CELEBRATE:
"${note.content}"
- Category: ${note.category || 'general'}
- Class: ${note.class_name || 'class'}
- Teacher: ${note.teacher_name || 'Teacher'}

Write a short, genuine celebration message that:
1. Specifically mentions what the child did
2. Shows we're paying attention and care
3. Encourages them to keep going
4. Makes the parent proud

Return JSON: {
  "celebration_hook": "the specific win being celebrated",
  "parent_pride_angle": "what will make the parent proud",
  "encouragement": "how to keep the momentum",
  "message": "the full message (under 80 words)"
}`;

          const celebration = await base44.integrations.Core.InvokeLLM({
            prompt: celebratePrompt,
            response_json_schema: {
              type: "object",
              properties: {
                celebration_hook: { type: "string" },
                parent_pride_angle: { type: "string" },
                encouragement: { type: "string" },
                message: { type: "string" }
              }
            }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id,
            outcome_id: retainOutcome?.id,
            agent: 'retainer',
            action_type: 'sms',
            status: 'pending_review',
            priority: 'medium',
            target_type: 'student',
            target_id: student.id,
            target_name: student.name,
            target_phone: student.phone || families.find(f => f.parent_email === student.parent_email)?.phone,
            title: `Celebrate ${student.name}'s win!`,
            summary: celebration.celebration_hook,
            content: celebration.message,
            context: {
              action_subtype: 'celebration',
              student_name: student.name,
              note_content: note.content,
              note_id: note.id,
              teacher_name: note.teacher_name
            }
          });

          results.actions_created++;
        } catch (err) {
          console.error(`Error celebrating ${studentName}:`, err.message);
          results.errors.push(`Celebrate ${studentName}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 4: Log activity
    // =========================================
    
    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'retainer',
      outcome_id: retainOutcome?.id,
      event_type: 'action',
      summary: `Analyzed ${results.students_analyzed} students, found ${results.at_risk_found} at-risk and ${results.wins_found} wins, created ${results.actions_created} actions`,
      details: results
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Retainer agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});