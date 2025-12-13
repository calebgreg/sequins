import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse Request
        const { prompt } = await req.json();

        if (!prompt) {
            return Response.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // 1. Fetch Context Data (Omnipotent View)
        // We fetch key entities to help the LLM understand names, schedules, and existing data.
        const [students, classes, settingsList, plans, teachers] = await Promise.all([
            base44.entities.Student.list(),
            base44.entities.DanceClass.list(),
            base44.entities.StudioSettings.list(),
            base44.entities.TuitionPlan.list(),
            base44.entities.Teacher.list(),
        ]);

        const settings = settingsList[0] || {};
        const aiName = settings.ai_assistant_name || 'Gene';

        // Filter and format context for the LLM to save tokens while providing utility
        const activeStudents = students.filter(s => s.status === 'active');
        const rosterContext = activeStudents.map(s => 
            `Name: ${s.name}, ID: ${s.id}, ParentEmail: ${s.parent_email || 'N/A'}, Age: ${s.age}`
        ).join('\n');

        const classContext = classes.map(c => 
            `${c.title} (${c.style}) on ${c.day} @ ${c.start_time}:00`
        ).join('\n');

        const teacherContext = teachers.map(t => t.name).join(', ');

        const systemContext = `
            You are ${aiName}, the intelligent coordinator and operating system for ${settings.name || 'the dance studio'}.
            You are assisting ${user.full_name || 'a staff member'}.

            YOUR CAPABILITIES:
            You can answer questions and DIRECTLY EXECUTE actions on the database.
            
            AVAILABLE DATA CONTEXT:
            - Students: ${activeStudents.length} active students
            - Teachers: ${teacherContext}
            - Classes: ${classes.length} scheduled classes
            
            ROSTER SNAPSHOT (Use for resolving names to emails/IDs):
            ${rosterContext}

            SCHEDULE SNAPSHOT:
            ${classContext}

            INSTRUCTIONS:
            1. Analyze the user's request.
            2. If it's a question, answer it based on the context.
            3. If it's an ACTION (create, update, delete), you MUST output the 'tool_call' JSON.
            
            SUPPORTED ENTITIES & ACTIONS:
            - FamilyTask: create (title, due_date, parent_email, priority, category)
            - FamilyNote: create (parent_email, content, is_pinned)
            - StudentNote: create (student_name, content, category, sentiment)
            - Student: update (id, status, notes, etc) - *Use with caution*
            - Student: read (payload: { name: "student name" }) - Use this to look up details like phone, email, address, etc.

            IMPORTANT:
            - If the user asks for personal info (phone, email, etc.) that isn't in the context, use the 'read' action to look it up.
            - When creating FamilyTask or FamilyNote, you MUST resolve a name to a 'parent_email' from the Roster.
            - If you cannot resolve a name to a specific entity, ask for clarification instead of guessing.
            - Default 'due_date' for tasks is today (${new Date().toISOString().split('T')[0]}).
        `;

        // 2. Invoke LLM with flexible tool schema
        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `
                ${systemContext}

                USER PROMPT: "${prompt}"
            `,
            response_json_schema: {
                type: "object",
                properties: {
                    response_text: { 
                        type: "string", 
                        description: "The conversational response to the user. If an action was taken, confirm it here." 
                    },
                    tool_call: {
                        type: "object",
                        description: "The action to execute, if any",
                        properties: {
                            entity: { 
                                type: "string", 
                                enum: ["FamilyTask", "FamilyNote", "StudentNote", "Student"] 
                            },
                            action: { 
                                type: "string", 
                                enum: ["create", "update", "read"] 
                            },
                            payload: {
                                type: "object",
                                description: "The data for the entity. MUST match the entity schema."
                            },
                            entity_id: {
                                type: "string",
                                description: "Required only for 'update' actions"
                            }
                        },
                        required: ["entity", "action", "payload"]
                    }
                },
                required: ["response_text"]
            }
        });

        let responseText = llmResponse.response_text;
        let actionResult = null;

        // 3. Coordinator Logic: Execute the Tool Call
        if (llmResponse.tool_call) {
            const { entity, action, payload, entity_id } = llmResponse.tool_call;
            
            console.log(`[GeneCoordinator] Executing ${action} on ${entity}`, payload);

            try {
                // Dynamic execution based on entity and action
                // Security check: We are running as the user (base44 initialized with req), 
                // so standard RLS (Row Level Security) applies automatically.
                
                let result;

                if (action === 'read') {
                    // Handle Read/Lookup Action
                    if (entity === 'Student') {
                        const searchName = (payload.name || '').toLowerCase();
                        // Search in the already fetched students list (memory cache) for efficiency
                        const foundStudent = students.find(s => s.name.toLowerCase().includes(searchName));

                        if (foundStudent) {
                            // Re-invoke LLM with the found data to generate the natural language answer
                            const answer = await base44.integrations.Core.InvokeLLM({
                                prompt: `
                                    SYSTEM: You are Gene.
                                    CONTEXT: The user asked a question about ${foundStudent.name}.
                                    RETRIEVED DATA: ${JSON.stringify(foundStudent)}

                                    USER ORIGINAL QUESTION: "${prompt}"

                                    INSTRUCTION: Answer the user's question directly using the RETRIEVED DATA. Be concise and professional.
                                `
                            });

                            // Update the response text to the user
                            responseText = typeof answer === 'string' ? answer : answer.response_text || "Found the information.";

                            // We successfully answered, no need for a generic "Action Executed" toast for a simple question
                            actionResult = null; 
                        } else {
                            responseText = `I couldn't find a student named "${payload.name}".`;
                            actionResult = { type: 'error', message: 'Student not found' };
                        }
                    }
                } else if (action === 'create') {
                    // Enrich payload with metadata if needed
                    if (entity === 'FamilyNote') {
                        payload.author_name = user.full_name || 'Gene AI';
                    }
                    if (entity === 'FamilyTask') {
                        if (!payload.assigned_to) payload.assigned_to = user.full_name;
                    }
                    if (entity === 'StudentNote') {
                        if (!payload.date) payload.date = new Date().toISOString().split('T')[0];
                    }

                    result = await base44.entities[entity].create(payload);
                    actionResult = { type: 'success', entity, action, result };
                } else if (action === 'update') {
                    if (!entity_id) throw new Error("Missing entity_id for update action");
                    result = await base44.entities[entity].update(entity_id, payload);
                    actionResult = { type: 'success', entity, action, result };
                }
                
                // Append confirmation to text if not present (optional, LLM usually handles this in response_text)
                // but we can add a system flag for the frontend to show a nice checkmark
                
            } catch (err) {
                console.error(`[GeneCoordinator] Action Failed:`, err);
                actionResult = { type: 'error', message: err.message };
                responseText += `\n\n(System Note: I tried to perform the action, but encountered an error: ${err.message})`;
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