import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { instruction, studentIds } = await req.json();

        if (!instruction || !studentIds || studentIds.length === 0) {
            return Response.json({ error: 'Instruction and studentIds are required' }, { status: 400 });
        }

        // Fetch all selected students
        const allStudents = await base44.entities.Student.list();
        const selectedStudents = allStudents.filter(s => studentIds.includes(s.id));

        if (selectedStudents.length === 0) {
            return Response.json({ error: 'No students found with the provided IDs' }, { status: 400 });
        }

        console.log(`[BulkAction] Processing "${instruction}" for ${selectedStudents.length} students`);

        // Build context about the selected students
        const studentContext = selectedStudents.map(s => ({
            id: s.id,
            name: s.name,
            parent_email: s.parent_email,
            phone: s.phone,
            status: s.status,
            billing_method: s.billing_method,
            level: s.level,
            age: s.age
        }));

        // Ask LLM to interpret the instruction and decide on actions
        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `
                SYSTEM: You are Gene, an AI assistant for a dance studio. 
                A staff member has selected ${selectedStudents.length} students and given the following instruction:
                "${instruction}"

                SELECTED STUDENTS:
                ${JSON.stringify(studentContext, null, 2)}

                YOUR TASK:
                Determine what action(s) to take based on the instruction. You can:
                1. UPDATE student records (e.g., change billing_method, status, level, tags)
                2. SEND EMAIL to parents (compose a message)
                3. SEND SMS to parents (compose a short message)
                4. CREATE NOTES on students

                If the instruction is unclear or you cannot fulfill it, explain why.

                IMPORTANT:
                - For "set to autopay" or "make autopay" -> update billing_method to "auto_pay"
                - For "set to manual" -> update billing_method to "manual"
                - For status changes, use: "active", "inactive", "prospect", "alumni"
                - For emails/SMS, compose an appropriate message based on context
            `,
            response_json_schema: {
                type: "object",
                properties: {
                    understood: { type: "boolean", description: "Whether the instruction was understood" },
                    action_type: { 
                        type: "string", 
                        enum: ["update_students", "send_email", "send_sms", "create_notes", "cannot_fulfill"],
                        description: "The type of action to perform"
                    },
                    update_data: {
                        type: "object",
                        description: "For update_students: fields to update on each student",
                        properties: {
                            billing_method: { type: "string", enum: ["auto_pay", "manual"] },
                            status: { type: "string", enum: ["active", "inactive", "prospect", "alumni"] },
                            level: { type: "string" }
                        }
                    },
                    message_content: {
                        type: "object",
                        description: "For send_email or send_sms",
                        properties: {
                            subject: { type: "string" },
                            body: { type: "string" }
                        }
                    },
                    note_content: {
                        type: "string",
                        description: "For create_notes: the note to add to each student"
                    },
                    explanation: { 
                        type: "string", 
                        description: "Human-readable explanation of what will be done" 
                    }
                },
                required: ["understood", "action_type", "explanation"]
            }
        });

        console.log(`[BulkAction] LLM decided: ${llmResponse.action_type}`);

        let results = [];
        let successCount = 0;
        let errorCount = 0;

        // Execute the action
        if (llmResponse.action_type === 'update_students' && llmResponse.update_data) {
            console.log(`[BulkAction] Update data from LLM:`, JSON.stringify(llmResponse.update_data));
            for (const student of selectedStudents) {
                try {
                    console.log(`[BulkAction] Updating student ${student.id} with:`, JSON.stringify(llmResponse.update_data));
                    await base44.asServiceRole.entities.Student.update(student.id, llmResponse.update_data);
                    console.log(`[BulkAction] Successfully updated student ${student.id}`);
                    results.push({ id: student.id, name: student.name, success: true });
                    successCount++;
                } catch (err) {
                    console.error(`[BulkAction] Failed to update student ${student.id}:`, err.message);
                    results.push({ id: student.id, name: student.name, success: false, error: err.message });
                    errorCount++;
                }
            }
        } else if (llmResponse.action_type === 'send_email' && llmResponse.message_content) {
            for (const student of selectedStudents) {
                if (!student.parent_email) {
                    results.push({ id: student.id, name: student.name, success: false, error: 'No parent email' });
                    errorCount++;
                    continue;
                }
                try {
                    await base44.integrations.Core.SendEmail({
                        to: student.parent_email,
                        subject: llmResponse.message_content.subject || 'Message from the Studio',
                        body: llmResponse.message_content.body
                    });
                    results.push({ id: student.id, name: student.name, success: true });
                    successCount++;
                } catch (err) {
                    results.push({ id: student.id, name: student.name, success: false, error: err.message });
                    errorCount++;
                }
            }
        } else if (llmResponse.action_type === 'send_sms' && llmResponse.message_content) {
            // Use Twilio for SMS
            const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
            const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
            const twilioMessagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

            if (!twilioAccountSid || !twilioAuthToken || !twilioMessagingServiceSid) {
                return Response.json({ 
                    success: false, 
                    explanation: "SMS is not configured. Please set up Twilio credentials.",
                    results: []
                });
            }

            for (const student of selectedStudents) {
                if (!student.phone) {
                    results.push({ id: student.id, name: student.name, success: false, error: 'No phone number' });
                    errorCount++;
                    continue;
                }
                try {
                    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
                    const authHeader = 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`);
                    
                    const formData = new URLSearchParams();
                    formData.append('MessagingServiceSid', twilioMessagingServiceSid);
                    formData.append('To', student.phone);
                    formData.append('Body', llmResponse.message_content.body);

                    const smsResponse = await fetch(twilioUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': authHeader,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: formData.toString()
                    });

                    if (smsResponse.ok) {
                        results.push({ id: student.id, name: student.name, success: true });
                        successCount++;
                    } else {
                        const errData = await smsResponse.json();
                        results.push({ id: student.id, name: student.name, success: false, error: errData.message || 'SMS failed' });
                        errorCount++;
                    }
                } catch (err) {
                    results.push({ id: student.id, name: student.name, success: false, error: err.message });
                    errorCount++;
                }
            }
        } else if (llmResponse.action_type === 'create_notes' && llmResponse.note_content) {
            for (const student of selectedStudents) {
                try {
                    await base44.entities.StudentNote.create({
                        student_name: student.name,
                        content: llmResponse.note_content,
                        category: 'general',
                        sentiment: 'neutral',
                        teacher_name: user.full_name || 'Staff',
                        date: new Date().toISOString().split('T')[0]
                    });
                    results.push({ id: student.id, name: student.name, success: true });
                    successCount++;
                } catch (err) {
                    results.push({ id: student.id, name: student.name, success: false, error: err.message });
                    errorCount++;
                }
            }
        } else if (llmResponse.action_type === 'cannot_fulfill') {
            return Response.json({
                success: false,
                explanation: llmResponse.explanation,
                results: []
            });
        }

        return Response.json({
            success: errorCount === 0,
            explanation: llmResponse.explanation,
            action_type: llmResponse.action_type,
            summary: {
                total: selectedStudents.length,
                successful: successCount,
                failed: errorCount
            },
            results,
            message_preview: llmResponse.message_content || null
        });

    } catch (error) {
        console.error('[BulkAction] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});