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
    
    const allStudios = await base44.entities.Studio.list();
    const studio = allStudios.find(s => s.id === studio_id);
    
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

          // Get owner first name
          const ownerFirstName = (() => {
            const name = user.full_name || '';
            if (name.includes('@') || name.includes('.')) return null;
            return name.split(' ')[0];
          })();
          const senderFirst = ownerFirstName || 'We';

          const atRiskPrompt = `Write a short check-in text from a dance studio owner to a parent whose kid has been missing class.

SENDER: ${senderFirst} (studio owner, knows this family)
PARENT: ${student.parent_name || family?.parent_name || 'there'}
CHILD: ${student.name}, age ${student.age || 'unknown'}
CLASSES: ${student.interests?.join(', ') || 'Dance'}

WHAT'S HAPPENING:
- They used to come ${Math.round(olderRate * 100)}% of the time, now it's ${Math.round(recentRate * 100)}%
${notes.length > 0 ? `RECENT TEACHER NOTES:\n${notes.slice(0, 2).map(n => `- ${n.content}`).join('\n')}` : ''}

CRITICAL RULES:
- MAX 3 sentences. This is a text message, not a letter.
- Write as ${senderFirst}, first person. "Hey [parent name], just checking in..."
- NO "I hope this message finds you well". NO "I wanted to reach out".
- Sound like a real person who genuinely misses seeing the kid
- If there's a positive note about the child, mention it naturally
- Offer to help (different time, makeup class) but keep it casual
- NO sign-off. No "Best," no "Sincerely," no name at the end. It's a text.
- NO URLs or links

Return JSON: {
  "concern_framing": "how you're framing the concern",
  "positive_reminder": "something good about the child",
  "flexibility_offer": "what flexibility you can offer",
  "message": "the full text message"
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
          // Get owner first name for celebrations
          const celebOwnerName = (() => {
            const name = user.full_name || '';
            if (name.includes('@') || name.includes('.')) return null;
            return name.split(' ')[0];
          })();
          const celebSender = celebOwnerName || note.teacher_name || 'We';

          const celebratePrompt = `Write a quick, excited text from a dance studio to a parent celebrating their kid's win.

SENDER: ${celebSender}
PARENT: ${student.parent_name || 'there'}
CHILD: ${student.name}

WHAT HAPPENED: "${note.content}"
CLASS: ${note.class_name || 'class'}
TEACHER: ${note.teacher_name || 'their teacher'}

CRITICAL RULES:
- MAX 2-3 sentences. This is a text, not a card.
- Sound genuinely excited, like you're texting a friend about their kid
- Mention the SPECIFIC thing the child did — don't be vague
- NO "I wanted to share" or "I just wanted to let you know"
- NO sign-off, no name at the end
- NO URLs or links
- Make the parent feel like their kid is seen and valued

Return JSON: {
  "celebration_hook": "the specific win",
  "parent_pride_angle": "what will make the parent proud",
  "encouragement": "momentum note",
  "message": "the full text message"
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