import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CONNECTOR_SYSTEM_PROMPT = `You are the Connector agent for Sequins, a growth engine for dance studios.

Your job is to help the studio owner CONNECT with local business owners. Not just contact them - actually build real relationships.

"Connect" means: They responded. There's a relationship now. Not just "email sent."

## Your Responsibilities

1. FIND the right people to reach out to
   - Prioritize by fit (daycares > dentists for a kids dance studio)
   - Prioritize by proximity (closer is better)
   - Prioritize warm paths (owner knows someone, mutual connections)
   - Look for signals of partnership-friendliness (promotes other local businesses)

2. RESEARCH each person (not just the business)
   - Who is the decision maker?
   - How long have they been there?
   - What do they care about?
   - What do they post about?
   - Any mutual connections or common ground?

3. RECOMMEND the best approach
   - Which channel? (Email, Instagram DM, LinkedIn, drop-in, phone)
   - What's the angle? (Neighbor, fellow parent, Buckeye connection, etc.)
   - Why this person, why now?

4. DRAFT the message
   - Human to human, not business to business
   - Reference something real about THEM
   - Short, warm, clear ask
   - Sound like the studio owner, not a sales email

5. LEARN what's working
   - Track response rates by channel, partner type, approach
   - Identify blockers (low open rates? wrong channel. no replies? wrong angle.)
   - Adjust strategy based on results

## Voice Guidelines

When writing outreach:
- Sound like a friendly neighbor, not a sales pitch
- Keep it under 100 words
- One clear, easy call to action
- Reference something specific about them
- Don't compliment their "great business" - that's generic AI slop

## Output Format

Return a JSON object with:
{
  "todaysActions": [...],
  "inProgress": [...],
  "insights": {
    "connectionRate": number,
    "bestChannel": string,
    "bestPartnerType": string,
    "blockers": [...]
  }
}

Each action should have:
- partnerId: string
- partnerName: string
- businessName: string
- headline: string
- reasoning: string
- channel: 'email' | 'instagram_dm' | 'linkedin' | 'phone' | 'drop_in'
- draftMessage: string
- urgency: 'now' | 'soon' | 'later'

Be specific. Be actionable. Help the owner hit their connection target.`;

function isThisWeek(date) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return new Date(date) >= startOfWeek;
}

