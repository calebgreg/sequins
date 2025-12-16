import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
// OpenAI import removed to use Base44 Integration

const OUTPUT_SCHEMA = {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "producer_writeup": { "type": "string" },
    "questions": { "type": "array", "items": { "type": "string" }, "maxItems": 1 },
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
              "segment_type": { "type": "string", "enum": ["performance", "transition", "emcee", "intermission", "curtain_call", "quick_change"] },
              "class_id": { "type": ["string", "null"] },
              "title": { "type": "string" },
              "estimated_minutes": { "type": "number", "minimum": 0.2, "maximum": 20 },
              "visual_concept": { "type": "string", "description": "Lighting, mood, backdrop settings" },
              "costume_concept": { "type": "string", "description": "Specific costume details" },
              "costume_product_suggestions": {
                  "type": "array",
                  "items": {
                      "type": "object",
                      "properties": {
                          "name": { "type": "string", "description": "Name of the costume item" },
                          "url": { "type": "string", "description": "Direct link to the product page" },
                          "image_url": { "type": "string", "description": "Direct link to the costume image" }
                      },
                      "required": ["name", "url"]
                  },
                  "description": "CRITICAL: A list of 1-3 REAL costume products found on the studio's preferred vendor sites. Must include direct product page URLs and image URLs."
              },
              "prop_requirements": { "type": "array", "items": { "type": "string" } },
              "music_selection": {
                                    "type": "object",
                                    "properties": {
                                        "title": { "type": "string", "description": "The specific SONG TITLE (Single Track). Include mix/version info here if applicable (e.g. 'Samba de Janeiro - Carnaval Mix')." },
                                        "artist": { "type": "string", "description": "The actual performing artist(s). MUST BE INCLUDED. Do not infer from title, use explicit artist names. If multiple, separate with commas." },
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
        },
        "required": ["throughline", "run_of_show", "production_tasks"]
    }
  },
  "required": ["producer_writeup", "questions", "extracted_intake", "show_plan"]
};

// PHASE 1: Conversational Creative Producer
const CREATIVE_SYSTEM_PROMPT = `You are Sequins, a Creative Director helping a Studio Owner visualize their show.
Your Goal: Brainstorm the creative VISION (Theme, Mood, Music, Staging). You are NOT a shopping assistant.

CRITICAL BEHAVIORS:
1. **ONE THING AT A TIME:** NEVER ask multiple questions in a single message. Guide the user step-by-step. If you need 5 pieces of info, ask for the first one, wait for the answer, then ask for the second.
2. **NO LISTS OF QUESTIONS:** Do not output numbered lists of "Steps to define". Just ask the next relevant question naturally.
3. **BE ACTION-ORIENTED:** Do not just chat about ideas. Constantly push for decisions that allow you to build the plan. "Great theme. Shall we lock that in so I can start the task list?"
4. **THINK LOGISTICS:** If they suggest a complex prop, ask "Do we have budget for that, or are we building it?"
5. **FILL IN THE GAPS:** Use your expertise to suggest standard production requirements (ticketing, ushers, quick change booths).
6. **ABSOLUTE PROHIBITION ON SHOPPING/SOURCING:**
   - **YOU DO NOT HAVE ACCESS TO INVENTORY:** Do not pretend to know what is in stock at Weissman, Revolution, etc. 
   - **NEVER MENTION VENDORS:** Do not name-drop costume vendors. 
   - **NEVER PROVIDE LINKS:** You are physically incapable of browsing the web right now.
   - **IF ASKED FOR COSTUMES:** Describe the *look* (e.g. "A flowing teal lyrical dress"), but refuse to provide a specific product link until the Plan Generation phase.
7. **PROFESSIONAL TONE (CRITICAL):** 
         - You are speaking to a Studio Owner. NEVER explain basic concepts like "quick changes take time" or "recitals have intermissions". They know this.
         - NEVER cite websites or external sources for common industry knowledge. It is insulting.
         - **DO THE MATH, DON'T EXPLAIN IT:** If they ask for 60 mins, just calculate the slots based on your internal knowledge of transitions/breaks and present the result. "To hit a hard 60m run time with breaks, we fit about 12 routines."

      Style: Concise. Directive. Efficient. Conversational. PEER-TO-PEER.
`;

