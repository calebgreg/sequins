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

        // 3. Identify Sender (Staff)
        console.log("[SMS] identifying sender...");
        // Normalize phone for search (strip non-digits to match flexible formats)
        const normalizedFrom = fromNumber.replace(/\D/g, ''); 

        const allTeachers = await base44.asServiceRole.entities.Teacher.list();
        const teacher = allTeachers.find(t => {
            if (!t.phone) return false;
            const tPhone = t.phone.replace(/\D/g, '');
            return tPhone.includes(normalizedFrom) || normalizedFrom.includes(tPhone);
        });

        const senderName = teacher ? teacher.name : "Unknown Staff";
        console.log(`[SMS] Sender identified as: ${senderName}`);
        const senderContext = teacher ? `You are talking to ${teacher.name}, a dance teacher.` : "You are talking to a staff member (phone unknown).";

        // 4. Retrieve Conversation History
        console.log("[SMS] fetching history...");
        const history = await base44.asServiceRole.entities.ConversationMessage.filter(
            { phone_number: fromNumber },
            '-timestamp', 
            10
        );

        const conversationHistory = history.reverse().map(msg => 
            `${msg.role === 'user' ? 'User' : 'Gene'}: ${msg.content}`
        ).join('\n');

        // 5. Build Context & Prompt
        console.log("[SMS] fetching settings...");
        const settingsList = await base44.asServiceRole.entities.StudioSettings.list();
        const settings = settingsList[0] || {};
        const aiName = settings.ai_assistant_name || 'Gene';

        const prompt = `
            System: You are ${aiName}, the intelligent OS for ${settings.name || 'the dance studio'}.
            ${senderContext}

            Context:
            - Provide helpful, concise answers suitable for SMS (short, text-only).
            - You have memory of the recent conversation.

            Conversation History:
            ${conversationHistory}

            Current Message:
            User: ${body}

            Instructions:
            Reply as ${aiName}. Keep it brief (under 160 chars if possible, max 300).
        `;

        // 6. Invoke LLM
        console.log("[SMS] invoking LLM...");
        const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt
        });
        console.log("[SMS] LLM responded");

        let replyText = typeof llmResponse === 'string' ? llmResponse : JSON.stringify(llmResponse);

        // XML Escape the reply text to prevent TwiML errors
        replyText = replyText.replace(/&/g, '&amp;')
                             .replace(/</g, '&lt;')
                             .replace(/>/g, '&gt;')
                             .replace(/"/g, '&quot;')
                             .replace(/'/g, '&apos;');

        // 7. Save Messages to History
        await base44.asServiceRole.entities.ConversationMessage.create({
            phone_number: fromNumber,
            role: 'user',
            content: body,
            teacher_email: teacher ? teacher.email : null,
            timestamp: new Date().toISOString()
        });

        await base44.asServiceRole.entities.ConversationMessage.create({
            phone_number: fromNumber,
            role: 'assistant',
            content: replyText,
            teacher_email: teacher ? teacher.email : null,
            timestamp: new Date().toISOString()
        });

        // 8. Return TwiML
        const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyText}</Message></Response>`;

        return new Response(twiml, {
            headers: { "Content-Type": "text/xml" },
            status: 200
        });

    } catch (error) {
        console.error("[SMS ERROR]", error.message);
        console.error(error.stack);

        let errorMessage = "Sorry, I encountered an error processing your message.";
        if (error.name === 'TimeoutError') {
             errorMessage = "Sorry, I'm thinking too hard and timed out.";
        }

        const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${errorMessage}</Message></Response>`;
        return new Response(errorTwiml, {
            headers: { "Content-Type": "text/xml" },
            status: 200 
        });
    }
});