import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const anthropic = new Anthropic({
  apiKey: Deno.env.get("CLAUDE_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, response_json_schema, system_prompt } = body;

    if (!prompt) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    const messages = [{ role: "user", content: prompt }];

    let systemContent = system_prompt || "You are a warm, natural copywriter for a small dance studio. Write like a real person texting a friend — never corporate, never stiff. Short sentences. Real emotions.";

    if (response_json_schema) {
      systemContent += "\n\nIMPORTANT: You MUST respond with valid JSON matching this schema: " + JSON.stringify(response_json_schema) + "\nRespond ONLY with the JSON object, no markdown fences, no extra text.";
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemContent,
      messages,
    });

    const text = response.content[0].text;

    if (response_json_schema) {
      try {
        const parsed = JSON.parse(text);
        return Response.json(parsed);
      } catch (_) {
        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return Response.json(JSON.parse(jsonMatch[0]));
        }
        return Response.json({ error: 'Failed to parse JSON response', raw: text }, { status: 500 });
      }
    }

    return Response.json({ response: text });
  } catch (error) {
    console.error('Claude API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});