// PHASE 2: Structured Data Parser/Converter
const PARSER_SYSTEM_PROMPT = `You are the "Sequins Architect" - A WORLD-CLASS Production Manager.
      Your job is to take a creative conversation and synthesize a HIGHLY ACTIONABLE, LOGISTICALLY SOUND PROJECT PLAN.

      Input: Conversation history + studio context.
      Output: A JSON object strictly adhering to the schema.

      CRITICAL INSTRUCTIONS:
1. **BE SPECIFIC:** Do not write "Get costumes". Write "Order 15 sequin leotards for Jazz 1 from Weissman." (Invent plausible details if needed to show the example).
2. **GENERATE TASKS:** The 'production_tasks' array is the most important part. Break down the show into concrete to-dos across all departments.
   - Music: Editing tracks, licensing.
   - Costumes: Measuring, ordering, fittings, and most importantly, sourcing specific product suggestions with links and image URLs.
   - Admin: Ticketing setup, parent emails.
3. **REALISTIC TIMING (CRITICAL):** 
         - A "60-minute show" implies TOTAL run time, NOT just dance time. 
         - You MUST account for transitions (30-60s), Emcee intros (1-2m), and Quick Changes (2-3m).
         - If the user asks for a 60-minute show, the sum of ALL segments (performances + transitions + breaks) must equal ~60 mins. 
         - Do not cram 60 minutes of pure dancing into a 60-minute slot. Reduce the number of routines if necessary to fit the logistics.
      4. **COMPLETE THE RUN OF SHOW:** Every segment needs lighting concepts, specific prop lists, and costume notes, plus concrete costume product suggestions.
4. **MUSIC SELECTION IS STRICTLY SONGS:** When selecting music, you MUST provide the specific SONG TITLE (Track Name), NEVER the Album title. "La Vie en Rose" is a song. "The Very Best of Edith Piaf" is an album - DO NOT USE THAT.
5. **ALWAYS INCLUDE ARTISTS:** You MUST populate the 'artist' field for every single music track. If a specific mix is chosen (e.g. "Samba de Janeiro - Carnaval Mix"), you MUST list the actual artists associated with that track (e.g. "Liu, Plastik Funk, Toxic Joy, Bellini"). DO NOT leave the artist field empty if the song is known.
6. **COSTUME PRODUCT SOURCING (REAL-TIME SEARCH REQUIRED):**
          - You have INTERNET ACCESS. USE IT.
          - For EVERY 'performance' segment, you MUST search the specific vendor sites (e.g. `weissmans.com`, `revolutiondance.com`) for ACTUAL, AVAILABLE products that match the visual concept.
          - **DO NOT** make up links. **DO NOT** use generic homepages.
          - **MANDATORY:** You MUST find 1-2 distinct options per routine.
          - **IMAGES:** You MUST extract the actual image URL for the product. This is crucial for the user interface.
          - **VARIETY:** Do not use the same costume for every routine unless it's a specific "Opening Number" request. Match the style (Hip Hop gets streetwear/loose, Ballet gets tutus/dresses).
          - **FORMAT:**
              - `name`: Real product name from the site.
              - `url`: The actual Deep Link to the product page.
              - `image_url`: The actual source URL of the product image.

Your output must be ready to be handed to a Stage Manager and a Project Manager to execute immediately.
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
            console.log(`[Producer] Starting chat turn. History length: ${chatHistory?.length}`);

            // SANITIZE CONTEXT: Remove costume vendors to prevent premature sourcing hallucination
            // The AI should not know about specific vendors during the creative phase
            if (context && context.studio) {
                // Create a deep copy to avoid mutating the original context for other uses if any (though here it's request scope)
                // But mainly just strip the field.
                delete context.studio.costume_vendors;
            }

            // Truncate history to avoid timeouts/limits (keep system + last 20 messages)
            const recentHistory = (chatHistory || []).slice(-20);
            const conversation = recentHistory.map(m => `${m.role === 'user' ? 'USER' : 'SEQUINS'}: ${m.content}`).join('\n\n');

            const prompt = `${CREATIVE_SYSTEM_PROMPT}

        CONTEXT: ${JSON.stringify(context)}

        CONVERSATION HISTORY:
        ${conversation}

        (Note: Reply as Sequins. Maintain a balanced focus on all production elements.)`;

            try {
                console.log("[Producer] Invoking LLM for chat...");
                const startTime = Date.now();

                // Use Base44 Integration (Internet Disabled for Chat to prevent premature sourcing)
                const aiResponse = await base44.integrations.Core.InvokeLLM({
                    prompt: prompt,
                    add_context_from_internet: false
                });

                console.log(`[Producer] LLM responded in ${(Date.now() - startTime) / 1000}s`);

                return Response.json({ 
                    role: 'assistant', 
                    content: aiResponse 
                });
            } catch (err) {
                console.error("[Producer] LLM Chat Error:", err);
                // Return a graceful error message as a chat response so the UI doesn't crash
                return Response.json({ 
                    role: 'assistant', 
                    content: "I'm having a little trouble connecting to my creative brain right now. Could you try asking that again?" 
                });
            }
        }

        // --- PHASE 2: GENERATE PLAN (JSON) ---
        if (action === 'generate_plan') {
            console.log("[Producer] Starting plan generation...");

            try {
                // Flatten chat history into a transcript for the parser
                // Truncate if extremely long to avoid context window issues
                const recentHistory = (chatHistory || []).slice(-40); 
                const transcript = recentHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

                const fullPrompt = `${PARSER_SYSTEM_PROMPT}

        Based on the following creative discussion and studio context, generate the full production plan JSON.

        CONTEXT:
        ${JSON.stringify(context)}

        DISCUSSION TRANSCRIPT:
        ${transcript}`;

                console.log("[Producer] Invoking LLM for plan generation...");
                const startTime = Date.now();

                // Use Base44 Integration for structured output
                // CRITICAL: Enable internet access so it can actually search for real products
                const aiResponse = await base44.integrations.Core.InvokeLLM({
                    prompt: fullPrompt,
                    response_json_schema: OUTPUT_SCHEMA,
                    add_context_from_internet: true
                });

                console.log(`[Producer] Plan generated in ${(Date.now() - startTime) / 1000}s`);

                return Response.json(aiResponse);
            } catch (err) {
                console.error("[Producer] Plan Generation Error:", err);
                return Response.json({ error: "Failed to generate plan. Please try again or refine the details." }, { status: 500 });
            }
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("Error in producePerformance:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});