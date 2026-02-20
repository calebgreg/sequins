import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * OFFERER AGENT
 * Outcome: Get X prospects to take an offer (trial, camp, open house) per week
 * Does: Matches leads/prospects to best current offer, crafts personalized invitations
 * "Offer taken" means they signed up for or attended a trial/event
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studio_id, mode = 'match' } = await req.json();
    
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

    // Get all leads and prospects
    const leads = await base44.entities.Lead.filter({ studio_id });
    const prospects = await base44.entities.Prospect?.filter({ studio_id }) || [];

    // Get current classes for trial matching
    const classes = await base44.entities.DanceClass.filter({ studio_id });

    // Get outcome tracking
    const outcomes = await base44.entities.GrowthOutcome.filter({ 
      studio_id, 
      agent: 'offerer' 
    });
    const offerOutcome = outcomes.find(o => o.name?.toLowerCase().includes('offer'));
    const weeklyTarget = offerOutcome?.target_count || 5;

    // Count this week's offers taken
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const offersThisWeek = leads.filter(l => 
      (l.funnel_status === 'trial_scheduled' || l.funnel_status === 'trial_completed') &&
      new Date(l.updated_date) >= weekStart
    ).length;

    const results = {
      mode,
      studio_id,
      weekly_target: weeklyTarget,
      current_progress: offersThisWeek,
      leads_processed: 0,
      actions_created: 0,
      errors: []
    };

    // =========================================
    // STEP 2: BUILD CURRENT OFFERS
    // What can we offer right now?
    // =========================================
    
    // Group classes by style and find trial-friendly ones
    const styleMap = {};
    for (const cls of classes) {
      if (cls.type === 'admin') continue;
      const style = cls.style || cls.title?.split(' ')[0] || 'Dance';
      if (!styleMap[style]) styleMap[style] = [];
      styleMap[style].push({
        id: cls.id,
        title: cls.title,
        day: cls.day,
        time: cls.start_time,
        spots: (cls.student_names?.length || 0) < 12 // Has room
      });
    }

    const currentOffers = [
      {
        type: 'trial_class',
        name: 'Free Trial Class',
        description: 'One free class in any style',
        urgency: 'anytime',
        available_styles: Object.keys(styleMap)
      },
      {
        type: 'open_house',
        name: 'Open House Visit',
        description: 'Tour the studio, meet teachers, see a mini demo',
        urgency: 'schedule'
      }
    ];

    // =========================================
    // STEP 3: MATCH MODE
    // Match each lead to best offer
    // =========================================
    
    if (mode === 'match' || mode === 'full') {
      console.log("Starting lead-offer matching...");

      // Filter to leads that need an offer
      const leadsNeedingOffer = leads.filter(l => 
        l.funnel_status === 'new' || l.funnel_status === 'contacted'
      );

      // Also include prospects if entity exists
      const allProspects = [...leadsNeedingOffer, ...prospects.filter(p => !p.converted_to_lead)];

      for (const lead of allProspects.slice(0, 10)) {
        // Check for existing pending action
        const existingActions = await base44.entities.GrowthAction.filter({
          studio_id,
          target_id: lead.id,
          agent: 'offerer',
          status: 'pending_review'
        });
        
        if (existingActions.length > 0) continue;

        try {
          const matchPrompt = `Match this lead to the best offer from a dance studio:

LEAD:
- Parent: ${lead.parent_name}
- Child: ${lead.child_name || 'Unknown'}
- Age: ${lead.child_age || 'Unknown'}
- Interests: ${lead.child_interests?.join(', ') || 'Not specified'}
- Source: ${lead.source} ${lead.source_detail ? `(${lead.source_detail})` : ''}
- Status: ${lead.funnel_status}
- Last Contact: ${lead.last_contact_date || 'Never'}

AVAILABLE OFFERS:
1. Free Trial Class - Available styles: ${currentOffers[0].available_styles.join(', ')}
2. Open House Visit - Tour, meet teachers, see demo

STUDIO CLASSES BY STYLE:
${Object.entries(styleMap).map(([style, classes]) => 
  `- ${style}: ${classes.filter(c => c.spots).length} classes with openings`
).join('\n')}

Decide:
1. Which offer is best for this lead?
2. Which specific class/time would be ideal (if trial)?
3. What personal hook should we use in the invitation?

Return JSON: {
  "recommended_offer": "trial_class|open_house",
  "recommended_style": "style name or null",
  "recommended_class": "class title or null",
  "personal_hook": "something specific about them to mention",
  "urgency_angle": "why they should act now",
  "confidence": "high|medium|low"
}`;

          const match = await base44.integrations.Core.InvokeLLM({
            prompt: matchPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                recommended_offer: { type: "string" },
                recommended_style: { type: "string" },
                recommended_class: { type: "string" },
                personal_hook: { type: "string" },
                urgency_angle: { type: "string" },
                confidence: { type: "string" }
              }
            }
          });

          results.leads_processed++;

          // Skip low confidence matches
          if (match.confidence === 'low') continue;

          // =========================================
          // STEP 4: DRAFT INVITATION
          // =========================================
          
          const invitePrompt = `Write a warm, personal invitation for a dance studio lead:

TO: ${lead.parent_name}
CHILD: ${lead.child_name || 'their child'}
OFFER: ${match.recommended_offer === 'trial_class' ? 'Free Trial Class' : 'Open House Visit'}
${match.recommended_style ? `STYLE: ${match.recommended_style}` : ''}
${match.recommended_class ? `CLASS: ${match.recommended_class}` : ''}

PERSONAL HOOK: ${match.personal_hook}
URGENCY: ${match.urgency_angle}
SOURCE: They found us via ${lead.source}

Write a short SMS-friendly message (under 160 chars) AND an email version (under 100 words).
Be warm and personal, not salesy. Focus on the child's experience.

Return JSON: {
  "sms": "short text message",
  "email_subject": "email subject line",
  "email_body": "email body text"
}`;

          const invitation = await base44.integrations.Core.InvokeLLM({
            prompt: invitePrompt,
            response_json_schema: {
              type: "object",
              properties: {
                sms: { type: "string" },
                email_subject: { type: "string" },
                email_body: { type: "string" }
              }
            }
          });

          // Create GrowthAction for owner review
          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id,
            outcome_id: offerOutcome?.id,
            agent: 'offerer',
            action_type: lead.parent_phone ? 'sms' : 'email',
            status: 'pending_review',
            priority: match.confidence === 'high' ? 'high' : 'medium',
            target_type: 'lead',
            target_id: lead.id,
            target_name: lead.parent_name,
            target_email: lead.parent_email,
            target_phone: lead.parent_phone,
            title: `Invite ${lead.child_name || lead.parent_name} to ${match.recommended_offer === 'trial_class' ? 'trial' : 'open house'}`,
            summary: match.personal_hook,
            subject: invitation.email_subject,
            content: lead.parent_phone ? invitation.sms : invitation.email_body,
            context: {
              child_name: lead.child_name,
              child_age: lead.child_age,
              recommended_offer: match.recommended_offer,
              recommended_style: match.recommended_style,
              recommended_class: match.recommended_class,
              urgency_angle: match.urgency_angle,
              sms_version: invitation.sms,
              email_version: invitation.email_body
            }
          });

          results.actions_created++;
        } catch (err) {
          console.error(`Error processing ${lead.parent_name}:`, err.message);
          results.errors.push(`Match ${lead.parent_name}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 5: Log activity
    // =========================================
    
    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'offerer',
      outcome_id: offerOutcome?.id,
      event_type: 'action',
      summary: `Processed ${results.leads_processed} leads, created ${results.actions_created} invitation actions`,
      details: results
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Offerer agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});