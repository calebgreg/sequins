import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        // 1. Setup
        const base44 = createClientFromRequest(req);
        
        // Check if request is POST (Twilio webhook)
        if (req.method !== 'POST') {
            return new Response("Method not allowed", { status: 405 });
        }

        // 2. Parse Input (Handle both Form Data and JSON)
        let fromNumber, body;
        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const json = await req.json();
            fromNumber = json.From || json.from;
            body = json.Body || json.body;
        } else {
            const formData = await req.formData();
            fromNumber = formData.get('From');
            body = formData.get('Body');
        }

        if (!fromNumber || !body) {
            return new Response("Missing From or Body", { status: 400 });
        }

        console.log(`[SMS] Received from ${fromNumber}: ${body}`);

        // 3. Identify Sender (Staff) & Fetch Context Data
        console.log("[SMS] Fetching context data...");
        
        // Run fetches in parallel for speed
        const [allTeachers, students, classes, settingsList, plans, history] = await Promise.all([
            base44.asServiceRole.entities.Teacher.list(),
            base44.asServiceRole.entities.Student.list(),
            base44.asServiceRole.entities.DanceClass.list(),
            base44.asServiceRole.entities.StudioSettings.list(),
            base44.asServiceRole.entities.TuitionPlan.list(),
            base44.asServiceRole.entities.ConversationMessage.filter(
                { phone_number: fromNumber },
                '-timestamp', 
                10
            )
        ]);

        // Identify Teacher
        const normalizedFrom = fromNumber.replace(/\D/g, ''); 
        const teacher = allTeachers.find(t => {
            if (!t.phone) return false;
            const tPhone = t.phone.replace(/\D/g, '');
            return tPhone.includes(normalizedFrom) || normalizedFrom.includes(tPhone);
        });

        const settings = settingsList[0] || {};
        const aiName = settings.ai_assistant_name || 'Gene';

        // Check SMS opt-in status
        if (teacher && !teacher.sms_opt_in) {
            console.log(`[SMS] Teacher ${teacher.name} has not opted in to SMS`);
            
            const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
            const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
            const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
            
            const optInMessage = `Hi ${teacher.name}! To use ${aiName} via text, please enable SMS in your staff profile in the Sequins app. Your studio administrator can enable this for you.`;
            
            await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        To: fromNumber,
                        Body: optInMessage,
                        MessagingServiceSid: messagingServiceSid
                    })
                }
            );
            
            return new Response(null, { status: 200 });
        }

        const senderName = teacher ? teacher.name : "Unknown Staff";

        // 4. Prepare Context Strings
        const activeStudents = students.filter(s => s.status === 'active');
        
        // Format concise schedule for SMS context
        const scheduleContext = classes.map(c => 
            `- ${c.title} (${c.style}): ${c.day}s ${c.start_time}:00 w/ ${c.teacher || 'Staff'}`
        ).join('\n');
        
        // Concise roster for SMS context (name only to save tokens)
        const rosterContext = activeStudents.map(s => s.name).join(', ');

        const conversationHistory = history.reverse().map(msg => 
            `${msg.role === 'user' ? 'User' : aiName}: ${msg.content}`
        ).join('\n');

        const systemContext = `
            System: You are ${aiName}, the intelligent executive assistant for ${settings.name || 'the dance studio'}.
            You are assisting ${senderName}, a staff member.
            
            FULL CLASS SCHEDULE:
            ${scheduleContext}

            STUDENT ROSTER:
            ${rosterContext}

            Instructions:
            1. Answer the user's question accurately using the provided data.
            2. If the user asks to CREATE A TASK (e.g., "remind me to...", "add a task..."), use the 'create_task' JSON field.
               - Extract 'related_student_name' if a student is mentioned.
               - Infer 'due_date' (today is ${new Date().toISOString().split('T')[0]}).
            3. Keep 'response_text' concise (SMS friendly, under 300 chars preferably).
        `;

        // 5. Invoke LLM
        console.log("[SMS] invoking LLM...");
        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `
                ${systemContext}

                Conversation History:
                ${conversationHistory}

                Current Message:
                User: ${body}
            `,
            response_json_schema: {
                type: "object",
                properties: {
                    response_text: { type: "string", description: "The SMS response to the user" },
                    create_task: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            due_date: { type: "string", format: "date" },
                            related_student_name: { type: "string", description: "Name of student if explicitly mentioned" },
                            priority: { type: "string", enum: ["low", "medium", "high"], default: "medium" }
                        }
                    }
                },
                required: ["response_text"]
            }
        });

        let replyText = response.response_text;

        // 6. Handle Actions (Task Creation)
        if (response.create_task) {
            console.log("[SMS] Creating task...", response.create_task);
            const { title, due_date, related_student_name, priority } = response.create_task;
            
            let parentEmail = null;
            if (related_student_name) {
                const student = activeStudents.find(s => s.name.toLowerCase().includes(related_student_name.toLowerCase()));
                if (student) parentEmail = student.parent_email;
            }

            await base44.asServiceRole.entities.FamilyTask.create({
                title: title,
                due_date: due_date || new Date().toISOString().split('T')[0],
                status: 'pending',
                priority: priority || 'medium',
                category: 'admin',
                parent_email: parentEmail,
                assigned_to: senderName,
                is_shared: false
            });
            
            // Append confirmation to reply if not already implicit
            if (!replyText.toLowerCase().includes("task")) {
                replyText += ` (Task created: "${title}")`;
            }
        }

        // 7. Save History
        try {
            await Promise.all([
                base44.asServiceRole.entities.ConversationMessage.create({
                    phone_number: fromNumber,
                    role: 'user',
                    content: body,
                    teacher_email: teacher ? teacher.email : undefined,
                    timestamp: new Date().toISOString()
                }),
                base44.asServiceRole.entities.ConversationMessage.create({
                    phone_number: fromNumber,
                    role: 'assistant',
                    content: replyText,
                    teacher_email: teacher ? teacher.email : undefined,
                    timestamp: new Date().toISOString()
                })
            ]);
        } catch (dbError) {
            console.error("[SMS] Failed to save history:", dbError.message);
        }

        // 8. Send SMS via Twilio (using Messaging Service SID)
        console.log("[SMS] Sending reply via Twilio...");

        const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

        if (!accountSid || !authToken || !messagingServiceSid) {
            throw new Error("Missing Twilio Credentials (SID, Token, or Messaging Service SID)");
        }

        // Debug: Check Messaging Service Status (User Request)
        console.log("[Twilio] Checking Service SID:", messagingServiceSid);
        const svcCheck = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messaging/Services/${messagingServiceSid}.json`,
            {
                headers: { "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`) }
            }
        );
        console.log("[Twilio] Service check status:", svcCheck.status);
        const svcBody = await svcCheck.text();
        console.log("[Twilio] Service check body:", svcBody);
        
        if (!svcCheck.ok) {
             console.error("[Twilio] Service check failed. Aborting send.");
             // Return error directly so we see it in test output
             return Response.json({ error: "Messaging Service Invalid", details: JSON.parse(svcBody) }, { status: 400 });
        }

        const twilioParams = new URLSearchParams();
        twilioParams.append('To', fromNumber);
        twilioParams.append('Body', replyText);
        twilioParams.append('MessagingServiceSid', messagingServiceSid); 

        const twilioRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: twilioParams
            }
        );

        if (!twilioRes.ok) {
            const errorText = await twilioRes.text();
            console.error(`[SMS] Twilio API Error: ${twilioRes.status} ${errorText}`);
        } else {
            console.log(`[SMS] Message sent successfully!`);
        }

        return new Response(null, { status: 200 });

    } catch (error) {
        console.error("[SMS ERROR]", error.message);
        // Fallback TwiML in case of error, to prevent Twilio retry loops
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
            headers: { "Content-Type": "text/xml" },
            status: 200 
        });
    }
});