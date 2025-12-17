import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse Request
        const { prompt, chatHistory = [] } = await req.json();

        if (!prompt) {
            return Response.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // --- PASS 1: INTENT DETECTION (Fast, Low Context) ---
        console.log(`[Gene] Pass 1: analyzing intent for "${prompt.substring(0, 50)}..."`);
        
        const intentResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `
                SYSTEM: You are the routing layer for Gene, a dance studio AI.
                TASK: Analyze the user prompt to determine which database entities are needed to answer.
                
                USER PROMPT: "${prompt}"
                
                AVAILABLE DATA CATEGORIES:
                - Student: Roster info, finding a person, checking enrollment, ages, parents.
                - DanceClass: Schedule, time, class details, day of week.
                - Performance: Upcoming events, recitals, shows, dates.
                - Teacher: Staff info, bios.
                - TuitionPlan: Pricing plans, billing info.
                - FamilyTask: Tasks, to-dos.
                - FamilyNote: Notes on families.
                
                SPECIAL CASES:
                - If the user talks about "planning a show", "production", "costumes", "run sheet", or "the producer", you NEED: 'Performance', 'DanceClass', 'StudioSettings'.
                - If the user asks a general question unrelated to data (e.g. "write a poem"), request NO entities.
                - Always request 'StudioSettings' if you need the studio name or AI persona details (default to requesting it if unsure).
            `,
            response_json_schema: {
                type: "object",
                properties: {
                    intent: { type: "string", description: "Brief description of intent" },
                    entities_needed: { 
                        type: "array", 
                        items: { type: "string", enum: ["Student", "DanceClass", "StudioSettings", "TuitionPlan", "Teacher", "Performance", "FamilyTask", "FamilyNote"] }
                    }
                },
                required: ["entities_needed"]
            }
        });

        const entitiesToFetch = new Set(intentResponse.entities_needed || []);
        // Always ensure Settings is fetched for AI persona consistency, unless explicitly empty (though safe to always add)
        entitiesToFetch.add("StudioSettings");

        console.log(`[Gene] Intent: ${intentResponse.intent}. Fetching: [${Array.from(entitiesToFetch).join(', ')}]`);

        // --- FETCH DATA (Parallel) ---
        const dataMap = {};
        const fetchPromises = [];

        const fetchEntity = async (name) => {
            try {
                // Using standard list for now. Could be optimized with filters later.
                const list = await base44.entities[name].list();
                dataMap[name] = list;
            } catch (err) {
                console.warn(`[Gene] Failed to fetch ${name}`, err);
                dataMap[name] = [];
            }
        };

        for (const entity of entitiesToFetch) {
            fetchPromises.push(fetchEntity(entity));
        }

        await Promise.all(fetchPromises);

        // --- CONSTRUCT CONTEXT (Pass 2 Prep) ---
        const settings = (dataMap["StudioSettings"] || [])[0] || {};
        const aiName = settings.ai_assistant_name || 'Gene';
        
        // Build efficient context string based ONLY on what was fetched
        let dynamicContext = "";

        if (dataMap["Student"]) {
            const activeStudents = dataMap["Student"].filter(s => s.status === 'active');
            dynamicContext += `\nROSTER (${activeStudents.length} active students):\n` + 
                activeStudents.map(s => `Name: ${s.name}, ID: ${s.id}, ParentEmail: ${s.parent_email || 'N/A'}, Age: ${s.age}`).join('\n');
        }

        if (dataMap["DanceClass"]) {
            dynamicContext += `\nSCHEDULE:\n` + 
                dataMap["DanceClass"].map(c => `${c.title} (${c.style}) on ${c.day} @ ${c.start_time}:00`).join('\n');
        }

        if (dataMap["Performance"]) {
            dynamicContext += `\nUPCOMING EVENTS:\n` + 
                dataMap["Performance"].map(p => {
                    const venueName = typeof p.venue === 'object' ? (p.venue?.venue_name || 'TBD') : (p.venue || 'TBD');
                    return `Event: ${p.title} | Date: ${p.date} | Status: ${p.status} | Venue: ${venueName}`;
                }).join('\n');
        }

        if (dataMap["Teacher"]) {
            dynamicContext += `\nSTAFF: ` + dataMap["Teacher"].map(t => t.name).join(', ') + `\n`;
        }

        if (dataMap["TuitionPlan"]) {
            dynamicContext += `\nPRICING PLANS: ` + dataMap["TuitionPlan"].map(p => `${p.name} ($${p.amount})`).join(', ') + `\n`;
        }

        const systemContext = `
            You are ${aiName}, the intelligent coordinator for ${settings.name || 'the dance studio'}.
            Assisting user: ${user.full_name || 'Staff'}.

            YOUR CAPABILITIES:
            1. Answer questions using the retrieved data context.
            2. Execute ACTIONS on the database (create tasks, notes, etc).
            3. Route complex planning requests to the "PerformanceProducer" (Sequins).

            RETRIEVED DATA CONTEXT:
            ${dynamicContext || "(No specific database data retrieved for this query)"}
            
            INSTRUCTIONS:
            - If the user asks for personal info not in context, use the 'read' action (e.g. Student lookup).
            - If data is missing, say so.
            - Default 'due_date' for tasks is today (${new Date().toISOString().split('T')[0]}).

            SUPPORTED ENTITIES & ACTIONS:
            - FamilyTask: create (title, due_date, parent_email, priority, category)
            - FamilyNote: create (parent_email, content, is_pinned)
            - StudentNote: create (student_name, content, category, sentiment)
            - Student: read (payload: { name: "student name" }) - Use this to look up detailed info if not in roster snapshot.
            - PerformanceProducer: invoke (action: "chat" | "generate_plan", chatHistory: array)
        `;

        // --- PASS 2: EXECUTION & RESPONSE ---
        // Full context call to generate answer or tool call
        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `
                ${systemContext}

                PREVIOUS CHAT CONTEXT:
                ${JSON.stringify(chatHistory.slice(-10))}

                USER PROMPT: "${prompt}"
            `,
            response_json_schema: {
                type: "object",
                properties: {
                    response_text: { 
                        type: "string", 
                        description: "Conversational response to the user." 
                    },
                    tool_call: {
                        type: "object",
                        description: "Action to execute if needed",
                        properties: {
                            entity: { 
                                type: "string", 
                                enum: ["FamilyTask", "FamilyNote", "StudentNote", "Student", "PerformanceProducer"] 
                            },
                            action: { 
                                type: "string", 
                                enum: ["create", "update", "read", "invoke"] 
                            },
                            payload: {
                                type: "object",
                                description: "Data for the action"
                            },
                            entity_id: { type: "string" }
                        },
                        required: ["entity", "action", "payload"]
                    }
                },
                required: ["response_text"]
            }
        });

        let responseText = llmResponse.response_text;
        let actionResult = null;

        // --- EXECUTE TOOL CALL ---
        if (llmResponse.tool_call) {
            const { entity, action, payload, entity_id } = llmResponse.tool_call;
            console.log(`[Gene] Executing ${action} on ${entity}`);

            try {
                let result;

                if (entity === 'PerformanceProducer') {
                    // Lazy Fetch Fallback: Ensure we have classes/settings if Pass 1 missed them
                    let producerClasses = dataMap["DanceClass"];
                    if (!producerClasses) producerClasses = await base44.entities.DanceClass.list();
                    
                    const produceContext = {
                        studio: { 
                            studio_name: settings.name || "My Dance Studio",
                            costume_vendors: settings.costume_vendors || []
                        },
                        classes: producerClasses.filter(c => c.type !== 'admin').map(c => ({
                            class_id: c.id,
                            name: c.title,
                            style: c.style || c.title,
                            dancer_count: c.student_names?.length || 5,
                            approx_length_minutes: (c.duration || 1) * 60,
                            notes: `Taught by ${c.teacher || 'Staff'}`
                        })),
                        event_details: {} 
                    };

                    const producerResponse = await base44.functions.invoke('producePerformance', {
                        action: payload.action || 'chat',
                        chatHistory: payload.chatHistory || [{ role: 'user', content: prompt }],
                        context: produceContext
                    });

                    const data = producerResponse.data;
                    if (data.generated_plan) {
                        responseText = data.response_text || "Plan generated.";
                        actionResult = { type: 'success', entity, action, result: data.generated_plan, message: "Plan Created" };
                    } else {
                        // FIX: Correctly reading content from producer response
                        responseText = data.content || data.response_text || "I've consulted the producer.";
                        actionResult = { type: 'success', entity, action, result: "Chat continued" };
                    }

                } else if (action === 'read' && entity === 'Student') {
                    const searchName = (payload.name || '').toLowerCase();
                    // Lazy Fetch Fallback
                    let searchPool = dataMap["Student"];
                    if (!searchPool) searchPool = await base44.entities.Student.list();
                    
                    const foundStudent = searchPool.find(s => s.name.toLowerCase().includes(searchName));

                    if (foundStudent) {
                        // Pass 3 (Mini): Answer specific question about student
                        const answer = await base44.integrations.Core.InvokeLLM({
                            prompt: `
                                SYSTEM: You are Gene.
                                CONTEXT: User asked about ${foundStudent.name}.
                                DATA: ${JSON.stringify(foundStudent)}
                                QUESTION: "${prompt}"
                                ANSWER:
                            `
                        });
                        responseText = typeof answer === 'string' ? answer : answer.response_text || "Found info.";
                        actionResult = null;
                    } else {
                        responseText = `I couldn't find a student named "${payload.name}".`;
                        actionResult = { type: 'error', message: 'Student not found' };
                    }

                } else if (action === 'create') {
                    // Enrich payload defaults
                    if (entity === 'FamilyNote') payload.author_name = user.full_name || 'Gene AI';
                    if (entity === 'FamilyTask' && !payload.assigned_to) payload.assigned_to = user.full_name;
                    if (entity === 'StudentNote' && !payload.date) payload.date = new Date().toISOString().split('T')[0];

                    result = await base44.entities[entity].create(payload);
                    actionResult = { type: 'success', entity, action, result };
                } else if (action === 'update') {
                    if (!entity_id) throw new Error("Missing entity_id");
                    result = await base44.entities[entity].update(entity_id, payload);
                    actionResult = { type: 'success', entity, action, result };
                }

            } catch (err) {
                console.error(`[Gene] Action Error:`, err);
                actionResult = { type: 'error', message: err.message };
                responseText += `\n(Error executing action: ${err.message})`;
            }
        }

        return Response.json({ 
            response_text: responseText,
            action_result: actionResult 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});