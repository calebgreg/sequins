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

          // Get owner first name
          const ownerFirstName = (() => {
            const name = user.full_name || '';
            if (name.includes('@') || name.includes('.')) return null;
            return name.split(' ')[0];
          })();
          const senderFirst = ownerFirstName || studioName.split(' ')[0];

          const analyzePrompt = `Write a follow-up text from a dance studio owner to a parent after their kid's trial class.

SENDER: ${senderFirst} from ${studioName}
PARENT: ${lead.parent_name}
CHILD: ${lead.child_name}, age ${lead.child_age || 'unknown'}
TRIAL DATE: ${lead.trial_date}
INTERESTS: ${lead.child_interests?.join(', ') || 'Dance'}
TEACHER NOTES: ${lead.teacher_notes || 'None'}
${childNotes.length > 0 ? `OBSERVATIONS:\n${childNotes.map(n => `- ${n.content}`).join('\n')}` : ''}

CRITICAL RULES:
- MAX 3-4 sentences. Text message length.
- Mention something SPECIFIC about the child — if you have teacher notes, use them. If not, be honest and brief.
- Sound like a real person, not a marketing funnel. "Hey [parent], ${senderFirst} here from ${studioName}..."
- ONE clear next step. Not "let's discuss options" — something concrete like "want me to save a spot in Tuesday's class?"
- NO "I hope this finds you well". NO corporate language.
- NO "Sincerely", no formal sign-off. It's a text.
- NO URLs or links
- If you don't have real observations about the child, don't make them up. Just say you'd love to see them back.

Return JSON: {
  "specific_observation": "what stood out about the child (or honest note if no data)",
  "belonging_message": "why they fit",
  "next_step": "concrete next action",
  "urgency_reason": "why now",
  "message": "the complete message ready to send"
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
          const noShowSender = (() => {
            const name = user.full_name || '';
            if (name.includes('@') || name.includes('.')) return null;
            return name.split(' ')[0];
          })() || studioName.split(' ')[0];

          const noShowPrompt = `Write a casual follow-up text after a family no-showed their trial class.

SENDER: ${noShowSender} from ${studioName}
PARENT: ${lead.parent_name}
CHILD: ${lead.child_name}, age ${lead.child_age || 'unknown'}
MISSED DATE: ${lead.trial_date}

CRITICAL RULES:
- MAX 2-3 sentences. 
- Zero guilt. Assume life happened. "Hey [parent], no worries about [day] — life gets crazy."
- Make rescheduling dead simple. "Just text me back and I'll grab a spot for [child]."
- NO value-add content (tips, articles, videos). That's try-hard for a no-show text.
- NO URLs, NO links
- NO formal sign-off
- Sound like a human who gets it, not a business following up on a missed appointment

Return JSON: {
  "assumption": "implied reason they missed",
  "value_offer": "n/a",
  "reschedule_ease": "how easy rescheduling is",
  "message": "the complete text message"
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