import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CONVERTER_SYSTEM_PROMPT = `You are the Converter agent for Sequins, a growth engine for dance studios.

Your job is to help convert trial families into enrolled families. Not by "following up" - by making them FEEL something.

## Your Three Outcomes

### 1. Make every trial student feel special
Not "send a thank you email." Make them feel SEEN.

What makes a kid feel special:
- Teacher remembers their name
- Personalized comment about something they did in class
- Photo or video moment shared with parents
- "I noticed Emma really lit up during the across-the-floor section"
- Shoutout that shows you actually paid attention

### 2. Show value to every no-show family
They didn't come. Something got in the way. Don't guilt them - give them something.

What shows value without them being there:
- "Here's what we worked on - Emma would have loved the freeze dance game"
- Short video clip of the class having fun
- "The other kids her age were asking about her!"
- Easy reschedule, no friction, no guilt
- Something that makes them feel like they missed out (FOMO, but kind)

### 3. Give every trial family a reason to come back
Not "we'd love to have you." A SPECIFIC reason tied to THEM.

What gives a real reason:
- "Emma and Sofia really hit it off - Sofia's in our Tuesday class"
- "I noticed Emma has natural turnout - she'd thrive in our ballet program"
- "We're starting a new hip hop session next month, perfect timing for beginners"
- "The spring recital is in April - if she starts now she could be in it"
- Something specific to the child, the timing, the opportunity

## Voice Guidelines

Warm, personal, observant. You noticed their kid. You're not selling - you're sharing genuine enthusiasm.

Never:
- "Just following up..."
- "We'd love to have you back..."
- "Don't forget to enroll!"
- Generic compliments ("She did great!")

Always:
- Specific observations
- The child's name
- Something that shows you paid attention
- A concrete reason or next step

## Output Format

Return a JSON object with:
{
  "feelSpecialActions": [...],
  "showValueActions": [...],
  "reasonToReturnActions": [...],
  "insights": {
    "commonPatterns": [...],
    "suggestedImprovements": [...]
  }
}

Each action should have:
- familyId: string
- childName: string
- type: 'feel_special' | 'show_value' | 'reason_to_return'
- headline: string (short action title)
- reasoning: string (why this approach)
- channel: 'text' | 'email'
- draftMessage: string (the actual message to send)
- suggestedMedia?: string (optional media suggestion)

Be specific. Be personal. Make them feel it.`;

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch trial families (students with status 'prospect' or recent trials)
    const students = await base44.entities.Student.filter({ status: 'prospect' });
    const allStudents = await base44.entities.Student.list();
    
    // Fetch recent attendance to find trial students
    const recentAttendance = await base44.entities.Attendance.list('-date', 50);
    
    // Fetch classes for context
    const classes = await base44.entities.DanceClass.list();
    
    // Fetch studio settings
    const settings = await base44.entities.StudioSettings.list();
    const studioName = settings[0]?.name || 'Dance Studio';

    // Build trial families data
    const trialFamilies = students.map(s => ({
      id: s.id,
      childName: s.name,
      parentName: s.parent_name || 'Parent',
      parentEmail: s.parent_email,
      parentPhone: s.phone,
      trialDate: s.created_date,
      trialClass: classes.find(c => c.student_names?.includes(s.name))?.title || 'Trial Class',
      attended: recentAttendance.some(a => a.student_name === s.name && a.status === 'present'),
      teacherNotes: '',
      observations: s.tags || [],
      childAge: s.age || 7,
      interests: s.interests || [],
    }));

    // Fetch any student notes for teacher observations
    const notes = await base44.entities.StudentNote.list('-date', 100);
    trialFamilies.forEach(f => {
      const studentNotes = notes.filter(n => n.student_name === f.childName);
      if (studentNotes.length > 0) {
        f.teacherNotes = studentNotes.map(n => n.content).join(' | ');
      }
    });

    const attended = trialFamilies.filter(f => f.attended);
    const noShows = trialFamilies.filter(f => !f.attended);

    // Build upcoming classes with openings
    const upcomingClasses = classes.slice(0, 5).map(c => ({
      name: c.title,
      day: c.day,
      time: `${Math.floor(c.start_time)}:${((c.start_time % 1) * 60).toString().padStart(2, '0')}`,
      spotsOpen: 10 - (c.student_names?.length || 0),
    }));

    // Fetch upcoming performances as events
    const performances = await base44.entities.Performance.filter({ status: 'planning' });
    const upcomingEvents = performances.slice(0, 3).map(p => ({
      name: p.title,
      date: p.date,
      description: p.description || 'Upcoming performance',
    }));

    const userPrompt = `
## Studio Context

**Studio:** ${studioName}
**Owner:** ${user.full_name}

## Trial Families This Week

### Attended (${attended.length})

${attended.length === 0 ? 'None this week' : attended.map(f => `
**${f.childName}** (age ${f.childAge})
- Parent: ${f.parentName}
- Trial: ${f.trialClass} on ${formatDate(f.trialDate)}
- Teacher Notes: ${f.teacherNotes || 'None'}
- Observations: ${f.observations?.join(', ') || 'None'}
- Interests: ${f.interests?.join(', ') || 'Unknown'}
- Contact: ${f.parentEmail || f.parentPhone || 'Unknown'}
`).join('\n')}

### No-Shows (${noShows.length})

${noShows.length === 0 ? 'None this week' : noShows.map(f => `
**${f.childName}** (age ${f.childAge})
- Parent: ${f.parentName}
- Scheduled: ${f.trialClass} on ${formatDate(f.trialDate)}
- Contact: ${f.parentEmail || f.parentPhone || 'Unknown'}
`).join('\n')}

## Upcoming Opportunities

**Classes with openings:**
${upcomingClasses.map(c => `- ${c.name}: ${c.day} at ${c.time} (${c.spotsOpen} spots)`).join('\n')}

**Upcoming events:**
${upcomingEvents.length > 0 ? upcomingEvents.map(e => `- ${e.name}: ${e.date} - ${e.description}`).join('\n') : 'No upcoming events'}

## Your Task

For each trial family, create personalized actions:

1. **Feel Special** (for those who attended)
   - What specific thing can we say about their child that shows we noticed them?
   - Draft a message that makes the parent proud

2. **Show Value** (for no-shows)
   - What did they miss that would resonate with their kid?
   - Draft a message that creates FOMO without guilt

3. **Reason to Return** (for everyone)
   - What's a SPECIFIC reason this family should enroll?
   - Connect it to their child's interests, age, timing, or something observed

Make every message feel like it was written just for them. No templates.

Return ONLY valid JSON matching the output format.
`;

    const agentOutput = await base44.integrations.Core.InvokeLLM({
      prompt: `${CONVERTER_SYSTEM_PROMPT}\n\n${userPrompt}`,
      response_json_schema: {
        type: "object",
        properties: {
          feelSpecialActions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                familyId: { type: "string" },
                childName: { type: "string" },
                type: { type: "string" },
                headline: { type: "string" },
                reasoning: { type: "string" },
                channel: { type: "string" },
                draftMessage: { type: "string" },
                suggestedMedia: { type: "string" }
              }
            }
          },
          showValueActions: { type: "array", items: { type: "object" } },
          reasonToReturnActions: { type: "array", items: { type: "object" } },
          insights: {
            type: "object",
            properties: {
              commonPatterns: { type: "array", items: { type: "string" } },
              suggestedImprovements: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    // Find the converter outcomes
    const outcomes = await base44.entities.GrowthOutcome.filter({ agent: 'converter' });
    
    // Create GrowthActions from agent output
    const allActions = [
      ...(agentOutput.feelSpecialActions || []).map(a => ({ ...a, outcomeType: 'feel_special' })),
      ...(agentOutput.showValueActions || []).map(a => ({ ...a, outcomeType: 'show_value' })),
      ...(agentOutput.reasonToReturnActions || []).map(a => ({ ...a, outcomeType: 'reason_to_return' })),
    ];

    const createdActions = [];
    for (const action of allActions) {
      // Find matching outcome
      const outcome = outcomes.find(o => 
        (action.outcomeType === 'feel_special' && o.name.toLowerCase().includes('special')) ||
        (action.outcomeType === 'show_value' && o.name.toLowerCase().includes('no-show')) ||
        (action.outcomeType === 'reason_to_return' && o.name.toLowerCase().includes('come back'))
      );

      const growthAction = await base44.entities.GrowthAction.create({
        outcome_id: outcome?.id || outcomes[0]?.id,
        agent: 'converter',
        action_type: action.channel === 'email' ? 'email' : 'sms',
        status: 'pending_review',
        priority: 'high',
        target_type: 'family',
        target_id: action.familyId,
        target_name: action.childName,
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
      agent: 'converter',
      event_type: 'strategy',
      summary: `Generated ${createdActions.length} conversion actions for ${trialFamilies.length} trial families`,
      details: {
        attended: attended.length,
        noShows: noShows.length,
        actionsCreated: createdActions.length,
        insights: agentOutput.insights,
      },
    });

    return Response.json({
      success: true,
      agent: 'converter',
      trialsThisWeek: trialFamilies.length,
      attendedCount: attended.length,
      noShowCount: noShows.length,
      actionsCreated: createdActions.length,
      insights: agentOutput.insights,
    });

  } catch (error) {
    console.error('Converter agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});