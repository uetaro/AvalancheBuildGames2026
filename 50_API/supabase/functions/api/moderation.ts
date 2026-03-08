// AI content moderation — score Kudos before post
// Detects negative/defamatory/gibberish content; rejects if score < 90

export interface ModerationResult {
  /** Score 0–100 (100 = most appropriate) */
  score: number;
  /** true if score >= threshold */
  passed: boolean;
  /** Rejection reason (for internal logging when passed=false) */
  reason?: string;
  /** Suggestion shown to user (friendly tone) */
  suggestion?: string;
  /** Detected issue types (e.g. negative, defamation, gibberish, category_mismatch) */
  flags?: string[];
  /** Model used (debug) */
  model?: string;
}

const DEFAULT_THRESHOLD = 90;

const SYSTEM_PROMPT = `You are a quality checker for "Kudos" — gratitude messages from hotel guests to staff.
The user will provide a message along with a selected category.

## Language
Messages may be in ANY language (Japanese, English, Chinese, etc.). This is expected and causes NO errors. The system fully supports multilingual input. Do not treat non-English messages as problematic—score them fairly based on content quality only.

## Scoring (0–100)

Score messages in ANY language fairly. Do NOT penalize for writing in Japanese, Chinese, or other languages. Only deduct for content quality issues below.

Deductions:
- Negative, hostile, or insulting language
- Gibberish or meaningless text (e.g. "aaaa", "test", random characters)
- Spam or promotional content
- Inappropriate content
- Category mismatch: the message content clearly does not relate to the selected category (e.g. category is "Quick Response" but the message talks only about kindness with no mention of speed)

Bonus:
- Specific, sincere gratitude with concrete details
- Genuine gratitude in any language deserves a fair score

## Category definitions
- hospitality: Welcoming attitude, attentiveness to guest comfort
- professional: Competence, expertise, thorough work
- helpful: Kindness, going out of the way to help
- quick: Fast service, prompt response, efficiency
- smile: Friendly demeanor, warm smile, positive energy
- other: Does not fit a specific category — any genuine gratitude is fine

## Output format
Return JSON only.

If score >= 90:
{"score": 95, "reason": "", "suggestion": "", "flags": []}

If score < 90:
{"score": 40, "reason": "internal reason for logging", "suggestion": "A short, friendly tip for the guest (1-2 sentences, warm and encouraging)", "flags": ["category_mismatch"]}

## CRITICAL: Suggestion language
The "suggestion" field MUST be written in the SAME language as the user's message.
- If the message is in Japanese → write suggestion in Japanese
- If the message is in English → write suggestion in English
- If the message is in Chinese → write suggestion in Chinese
- Apply this rule for any language. Never respond in a different language than the input.

The "suggestion" is shown directly to the guest. Keep it kind and constructive. Never blame the user. Frame it as a helpful hint.`;

/**
 * Score a Kudos message via AI. If score < threshold (default 90), returns passed=false and post is blocked.
 *
 * @param messageText - Message content
 * @param threshold - Pass threshold (0–100)
 * @returns ModerationResult
 */
/** Log-safe: first part of message only (privacy) */
function messagePreview(text: string, maxLen = 30): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen) + "...";
}

export async function scoreKudosContent(
  messageText: string,
  threshold: number = DEFAULT_THRESHOLD,
  category?: string,
): Promise<ModerationResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const preview = messagePreview(messageText);

  if (!apiKey) {
    const result = fallbackScore(messageText, threshold);
    console.log("[moderation] fallback", {
      preview,
      score: result.score,
      passed: result.passed,
      model: result.model,
      flags: result.flags,
    });
    return result;
  }

  try {
    const result = await callOpenAI(messageText, apiKey, category);
    const passed = result.score >= threshold;
    console.log("[moderation] AI", {
      preview,
      category,
      score: result.score,
      threshold,
      passed,
      model: result.model,
      reason: result.reason,
      suggestion: result.suggestion,
      flags: result.flags,
    });
    return { ...result, passed };
  } catch (err) {
    console.error("[moderation] OpenAI API error:", err);
    const result = fallbackScore(messageText, threshold);
    console.log("[moderation] fallback (API error)", {
      preview,
      score: result.score,
      passed: result.passed,
      model: result.model,
    });
    return result;
  }
}

async function callOpenAI(
  messageText: string,
  apiKey: string,
  category?: string,
): Promise<ModerationResult> {
  const categoryLabel = category ? `Selected category: ${category}` : "No category selected";
  const userContent = `${categoryLabel}\n\nMessage:\n${messageText}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in OpenAI response");

  const parsed = JSON.parse(content) as {
    score?: number;
    reason?: string;
    suggestion?: string;
    flags?: string[];
  };
  const score = Math.max(0, Math.min(100, Number(parsed.score) || 50));
  return {
    score,
    passed: false,
    reason: parsed.reason,
    suggestion: parsed.suggestion,
    flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    model: "gpt-4o-mini",
  };
}

/** Simple check if input looks like Japanese (hiragana, katakana, kanji) */
function looksLikeJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
}

/**
 * Fallback when API key is unset or API fails.
 * Simple rules to block; otherwise pass. Suggestion follows input language (e.g. Japanese if detected).
 */
function fallbackScore(messageText: string, threshold: number): ModerationResult {
  const trimmed = messageText.trim();
  const flags: string[] = [];
  const isJa = looksLikeJapanese(trimmed);

  if (/^(.)\1{4,}$/.test(trimmed)) {
    flags.push("gibberish");
    return {
      score: 0, passed: false,
      reason: "Repeated characters",
      suggestion: isJa
        ? "メッセージが誤入力された可能性があります。スタッフのどんなところが良かったか教えてください。"
        : "It looks like the message might have been entered by accident. Could you share what you appreciated about the staff member?",
      flags,
    };
  }

  if (trimmed.length <= 2) {
    flags.push("too_short");
    return {
      score: 0, passed: false,
      reason: "Too short",
      suggestion: isJa
        ? "もう少し詳しく教えてください。体験で良かった点を一言でも書いていただけると嬉しいです。"
        : "We'd love to hear more! Even a short sentence about what made your experience great would be wonderful.",
      flags,
    };
  }

  return { score: 100, passed: true, model: "fallback" };
}
