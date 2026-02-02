import { base44 } from "@/api/base44Client";

/**
 * Shared AI processing layer for teacher notes
 * Handles bulk class notes, individual student notes, and attendance analysis
 */

// Fetch recent notes for a student to provide historical context
export async function fetchStudentHistory(studentName, limit = 5) {
  try {
    const notes = await base44.entities.StudentNote.filter(
      { student_name: studentName },
      '-created_date',
      limit
    );
    return notes;
  } catch (e) {
    return [];
  }
}

// Process bulk class notes from voice dictation
export async function processBulkNotes({
  transcript,
  classData,
  students,
  teacherName,
  recentNotes = [],
}) {
  if (!transcript.trim()) return { notes: [] };

  const classStudents = students.filter(s => classData.student_names?.includes(s.name));
  const studentContext = classStudents.map(s => ({
    name: s.name,
    level: s.level || 'Unknown',
    interests: s.interests || [],
    tags: s.tags || [],
    recentFeedback: recentNotes
      .filter(n => n.student_name === s.name)
      .slice(0, 2)
      .map(n => `${n.category}: ${n.content.slice(0, 80)}`)
  }));

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `
You are a senior dance education specialist analyzing a teacher's post-class voice notes.

CLASS CONTEXT:
- Class: ${classData.title}
- Style: ${classData.style || 'General'}
- Teacher: ${teacherName}
- Date: ${new Date().toLocaleDateString()}

STUDENTS IN CLASS (with context):
${studentContext.map(s => `
• ${s.name} (Level: ${s.level})
  - Interests: ${s.interests.join(', ') || 'None listed'}
  - Tags: ${s.tags.join(', ') || 'None'}
  - Recent feedback: ${s.recentFeedback.length > 0 ? s.recentFeedback.join(' | ') : 'No recent notes'}
`).join('')}

TEACHER'S RAW DICTATION:
"${transcript}"

INSTRUCTIONS:
1. Parse the dictation into individual, actionable notes
2. Match feedback to specific students when mentioned (fuzzy match names)
3. Create a "Class Summary" note for general observations
4. Categorize each note precisely:
   - technique: Form, alignment, execution, steps
   - behavior: Focus, attitude, energy, participation
   - progress: Improvement, milestones, breakthroughs
   - general: Everything else
5. Assess sentiment:
   - positive: Praise, achievement, strength
   - neutral: Observation, reminder
   - constructive: Area for growth, correction needed
6. Add relevant skill tags for tracking (e.g., "pirouettes", "musicality", "flexibility")
7. If a student has recent constructive feedback in the same area, note if this is improvement or continued struggle
8. Suggest one specific follow-up action when appropriate

OUTPUT FORMAT (JSON):
{
  "notes": [
    {
      "student_name": "Student Name or 'Class Summary'",
      "content": "Clear, professional note text",
      "category": "technique|behavior|progress|general",
      "sentiment": "positive|neutral|constructive",
      "tags": ["skill1", "skill2"],
      "follow_up": "Optional: specific action item for teacher or student",
      "shows_improvement": true|false|null
    }
  ],
  "class_insights": {
    "energy_level": "high|medium|low",
    "focus_areas": ["area1", "area2"],
    "standout_moments": "Brief summary of highlights"
  }
}
    `.trim(),
    response_json_schema: {
      type: "object",
      properties: {
        notes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              student_name: { type: "string" },
              content: { type: "string" },
              category: { type: "string", enum: ["technique", "behavior", "progress", "general"] },
              sentiment: { type: "string", enum: ["positive", "neutral", "constructive"] },
              tags: { type: "array", items: { type: "string" } },
              follow_up: { type: "string" },
              shows_improvement: { type: "boolean" }
            },
            required: ["student_name", "content", "category", "sentiment"]
          }
        },
        class_insights: {
          type: "object",
          properties: {
            energy_level: { type: "string" },
            focus_areas: { type: "array", items: { type: "string" } },
            standout_moments: { type: "string" }
          }
        }
      },
      required: ["notes"]
    }
  });

  return res;
}

