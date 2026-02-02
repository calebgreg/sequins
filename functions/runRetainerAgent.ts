import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Anthropic from 'npm:@anthropic-ai/sdk';

const RETAINER_SYSTEM_PROMPT = `You are the Retainer agent for Sequins, a growth engine for dance studios.

Your job is to keep families enrolled. Not by "checking in" - by making them feel SEEN and CELEBRATED.

## Your Two Outcomes

### 1. Make at-risk families feel seen (5 per week)

At-risk families are slipping away quietly. They're not complaining - they're just... fading.

Signs of at-risk:
- Attendance dropping (was 90%, now 60%)
- Stopped responding to messages
- Haven't renewed when they usually do early
- Parent seems disengaged at pickup
- Kid seems less excited
- Life event (divorce, job loss, new baby, moved)

What makes them feel SEEN (not sold):
- "I noticed Mia hasn't been in as much lately - everything okay?"
- "Just thinking about your family. No agenda, just wanted to check in."
- "Mia's been missed in class. The other girls keep asking about her."
- Acknowledge their life stuff if you know about it
- Offer flexibility before they ask (pause, makeup classes, schedule change)

NOT this:
- "We noticed you haven't been coming to class..."
- "Just a reminder that tuition is due..."
- "We'd hate to lose you!"

### 2. Celebrate 10 student wins per week

Every kid has wins. Most go unnoticed. Your job is to notice them and make a big deal.

What counts as a win:
- Nailed a skill they've been working on
- Showed up even when they didn't want to
- Helped another student
- Showed improvement (not perfection)
- Hit a milestone (10th class, 1 year, first recital)
- Pushed through something hard
- Showed creativity or personality

How to celebrate:
- Text parent with specific observation
- Shoutout in class (if kid likes that)
- Photo/video of the moment
- Sticker, certificate, small recognition
- "I have to tell you what Emma did today..."

The key: BE SPECIFIC. "Great job today!" means nothing. "Emma finally got her tuck jump and her face was PRICELESS" means everything.

## Voice Guidelines

For at-risk: Warm, no pressure, human. You're a person who cares, not a business trying to retain revenue.

For celebrations: Enthusiastic, specific, proud. You noticed their kid and you're genuinely excited about it.

## Output Format

Return a JSON object with:
{
  "atRiskActions": [...],
  "celebrationActions": [...],
  "insights": {
    "atRiskPatterns": [...],
    "celebrationOpportunities": [...]
  }
}

Each action should have:
- familyId: string
- studentName: string (optional for at-risk)
- type: 'at_risk_outreach' | 'celebration'
- headline: string
- reasoning: string
- urgency: 'now' | 'soon' | 'later'
- channel: 'text' | 'email' | 'call' | 'in_person'
- draftMessage: string

Be specific. Make them feel it.`;

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

    // Fetch all active students and families
    const students = await base44.entities.Student.filter({ status: 'active' });
    const families = await base44.entities.Family.list();
    
    // Fetch attendance data
    const attendance = await base44.entities.Attendance.list('-date', 200);
    
    // Fetch recent student notes for wins
    const notes = await base44.entities.StudentNote.list('-date', 100);
    
    // Fetch messages for last contact tracking
    const messages = await base44.entities.Message.list('-timestamp', 100);
    
    // Fetch studio settings
    const settings = await base44.entities.StudioSettings.list();
    const studioName = settings[0]?.name || 'Dance Studio';

    // Build family data with attendance stats
    const familyData = families.map(f => {
      const familyStudents = students.filter(s => s.parent_email === f.parent_email);
      
      // Calculate attendance for family's students
      const studentNames = familyStudents.map(s => s.name);
      const familyAttendance = attendance.filter(a => studentNames.includes(a.student_name));
      const totalClasses = familyAttendance.length || 1;
      const presentClasses = familyAttendance.filter(a => a.status === 'present').length;
      const attendanceRate = presentClasses / totalClasses;
      
      // Check recent vs older attendance for trend
      const recentAttendance = familyAttendance.slice(0, 10);
      const olderAttendance = familyAttendance.slice(10, 20);
      const recentRate = recentAttendance.length > 0 
        ? recentAttendance.filter(a => a.status === 'present').length / recentAttendance.length 
        : attendanceRate;
      const olderRate = olderAttendance.length > 0 
        ? olderAttendance.filter(a => a.status === 'present').length / olderAttendance.length 
        : attendanceRate;
      
      let attendanceTrend = 'stable';
      if (recentRate < olderRate - 0.15) attendanceTrend = 'declining';
      if (recentRate > olderRate + 0.15) attendanceTrend = 'improving';
      
      // Last contact
      const familyMessages = messages.filter(m => 
        familyStudents.some(s => s.id === m.student_id) || 
        m.parent_email === f.parent_email
      );
      const lastContact = familyMessages[0]?.timestamp || f.created_date;

      return {
        id: f.id,
        parentName: f.parent_name,
        parentEmail: f.parent_email,
        parentPhone: f.phone,
        students: familyStudents.map(s => ({
          id: s.id,
          name: s.name,
          age: s.age || 8,
          classes: [], // Could be enriched from DanceClass
          recentWins: notes.filter(n => n.student_name === s.name && n.sentiment === 'positive').map(n => n.content).slice(0, 3),
          struggles: notes.filter(n => n.student_name === s.name && n.sentiment === 'constructive').map(n => n.content).slice(0, 2),
          milestones: [],
        })),
        enrolledSince: f.joined_date || f.created_date,
        attendanceRate,
        attendanceTrend,
        lastContact,
        renewalStatus: 'current', // Could be calculated from billing
        notes: f.notes,
        lifeEvents: [],
      };
    });

    // Identify at-risk families
    const atRiskFamilies = familyData.filter(f => 
      f.attendanceTrend === 'declining' ||
      f.attendanceRate < 0.6 ||
      daysSince(f.lastContact) > 30
    );

    // Get all students for celebration opportunities
    const allStudentsWithNotes = students.map(s => {
      const studentNotes = notes.filter(n => n.student_name === s.name);
      const family = familyData.find(f => f.students.some(fs => fs.id === s.id));
      return {
        id: s.id,
        name: s.name,
        age: s.age || 8,
        familyId: family?.id,
        parentName: family?.parentName,
        classes: s.interests || [],
        recentWins: studentNotes.filter(n => n.sentiment === 'positive').map(n => n.content).slice(0, 3),
        struggles: studentNotes.filter(n => n.sentiment === 'constructive').map(n => n.content).slice(0, 2),
      };
    });

    // Recent class notes for context
    const recentClassNotes = notes.slice(0, 20).map(n => ({
      className: n.class_name || 'Class',
      date: n.date,
      notes: `${n.student_name}: ${n.content}`,
    }));

    const userPrompt = `
## Studio Context

**Studio:** ${studioName}
**Owner:** ${user.full_name}

## At-Risk Families (${atRiskFamilies.length} identified)

${atRiskFamilies.length === 0 ? 'No at-risk families identified this week.' : atRiskFamilies.slice(0, 10).map(f => `
### ${f.parentName} family
- Students: ${f.students.map(s => `${s.name} (${s.age})`).join(', ')}
- Enrolled since: ${formatDate(f.enrolledSince)}
- Attendance: ${Math.round(f.attendanceRate * 100)}% (${f.attendanceTrend})
- Last contact: ${formatDate(f.lastContact)} (${daysSince(f.lastContact)} days ago)
- Notes: ${f.notes || 'None'}
- Contact: ${f.parentPhone || f.parentEmail || 'Unknown'}
`).join('\n')}

## Students & Recent Activity

${allStudentsWithNotes.slice(0, 20).map(s => `
**${s.name}** (${s.age})
- Recent wins: ${s.recentWins?.join(' | ') || 'None noted'}
- Working on: ${s.struggles?.join(' | ') || 'Nothing specific'}
`).join('\n')}

## Recent Class Notes

${recentClassNotes.map(n => `**${n.className}** (${formatDate(n.date)}): ${n.notes}`).join('\n')}

## Your Task

### At-Risk Families (target: 5 this week)
For each at-risk family, craft a personalized outreach that:
- Acknowledges what you've noticed WITHOUT being accusatory
- Shows genuine care, not business concern
- Offers support or flexibility
- Feels human, not automated

### Celebrations (target: 10 this week)
Find 10 wins worth celebrating. For each:
- Be SPECIFIC about what happened
- Make the parent feel proud
- Show you actually noticed their kid

Return ONLY valid JSON matching the output format.
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: RETAINER_SYSTEM_PROMPT,
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
        atRiskActions: [],
        celebrationActions: [],
        insights: { atRiskPatterns: [], celebrationOpportunities: [] },
      };
    }

    // Find the retainer outcomes
    const outcomes = await base44.entities.GrowthOutcome.filter({ agent: 'retainer' });
    
    // Create GrowthActions from agent output
    const allActions = [
      ...(agentOutput.atRiskActions || []).map(a => ({ ...a, outcomeType: 'at_risk' })),
      ...(agentOutput.celebrationActions || []).map(a => ({ ...a, outcomeType: 'celebration' })),
    ];

    const createdActions = [];
    for (const action of allActions) {
      const outcome = outcomes.find(o => 
        (action.outcomeType === 'at_risk' && o.name.toLowerCase().includes('at-risk')) ||
        (action.outcomeType === 'celebration' && o.name.toLowerCase().includes('celebrate'))
      );

      const growthAction = await base44.entities.GrowthAction.create({
        outcome_id: outcome?.id || outcomes[0]?.id,
        agent: 'retainer',
        action_type: action.channel === 'email' ? 'email' : action.channel === 'call' ? 'call' : 'sms',
        status: 'pending_review',
        priority: action.urgency === 'now' ? 'high' : 'medium',
        target_type: 'family',
        target_id: action.familyId,
        target_name: action.studentName || action.headline,
        title: action.headline,
        summary: action.reasoning,
        content: action.draftMessage,
        context: { type: action.type },
      });
      createdActions.push(growthAction);
    }

    // Log agent activity
    await base44.entities.AgentLog.create({
      agent: 'retainer',
      event_type: 'strategy',
      summary: `Generated ${createdActions.length} retention actions (${agentOutput.atRiskActions?.length || 0} at-risk, ${agentOutput.celebrationActions?.length || 0} celebrations)`,
      details: {
        totalFamilies: familyData.length,
        atRiskCount: atRiskFamilies.length,
        actionsCreated: createdActions.length,
        insights: agentOutput.insights,
      },
    });

    return Response.json({
      success: true,
      agent: 'retainer',
      totalFamilies: familyData.length,
      atRiskCount: atRiskFamilies.length,
      actionsCreated: createdActions.length,
      insights: agentOutput.insights,
    });

  } catch (error) {
    console.error('Retainer agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});