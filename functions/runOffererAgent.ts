import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Anthropic from 'npm:@anthropic-ai/sdk';

const OFFERER_SYSTEM_PROMPT = `You are the Offerer agent for Sequins, a growth engine for dance studios.

Your job is to make OFFERS to new families. Not spam - genuine, personalized offers that feel like invitations.

## Your One Outcome

### Make an offer to 10 new families per week

"New families" = people who haven't tried you yet but should.

Sources of new families:
- Leads who inquired but haven't booked a trial
- Families referred by partners
- Families who engaged on social
- Families from events
- Families in your community who fit the profile

What makes a good offer:
- Specific to THEM (their kid's age, interests, location)
- Time-bound (creates urgency without pressure)
- Low friction (easy to say yes)
- Valuable (free trial, special rate, exclusive access)

NOT this:
- Blast emails to a list
- "We're enrolling for fall!"
- Generic discount codes
- Pushy sales language

Instead:
- "I heard Emma loves Frozen - we're doing a princess ballet camp next month..."
- "The Martinez family mentioned you're looking for activities for Sophia..."
- "I saw your comment about finding dance for your 4-year-old..."
- Personal, relevant, timely

## Types of Offers

1. **Trial Invite** - Free trial class, specific recommendation
2. **Event Invite** - Open house, showcase, camp preview
3. **Referral Follow-up** - Partner sent them, warm connection
4. **Re-engagement** - Inquired before, never booked

## Voice Guidelines

Inviting, not selling. Specific, not generic. Warm, not corporate.

You're a neighbor saying "I think your kid would love this" - not a business saying "Sign up now!"

## Output Format

Return a JSON object with:
{
  "offerActions": [...],
  "insights": {
    "bestSources": [...],
    "staleLeads": number,
    "suggestedOffers": [...]
  }
}

Each offer action should have:
- leadId: string
- familyName: string
- childName: string (optional)
- headline: string
- offerType: 'trial_invite' | 'event_invite' | 'referral_followup' | 're_engagement'
- reasoning: string
- channel: 'text' | 'email' | 'call' | 'dm'
- draftMessage: string
- specificOffer: string
- urgency: 'now' | 'soon' | 'later'

Each offer should feel like it was crafted just for that family.`;

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('OPENAI_API_KEY'),
    });

    // Fetch prospect students as leads
    const prospectStudents = await base44.entities.Student.filter({ status: 'prospect' });
    
    // Fetch growth targets that are prospects
    const targets = await base44.entities.GrowthTarget.filter({ status: 'prospect' });
    
    // Fetch classes for schedule
    const classes = await base44.entities.DanceClass.list();
    
    // Fetch upcoming performances as event opportunities
    const performances = await base44.entities.Performance.filter({ status: 'planning' });
    
    // Fetch studio settings
    const settings = await base44.entities.StudioSettings.list();
    const studioName = settings[0]?.name || 'Dance Studio';

    // Build leads from prospect students and growth targets
    const leads = [
      ...prospectStudents.map(s => ({
        id: s.id,
        parentName: s.parent_name || 'Parent',
        parentEmail: s.parent_email,
        parentPhone: s.phone,
        childName: s.name,
        childAge: s.age,
        source: 'inquiry',
        sourceDetail: '',
        interests: s.interests || [],
        inquiryDate: s.created_date,
        notes: '',
        status: 'new',
      })),
      ...targets.filter(t => t.target_type === 'prospect_family').map(t => ({
        id: t.id,
        parentName: t.contact_name || t.name,
        parentEmail: t.email,
        parentPhone: t.phone,
        childName: '',
        childAge: null,
        source: t.category === 'referral' ? 'partner_referral' : 'inquiry',
        sourceDetail: t.notes || '',
        interests: t.tags || [],
        inquiryDate: t.created_date,
        notes: t.notes || '',
        status: t.status === 'contacted' ? 'contacted' : 'new',
      })),
    ];

    // Segment leads
    const newLeads = leads.filter(l => l.status === 'new');
    const contactedNoResponse = leads.filter(l => l.status === 'contacted' || l.status === 'no_response');
    const partnerReferrals = leads.filter(l => l.source === 'partner_referral');

    // Build class schedule
    const classSchedule = classes.map(c => ({
      name: c.title,
      ageRange: '4-18',
      day: c.day,
      time: `${Math.floor(c.start_time)}:${((c.start_time % 1) * 60).toString().padStart(2, '0')}`,
      spotsOpen: 10 - (c.student_names?.length || 0),
    }));

    // Build opportunities
    const opportunities = [
      { type: 'trial_invite', name: 'Free Trial Class', description: 'Complimentary first class in any program' },
      ...performances.slice(0, 2).map(p => ({
        type: 'event_invite',
        name: p.title,
        description: p.description || 'Upcoming performance',
        deadline: p.date,
      })),
    ];

    const userPrompt = `
## Studio Context

**Studio:** ${studioName}
**Owner:** ${user.full_name}

## Leads to Make Offers To

### New Leads (${newLeads.length})

${newLeads.length === 0 ? 'No new leads this week.' : newLeads.slice(0, 15).map(l => `
**${l.parentName}**${l.childName ? ` - ${l.childName}` : ''}${l.childAge ? ` (age ${l.childAge})` : ''}
- Source: ${l.source}${l.sourceDetail ? ` - ${l.sourceDetail}` : ''}
- Interests: ${l.interests?.join(', ') || 'Unknown'}
- Inquiry: ${l.inquiryDate ? formatDate(l.inquiryDate) : 'Unknown'}
- Notes: ${l.notes || 'None'}
- Contact: ${l.parentPhone || l.parentEmail || 'Unknown'}
`).join('\n')}

### Partner Referrals (${partnerReferrals.length})

${partnerReferrals.length === 0 ? 'No partner referrals.' : partnerReferrals.map(l => `
**${l.parentName}**${l.childName ? ` - ${l.childName}` : ''}
- Referred by: ${l.sourceDetail || 'Unknown partner'}
- Notes: ${l.notes || 'None'}
- Contact: ${l.parentPhone || l.parentEmail || 'Unknown'}
`).join('\n')}

### Contacted, No Response Yet (${contactedNoResponse.length})

${contactedNoResponse.length === 0 ? 'None waiting.' : contactedNoResponse.slice(0, 5).map(l => `
**${l.parentName}** - last contacted ${l.inquiryDate ? daysSince(l.inquiryDate) + ' days ago' : 'unknown'}
`).join('\n')}

## Current Offers Available

${opportunities.map(o => `
### ${o.name}
- Type: ${o.type}
- Description: ${o.description}
${o.deadline ? `- Deadline: ${formatDate(o.deadline)}` : ''}
`).join('\n')}

## Class Schedule (with openings)

${classSchedule.filter(c => c.spotsOpen > 0).slice(0, 10).map(c => `
- **${c.name}** (${c.ageRange}): ${c.day} at ${c.time} - ${c.spotsOpen} spots
`).join('\n')}

## Your Task

Create up to 10 personalized offers for this week.

For each:
1. Pick the RIGHT family (prioritize partner referrals and warm leads)
2. Match them to the RIGHT offer (based on age, interests, timing)
3. Craft a PERSONAL message that feels like an invitation, not a sales pitch
4. Include a SPECIFIC offer with easy next step

Return ONLY valid JSON matching the output format.
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: OFFERER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content.text;
    
    let agentOutput;
    try {
      agentOutput = JSON.parse(jsonStr);
    } catch {
      agentOutput = {
        offerActions: [],
        insights: { bestSources: [], staleLeads: 0, suggestedOffers: [] },
      };
    }

    // Find the offerer outcomes
    const outcomes = await base44.entities.GrowthOutcome.filter({ agent: 'offerer' });
    
    // Create GrowthActions from agent output
    const createdActions = [];
    for (const action of (agentOutput.offerActions || [])) {
      const growthAction = await base44.entities.GrowthAction.create({
        outcome_id: outcomes[0]?.id,
        agent: 'offerer',
        action_type: action.channel === 'email' ? 'email' : action.channel === 'call' ? 'call' : 'sms',
        status: 'pending_review',
        priority: action.urgency === 'now' ? 'high' : 'medium',
        target_type: 'family',
        target_id: action.leadId,
        target_name: action.childName || action.familyName,
        title: action.headline,
        summary: action.reasoning,
        content: action.draftMessage,
        context: { 
          offerType: action.offerType,
          specificOffer: action.specificOffer,
        },
      });
      createdActions.push(growthAction);
    }

    // Log agent activity
    await base44.entities.AgentLog.create({
      agent: 'offerer',
      event_type: 'strategy',
      summary: `Generated ${createdActions.length} offer actions for ${leads.length} leads`,
      details: {
        totalLeads: leads.length,
        newThisWeek: newLeads.length,
        partnerReferrals: partnerReferrals.length,
        actionsCreated: createdActions.length,
        insights: agentOutput.insights,
      },
    });

    return Response.json({
      success: true,
      agent: 'offerer',
      totalLeads: leads.length,
      newThisWeek: newLeads.length,
      waitingForResponse: contactedNoResponse.length,
      actionsCreated: createdActions.length,
      insights: agentOutput.insights,
    });

  } catch (error) {
    console.error('Offerer agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});