function daysLeftInWeek() {
  return 7 - new Date().getDay();
}

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

    // Fetch studio settings
    const settings = await base44.entities.StudioSettings.list();
    const studioName = settings[0]?.name || 'Dance Studio';

    // Fetch growth targets (businesses/partners)
    const targets = await base44.entities.GrowthTarget.list();
    const partners = targets.filter(t => t.target_type === 'business' || t.target_type === 'partner');

    // Fetch growth outcomes to find connection target
    const outcomes = await base44.entities.GrowthOutcome.filter({ agent: 'connector' });
    const connectionOutcome = outcomes.find(o => o.name.toLowerCase().includes('connection'));
    const connectionsTarget = connectionOutcome?.target_count || 4;

    // Fetch recent actions to track outreach
    const recentActions = await base44.entities.GrowthAction.filter({ agent: 'connector' });

    // Calculate connections this week
    const connectedPartners = partners.filter(p => 
      p.status === 'connected' || p.status === 'partner'
    );
    const connectionsThisWeek = connectedPartners.filter(p => 
      p.last_contact_date && isThisWeek(p.last_contact_date)
    ).length;

    // Segment partners by status
    const potentialPartners = partners.filter(p => 
      p.status === 'prospect' || !p.status
    );
    const contactedPartners = partners.filter(p => p.status === 'contacted');

    // Build outreach history
    const outreachHistory = recentActions.filter(a => 
      a.status === 'sent' || a.status === 'completed'
    );

    const userPrompt = `
## Studio Context

**Studio:** ${studioName}
**Owner:** ${user.full_name}

## Progress This Week

**Connections Target:** ${connectionsTarget}
**Connections Made:** ${connectionsThisWeek}
**Remaining:** ${connectionsTarget - connectionsThisWeek}
**Days Left in Week:** ${daysLeftInWeek()}

## Potential Partners to Reach Out To

${potentialPartners.length === 0 ? 'No potential partners identified yet.' : potentialPartners.slice(0, 10).map(p => `
### ${p.contact_name || p.name} - ${p.name}
- **Type:** ${p.category || 'Local Business'}
- **Email:** ${p.email || 'Unknown'}
- **Phone:** ${p.phone || 'Unknown'}
- **Website:** ${p.website || 'Unknown'}
- **Notes:** ${p.notes || 'None'}
- **Tags:** ${p.tags?.join(', ') || 'None'}
- **AI Research:** ${p.ai_research ? JSON.stringify(p.ai_research).slice(0, 200) : 'Not researched yet'}
`).join('\n')}

## In-Progress (Contacted, Awaiting Response)

${contactedPartners.length === 0 ? 'None' : contactedPartners.map(p => `
### ${p.contact_name || p.name} - ${p.name}
- **Last Contacted:** ${p.last_contact_date ? formatDate(p.last_contact_date) : 'Unknown'}
- **Days Since Contact:** ${p.last_contact_date ? daysSince(p.last_contact_date) : 'Unknown'}
- **Notes:** ${p.notes || 'None'}
`).join('\n')}

## Recent Outreach Performance

${outreachHistory.length === 0 ? 'No recent outreach data' : `
- **Total Sent (Recent):** ${outreachHistory.length}
- **Completed:** ${outreachHistory.filter(o => o.status === 'completed').length}
`}

## Your Task

Based on the above context:

1. Recommend 2-3 partners to reach out to TODAY, prioritized by likelihood of connection
2. For each, explain WHY them and WHY NOW
3. Recommend the BEST CHANNEL to reach them
4. Write a DRAFT MESSAGE ready to send
5. For in-progress partners, recommend next steps (follow up? different angle? move on?)
6. Share any insights about what's working or not working

Return ONLY valid JSON matching the output format.
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: CONNECTOR_SYSTEM_PROMPT,
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
        todaysActions: [],
        inProgress: [],
        insights: { connectionRate: 0, bestChannel: 'email', bestPartnerType: 'daycare', blockers: [] },
      };
    }

    // Create GrowthActions from agent output
    const createdActions = [];
    for (const action of (agentOutput.todaysActions || [])) {
      const growthAction = await base44.entities.GrowthAction.create({
        outcome_id: connectionOutcome?.id || outcomes[0]?.id,
        agent: 'connector',
        action_type: action.channel === 'email' ? 'email' : action.channel === 'phone' ? 'call' : 'message',
        status: 'pending_review',
        priority: action.urgency === 'now' ? 'high' : 'medium',
        target_type: 'business',
        target_id: action.partnerId,
        target_name: `${action.partnerName} - ${action.businessName}`,
        title: action.headline,
        summary: action.reasoning,
        content: action.draftMessage,
        context: { channel: action.channel },
      });
      createdActions.push(growthAction);
    }

    // Log agent activity
    await base44.entities.AgentLog.create({
      agent: 'connector',
      event_type: 'strategy',
      summary: `Generated ${createdActions.length} connection actions. Progress: ${connectionsThisWeek}/${connectionsTarget} this week.`,
      details: {
        connectionsThisWeek,
        connectionsTarget,
        potentialPartners: potentialPartners.length,
        inProgress: contactedPartners.length,
        actionsCreated: createdActions.length,
        insights: agentOutput.insights,
      },
    });

    return Response.json({
      success: true,
      agent: 'connector',
      connectionsThisWeek,
      connectionsTarget,
      actionsCreated: createdActions.length,
      inProgress: agentOutput.inProgress || [],
      insights: agentOutput.insights,
    });

  } catch (error) {
    console.error('Connector agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});