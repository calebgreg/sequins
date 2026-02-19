import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ORCHESTRATOR AGENT
 * Does: Runs daily, checks progress toward all outcomes, prioritizes agent work
 * Output: Summary for Growth UI dashboard, triggers underperforming agents
 * 
 * The 7 Agents and their outcomes:
 * 1. Connector - Connect with X business owners/week
 * 2. Attender - Attend X community events/month
 * 3. Accessor - Gain access to X family groups/month
 * 4. Offerer - Get X prospects to take offers/week
 * 5. Converter - Convert X trials to enrolled/week
 * 6. Retainer - Retain families + celebrate wins
 * 7. Referrer - Generate X referrals/month
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studio_id, run_agents = false } = await req.json();
    
    if (!studio_id) {
      return Response.json({ error: 'studio_id required' }, { status: 400 });
    }

    // =========================================
    // STEP 1: Gather all outcome data
    // =========================================
    
    const studios = await base44.entities.Studio.filter({ id: studio_id });
    const studio = studios[0];
    
    if (!studio) {
      return Response.json({ error: 'Studio not found' }, { status: 404 });
    }

    // Get all growth outcomes
    const outcomes = await base44.entities.GrowthOutcome.filter({ studio_id });
    
    // Get all pending actions
    const pendingActions = await base44.entities.GrowthAction.filter({ 
      studio_id, 
      status: 'pending_review' 
    });

    // Get recent agent logs
    const agentLogs = await base44.entities.AgentLog.filter({ studio_id });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaysLogs = agentLogs.filter(l => new Date(l.created_date) >= todayStart);

    // =========================================
    // STEP 2: Calculate progress for each agent
    // =========================================

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Helper to calculate progress
    const calculateProgress = async (agent, periodStart) => {
      const agentOutcomes = outcomes.filter(o => o.agent === agent);
      if (agentOutcomes.length === 0) {
        return { target: 0, current: 0, percent: 0, status: 'no_target' };
      }

      const outcome = agentOutcomes[0];
      const target = outcome.target_count || 0;

      // Get progress records for this period
      const progressRecords = await base44.entities.GrowthPeriodProgress?.filter({
        studio_id,
        outcome_id: outcome.id
      }) || [];

      const currentPeriodProgress = progressRecords.find(p => 
        new Date(p.period_start) >= periodStart
      );

      const current = currentPeriodProgress?.current_count || 0;
      const percent = target > 0 ? Math.round((current / target) * 100) : 0;

      let status = 'on_track';
      const daysIntoPeriod = Math.ceil((now - periodStart) / (1000 * 60 * 60 * 24));
      const periodLength = outcome.period === 'weekly' ? 7 : 30;
      const expectedPercent = (daysIntoPeriod / periodLength) * 100;

      if (percent < expectedPercent * 0.5) {
        status = 'behind';
      } else if (percent >= 100) {
        status = 'complete';
      } else if (percent >= expectedPercent) {
        status = 'ahead';
      }

      return {
        outcome_id: outcome.id,
        outcome_name: outcome.name,
        target,
        current,
        percent,
        status,
        period: outcome.period
      };
    };

    // Calculate each agent's progress
    const agentProgress = {
      connector: await calculateProgress('connector', weekStart),
      attender: await calculateProgress('attender', monthStart),
      accessor: await calculateProgress('accessor', monthStart),
      offerer: await calculateProgress('offerer', weekStart),
      converter: await calculateProgress('converter', weekStart),
      retainer: await calculateProgress('retainer', weekStart),
      referrer: await calculateProgress('referrer', monthStart)
    };

    // =========================================
    // STEP 3: Determine today's priorities
    // =========================================

    const priorities = [];

    // Rank by how far behind each agent is
    const behindAgents = Object.entries(agentProgress)
      .filter(([_, p]) => p.status === 'behind')
      .sort((a, b) => a[1].percent - b[1].percent);

    for (const [agent, progress] of behindAgents) {
      priorities.push({
        agent,
        reason: `${progress.outcome_name}: ${progress.current}/${progress.target} (${progress.percent}%)`,
        urgency: 'high',
        action: `Run ${agent} agent to catch up`
      });
    }

    // Add agents that haven't run today
    const agentNames = ['connector', 'attender', 'accessor', 'offerer', 'converter', 'retainer', 'referrer'];
    for (const agent of agentNames) {
      const ranToday = todaysLogs.some(l => l.agent === agent);
      if (!ranToday && !behindAgents.find(([a]) => a === agent)) {
        priorities.push({
          agent,
          reason: "Hasn't run today",
          urgency: 'normal',
          action: `Run daily ${agent} check`
        });
      }
    }

    // =========================================
    // STEP 4: Build dashboard summary
    // =========================================

    const dashboardSummary = {
      studio_name: studio.name,
      generated_at: now.toISOString(),
      
      // Overall health
      overall_status: behindAgents.length === 0 ? 'healthy' : 
                      behindAgents.length <= 2 ? 'attention_needed' : 'falling_behind',
      
      // Progress by agent
      agent_progress: agentProgress,
      
      // Today's focus
      priorities: priorities.slice(0, 5),
      
      // Pending actions needing review
      pending_actions: {
        total: pendingActions.length,
        high_priority: pendingActions.filter(a => a.priority === 'high').length,
        by_agent: {
          connector: pendingActions.filter(a => a.agent === 'connector').length,
          attender: pendingActions.filter(a => a.agent === 'attender').length,
          accessor: pendingActions.filter(a => a.agent === 'accessor').length,
          offerer: pendingActions.filter(a => a.agent === 'offerer').length,
          converter: pendingActions.filter(a => a.agent === 'converter').length,
          retainer: pendingActions.filter(a => a.agent === 'retainer').length,
          referrer: pendingActions.filter(a => a.agent === 'referrer').length
        }
      },
      
      // Agents run today
      agents_run_today: todaysLogs.map(l => l.agent).filter((v, i, a) => a.indexOf(v) === i)
    };

    // =========================================
    // STEP 5: Optionally run behind agents
    // =========================================

    const agentsTriggered = [];

    if (run_agents && behindAgents.length > 0) {
      // Trigger up to 3 behind agents
      for (const [agent] of behindAgents.slice(0, 3)) {
        try {
          const functionName = `run${agent.charAt(0).toUpperCase() + agent.slice(1)}Agent`;
          await base44.functions.invoke(functionName, { 
            studio_id, 
            mode: 'full' 
          });
          agentsTriggered.push(agent);
        } catch (err) {
          console.error(`Failed to trigger ${agent}:`, err.message);
        }
      }
    }

    // =========================================
    // STEP 6: Log orchestrator run
    // =========================================

    await base44.asServiceRole.entities.AgentLog.create({
      studio_id,
      agent: 'orchestrator',
      event_type: 'orchestration',
      summary: `Health: ${dashboardSummary.overall_status}, ${behindAgents.length} agents behind, ${pendingActions.length} pending actions`,
      details: {
        agent_progress: agentProgress,
        priorities: priorities.slice(0, 5),
        agents_triggered: agentsTriggered
      }
    });

    return Response.json({
      success: true,
      dashboard: dashboardSummary,
      agents_triggered: agentsTriggered
    });

  } catch (error) {
    console.error('Orchestrator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});