import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * GROWTH ORCHESTRATOR (legacy wrapper)
 * Checks progress on all outcomes, coordinates agents
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const studio_id = body.studio_id;
    if (!studio_id) return Response.json({ error: 'studio_id is required' }, { status: 400 });

    const outcomes = await base44.asServiceRole.entities.GrowthOutcome.filter({ studio_id });
    const actions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id });
    const progress = await base44.asServiceRole.entities.GrowthPeriodProgress.filter({ studio_id });

    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const outcomeAnalysis = [];
    for (const outcome of outcomes) {
      const periodStart = outcome.target_period === 'week' ? weekStart : monthStart;
      const completedActions = actions.filter(a => a.outcome_id === outcome.id && (a.status === 'sent' || a.status === 'completed') && new Date(a.created_date) >= periodStart).length;
      const pendingActions = actions.filter(a => a.outcome_id === outcome.id && a.status === 'pending_review').length;
      const progressPercent = outcome.target_count > 0 ? (completedActions / outcome.target_count) * 100 : 0;
      const daysIntoPeriod = Math.floor((now - periodStart) / (1000 * 60 * 60 * 24)) + 1;
      const periodLength = outcome.target_period === 'week' ? 7 : 30;
      const expectedProgress = (daysIntoPeriod / periodLength) * 100;
      const status = progressPercent >= expectedProgress ? 'on_track' : progressPercent >= expectedProgress - 20 ? 'slightly_behind' : 'behind';
      outcomeAnalysis.push({ outcome, completed: completedActions, pending: pendingActions, target: outcome.target_count, progressPercent, expectedProgress, status, needsAttention: status !== 'on_track' && pendingActions < 3 });
    }

    const agentsToRun = [];
    for (const analysis of outcomeAnalysis) {
      if (analysis.needsAttention) {
        agentsToRun.push({ agent: analysis.outcome.agent, outcome: analysis.outcome.name, reason: `${analysis.status}: ${analysis.completed}/${analysis.target}`, priority: analysis.status === 'behind' ? 'high' : 'medium' });
      }
    }

    const uniqueAgents = [...new Set(agentsToRun.map(a => a.agent))];
    const agentResults = {};

    for (const agentName of uniqueAgents) {
      const agentInfo = agentsToRun.find(a => a.agent === agentName);
      try {
        const functionName = `run${agentName.charAt(0).toUpperCase() + agentName.slice(1)}Agent`;
        const result = await base44.functions.invoke(functionName, { studio_id, mode: 'full' });
        agentResults[agentName] = { success: true, reason: agentInfo.reason, result: result.data };
      } catch (error) {
        agentResults[agentName] = { success: false, reason: agentInfo.reason, error: error.message };
      }
    }

    // Update period progress records
    for (const analysis of outcomeAnalysis) {
      const periodStart = analysis.outcome.target_period === 'week' ? weekStart.toISOString().split('T')[0] : monthStart.toISOString().split('T')[0];
      const periodEnd = analysis.outcome.target_period === 'week' ? new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const existingProgress = progress.find(p => p.outcome_id === analysis.outcome.id && p.period_start === periodStart);
      const progressData = { studio_id, outcome_id: analysis.outcome.id, period_type: analysis.outcome.target_period, period_start: periodStart, period_end: periodEnd, target_count: analysis.target, current_count: analysis.completed, actions_pending: analysis.pending, actions_completed: analysis.completed, is_on_track: analysis.status === 'on_track', agent_notes: `Status: ${analysis.status}. ${analysis.completed}/${analysis.target} complete, ${analysis.pending} pending.` };
      if (existingProgress) { await base44.asServiceRole.entities.GrowthPeriodProgress.update(existingProgress.id, progressData); }
      else { await base44.asServiceRole.entities.GrowthPeriodProgress.create(progressData); }
    }

    const { data: summaryResponse } = await base44.asServiceRole.functions.invoke('callClaudeService', {
      prompt: `Summarize today's growth status for a dance studio.\nOutcomes:\n${outcomeAnalysis.map(a => `- ${a.outcome.name}: ${a.completed}/${a.target} (${a.status})`).join('\n')}\nAgents Run:\n${Object.entries(agentResults).map(([agent, r]) => `- ${agent}: ${r.success ? 'Success' : 'Failed'}`).join('\n') || 'None needed'}\nReturn JSON: { "summary": "2-3 sentences", "top_priority": "most important thing" }`,
      response_json_schema: { type: "object", properties: { summary: { type: "string" }, top_priority: { type: "string" } } }
    });

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id, agent: 'orchestrator', event_type: 'strategy',
      summary: summaryResponse.summary,
      details: { outcomes_analyzed: outcomeAnalysis.length, agents_run: Object.keys(agentResults), agent_results: agentResults, top_priority: summaryResponse.top_priority }
    });

    return Response.json({ success: true, summary: summaryResponse.summary, top_priority: summaryResponse.top_priority, outcomes: outcomeAnalysis.map(a => ({ name: a.outcome.name, agent: a.outcome.agent, progress: `${a.completed}/${a.target}`, status: a.status, pending: a.pending })), agents_run: agentResults });
  } catch (error) {
    console.error('Orchestrator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});