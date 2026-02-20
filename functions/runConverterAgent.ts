import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONVERTER AGENT
 * Outcome: Convert X trial families to enrolled per week
 * Does: Analyzes trial attendance, generates personalized follow-ups
 * Three paths: Feel Special (attended), No-Show Value, Reason to Return (didn't enroll yet)
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

    // Get leads with trial data
    const leads = await base44.entities.Lead.filter({ studio_id });
    
    // Get recent attendance for trial analysis
    const attendance = await base44.entities.Attendance.filter({ studio_id });
    
    // Get student notes for insights
    const studentNotes = await base44.entities.StudentNote.filter({ studio_id });

    // Get outcome tracking
    const outcomes = await base44.entities.GrowthOutcome.filter({ 
      studio_id, 
      agent: 'converter' 
    });
    const convertOutcome = outcomes.find(o => o.name?.toLowerCase().includes('convert'));
    const weeklyTarget = convertOutcome?.target_count || 3;

    // Count this week's conversions
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const conversionsThisWeek = leads.filter(l => 
      l.funnel_status === 'enrolled' &&
      new Date(l.updated_date) >= weekStart
    ).length;

    const results = {
      mode,
      studio_id,
      weekly_target: weeklyTarget,
      current_progress: conversionsThisWeek,
      trials_analyzed: 0,
      actions_created: 0,
      errors: []
    };

    // =========================================
    // STEP 2: CATEGORIZE TRIAL FAMILIES
    // =========================================
    
    // Trial completed but not enrolled
    const trialCompletedNotEnrolled = leads.filter(l => 
      l.funnel_status === 'trial_completed' || 
      (l.funnel_status === 'offer_made' && l.trial_outcome === 'attended')
    );

    // Trial scheduled but no-showed
    const noShows = leads.filter(l => 
      l.trial_outcome === 'no_show' ||
      (l.funnel_status === 'trial_scheduled' && l.trial_date && new Date(l.trial_date) < new Date())
    );

    // Trial scheduled for future (prep them)
    const upcomingTrials = leads.filter(l => 
      l.funnel_status === 'trial_scheduled' && 
      l.trial_date && 
      new Date(l.trial_date) >= new Date()
    );

    // =========================================
    // STEP 3: ANALYZE & CREATE ACTIONS
    // =========================================
    
    if (mode === 'analyze' || mode === 'full') {
      console.log("Analyzing trial families...");

      // --- PATH 1: FEEL SPECIAL (attended trial) ---
      for (const lead of trialCompletedNotEnrolled.slice(0, 5)) {
        const existingActions = await base44.entities.GrowthAction.filter({
          studio_id,
          target_id: lead.id,
          agent: 'converter',
          status: 'pending_review'
        });
        
        if (existingActions.length > 0) continue;

        try {
          // Look for notes about this child from trial
          const childNotes = studentNotes.filter(n => 
            n.student_name?.toLowerCase() === lead.child_name?.toLowerCase()
          );

          const analyzePrompt = `Analyze this trial family and craft a "feel special" follow-up:

FAMILY:
- Parent: ${lead.parent_name}
- Child: ${lead.child_name}, age ${lead.child_age || 'unknown'}
- Trial Date: ${lead.trial_date}
- Trial Class: ${lead.trial_class_id || 'Unknown class'}
- Teacher Notes: ${lead.teacher_notes || 'None recorded'}
- Interest: ${lead.child_interests?.join(', ') || 'Dance'}

NOTES ABOUT THIS CHILD:
${childNotes.length > 0 ? childNotes.map(n => `- ${n.content}`).join('\n') : 'No notes yet'}

Create a personalized follow-up that:
1. Mentions something SPECIFIC about the child's trial experience
2. Makes them feel like they belong here
3. Creates gentle urgency without pressure
4. Suggests a clear next step

Return JSON: {
  "specific_observation": "something the child did that stood out",
  "belonging_message": "why they fit here",
  "next_step": "what you want them to do",
  "urgency_reason": "why now is good",
  "message": "the full follow-up message (under 150 words)"
}`;

          const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: analyzePrompt,
            response_json_schema: {
              type: "object",
              properties: {
                specific_observation: { type: "string" },
                belonging_message: { type: "string" },
                next_step: { type: "string" },
                urgency_reason: { type: "string" },
                message: { type: "string" }
              }
            }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id,
            outcome_id: convertOutcome?.id,
            agent: 'converter',
            action_type: lead.parent_phone ? 'sms' : 'email',
            status: 'pending_review',
            priority: 'high',
            target_type: 'lead',
            target_id: lead.id,
            target_name: lead.parent_name,
            target_email: lead.parent_email,
            target_phone: lead.parent_phone,
            title: `Convert ${lead.child_name || lead.parent_name} - Feel Special`,
            summary: analysis.specific_observation,
            content: analysis.message,
            context: {
              follow_up_type: 'feel_special',
              child_name: lead.child_name,
              trial_date: lead.trial_date,
              specific_observation: analysis.specific_observation,
              next_step: analysis.next_step
            }
          });

          results.trials_analyzed++;
          results.actions_created++;
        } catch (err) {
          console.error(`Error analyzing ${lead.parent_name}:`, err.message);
          results.errors.push(`Feel Special ${lead.parent_name}: ${err.message}`);
        }
      }

      // --- PATH 2: NO-SHOW VALUE ---
      for (const lead of noShows.slice(0, 3)) {
        const existingActions = await base44.entities.GrowthAction.filter({
          studio_id,
          target_id: lead.id,
          agent: 'converter',
          status: 'pending_review'
        });
        
        if (existingActions.length > 0) continue;

        try {
          const noShowPrompt = `Craft a no-show follow-up for a trial family:

FAMILY:
- Parent: ${lead.parent_name}
- Child: ${lead.child_name}, age ${lead.child_age || 'unknown'}
- Scheduled Trial: ${lead.trial_date}
- Interest: ${lead.child_interests?.join(', ') || 'Dance'}

Write a message that:
1. Assumes life got busy (no guilt)
2. Offers easy rescheduling
3. Shares something valuable (tip, video, article) about dance for kids
4. Keeps the door open

Return JSON: {
  "assumption": "why they might have missed",
  "value_offer": "something helpful you're sharing",
  "reschedule_ease": "how easy it is to reschedule",
  "message": "the full message (under 100 words)"
}`;

          const noShowAnalysis = await base44.integrations.Core.InvokeLLM({
            prompt: noShowPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                assumption: { type: "string" },
                value_offer: { type: "string" },
                reschedule_ease: { type: "string" },
                message: { type: "string" }
              }
            }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id,
            outcome_id: convertOutcome?.id,
            agent: 'converter',
            action_type: 'email',
            status: 'pending_review',
            priority: 'medium',
            target_type: 'lead',
            target_id: lead.id,
            target_name: lead.parent_name,
            target_email: lead.parent_email,
            title: `Re-engage ${lead.child_name || lead.parent_name} - No Show`,
            summary: `Missed trial on ${lead.trial_date}`,
            content: noShowAnalysis.message,
            context: {
              follow_up_type: 'no_show_value',
              child_name: lead.child_name,
              original_trial_date: lead.trial_date,
              value_offer: noShowAnalysis.value_offer
            }
          });

          results.trials_analyzed++;
          results.actions_created++;
        } catch (err) {
          console.error(`Error with no-show ${lead.parent_name}:`, err.message);
          results.errors.push(`No-Show ${lead.parent_name}: ${err.message}`);
        }
      }

      // --- PATH 3: PREP UPCOMING TRIALS ---
      for (const lead of upcomingTrials.slice(0, 3)) {
        const trialDate = new Date(lead.trial_date);
        const daysUntil = Math.ceil((trialDate - new Date()) / (1000 * 60 * 60 * 24));
        
        // Only prep if trial is 1-3 days away
        if (daysUntil < 1 || daysUntil > 3) continue;

        const existingActions = await base44.entities.GrowthAction.filter({
          studio_id,
          target_id: lead.id,
          agent: 'converter',
          action_type: 'prep',
          status: 'pending_review'
        });
        
        if (existingActions.length > 0) continue;

        try {
          const prepPrompt = `Create a trial prep message to reduce no-shows:

FAMILY:
- Parent: ${lead.parent_name}
- Child: ${lead.child_name}, age ${lead.child_age || 'unknown'}
- Trial Date: ${lead.trial_date} (${daysUntil} days away)
- Interest: ${lead.child_interests?.join(', ') || 'Dance'}

Write a friendly reminder that:
1. Builds excitement for the child
2. Gives practical info (what to wear, where to park)
3. Reduces anxiety for first-timers
4. Confirms they're coming

Return JSON: {
  "excitement_builder": "something to get the child excited",
  "practical_tip": "what to bring/wear",
  "anxiety_reducer": "something reassuring",
  "message": "the full message (under 100 words)"
}`;

          const prep = await base44.integrations.Core.InvokeLLM({
            prompt: prepPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                excitement_builder: { type: "string" },
                practical_tip: { type: "string" },
                anxiety_reducer: { type: "string" },
                message: { type: "string" }
              }
            }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id,
            outcome_id: convertOutcome?.id,
            agent: 'converter',
            action_type: 'sms',
            status: 'pending_review',
            priority: 'high',
            target_type: 'lead',
            target_id: lead.id,
            target_name: lead.parent_name,
            target_phone: lead.parent_phone,
            title: `Prep ${lead.child_name || lead.parent_name} for trial`,
            summary: `Trial in ${daysUntil} days - reduce no-show risk`,
            content: prep.message,
            context: {
              follow_up_type: 'trial_prep',
              child_name: lead.child_name,
              trial_date: lead.trial_date,
              days_until: daysUntil
            }
          });

          results.trials_analyzed++;
          results.actions_created++;
        } catch (err) {
          console.error(`Error prepping ${lead.parent_name}:`, err.message);
          results.errors.push(`Prep ${lead.parent_name}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 4: Log activity
    // =========================================
    
    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'converter',
      outcome_id: convertOutcome?.id,
      event_type: 'action',
      summary: `Analyzed ${results.trials_analyzed} trial families, created ${results.actions_created} conversion actions`,
      details: results
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Converter agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});