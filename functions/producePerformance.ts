import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const OUTPUT_SCHEMA = {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "producer_writeup": { "type": "string" },
    "questions": { "type": "array", "items": { "type": "string" }, "maxItems": 3 },
    "extracted_intake": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "show_type_used": { "type": "string", "enum": ["story", "theme"] },
        "theme_or_story_seed": { "type": ["string", "null"] },
        "theater_size": { "type": ["string", "null"] },
        "num_shows": { "type": ["integer", "null"] },
        "target_runtime_minutes": { "type": ["integer", "null"] },
        "constraints": { "type": "array", "items": { "type": "string" } },
        "assumptions": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["show_type_used", "theme_or_story_seed", "constraints", "assumptions"]
    },
    "show_plan": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "throughline": { "type": "string" },
        "run_of_show": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "order": { "type": "integer", "minimum": 1 },
              "segment_type": { "type": "string", "enum": ["performance", "transition", "emcee", "intermission", "curtain_call"] },
              "class_id": { "type": ["string", "null"] },
              "title": { "type": "string" },
              "estimated_minutes": { "type": "number", "minimum": 0.2, "maximum": 20 },
              "visual_concept": { "type": "string", "description": "Lighting, mood, backdrop settings" },
              "costume_concept": { "type": "string", "description": "Specific costume details" },
              "prop_requirements": { "type": "array", "items": { "type": "string" } },
              "music_selection": {
                "type": "object",
                "properties": {
                    "title": { "type": "string" },
                    "artist": { "type": "string" },
                    "edit_notes": { "type": "string" }
                },
                "required": ["title", "artist"]
              },
              "stage_action": { "type": "string", "description": "Blocking notes and movement" }
            },
            "required": ["order", "segment_type", "title", "estimated_minutes", "visual_concept", "costume_concept", "stage_action"]
          }
        },
        "production_tasks": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "department": { "type": "string", "enum": ["admin", "costume", "lighting", "sound", "stage_management", "choreography"] },
                    "task": { "type": "string" },
                    "detail": { "type": "string" },
                    "priority": { "type": "string", "enum": ["critical", "high", "medium", "low"] },
                    "due_milestone": { "type": "string", "enum": ["concept_lock", "1_month_out", "tech_week", "show_day", "post_show"] }
                },
                "required": ["department", "task", "priority", "due_milestone"]
            }
        },
        "risk_mitigation": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                    "risk": { "type": "string" },
                    "severity": { "type": "string", "enum": ["high", "medium", "low"] },
                    "mitigation_plan": { "type": "string" }
                },
                "required": ["risk", "severity", "mitigation_plan"]
            }
        }
      },
      "required": ["throughline", "run_of_show", "production_tasks", "risk_mitigation"]
    }
  },
  "required": ["producer_writeup", "questions", "extracted_intake", "show_plan"]
};

// PHASE 1: Conversational Creative Producer
const CREATIVE_SYSTEM_PROMPT = `You are Sequins, an expert Creative Producer & Project Manager for dance productions. 
Your Goal: Help the user define their show concept and then RIGOROUSLY PLAN the execution.

CRITICAL BEHAVIORS:
1. **ONE THING AT A TIME:** NEVER ask multiple questions in a single message. Guide the user step-by-step. If you need 5 pieces of info, ask for the first one, wait for the answer, then ask for the second.
2. **NO LISTS OF QUESTIONS:** Do not output numbered lists of "Steps to define". Just ask the next relevant question naturally.
3. **BE ACTION-ORIENTED:** Do not just chat about ideas. Constantly push for decisions that allow you to build the plan. "Great theme. Shall we lock that in so I can start the task list?"
4. **THINK LOGISTICS:** If they suggest a complex prop, ask "Do we have budget for that, or are we building it?"
5. **FILL IN THE GAPS:** Use your expertise to suggest standard production requirements (ticketing, ushers, quick change booths).
6. **PROFESSIONAL TONE:** Competent, organized, experienced.

Style: Concise. Directive. Efficient. Conversational.
`;

// PHASE 2: Structured Data Parser/Converter
const PARSER_SYSTEM_PROMPT = `You are the "Sequins Architect" - Lead Production Manager.
Your job is to take a creative conversation and synthesize a HIGHLY ACTIONABLE, DETAILED PROJECT PLAN.

Input: Conversation history + studio context.
Output: A JSON object strictly adhering to the schema.

CRITICAL INSTRUCTIONS:
1. **BE SPECIFIC:** Do not write "Get costumes". Write "Order 15 sequin leotards for Jazz 1 from Weissman." (Invent plausible details if needed to show the example).
2. **GENERATE TASKS:** The 'production_tasks' array is the most important part. Break down the show into concrete to-dos across all departments.
   - Music: Editing tracks, licensing.
   - Costumes: Measuring, ordering, fittings.
   - Admin: Ticketing setup, parent emails.
3. **REALISTIC RISKS:** specific risks (e.g. "Quick change for Senior tap routine") and specific mitigation plans (e.g. "Assign 2 parents to backstage left").
4. **COMPLETE THE RUN OF SHOW:** Every segment needs lighting concepts, specific prop lists, and costume notes.

Your output must be ready to be handed to a Stage Manager and a Project Manager to execute immediately.

Schema:
${JSON.stringify(OUTPUT_SCHEMA, null, 2)}
`;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { action = 'chat', chatHistory, context } = body;

        if (!context) {
            return Response.json({ error: 'Missing context' }, { status: 400 });
        }

        // --- PHASE 1: CHAT ---
        if (action === 'chat') {
            const messages = [
                { role: "system", content: CREATIVE_SYSTEM_PROMPT },
                { role: "system", content: `CONTEXT: ${JSON.stringify(context)}` },
                ...(chatHistory || [])
            ];

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: messages,
            });

            return Response.json({ 
                role: 'assistant', 
                content: completion.choices[0].message.content 
            });
        }

        // --- PHASE 2: GENERATE PLAN (JSON) ---
        if (action === 'generate_plan') {
            // Flatten chat history into a transcript for the parser
            const transcript = chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
            const userMessage = `Based on the following creative discussion and studio context, generate the full production plan JSON.\n\nCONTEXT:\n${JSON.stringify(context)}\n\nDISCUSSION TRANSCRIPT:\n${transcript}`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: PARSER_SYSTEM_PROMPT },
                    { role: "user", content: userMessage }
                ],
                response_format: { type: "json_object" }
            });

            let content = completion.choices[0].message.content;
            
            // Clean up markdown code blocks if present (safeguard)
            if (content.includes('```json')) {
                content = content.split('```json')[1].split('```')[0].trim();
            } else if (content.includes('```')) {
                content = content.split('```')[1].split('```')[0].trim();
            }
            
            let parsedContent;
            try {
                parsedContent = JSON.parse(content);
            } catch (e) {
                console.error("Failed to parse OpenAI response", content);
                return Response.json({ error: 'Failed to generate valid JSON plan' }, { status: 500 });
            }

            return Response.json(parsedContent);
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("Error in producePerformance:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});