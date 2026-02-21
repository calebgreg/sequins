import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ORCHESTRATOR AGENT
 * Runs daily, checks progress toward all outcomes, prioritizes agent work
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}

    let body = {};
    try { body = await req.json(); } catch (_) {}

    let studio_id = body.studio_id;
    const run_agents = body.run_agents || false;

    if (!studio_id) {
      if (user?.studio_id) studio_id = user.studio_id;
      else if (user?.data?.studio_id) studio_id = user.data.studio_id;
      else {
        const allStudios = await base44.asServiceRole.entities.Studio.filter({ status: 'active' });
        if (allStudios.length > 0) studio_id = allStudios[0].id;
      }
    }
    if (!studio_id) return Response.json({ error: 'studio_id could not be determined' }, { status: 400 });

    const allStudios = await base44.asServiceRole.entities.Studio.list();
    const studio = allStudios.find(s => s.id === studio_id);
    if (!studio) return Response.json({ error: 'Studio not found' }, { status: 404 });

    const outcomes = await base44.asServiceRole.entities.GrowthOutcome.filter({ studio_id });
    const pendingActions = await base44.asServiceRole.entities.GrowthAction.filter({ studio_id, status: 'pending_review' });

    const agentLogs = await base44.asServiceRole.entities.AgentLog.filter({ studio_id });
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todaysLogs = agentLogs.filter(l => new Date(l.created_date) >= todayStart);

    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const calculateProgress = async (agent, periodStart) => {
      const agentOutcomes = outcomes.filter(o => o.agent === agent);
      if (agentOutcomes.length === 0) return { target: 0, current: 0, percent: 0, status: 'no_target' };
      const outcome = agentOutcomes[0];
      const target = outcome.target_count || 0;
      let progressRecords = [];
      try { progressRecords = await base44.asServiceRole.entities.GrowthPeriodProgress.filter({ studio_id, outcome_id: outcome.id }); } catch (_) {}
      const currentPeriodProgress = progressRecords.find(p => new Date(p.period_start) >= periodStart);
      const current = currentPeriodProgress?.current_count || 0;
      const percent = target > 0 ? Math.round((current / target) * 100) : 0;
      const daysIntoPeriod = Math.ceil((now - periodStart) / (1000 * 60 * 60 * 24));
      const periodLength = outcome.target_period === 'week' ? 7 : 30;
      const expectedPercent = (daysIntoPeriod / periodLength) * 100;
      let status = 'on_track';
      if (percent < expectedPercent * 0.5) status = 'behind';
      else if (percent >= 100) status = 'complete';
      else if (percent >= expectedPercent) status = 'ahead';
      return { outcome_id: outcome.id, outcome_name: outcome.name, target, current, percent, status, period: outcome.target_period };
    };

    const agentProgress = {
      connector: await calculateProgress('connector', weekStart),
      attender: await calculateProgress('attender', monthStart),
      accessor: await calculateProgress('accessor', monthStart),
      offerer: await calculateProgress('offerer', weekStart),
      converter: await calculateProgress('converter', weekStart),
      retainer: await calculateProgress('retainer', weekStart),
      referrer: await calculateProgress('referrer', monthStart)
    };

    const behindAgents = Object.entries(agentProgress).filter(([_, p]) => p.status === 'behind').sort((a, b) => a[1].percent - b[1].percent);

    const dashboardSummary = {
      studio_name: studio.name,
      generated_at: now.toISOString(),
      overall_status: behindAgents.length === 0 ? 'healthy' : behindAgents.length <= 2 ? 'attention_needed' : 'falling_behind',
      agent_progress: agentProgress,
      priorities: behindAgents.slice(0, 5).map(([agent, p]) => ({ agent, reason: `${p.outcome_name}: ${p.current}/${p.target} (${p.percent}%)`, urgency: 'high' })),
      pending_actions: { total: pendingActions.length, high_priority: pendingActions.filter(a => a.priority === 'high').length },
      agents_run_today: todaysLogs.map(l => l.agent).filter((v, i, a) => a.indexOf(v) === i)
    };

    const agentsTriggered = [];
    if (run_agents && behindAgents.length > 0) {
      for (const [agent] of behindAgents.slice(0, 3)) {
        try {
          const functionName = `run${agent.charAt(0).toUpperCase() + agent.slice(1)}Agent`;
          await base44.functions.invoke(functionName, { studio_id, mode: 'full' });
          agentsTriggered.push(agent);
        } catch (err) { console.error(`Failed to trigger ${agent}:`, err.message); }
      }
    }

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id, agent: 'orchestrator', event_type: 'strategy',
      summary: `Health: ${dashboardSummary.overall_status}, ${behindAgents.length} agents behind, ${pendingActions.length} pending actions`,
      details: { agent_progress: agentProgress, agents_triggered: agentsTriggered }
    });

    return Response.json({ success: true, dashboard: dashboardSummary, agents_triggered: agentsTriggered });
  } catch (error) {
    console.error('Orchestrator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});