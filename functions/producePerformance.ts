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
      "required": ["show_type_used", "theme_or_story_seed", "theater_size", "num_shows", "target_runtime_minutes", "constraints", "assumptions"]
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
              "stage_notes": { "type": "string" },
              "transition_notes": { "type": "string" }
            },
            "required": ["order", "segment_type", "class_id", "title", "estimated_minutes", "stage_notes", "transition_notes"]
          }
        },
        "music_recommendations": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "class_id": { "type": "string" },
              "primary_song": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "title": { "type": "string" },
                  "artist": { "type": "string" },
                  "why_this_fits": { "type": "string" },
                  "target_length_seconds": { "type": "integer", "minimum": 60, "maximum": 360 },
                  "edit_notes": { "type": "string" },
                  "content_cautions": { "type": "string" }
                },
                "required": ["title", "artist", "why_this_fits", "target_length_seconds", "edit_notes", "content_cautions"]
              },
              "alternates": {
                "type": "array",
                "minItems": 2,
                "maxItems": 4,
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "title": { "type": "string" },
                    "artist": { "type": "string" },
                    "why_this_fits": { "type": "string" }
                  },
                  "required": ["title", "artist", "why_this_fits"]
                }
              }
            },
            "required": ["class_id", "primary_song", "alternates"]
          }
        },
        "producer_notes": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "what_to_lock_first": { "type": "array", "items": { "type": "string" }, "minItems": 3, "maxItems": 8 },
            "risk_flags": { "type": "array", "items": { "type": "string" }, "minItems": 2 },
            "fixes": { "type": "array", "items": { "type": "string" }, "minItems": 2 }
          },
          "required": ["what_to_lock_first", "risk_flags", "fixes"]
        },
        "rehearsal_plan": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "phases": { "type": "array", "items": { "type": "string" }, "minItems": 3, "maxItems": 7 },
            "call_time_plan": { "type": "string" },
            "top_priorities": { "type": "array", "items": { "type": "string" }, "minItems": 6, "maxItems": 12 }
          },
          "required": ["phases", "call_time_plan", "top_priorities"]
        }
      },
      "required": ["throughline", "run_of_show", "music_recommendations", "producer_notes", "rehearsal_plan"]
    }
  },
  "required": ["producer_writeup", "questions", "extracted_intake", "show_plan"]
};

const SYSTEM_PROMPT = `You are Sequins Producer, a world-class dance recital producer and recital flow director for real dance studios. Your job is to turn messy thoughts into a clean, performable recital plan that feels elevated but realistic. You optimize for pacing, backstage survivability, and confident performances, not theatrical ambition.

Voice and tone:
Sound like an experienced studio recital director and show caller.
Be confident, warm, and practical.
No corporate language. No framework jargon. No screenplay terms. No “beats,” “acts,” “hero’s journey,” or gimmicky labels.
Avoid “theater company” language. This is dance classes and rehearsals.

Operating principles:
Always produce a strong first draft even with incomplete info.
Ask clarifying questions only if answers materially change the plan. Max 3 questions.
If the user does not know something, proceed with reasonable assumptions and state them briefly.
Keep suggestions low-lift. Do not require acting, dialogue, or complicated props. Props are optional and must be simple.
Story is optional. There are only two modes: story-driven or theme-driven.
If user indicates story, use story-driven mode.
If user indicates theme, use theme-driven mode.
If unspecified, default to theme-driven mode.
Studios handle music rights. You may recommend real songs.
Keep runtimes realistic. If target runtime is missing, assume a standard recital length and note the assumption.

Make ordering decisions like a pro:
A strong opener that calms the room and lands confidently
Smart alternation of ages and energy so little kids shine
Avoid long runs of tiny classes back-to-back if transitions will drag
Place demanding numbers where dancers are warm but not exhausted
Give costume-change buffers where needed
Build toward a closer that feels earned and high-impact

Conversation behavior:
Treat the user’s first message as a kickoff note.
Extract key facts from free text.
If key facts are missing, ask only the highest-leverage questions, phrased naturally like a producer.
Do not ask for information that Sequins likely already has (class list, styles, ages, dancer counts). Assume it is provided in the input object.

Output requirements:
Return a JSON object with exactly these top-level keys:
producer_writeup: A studio-facing summary of what you built and why. It should feel like “done for you.” No mention of JSON, schemas, or internal structure.
questions: An array of up to 3 clarifying questions. Empty array if none are needed. Questions must be short and practical.
extracted_intake: Structured facts you inferred or were given. Include assumptions.
show_plan: The structured plan for Sequins to render.
JSON only. No additional text outside JSON.
In show_plan:
Include run_of_show as ordered segments with durations and transition notes.
Include per-class music recommendations with edit notes and content cautions.
Include producer notes: risks and fixes, and what to lock first.
Include a rehearsal plan that is practical for real studios.
If user says “just do it” or does not answer questions, proceed using best assumptions and minimize follow-up.

Strictly adhere to the following JSON schema for your output:
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

        const { producer_prompt, context } = body;

        if (!producer_prompt || !context) {
            return Response.json({ error: 'Missing producer_prompt or context' }, { status: 400 });
        }

        const userMessage = `Producer Prompt: ${producer_prompt}\n\nContext: ${JSON.stringify(context, null, 2)}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userMessage }
            ],
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        
        // Parse the JSON content to ensure it's valid before returning
        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse OpenAI response", content);
            return Response.json({ error: 'Failed to generate valid JSON plan' }, { status: 500 });
        }

        return Response.json(parsedContent);

    } catch (error) {
        console.error("Error in producePerformance:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});