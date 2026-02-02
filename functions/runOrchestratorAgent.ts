import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the Orchestrator for Sequins, a growth engine for dance studios.

Your job is to coordinate the growth agents and help the studio owner focus on what matters most RIGHT NOW.

## The Outcomes You're Tracking

1. **CONNECTOR**: Connect with X business owners per week
2. **ATTENDER**: Attend X community events per month
3. **ACCESSOR**: Access X new groups per month
4. **OFFERER**: Make offers to X new families per week
5. **CONVERTER**: Convert trial students
6. **RETAINER**: Retain at-risk families
7. **REFERRER**: Generate referrals

## Your Responsibilities

1. TRACK progress across all outcomes
   - Who's on track? Who's behind?
   - What's the overall health of the growth system?

2. PRIORITIZE focus
   - What should the owner focus on TODAY?
   - Which outcome is most urgent/impactful?

3. SURFACE the best actions
   - Across all agents, what are the top 3-5 actions?
   - Prioritize by urgency and impact

4. FLAG blockers
   - Is something not working?
   - Connection rate dropped?
   - Stuck on a group for weeks?

5. CELEBRATE wins
   - Acknowledge progress
   - Reinforce what's working

## Prioritization Logic

1. URGENCY trumps impact
   - Event deadline tomorrow > higher-value connection
   
2. BEHIND outcomes get attention
   - If connections are at 1/4 with 2 days left, focus there

3. QUICK WINS when available
   - Low-effort actions that move the needle

4. BALANCE over time
   - Don't neglect any outcome too long

Be decisive. The owner has limited time. Tell them exactly what to do.`;

function isThisWeek(date) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return new Date(date) >= startOfWeek;
}

function isThisMonth(date) {
  const now = new Date();
  const d = new Date(date);
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function daysLeftInWeek() {
  return 7 - new Date().getDay();
}

function daysLeftInMonth() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
}

function getStatus(actual, target, periodType) {
  const now = new Date();
  let percentThroughPeriod;
  
  if (periodType === 'week') {
    percentThroughPeriod = now.getDay() / 7;
  } else {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    percentThroughPeriod = now.getDate() / daysInMonth;
  }
  
  const expectedProgress = target * percentThroughPeriod;
  
  if (actual >= target) return 'ahead';
  if (actual >= expectedProgress * 0.8) return 'on_track';
  return 'behind';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all growth outcomes
    const outcomes = await base44.entities.GrowthOutcome.filter({ is_active: true });
    
    // Fetch growth targets and actions
    const targets = await base44.entities.GrowthTarget.list();
    const actions = await base44.entities.GrowthAction.list();
    const periodProgress = await base44.entities.GrowthPeriodProgress.list();

    // Calculate progress for each outcome
    const progress = {};
    
    for (const outcome of outcomes) {
      const agent = outcome.agent;
      const target = outcome.target_count;
      const periodType = outcome.target_period;
      
      // Find current period progress or calculate from data
      let actual = 0;
      
      if (agent === 'connector') {
        const partners = targets.filter(t => 
          (t.target_type === 'business' || t.target_type === 'partner') &&
          (t.status === 'connected' || t.status === 'partner') &&
          t.last_contact_date && isThisWeek(t.last_contact_date)
        );
        actual = partners.length;
      } else if (agent === 'attender') {
        // Count events attended this month
        const attended = targets.filter(t => 
          t.target_type === 'event' && 
          t.status === 'connected' &&
          t.last_contact_date && isThisMonth(t.last_contact_date)
        );
        actual = attended.length;
      } else if (agent === 'accessor') {
        const accessed = targets.filter(t => 
          t.target_type === 'community_group' && 
          t.status === 'connected' &&
          t.last_contact_date && isThisMonth(t.last_contact_date)
        );
        actual = accessed.length;
      } else if (agent === 'referrer') {
        const sentActions = actions.filter(a => 
          a.agent === 'referrer' && 
          a.status === 'completed' &&
          a.completed_at && isThisWeek(a.completed_at)
        );
        actual = sentActions.length;
      } else {
        // For other agents, count completed actions this period
        const periodCheck = periodType === 'week' ? isThisWeek : isThisMonth;
        const completedActions = actions.filter(a => 
          a.agent === agent && 
          a.status === 'completed' &&
          a.completed_at && periodCheck(a.completed_at)
        );
        actual = completedActions.length;
      }
      
      progress[agent] = {
        outcome_id: outcome.id,
        name: outcome.name,
        actual,
        target,
        periodType,
        status: getStatus(actual, target, periodType),
        daysLeft: periodType === 'week' ? daysLeftInWeek() : daysLeftInMonth(),
      };
    }

    // Fetch pending actions from all agents
    const pendingActions = actions.filter(a => 
      a.status === 'pending_review' || a.status === 'approved'
    );

    // Build the prompt for orchestration
    const userPrompt = `
