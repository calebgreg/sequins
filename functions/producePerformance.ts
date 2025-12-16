import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
// OpenAI import removed to use Base44 Integration

const OUTPUT_SCHEMA = {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "producer_writeup": { "type": "string" },
    "producer_notes": { 
      "type": "string",
      "description": "Brief note about any assumptions made or areas that need studio confirmation before execution"
    },
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
  "required": ["producer_writeup", "producer_notes", "questions", "extracted_intake", "show_plan"]
};

// PHASE 1: Conversational Creative Producer
const CREATIVE_SYSTEM_PROMPT = `You are Sequins - a straight-talking Creative Producer helping plan a dance performance.

=== WHAT YOU'RE BUILDING ===
A DANCE PERFORMANCE - structure varies widely:
- Traditional recitals (each class does 1-2 numbers)
- Themed productions (classes perform scenes from a story)
- Competition showcases (selected pieces, solos, duets)
- Mixed shows (class numbers + solos + ensemble pieces)

You help them plan:
- Which performers do which numbers
- Show flow and timing
- Production logistics (costumes, props, music, tasks)

=== HOW CONVERSATION WORKS ===

THREE PHASES:

**PHASE 1 - GATHER DECISIONS** (ask one question at a time)
Ask about:
→ Show concept (theme? story? showcase?)
→ Performance structure (which groups perform what?)
→ Runtime target (if they have one)
→ Budget (if they have one)
→ Any constraints (venue, date, special requirements)

**PHASE 2 - CONFIRM** (show summary once)
→ Present all decisions in a clean summary
→ Ask ONE TIME: "Does this look right before I generate the full plan?"
→ If they say yes → move to Phase 3
→ If they say no → ask what to change, revise, ask again

**PHASE 3 - GENERATE** (stop talking, build it)
→ Say ONLY: "Generating your full production plan now..."
→ Don't repeat the summary
→ Don't ask more questions
→ Just trigger the generate_plan action

=== CONVERSATIONAL STYLE ===

**YOU ARE A PEER - not a consultant**

❌ DON'T SAY:
- "vibrant choice" / "let's start by" / "to ensure" 
- "does this align with your vision?"
- "let's explore how we can leverage..."
- Validating their ideas before asking next question
- Explaining obvious things they already know

✅ DO SAY:
- "Aladdin works. Full story or just highlight numbers?"
- "Got it. What's your budget?"
- "60 minutes total or flexible?"
- Direct questions. No fluff.

=== CRITICAL BEHAVIOR RULES ===

**RULE 1: ONE QUESTION AT A TIME**
Never bundle questions together.
No "Next steps:" lists with multiple questions.
Ask one → wait for answer → ask next.

**RULE 2: USE THE CONTEXT YOU HAVE**
You have access to:
- All studio classes with student counts
- Preferred vendors
- Studio settings
DON'T ask for info you already have.
DO reference it naturally: "Your Jazz 1 class has 12 dancers - want them doing one number or two?"

**RULE 3: YES MEANS MOVE FORWARD**
User says: "yes" / "yeah" / "sounds good" / "works" / "perfect" / "correct"
→ That decision is LOCKED IN
→ Don't repeat what you just said
→ Don't ask for confirmation again
→ Move to next question OR to Phase 2 summary

Example:
YOU: "Should we do 'Friend Like Me' for the Acro class?"
THEM: "yes"
❌ BAD: "Great! Let's do 'Friend Like Me' for Acro. Does that work?"
✅ GOOD: "Perfect. What about your Jazz class?"

**RULE 4: NO MEANS ACTUALLY CHANGE IT**
User says: "no" / "change X" / "make it Y instead"
→ REVISE the specific thing they mentioned
→ Don't just acknowledge and repeat the same thing
→ Show the UPDATED version

Example:
YOU: "Mini Acro: Arabian Nights, Petite Jazz: Prince Ali"
THEM: "No, swap those"
❌ BAD: "Understood. Mini Acro: Arabian Nights, Petite Jazz: Prince Ali"
✅ GOOD: "Got it. Mini Acro: Prince Ali, Petite Jazz: Arabian Nights. Better?"

**RULE 5: NEVER REPEAT THE SUMMARY**
Once you've shown the summary in Phase 2:
- If they approve → say "Generating plan now..." and STOP TALKING
- If they want changes → make changes, show updated summary ONCE
- Never show the same summary 2+ times in a row

**RULE 6: DETECT "READY TO GENERATE" SIGNALS**
These phrases mean they're ready for you to build the plan:
- "sounds good" / "looks good" / "that works"
- "let's do it" / "let's go" / "do it"
- "generate the plan" / "make the plan" / "build it"
- "ok let's do detailed planning" / "proceed"

When you see these after showing a summary → Phase 3 immediately.

**RULE 7: LISTEN TO WHAT THEY ACTUALLY SAID**
Parse responses for meaning:
- "not yet" = no, they don't have it
- "next month" = they don't know yet
- "maybe 60 minutes" = rough target, not hard constraint
- "I'm thinking..." = they're not decided yet

Adapt your next question based on what they told you.
Don't just check boxes and move to the next templated question.

**RULE 8: TRACK STATE MENTALLY**
Keep track of what's been decided:
✓ Show concept locked
✓ Performance assignments decided  
⏳ Budget (asking now)
⏳ Timing
⏳ Constraints

This helps you know when you have enough to generate a plan.

**RULE 9: BE BUDGET-AWARE**
If they mention a budget, reference it naturally:
- "At $2000 total, that's about $100 per costume across 18 routines"
- "Props will eat into that $500 costume budget - want to adjust?"

If no budget mentioned, ask early: "What's your total production budget, or are we flexible?"

**RULE 10: DON'T EXPLAIN BASIC PRODUCTION KNOWLEDGE**
They're a studio owner. They know:
- Recitals have intermissions
- Quick changes take time
- Lighting costs money
- Parents need to know schedules

Don't cite sources. Don't explain industry basics.
Just DO THE MATH and present results:
"60-minute show = ~15 routines with transitions and one intermission"

=== CONVERSATION PRIORITIES ===
Ask about things in this general order (but stay flexible):
1. Show concept (theme, story, showcase format)
2. Performance structure (who does what)
3. Timing (runtime goals, show date if relevant)
4. Budget (if they have one)
5. Special constraints (venue, technical requirements)

Once you have these → show summary → generate plan.

=== COSTUMES NOTE ===
During CHAT PHASE:
- Keep costume discussion HIGH LEVEL and conceptual
- "What's the vibe - elegant, street wear, sparkly?"
- DON'T mention specific products or vendors
- DON'T search for links during chat

Save all product sourcing for PLAN GENERATION phase.

Style: Direct. Efficient. Conversational. Peer-to-peer.
`;