// Process individual student note with AI refinement
export async function processIndividualNote({
  rawContent,
  student,
  classData,
  teacherName,
  recentNotes = [],
}) {
  if (!rawContent.trim()) return null;

  const recentForStudent = recentNotes
    .filter(n => n.student_name === student.name)
    .slice(0, 3)
    .map(n => `[${n.date}] ${n.category}: ${n.content.slice(0, 100)}`);

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `
You are a dance education assistant helping a teacher document student progress.

STUDENT: ${student.name}
- Level: ${student.level || 'Unknown'}
- Interests: ${(student.interests || []).join(', ') || 'None listed'}
- Tags: ${(student.tags || []).join(', ') || 'None'}

CLASS: ${classData.title} (${classData.style || 'General'})
TEACHER: ${teacherName}

RECENT NOTES FOR THIS STUDENT:
${recentForStudent.length > 0 ? recentForStudent.join('\n') : 'No recent notes'}

TEACHER'S RAW INPUT:
"${rawContent}"

TASK:
1. Refine the note into clear, professional language
2. Categorize: technique, behavior, progress, or general
3. Assess sentiment: positive, neutral, or constructive
4. Extract skill tags for tracking
5. Note if this shows improvement from recent feedback
6. Suggest a brief follow-up if appropriate

OUTPUT (JSON):
{
  "content": "Refined note text",
  "category": "technique|behavior|progress|general",
  "sentiment": "positive|neutral|constructive",
  "tags": ["skill1", "skill2"],
  "follow_up": "Optional action item",
  "shows_improvement": true|false|null,
  "parent_friendly_version": "A version suitable to share with parents (encouraging tone)"
}
    `.trim(),
    response_json_schema: {
      type: "object",
      properties: {
        content: { type: "string" },
        category: { type: "string", enum: ["technique", "behavior", "progress", "general"] },
        sentiment: { type: "string", enum: ["positive", "neutral", "constructive"] },
        tags: { type: "array", items: { type: "string" } },
        follow_up: { type: "string" },
        shows_improvement: { type: "boolean" },
        parent_friendly_version: { type: "string" }
      },
      required: ["content", "category", "sentiment"]
    }
  });

  return res;
}

// Analyze attendance patterns and generate alerts
export async function analyzeAttendance({
  attendance,
  classData,
  students,
}) {
  const issues = Object.entries(attendance).filter(([_, s]) => s === 'absent' || s === 'late');
  
  if (issues.length === 0) return { updates: [], insights: null };

  // Fetch recent attendance for context
  const recentAttendance = await base44.entities.Attendance.filter(
    { class_id: classData.id },
    '-date',
    50
  );

  const attendanceHistory = {};
  issues.forEach(([name]) => {
    const studentRecords = recentAttendance.filter(r => r.student_name === name);
    const totalClasses = studentRecords.length;
    const absences = studentRecords.filter(r => r.status === 'absent').length;
    const lates = studentRecords.filter(r => r.status === 'late').length;
    attendanceHistory[name] = { totalClasses, absences, lates };
  });

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `
Analyze attendance for ${classData.title}.

TODAY'S ISSUES:
${issues.map(([name, status]) => {
  const history = attendanceHistory[name] || { totalClasses: 0, absences: 0, lates: 0 };
  return `• ${name}: ${status} (History: ${history.absences} absences, ${history.lates} lates in ${history.totalClasses} classes)`;
}).join('\n')}

TASK:
1. Flag students who need attention (pattern of absences, first-time issue, etc.)
2. Generate appropriate alert summaries
3. Suggest follow-up actions

OUTPUT (JSON):
{
  "updates": [
    {
      "student_name": "Name",
      "flag": true|false,
      "severity": "low|medium|high",
      "summary": "Alert message",
      "suggested_action": "What to do next"
    }
  ],
  "class_attendance_note": "Brief overall attendance observation"
}
    `.trim(),
    response_json_schema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              student_name: { type: "string" },
              flag: { type: "boolean" },
              severity: { type: "string", enum: ["low", "medium", "high"] },
              summary: { type: "string" },
              suggested_action: { type: "string" }
            },
            required: ["student_name", "flag", "summary"]
          }
        },
        class_attendance_note: { type: "string" }
      },
      required: ["updates"]
    }
  });

  return res;
}

// Generate smart prompts for individual student notes
export async function generateNotePrompt({
  student,
  classData,
  recentNotes = [],
}) {
  const recentForStudent = recentNotes
    .filter(n => n.student_name === student.name)
    .slice(0, 3);

  const constructiveNotes = recentForStudent.filter(n => n.sentiment === 'constructive');
  const lastNote = recentForStudent[0];

  // Simple smart prompt without AI call for speed
  const prompts = [];
  
  if (constructiveNotes.length > 0) {
    const area = constructiveNotes[0].tags?.[0] || constructiveNotes[0].category;
    prompts.push(`Any progress on ${area}?`);
  }
  
  if (student.interests?.length > 0) {
    prompts.push(`How did they do with ${student.interests[0]} today?`);
  }
  
  if (lastNote) {
    prompts.push(`Following up from last class...`);
  }
  
  prompts.push("What stood out today?");
  
  return prompts[0] || "What stood out today?";
}