## Studio Growth Dashboard

**Owner:** ${user.full_name}
**Date:** ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}

## Progress By Outcome

${Object.entries(progress).map(([agent, data]) => `
### ${agent.toUpperCase()} - ${data.name}
- **Target:** ${data.target} per ${data.periodType}
- **Actual:** ${data.actual}
- **Status:** ${data.status.toUpperCase()}
- **Days Left:** ${data.daysLeft}
`).join('\n')}

## Pending Actions (${pendingActions.length} total)

${pendingActions.slice(0, 10).map(a => `
- **[${a.agent.toUpperCase()}]** ${a.title}
  - Priority: ${a.priority}
  - Target: ${a.target_name || 'N/A'}
  - Status: ${a.status}
`).join('\n')}

## Your Task

1. What should be TODAY'S FOCUS? (One agent/outcome)
   - Why?

2. What are the TOP 3-5 PRIORITY ACTIONS across all agents?
   - Rank by urgency and impact
   - Be specific

3. What ALERTS should the owner see?
   - Outcomes falling behind
   - Deadlines approaching
   - Wins to celebrate
   - Blockers identified

Return a JSON object with:
{
  "todaysFocus": "agent_name",
  "focusReason": "explanation",
  "priorityActions": [
    { "agent": "...", "action": "...", "urgency": "now|soon|later", "reason": "..." }
  ],
  "alerts": [
    { "type": "behind|deadline|win|blocker", "message": "...", "urgency": "now|soon|later" }
  ],
  "summary": "One sentence summary of the growth system health"
}
`;

    // Use Base44's InvokeLLM integration
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: ORCHESTRATOR_SYSTEM_PROMPT + '\n\n' + userPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          todaysFocus: { type: 'string' },
          focusReason: { type: 'string' },
          priorityActions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                agent: { type: 'string' },
                action: { type: 'string' },
                urgency: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
          alerts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                message: { type: 'string' },
                urgency: { type: 'string' },
              },
            },
          },
          summary: { type: 'string' },
        },
      },
    });

    // Log orchestrator activity
    await base44.entities.AgentLog.create({
      agent: 'connector', // Using connector as placeholder since orchestrator isn't in enum
      event_type: 'strategy',
      summary: `Orchestrator ran. Focus: ${llmResponse.todaysFocus}. ${llmResponse.summary}`,
      details: {
        progress,
        todaysFocus: llmResponse.todaysFocus,
        priorityActionsCount: llmResponse.priorityActions?.length || 0,
        alertsCount: llmResponse.alerts?.length || 0,
      },
    });

    return Response.json({
      success: true,
      agent: 'orchestrator',
      progress,
      todaysFocus: llmResponse.todaysFocus,
      focusReason: llmResponse.focusReason,
      priorityActions: llmResponse.priorityActions || [],
      alerts: llmResponse.alerts || [],
      summary: llmResponse.summary,
      pendingActionsCount: pendingActions.length,
    });

  } catch (error) {
    console.error('Orchestrator agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});