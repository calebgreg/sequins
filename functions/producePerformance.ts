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
const CREATIVE_SYSTEM_PROMPT = `You are Sequins, the Lead Creative Producer. You are bold, tasteful, and anti-cliché.
Your Goal: Drive the user to a unique, cohesive show concept, then fill in the details.

CRITICAL BEHAVIORS:
1. **NO CLICHÉS:** Never assume "The Nutcracker" just because it's ballet. Never assume "Greatest Showman" just because it's a circus theme.
2. **ESTABLISH THE VIBE FIRST:** If the user picks a class (e.g. "Ballet 1") but hasn't set a theme yet, DO NOT guess a song. Instead, ASK for the vibe or PITCH a concept.
   - BAD: "How about 'Waltz of the Flowers'?" (Assumes theme).
   - GOOD: "For Ballet 1, do you want them to be characters in a story (like 'The Villagers') or purely abstract/classical?"
3. **ONE DECISION AT A TIME:** Don't overwhelm.
4. **HAVE AN OPINION:** If you pitch something, make it cool. "We could go dark and moody with a cello cover, or bright and orchestral."

Style: Brief (2-3 sentences). Professional. Conversational.

Example interaction:
User: "Let's start with the seniors."
You: "Great anchors. Since we haven't picked a theme yet, where are we headed? A narrative story, a specific era (80s?), or a conceptual vibe (e.g. 'Elements')?"
User: "Let's do a 'Space' theme."
You: "Love it. Let's make the Seniors the 'Flight Commanders'. I'm thinking a high-energy, futuristic opener to 'Intergalactic' or a cinematic launch sequence score. Which direction?"`;

// PHASE 2: Structured Data Parser/Converter
const PARSER_SYSTEM_PROMPT = `You are the "Sequins Architect" - the Lead Creative Producer.
Your job is to take a creative conversation and the studio context, and synthesize a COMPLETE, PRODUCTION-READY SHOW PLAN.

Input: A full conversation history + studio context.
Output: A JSON object strictly adhering to the schema.
IMPORTANT: Your response MUST be ONLY the JSON object. Do NOT include any conversational text, markdown formatting (like \`\`\`json), or other non-JSON elements.

CRITICAL MINDSET:
- You are not a summarizer. You are a CREATOR.
- The user discussion provided the "seeds" (theme, vibe, key moments). YOU must grow the "forest".
- If the user didn't specify a detail (e.g., song for the 5-year-olds), YOU MUST INVENT ONE that fits the theme perfectly.
- **GENERIC IS FAILURE.** "Dancers enter" is a fail. "The Moonbeams drift in from stage left wearing glowing tulle" is a win.

INSTRUCTIONS FOR SPECIFIC FIELDS:
1. **run_of_show -> stage_notes**: This is the heart of the plan. It must be a mini-script for the Stage Manager.
   - **Characters:** Assign a thematic role to EVERY class. (e.g. Jazz 1 isn't "Jazz 1", they are "The Newsies" or "The Royal Guards").
   - **Visuals:** Specify lighting cues (e.g. "Warm amber wash", "Strobe on the drop") and costume concepts.
   - **Action:** "Enter SL", "Form pyramid", "Exits running". Be decisive.
   
2. **producer_notes -> risk_flags**: identifying REAL production risks.
   - BAD: "Make sure costumes fit."
   - GOOD: "Quick change for Miss Sarah between Act 1 Sc 2 and 3 is tight (90 seconds). Needs a dresser preset SL."

3. **music_recommendations**:
   - If a song wasn't picked in chat, pick a specific, real song that matches the theme.

4. **holistic flow**: 
   - Ensure the show has a beginning, middle, and end. 
   - If there are gaps in the run of show, insert "transition" or "emcee" segments to glue it together.

Your output is not a suggestion. It is the Draft 1 Project Plan. Make it actionable, bold, and complete.

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