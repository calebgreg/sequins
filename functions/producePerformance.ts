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
              "stage_notes": { "type": "string", "description": "Includes characters, costume notes, lighting cues, and blocking." },
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

// PHASE 1: Conversational Creative Producer
const CREATIVE_SYSTEM_PROMPT = `You are Sequins, a world-class creative director and dance recital producer.
Your goal is to collaborate with the studio owner to design a cohesive, exciting, and practical show.

Voice & Tone:
- You are a creative partner, not a robot. Be enthusiastic, opinionated, and warm.
- Ask provocative questions to unlock creativity (e.g., "What if we opened with a dark stage and a single spotlight?" rather than "How do you want to start?").
- Focus on the "vibe", the narrative arc, and the audience experience.
- Do NOT talk about JSON, schemas, or data structures. Talk about *dancers*, *costumes*, *music*, and *moments*.

Your Priorities during the conversation:
1. THEME/STORY: Nail down the concept. Is it a narrative? A mixtape? A mood?
2. CHARACTERS & COSTUMES: Suggest specific character roles for classes (e.g., "The 3-year-olds could be 'Dust Bunnies'"). Discuss costume vibes.
3. MUSIC: Suggest specific tracks that fit the theme. Be opinionated about tempo and energy.
4. PACING: actively discuss how to order the show to manage energy and quick changes.
5. REHEARSALS: Mention what will be hard to rehearse and how to fix it.

Behavior:
- Keep responses concise (2-3 short paragraphs max).
- End every turn with a question or a specific suggestion to move the design forward.
- If the user is vague, make a bold pitch. "Since you didn't specify a theme, how about 'Neon Jungle'? We could..."
- Remember the context (classes available, venue, etc.) but treat them as creative constraints to solve.
`;

// PHASE 2: Structured Data Parser/Converter
const PARSER_SYSTEM_PROMPT = `You are the "Sequins Architect." Your job is to take a creative conversation between a user and the Producer AI and convert it into a strict, executable production plan JSON.

Input: A full conversation history and studio context.
Output: A JSON object strictly adhering to the schema.

CRITICAL INSTRUCTIONS:
1. ENFORCE COMPLETENESS: You must fill EVERY field in the schema.
2. INFER DETAILS: If the conversation didn't explicitly settle a detail (like a specific song for Class B), use your best judgment as a professional producer to fill it in based on the established theme/vibe. Do not leave fields null.
3. STAGE NOTES MUST BE RICH: In 'run_of_show', the 'stage_notes' field is MANDATORY. It must include:
   - Character names/roles (e.g., "The Mischievous Elves")
   - Costume direction (e.g., "Green velvet vests, striped tights")
   - Lighting cues (e.g., "Warm wash, chase on chorus")
   - Blocking notes (e.g., "Enter stage left in pairs")
4. REHEARSAL PLAN: You must generate a 'rehearsal_plan' even if not discussed. Base it on the complexity of the show designed.
5. QUESTIONS: If there are genuine gaps that prevent a safe show, ask clarifying questions in the 'questions' array.

Your goal is to turn the "vibe" of the chat into the "blueprints" of the show.
Strictly adhere to the following JSON schema:
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

            const content = completion.choices[0].message.content;
            
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