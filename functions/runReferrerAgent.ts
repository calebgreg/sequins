import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REFERRER AGENT
 * Outcome: Generate X referrals per month (outbound to partners, shareable moments)
 * Does: Matches family needs to partner offerings, identifies shareable moments
 * Two paths: Outbound Referrals (to partners) + Shareable Moments (generate word-of-mouth)
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
    
    const studios = await base44.entities.Studio.filter({ id: studio_id });
    const studio = studios[0];
    
    if (!studio) {
      return Response.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    const studioName = studio.name;

    // Get partners with referral data
    const partners = await base44.entities.Partner.filter({ studio_id });
    const activePartners = partners.filter(p => 
      p.status === 'connected' || p.status === 'active_partner'
    );

    // Get families and students
    const families = await base44.entities.Family.filter({ studio_id });
    const students = await base44.entities.Student.filter({ studio_id, status: 'active' });

    // Get recent notes for shareable moments
    const studentNotes = await base44.entities.StudentNote.filter({ studio_id });
    const recentNotes = studentNotes.filter(n => {
      const noteDate = new Date(n.date || n.created_date);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      return noteDate >= twoWeeksAgo;
    });

    // Get existing referrals
    const referrals = await base44.entities.Referral.filter({ studio_id });

    // Get outcome tracking
    const outcomes = await base44.entities.GrowthOutcome.filter({ 
      studio_id, 
      agent: 'referrer' 
    });
    const referOutcome = outcomes.find(o => o.name?.toLowerCase().includes('refer'));
    const monthlyTarget = referOutcome?.target_count || 4;

    // Count this month's referrals
    const monthStart = new Date();
    monthStart.setDate(1);
    
    const referralsThisMonth = referrals.filter(r => 
      new Date(r.referral_date) >= monthStart
    ).length;

    const results = {
      mode,
      studio_id,
      monthly_target: monthlyTarget,
      current_progress: referralsThisMonth,
      matches_found: 0,
      moments_found: 0,
      actions_created: 0,
      errors: []
    };

    // =========================================
    // STEP 2: MATCH FAMILIES TO PARTNERS
    // Find referral opportunities
    // =========================================
    
    if (mode === 'match' || mode === 'full') {
      console.log("Matching families to partner services...");

      // Partners we "owe" referrals to (negative balance = they've sent us more)
      const partnersOwed = activePartners
        .filter(p => (p.referral_balance || 0) < 0)
        .sort((a, b) => (a.referral_balance || 0) - (b.referral_balance || 0));

      for (const partner of partnersOwed.slice(0, 3)) {
        try {
          // Find families who might need this partner's services
          const matchPrompt = `Match families to this partner's services:

PARTNER:
- Name: ${partner.name}
- Type: ${partner.category}
- Services: ${partner.category === 'pediatrician' ? 'pediatric healthcare' : 
             partner.category === 'salon' ? 'hair styling, kids haircuts' :
             partner.category === 'gym' ? 'fitness, family activities' :
             partner.category === 'daycare' ? 'childcare, preschool' :
             'family services'}

FAMILIES (sample):
${families.slice(0, 10).map(f => {
  const familyStudents = students.filter(s => s.parent_email === f.parent_email);
  return `- ${f.parent_name}: ${familyStudents.map(s => `${s.name} (${s.age || '?'})`).join(', ')}`;
}).join('\n')}

Which families might genuinely benefit from this partner's services?
Consider: age of children, likely needs, good fit.

Return JSON: {
  "recommended_families": [
    {
      "parent_name": "name",
      "reason": "why this family would benefit",
      "talking_point": "what to say when recommending"
    }
  ]
}`;

          const matches = await base44.integrations.Core.InvokeLLM({
            prompt: matchPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                recommended_families: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      parent_name: { type: "string" },
                      reason: { type: "string" },
                      talking_point: { type: "string" }
                    }
                  }
                }
              }
            }
          });

          for (const match of matches.recommended_families?.slice(0, 2) || []) {
            const family = families.find(f => 
              f.parent_name?.toLowerCase().includes(match.parent_name?.toLowerCase())
            );
            if (!family) continue;

            results.matches_found++;

            // Check for existing referral action
            const existingActions = await base44.entities.GrowthAction.filter({
              studio_id,
              agent: 'referrer',
              target_id: family.id,
              status: 'pending_review'
            });
            
            if (existingActions.length > 0) continue;

            await base44.asServiceRole.entities.GrowthAction.create({
              studio_id,
              outcome_id: referOutcome?.id,
              agent: 'referrer',
              action_type: 'referral_out',
              status: 'pending_review',
              priority: 'medium',
              target_type: 'family',
              target_id: family.id,
              target_name: family.parent_name,
              title: `Refer ${family.parent_name} to ${partner.name}`,
              summary: match.reason,
              content: match.talking_point,
              context: {
                action_subtype: 'outbound_referral',
                partner_id: partner.id,
                partner_name: partner.name,
                partner_type: partner.category,
                referral_balance: partner.referral_balance,
                talking_point: match.talking_point
              }
            });

            results.actions_created++;
          }
        } catch (err) {
          console.error(`Error matching for ${partner.name}:`, err.message);
          results.errors.push(`Match ${partner.name}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 3: IDENTIFY SHAREABLE MOMENTS
    // Find content worth sharing (generates word-of-mouth)
    // =========================================
    
    if (mode === 'moments' || mode === 'full') {
      console.log("Finding shareable moments...");

      // Find exceptional notes worth celebrating publicly
      const shareableNotes = recentNotes.filter(n => 
        n.sentiment === 'positive' &&
        (n.content?.length > 30) && // Substantive note
        (n.content?.toLowerCase().includes('first') ||
         n.content?.toLowerCase().includes('amazing') ||
         n.content?.toLowerCase().includes('breakthrough') ||
         n.content?.toLowerCase().includes('nailed') ||
         n.content?.toLowerCase().includes('beautiful'))
      );

      for (const note of shareableNotes.slice(0, 3)) {
        const student = students.find(s => s.name === note.student_name);
        if (!student) continue;

        results.moments_found++;

        // Check for existing shareable moment action
        const existingActions = await base44.entities.GrowthAction.filter({
          studio_id,
          agent: 'referrer',
          target_id: note.id,
          status: 'pending_review'
        });
        
        if (existingActions.length > 0) continue;

        try {
          const momentPrompt = `Create a shareable moment from this dance achievement:

STUDENT: ${student.name} (first name only for privacy)
ACHIEVEMENT: "${note.content}"
CLASS: ${note.class_name || 'dance class'}
TEACHER: ${note.teacher_name || 'their teacher'}

Create:
1. A parent-friendly message celebrating this moment
2. Suggest how they can share (social media, tell friends)
3. A subtle ask for referrals

Return JSON: {
  "celebration_message": "message to the parent (under 80 words)",
  "share_suggestion": "how they might share this",
  "referral_nudge": "gentle referral ask",
  "social_caption": "optional caption if they want to post"
}`;

          const moment = await base44.integrations.Core.InvokeLLM({
            prompt: momentPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                celebration_message: { type: "string" },
                share_suggestion: { type: "string" },
                referral_nudge: { type: "string" },
                social_caption: { type: "string" }
              }
            }
          });

          await base44.asServiceRole.entities.GrowthAction.create({
            studio_id,
            outcome_id: referOutcome?.id,
            agent: 'referrer',
            action_type: 'shareable_moment',
            status: 'pending_review',
            priority: 'low',
            target_type: 'note',
            target_id: note.id,
            target_name: student.name,
            target_email: student.parent_email,
            title: `Share ${student.name}'s moment`,
            summary: note.content?.slice(0, 100),
            content: moment.celebration_message,
            context: {
              action_subtype: 'shareable_moment',
              student_id: student.id,
              student_name: student.name,
              note_content: note.content,
              share_suggestion: moment.share_suggestion,
              referral_nudge: moment.referral_nudge,
              social_caption: moment.social_caption
            }
          });

          results.actions_created++;
        } catch (err) {
          console.error(`Error creating moment for ${student.name}:`, err.message);
          results.errors.push(`Moment ${student.name}: ${err.message}`);
        }
      }
    }

    // =========================================
    // STEP 4: Log activity
    // =========================================
    
    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'referrer',
      outcome_id: referOutcome?.id,
      event_type: 'action',
      summary: `Found ${results.matches_found} referral matches, ${results.moments_found} shareable moments, created ${results.actions_created} actions`,
      details: results
    });

    return Response.json({ success: true, ...results });

  } catch (error) {
    console.error('Referrer agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});