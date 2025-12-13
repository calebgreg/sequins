import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { taskId, content, authorEmail, authorName, type } = await req.json();

        // 1. Fetch Task Context
        const task = await base44.entities.FamilyTask.get(taskId);
        if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

        // 2. Fetch Potential Collaborators (Teachers/Staff) to resolve mentions
        const teachers = await base44.entities.Teacher.list();
        // Create a map for name resolution: "Sarah" -> "sarah@studio.com"
        const staffMap = teachers.reduce((acc, t) => {
            acc[t.name.toLowerCase()] = t.email;
            // Also handle first name only
            const firstName = t.name.split(' ')[0].toLowerCase();
            if (!acc[firstName]) acc[firstName] = t.email;
            return acc;
        }, {});

        // 3. AI Analysis of the Interaction
        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `
                You are the intelligent project manager for a dance studio.
                
                CONTEXT:
                Task: "${task.title}" (Status: ${task.status}, Assigned: ${task.assigned_to})
                Description: "${task.description || ''}"
                
                NEW ACTIVITY:
                User ${authorName} (${authorEmail}) ${type === 'comment' ? 'commented' : 'updated task'}:
                "${content}"

                AVAILABLE STAFF:
                ${JSON.stringify(staffMap)}

                YOUR GOAL:
                Analyze the content for mentions (starting with @) and INTENT.
                Determine if the task state needs to change or if people need to be notified.

                RULES:
                1. If a user is mentioned (e.g. "@Sarah"), match them to the staff list.
                2. Detect intent:
                   - "assign to @Sarah" -> intent: assign
                   - "@Sarah what do you think?" -> intent: notify
                   - "marking as done" -> intent: complete
                   - "@Gene create a subtask to..." -> intent: subtask
                3. If @Gene (you) is mentioned, provide a helpful response or action.

                OUTPUT JSON:
                {
                    "mentions": [{ "name": "Sarah", "email": "sarah@example.com", "intent": "assign" | "notify" | "ask" }],
                    "suggested_actions": {
                        "update_status": "pending" | "in_progress" | "completed" | null,
                        "update_assignment": "New Name" | null,
                        "add_collaborators": ["email1", "email2"],
                        "add_subtasks": ["subtask 1"] | null
                    },
                    "ai_reply": "text reply if needed (e.g. confirming action)"
                }
            `,
            response_json_schema: {
                type: "object",
                properties: {
                    mentions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                email: { type: "string" },
                                intent: { type: "string", enum: ["assign", "notify", "ask"] }
                            }
                        }
                    },
                    suggested_actions: {
                        type: "object",
                        properties: {
                            update_status: { type: "string" },
                            update_assignment: { type: "string" },
                            add_collaborators: { type: "array", items: { type: "string" } },
                            add_subtasks: { type: "array", items: { type: "string" } }
                        }
                    },
                    ai_reply: { type: "string" }
                },
                required: ["mentions", "suggested_actions"]
            }
        });

        const analysis = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;

        // 4. Execute Actions

        // A. Handle Mentions & Notifications
        for (const mention of analysis.mentions) {
            if (mention.email && mention.email !== authorEmail) {
                let msg = `${authorName} mentioned you in "${task.title}"`;
                if (mention.intent === 'assign') msg = `${authorName} assigned "${task.title}" to you`;
                
                await base44.entities.Notification.create({
                    recipient_email: mention.email,
                    type: mention.intent === 'assign' ? 'assignment' : 'mention',
                    title: mention.intent === 'assign' ? 'Task Assigned' : 'New Mention',
                    message: msg,
                    link: `/tasks?id=${taskId}`,
                    metadata: { task_id: taskId }
                });
            }
        }

        // B. Update Task if needed
        const updates = {};
        if (analysis.suggested_actions.update_status && analysis.suggested_actions.update_status !== task.status) {
            updates.status = analysis.suggested_actions.update_status;
        }
        if (analysis.suggested_actions.update_assignment) {
            updates.assigned_to = analysis.suggested_actions.update_assignment;
        }
        if (analysis.suggested_actions.add_collaborators && analysis.suggested_actions.add_collaborators.length > 0) {
            const currentCollabs = task.collaborators || [];
            const newCollabs = [...new Set([...currentCollabs, ...analysis.suggested_actions.add_collaborators])];
            updates.collaborators = newCollabs;
        }
        
        // Handle Subtasks (append to checklist)
        if (analysis.suggested_actions.add_subtasks && analysis.suggested_actions.add_subtasks.length > 0) {
             const currentChecklist = task.checklist || [];
             const newItems = analysis.suggested_actions.add_subtasks.map(text => ({
                 id: Math.random().toString(36).substr(2, 9),
                 text,
                 completed: false
             }));
             updates.checklist = [...currentChecklist, ...newItems];
        }

        if (Object.keys(updates).length > 0) {
            await base44.entities.FamilyTask.update(taskId, updates);
        }

        // C. AI Reply (if @Gene was invoked or explicit help needed)
        if (analysis.ai_reply) {
            await base44.entities.TaskComment.create({
                task_id: taskId,
                content: analysis.ai_reply,
                author_email: "ai@studio.com",
                author_name: "Gene",
                mentions: [],
                ai_generated: true
            });
        }

        return Response.json({ success: true, analysis });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});