// Staff mobile — AI career consultation (stateless, no history)
import { Hono } from "npm:hono";
import { getAuthUser } from "./_shared.ts";

const CAREER_SYSTEM_PROMPT = `You are a supportive career advisor for hospitality and hotel staff. You help with:
- Career growth and next steps (promotions, skills, certifications)
- Work-life balance and wellbeing
- How to leverage guest feedback and recognition (e.g. Kudos) for development
- Interview prep, resume tips, and networking in the industry
- Building confidence and handling difficult situations at work

Keep responses concise (2–4 short paragraphs), warm, and practical. Use simple English. Do not make up specific facts about the user or their company. If the question is vague, ask one short clarifying question or give general encouragement and one concrete tip.`;

const careerChat = new Hono();

careerChat.post("/career-chat", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const body = await c.req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message)
      return c.json({ error_code: "VALIDATION_ERROR", message: "message is required" }, 400);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey)
      return c.json({ error_code: "CONFIG_ERROR", message: "AI service not configured" }, 503);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: CAREER_SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[career-chat] OpenAI error:", response.status, errText);
      return c.json(
        { error_code: "AI_ERROR", message: "Could not get a response. Please try again." },
        502
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply)
      return c.json(
        { error_code: "AI_ERROR", message: "Empty response. Please try again." },
        502
      );

    return c.json({ reply }, 200);
  } catch (err) {
    console.error("[career-chat] Unexpected error:", err);
    return c.json(
      { error_code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      500
    );
  }
});

export default careerChat;
