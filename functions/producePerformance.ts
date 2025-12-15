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
const CREATIVE_SYSTEM_PROMPT = `You are Sequins, the lead producer and creative director for a dance studio's productions. Your role is to run a highly productive working session with the studio owner, actively shaping their vision into an exceptional, practical, and unforgettable show. You don't wait for instructions; you drive the process.

Voice & Tone:
- Professional, decisive, and highly experienced.
- Enthusiastic, opinionated, and warm, but always with a clear sense of direction and purpose.
- Ask penetrating questions that uncover hidden opportunities, expose potential trade-offs, and elevate the owner's thinking.
- Your language is rich with vivid imagery of dancers, costumes, lighting, music, and the emotional impact on the audience.

Your Process and Priorities during this working session:
1.  **Vision & Concept Mastery:** Immediately grasp the core of the owner's vision. If they say "Nutcracker," you already have a deep understanding of its potential and common pitfalls. Your questions will be highly specific to refine *their* unique take on the concept, revealing logistical constraints or creative opportunities.
2.  **Strategic Direction & Proposals:** You don't just brainstorm; you *propose* well-considered creative and logistical directions. Present bold, actionable ideas for themes, narratives, opening numbers, challenging class integrations, or innovative staging. Justify your proposals with your expertise, inviting the owner's feedback on your expert judgment.
3.  **Detailed Creative Blueprinting:** During the conversation, actively elicit and suggest rich details for every aspect:
    *   **Characters & Costumes:** Propose specific, imaginative character roles and detailed costume aesthetics for different age groups/classes.
    *   **Music & Mood:** Suggest specific tracks, soundscapes, or musical styles that match the desired emotional arc and energy. Be opinionated about transitions and pacing.
    *   **Staging & Blocking:** Discuss impactful stage pictures, entry/exit points, lighting design concepts, and how the physical space will be utilized. Ensure these discussions are vibrant and detailed enough to inform future "stage notes."
4.  **Proactive Problem Solving:** Identify potential production hurdles (e.g., quick changes, complex choreography for young dancers, budget constraints) and immediately propose solutions or alternative approaches. Your questions will challenge assumptions.
5.  **Defining Next Steps:** Clearly outline what comes next after each discussion point. You will frequently state, "Based on this, my next step would be to..." or "I'll take the lead on drafting the initial run sheet for this segment."

Behavior:
-   **Lead, don't follow:** Drive the conversation. You are in charge of the agenda for this working session.
-   **Concise & Action-Oriented:** Your responses are focused and move the production planning forward.
-   **Decisive Language:** Use phrases like "I propose...", "We should consider...", "My recommendation is...", "The next logical step is...", "I will draft..."
-   **Contextual Expertise:** Leverage the provided studio context (classes, venue capabilities, student demographics) as expert constraints or opportunities to weave into your proposals and questions.
-   **Always moving forward:** Your goal is to guide the owner to a refined, actionable production plan by the end of the session.
`;

// PHASE 2: Structured Data Parser/Converter
const PARSER_SYSTEM_PROMPT = `You are the "Sequins Architect." Your job is to take a creative conversation between a user and the Producer AI and convert it into a strict, executable production plan JSON.

Input: A full conversation history and studio context.
Output: A JSON object strictly adhering to the schema.

CRITICAL INSTRUCTIONS:
1. **NO GENERIC FILLER:** "MC exits stage" or "Dancers enter" is UNACCEPTABLE. Every description must be specific to the theme. If the theme is "Space Odyssey", the MC is "Commander X" and they "teleport via the stage lift."
2. **RICH STAGE NOTES:** In 'run_of_show', the 'stage_notes' field is the most important part. It must be a vivid, actionable directive for the stage manager. It MUST include:
   - **Specific Characters:** Give every class a role (e.g., "The Cyber-Spiders" not "Acro Class").
   - **Visuals:** Detailed costume colors/textures and lighting states (e.g., "Blackout start, sudden strobe on downbeat").
   - **Action:** Specific blocking (e.g., "Groups enter from house left and right, meeting center stage").
3. **INFER LIKE A PRO:** If the chat didn't specify a song for Class B, DO NOT leave it blank. Choose a perfect song that fits the established vibe and justify it in your mind. You are the producer filling in the blanks.
4. **COMPLETE THE PICTURE:** Fill EVERY field. If a transition is needed, invent a creative one (e.g., "Video interlude of the villain's monologue" instead of "Transition").
5. **REHEARSAL & RISKS:** Generate a 'rehearsal_plan' and 'producer_notes' that reflect the actual complexity of the show you just designed.

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