import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Hook to provide AI Assistant capabilities.
 * Allows staff to @mention the AI (e.g. "@Gene remind me to...") to trigger actions.
 */
export default function useAiAssistant() {
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch the configured AI name
    const { data: aiName = 'Gene' } = useQuery({
        queryKey: ['aiAssistantName'],
        queryFn: async () => {
            const settings = await base44.entities.StudioSettings.list();
            return settings[0]?.ai_assistant_name || 'Gene';
        },
        staleTime: 1000 * 60 * 5 // Cache for 5 mins
    });

    /**
     * checks if the text contains an AI command and executes it.
     * @param {string} text - The input text to check
     * @param {Object} context - Contextual data (family, student, user, etc.)
     * @returns {Promise<boolean>} - True if an AI command was processed, false otherwise
     */
    const checkAndTriggerAi = useCallback(async (text, context = {}) => {
        if (!text || !text.includes(`@${aiName}`)) return false;

        setIsProcessing(true);
        const toastId = toast.loading(`${aiName} is thinking...`);

        try {
            // Invoke LLM to interpret the command
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `
                    You are ${aiName}, an omnipotent studio assistant for a dance studio management app.
                    
                    USER REQUEST: "${text}"
                    
                    CONTEXT:
                    ${JSON.stringify(context, null, 2)}
                    
                    YOUR GOAL:
                    Determine if the user is asking you to perform a specific action (like creating a task, adding a note, etc.).
                    The request usually starts with "@${aiName}".
                    
                    AVAILABLE ACTIONS (Output valid JSON only):
                    
                    1. Create Task:
                    {
                        "action": "create_task",
                        "data": {
                            "title": "Task title",
                            "description": "Task description/details",
                            "due_date": "YYYY-MM-DD" (infer from "next week", "tomorrow", etc. Today is ${new Date().toISOString().split('T')[0]}),
                            "priority": "low" | "medium" | "high",
                            "category": "admin" | "billing" | "enrollment" | "communication" | "event"
                        }
                    }
                    
                    2. Create Note (Staff Note / Journal Entry):
                    {
                        "action": "create_note",
                        "data": {
                            "content": "The note content",
                            "is_pinned": boolean
                        }
                    }

                    3. No Action (if it's just chatter or unclear):
                    { "action": "none" }
                    
                    RESPONSE FORMAT:
                    Return ONLY the JSON object.
                `,
                response_json_schema: {
                    type: "object",
                    properties: {
                        action: { type: "string", enum: ["create_task", "create_note", "none"] },
                        data: { type: "object", additionalProperties: true }
                    },
                    required: ["action"]
                }
            });

            // Parse response (Integration returns a dict/object when schema is provided, but checking just in case)
            const result = typeof response === 'string' ? JSON.parse(response) : response;

            if (result.action === 'none') {
                toast.dismiss(toastId);
                return false;
            }

            // Execute Action
            if (result.action === 'create_task') {
                await base44.entities.FamilyTask.create({
                    parent_email: context.familyEmail || context.student?.parent_email,
                    title: result.data.title,
                    description: result.data.description || `AI Generated from: "${text}"`,
                    status: 'pending',
                    priority: result.data.priority || 'medium',
                    category: result.data.category || 'admin',
                    due_date: result.data.due_date || new Date().toISOString().split('T')[0],
                    is_shared: false, // Default to internal for AI tasks unless specified otherwise (keep safe)
                    assigned_to: context.currentUser?.full_name || 'AI Assistant'
                });
                toast.success(`Task created: ${result.data.title}`, { id: toastId });
                return true;
            }

            if (result.action === 'create_note') {
                // Determine which note entity to use based on context
                if (context.entityType === 'StudentNote') {
                     await base44.entities.StudentNote.create({
                        student_name: context.student?.name,
                        class_name: context.className || 'General',
                        teacher_name: context.currentUser?.full_name || 'AI Assistant',
                        content: result.data.content,
                        category: 'general',
                        sentiment: 'neutral',
                        tags: ['AI-Assistant'],
                        date: new Date().toISOString().split('T')[0]
                    });
                } else {
                    // Default to FamilyNote
                    await base44.entities.FamilyNote.create({
                        parent_email: context.familyEmail || context.student?.parent_email,
                        content: result.data.content,
                        author_name: `${context.currentUser?.full_name || 'Staff'} (via ${aiName})`,
                        is_pinned: result.data.is_pinned || false
                    });
                }
                toast.success("Note added successfully", { id: toastId });
                return true;
            }

            toast.dismiss(toastId);
            return false;

        } catch (error) {
            console.error("AI Action Failed:", error);
            toast.error(`Sorry, ${aiName} couldn't process that.`, { id: toastId });
            return false;
        } finally {
            setIsProcessing(false);
        }
    }, [aiName]);

    return {
        aiName,
        isProcessing,
        checkAndTriggerAi
    };
}