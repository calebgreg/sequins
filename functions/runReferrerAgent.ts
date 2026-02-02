import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Anthropic from 'npm:@anthropic-ai/sdk';

const REFERRER_SYSTEM_PROMPT = `You are the Referrer agent for Sequins, a growth engine for dance studios.

Your job is to generate referrals - both TO partners and FROM families. Not by asking - by giving reasons.

## Your Two Outcomes

### 1. Send 5 referrals to partners per week

This is about GIVING, not getting. You send value to partners so they naturally want to send value back.

What counts as sending a referral:
- "Hey Maria, the Johnson family just moved to the area and needs a preschool - Little Steps would be perfect for them"
- Introducing a family to a partner's business
- Recommending a partner in your newsletter
- Cross-promoting a partner on social
- Giving a partner a heads up: "Just sent someone your way"

Why this matters:
- Builds reciprocity
- Keeps you top of mind
- Creates genuine relationship (not transactional)
- Partners who receive start sending back

### 2. Give 5 happy families a reason to share per week

Don't ASK for referrals. GIVE them something worth sharing.

What gives a reason to share:
- A photo/video moment they'll want to post
- A milestone worth bragging about
- A story they'll tell at dinner
- Something their kid said/did that's adorable
- A win they're proud of

NOT this:
- "Know anyone who might be interested?"
- "Refer a friend and get $50 off!"
- "We're growing and looking for new families..."

Instead:
- "I had to share this moment from class today - Emma's face when she landed her first turn!"
- Content they WANT to share because it makes their kid look good
- Moments that naturally prompt "Where does your daughter dance?"

## Voice Guidelines

For partner referrals: Friendly, helpful, no strings attached. You're doing them a favor because you're neighbors.

For shareable moments: Enthusiastic, proud, specific. You're sharing because you genuinely can't help yourself.

## Output Format

Return a JSON object with:
{
  "partnerReferralActions": [...],
  "shareableMomentActions": [...],
  "insights": {
    "partnerBalance": [...],
    "topSharers": [...],
    "untappedMoments": [...]
  }
}

Each action should have:
- type: 'partner_referral' | 'shareable_moment'
- targetId: string
- targetName: string
- headline: string
- reasoning: string
- channel: 'text' | 'email' | 'social' | 'in_person'
- draftMessage: string
- suggestedMedia?: string (optional)

Make sharing feel natural, not forced.`;

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

    // Fetch partners (GrowthTargets with type partner or business)
    const targets = await base44.entities.GrowthTarget.list();
    const partners = targets.filter(t => t.target_type === 'partner' || t.target_type === 'business');
    
    // Fetch families
    const families = await base44.entities.Family.list();
    const students = await base44.entities.Student.filter({ status: 'active' });
    
    // Fetch recent student notes for moments
    const notes = await base44.entities.StudentNote.list('-date', 50);
    
    // Fetch studio settings
    const settings = await base44.entities.StudioSettings.list();
    const studioName = settings[0]?.name || 'Dance Studio';

    // Build partner data
    const partnerData = partners.map(p => ({
      id: p.id,
      personName: p.contact_name || p.name,
      businessName: p.name,
      businessType: p.category || 'Local Business',
      referralsSent: p.referrals_sent || 0,
      referralsReceived: p.referrals_received || 0,
      lastContact: p.last_contact_date || p.created_date,
    }));

    // Find partners we "owe" referrals to
    const partnersOwed = partnerData.filter(p => p.referralsReceived > p.referralsSent);

    // Build family data with happiness indicators
    const familyData = families.map(f => {
      const familyStudents = students.filter(s => s.parent_email === f.parent_email);
      const studentNotes = notes.filter(n => familyStudents.some(s => s.name === n.student_name));
      const positiveNotes = studentNotes.filter(n => n.sentiment === 'positive').length;
      
      // Determine happiness based on notes and engagement
      let happiness = 'neutral';
      if (positiveNotes >= 3) happiness = 'thrilled';
      else if (positiveNotes >= 1) happiness = 'happy';

      return {
        id: f.id,
        parentName: f.parent_name,
        parentEmail: f.parent_email,
        parentPhone: f.phone,
        students: familyStudents.map(s => ({
          name: s.name,
          age: s.age || 8,
          classes: s.interests || [],
        })),
        happiness,
        socialActive: true, // Could be tracked in Family entity
        needs: [], // Could be tracked in Family entity
        recentMoments: studentNotes.filter(n => n.sentiment === 'positive').map(n => n.content).slice(0, 3),
      };
    });

    // Happy families who are social
    const happyFamilies = familyData.filter(f => f.happiness === 'thrilled' || f.happiness === 'happy');

    // Recent class moments from notes
    const recentClassMoments = notes
      .filter(n => n.sentiment === 'positive')
      .slice(0, 15)
      .map(n => ({
        studentName: n.student_name,
        moment: n.content,
        mediaAvailable: false,
      }));

    // Upcoming milestones (could be tracked separately)
    const upcomingMilestones = students.slice(0, 5).map(s => ({
      studentName: s.name,
      milestone: s.joined_date ? 'Anniversary coming up' : 'First month complete',
      date: new Date(),
    }));

    const userPrompt = `
## Studio Context

**Studio:** ${studioName}
**Owner:** ${user.full_name}

## Partner Relationships

${partnerData.length === 0 ? 'No partners in system yet.' : partnerData.map(p => `
### ${p.personName} - ${p.businessName}
- Type: ${p.businessType}
- Referrals sent TO them: ${p.referralsSent}
- Referrals received FROM them: ${p.referralsReceived}
- Balance: ${p.referralsSent >= p.referralsReceived ? '✓ Good' : '⚠️ You owe them'}
- Last contact: ${formatDate(p.lastContact)}
`).join('\n')}

## Families Who Need Things

${familyData.filter(f => f.needs?.length > 0).length === 0 ? 'No known needs right now.' : familyData.filter(f => f.needs?.length > 0).map(f => `
- **${f.parentName}** needs: ${f.needs?.join(', ')}
`).join('\n')}

## Happy, Social Families

${happyFamilies.slice(0, 10).map(f => `
### ${f.parentName}
- Students: ${f.students.map(s => s.name).join(', ')}
- Happiness: ${f.happiness}
- Recent moments: ${f.recentMoments?.join(' | ') || 'None captured'}
`).join('\n')}

## Recent Class Moments

${recentClassMoments.length === 0 ? 'No recent moments captured.' : recentClassMoments.map(m => `
- **${m.studentName}**: ${m.moment} ${m.mediaAvailable ? '📸 Media available' : ''}
`).join('\n')}

## Upcoming Milestones

${upcomingMilestones.map(m => `
- **${m.studentName}**: ${m.milestone} on ${formatDate(m.date)}
`).join('\n')}

## Your Task

### Partner Referrals (target: 5 this week)
Find opportunities to send referrals to partners:
- Match family needs to partner offerings
- Prioritize partners you "owe"
- Draft the intro message

### Shareable Moments (target: 5 this week)
Find moments to give to families that they'll WANT to share:
- Recent class moments worth capturing
- Upcoming milestones to celebrate publicly
- Things that make parents proud

Return ONLY valid JSON matching the output format.
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: REFERRER_SYSTEM_PROMPT,
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
        partnerReferralActions: [],
        shareableMomentActions: [],
        insights: { partnerBalance: [], topSharers: [], untappedMoments: [] },
      };
    }

    // Find the referrer outcomes
    const outcomes = await base44.entities.GrowthOutcome.filter({ agent: 'referrer' });
    
    // Create GrowthActions from agent output
    const allActions = [
      ...(agentOutput.partnerReferralActions || []).map(a => ({ ...a, outcomeType: 'partner' })),
      ...(agentOutput.shareableMomentActions || []).map(a => ({ ...a, outcomeType: 'shareable' })),
    ];

    const createdActions = [];
    for (const action of allActions) {
      const outcome = outcomes.find(o => 
        (action.outcomeType === 'partner' && o.name.toLowerCase().includes('partner')) ||
        (action.outcomeType === 'shareable' && o.name.toLowerCase().includes('share'))
      );

      const growthAction = await base44.entities.GrowthAction.create({
        outcome_id: outcome?.id || outcomes[0]?.id,
        agent: 'referrer',
        action_type: action.channel === 'email' ? 'email' : action.channel === 'social' ? 'task' : 'sms',
        status: 'pending_review',
        priority: 'medium',
        target_type: action.type === 'partner_referral' ? 'partner' : 'family',
        target_id: action.targetId,
        target_name: action.targetName,
        title: action.headline,
        summary: action.reasoning,
        content: action.draftMessage,
        context: { 
          type: action.type,
          suggestedMedia: action.suggestedMedia,
        },
      });
      createdActions.push(growthAction);
    }

    // Log agent activity
    await base44.entities.AgentLog.create({
      agent: 'referrer',
      event_type: 'strategy',
      summary: `Generated ${createdActions.length} referral actions (${agentOutput.partnerReferralActions?.length || 0} partner, ${agentOutput.shareableMomentActions?.length || 0} shareable)`,
      details: {
        partnersOwed: partnersOwed.length,
        happyFamilies: happyFamilies.length,
        momentsAvailable: recentClassMoments.length,
        actionsCreated: createdActions.length,
        insights: agentOutput.insights,
      },
    });

    return Response.json({
      success: true,
      agent: 'referrer',
      partnersOwed: partnersOwed.length,
      happyFamilies: happyFamilies.length,
      momentsAvailable: recentClassMoments.length,
      actionsCreated: createdActions.length,
      insights: agentOutput.insights,
    });

  } catch (error) {
    console.error('Referrer agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});