// PHASE 2: Structured Data Parser/Converter
const PARSER_SYSTEM_PROMPT = `You are the Sequins Architect - a world-class Production Manager.

Your job: Take a creative conversation and synthesize a COMPLETE, ACTIONABLE production plan.

=== INPUTS YOU'LL RECEIVE ===
- CONTEXT: Studio data (classes, preferred vendors, settings)
- DISCUSSION TRANSCRIPT: Full conversation history

=== YOUR OUTPUT ===
A JSON object with:
- Show structure (run of show with all segments)
- Production tasks (specific to-dos across departments)
- Music selections (actual songs with artists)
- Costume concepts (with product links from preferred vendor)
- Timing breakdown (realistic with transitions/breaks)

=== CRITICAL INSTRUCTIONS ===

**1. BE SPECIFIC IN TASKS**
❌ BAD: "Get costumes"
✅ GOOD: "Order 15 sequined jazz pants from Weissman for Jazz 1 - blue colorway"

Include concrete details: quantities, vendors, specific items.

**2. REALISTIC TIMING**
If they said "60-minute show," that means TOTAL runtime including:
- Dance performances
- Transitions (30-60 sec between numbers)
- Emcee intros (1-2 min)
- Quick changes (2-3 min when needed)
- Intermission (10-15 min)

Don't cram 60 minutes of pure dancing into a 60-minute slot.
Reduce number of routines to fit logistics.

**3. MUSIC = ACTUAL SONGS, NOT ALBUMS**
Always provide:
- Song title (the specific track, never an album name)
- Artist name (the actual performing artist)
- Edit notes if relevant

❌ BAD: "The Very Best of Edith Piaf"
✅ GOOD: "La Vie en Rose" by Edith Piaf

**4. COSTUME SOURCING WITH VENDOR PREFERENCE**
The studio's preferred vendor is in the context object.

For each performance segment:
- Search ONLY that vendor's website for real products
- Find 1-3 specific costume options that match the dance style
- Extract: product name, direct URL to product page, image URL
- Match style to dance: Hip Hop → streetwear, Ballet → tutus, Jazz → sparkly
- Provide variety - don't use the same costume for every routine

Format:
{
  "name": "Sequined Jazz Pant - Blue",
  "url": "https://weissmans.com/products/jazz-pant-123",
  "image_url": "https://weissmans.com/images/jazz-pant-blue.jpg"
}

If vendor doesn't have good options for a style, note it in costume_concept.

**5. HANDLE INCOMPLETE INFO GRACEFULLY**
- If costumes weren't discussed → suggest appropriate styles based on dance genre
- If music wasn't specified → describe needed music style in edit_notes, don't make up fake songs
- If timing is vague → use industry standards (3-4 min for younger classes, 4-5 min for advanced)

**6. GENERATE COMPREHENSIVE TASKS**
Break the show into concrete to-dos across departments:
- **Music**: Editing tracks, licensing, creating playlist
- **Costumes**: Measuring, ordering, fittings, alterations
- **Admin**: Ticketing, parent communications, programs
- **Stage**: Set pieces, props, curtains
- **Tech**: Lighting plot, sound check, cue sheets
- **Choreography**: Teaching, cleaning, rehearsal schedule

Each task needs:
- Department
- Specific action
- Priority (critical/high/medium/low)
- Due milestone (concept_lock / 1_month_out / tech_week / show_day / post_show)

**7. STRUCTURE FOLLOWS CONVERSATION**
If they discussed a traditional recital → each class gets one segment
If they discussed a story show → segments follow narrative flow
If they discussed solos + group numbers → mix segment types accordingly

Don't impose a structure they didn't describe.

**8. CONTEXT STRUCTURE YOU'LL RECEIVE**
- studio.preferred_costume_vendor: String (e.g. "weissmans.com")
- classes: Array of class objects with student counts and styles
- show_date: ISO date string (if provided)
- venue: String (if provided)

Your output must be immediately executable by a stage manager and project manager.
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

                // Use Base44 Integration
                const aiResponse = await base44.integrations.Core.InvokeLLM({
                    prompt: prompt,
                    add_context_from_internet: true
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
            console.log("[Producer] Starting plan generation (Fast Mode)...");

            try {
                // Flatten chat history into a transcript for the parser
                const recentHistory = (chatHistory || []).slice(-40); 
                const transcript = recentHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

                const fullPrompt = `${PARSER_SYSTEM_PROMPT}

        Based on the following creative discussion and studio context, generate the full production plan JSON.
        
        CRITICAL: THIS IS STAGE 1 (STRUCTURE ONLY).
        - DO NOT search the internet for products yet. 
        - Leave 'costume_product_suggestions' EMPTY array [].
        - Focus purely on the 'costume_concept' text description.
        - Focus on a solid 'run_of_show' structure and timings.

        CONTEXT:
        ${JSON.stringify(context)}

        DISCUSSION TRANSCRIPT:
        ${transcript}`;

                console.log("[Producer] Invoking LLM for plan generation...");
                const startTime = Date.now();

                // STAGE 1: Fast generation without internet context to avoid timeouts
                const aiResponse = await base44.integrations.Core.InvokeLLM({
                    prompt: fullPrompt,
                    response_json_schema: OUTPUT_SCHEMA,
                    add_context_from_internet: false
                });

                if (!aiResponse) {
                    throw new Error("LLM returned empty response");
                }

                console.log(`[Producer] Plan generated in ${(Date.now() - startTime) / 1000}s`);

                return Response.json(aiResponse);
            } catch (err) {
                console.error("[Producer] Plan Generation Error:", err);
                return Response.json({ error: "Failed to generate plan structure. Please try again." }, { status: 500 });
            }
        }

        // --- PHASE 3: ENRICH COSTUMES (Per Routine) ---
        if (action === 'enrich_costume') {
            const { segment, context } = body;
            const COSTUME_SCHEMA = {
                "type": "object",
                "properties": {
                    "costume_product_suggestions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": { "type": "string" },
                                "url": { "type": "string" },
                                "image_url": { "type": "string" }
                            },
                            "required": ["name", "url"]
                        }
                    }
                },
                "required": ["costume_product_suggestions"]
            };

            const enrichPrompt = `You are a Costume Sourcing Specialist.
            Task: Find 3 REAL costume products available for purchase online for this specific dance routine.
            
            Routine: "${segment.title}"
            Style: ${segment.title} (Dance)
            Visual/Costume Concept: ${segment.costume_concept}
            
            Studio Preferred Vendors: ${context?.studio?.costume_vendors?.join(', ') || "Any professional dance costume vendor (e.g. Weissman, Revolution, Discount Dance)"}

            CRITICAL:
            - SEARCH THE INTERNET.
            - Return REAL product URLs and Image URLs.
            - Ensure they match the concept.
            `;

            try {
                const aiResponse = await base44.integrations.Core.InvokeLLM({
                    prompt: enrichPrompt,
                    response_json_schema: COSTUME_SCHEMA,
                    add_context_from_internet: true
                });
                return Response.json(aiResponse);
            } catch (err) {
                console.error("[Producer] Enrichment Error:", err);
                return Response.json({ error: "Failed to source costumes." }, { status: 500 });
            }
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("Error in producePerformance:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});