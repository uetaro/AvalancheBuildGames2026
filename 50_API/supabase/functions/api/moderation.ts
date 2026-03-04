// AI コンテンツモデレーション — Kudos 投稿前のスコアリング
// ネガティブ表現・誹謗中傷・無意味な文字列等を検出し、90点未満なら投稿を拒否する土台

export interface ModerationResult {
  /** 0〜100 のスコア（100が最も適切） */
  score: number;
  /** 閾値以上なら true */
  passed: boolean;
  /** 拒否理由（passed=false の場合） */
  reason?: string;
  /** 検出した問題の種別（例: negative, defamation, gibberish） */
  flags?: string[];
  /** 使用したモデル（デバッグ用） */
  model?: string;
}

const DEFAULT_THRESHOLD = 90;

const SYSTEM_PROMPT = `あなたはホテルスタッフへの感謝メッセージ（Kudos）の品質チェッカーです。
以下の観点でメッセージを0〜100点でスコアリングしてください。

減点対象:
- ネガティブ表現
- 誹謗中傷、侮辱
- 意味のない文字の羅列（例: ああああ、test）
- スパムや宣伝
- 不適切な内容

加点対象:
- 具体的で誠実な感謝

JSON のみで返答してください。例: {"score": 85, "reason": "やや抽象的", "flags": []}
スコアが90未満の場合は reason と flags を必ず含めてください。`;

/**
 * 生成AIで Kudos メッセージをスコアリングする。
 * 閾値（デフォルト90）未満なら passed=false を返し、投稿を中断する。
 *
 * @param messageText - 投稿内容
 * @param threshold - 合格ライン（0〜100）
 * @returns ModerationResult
 */
/** ログ用: メッセージの先頭のみ（プライバシー配慮） */
function messagePreview(text: string, maxLen = 30): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen) + "...";
}

export async function scoreKudosContent(
  messageText: string,
  threshold: number = DEFAULT_THRESHOLD
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
    const result = await callOpenAI(messageText, apiKey);
    const passed = result.score >= threshold;
    console.log("[moderation] AI", {
      preview,
      score: result.score,
      threshold,
      passed,
      model: result.model,
      reason: result.reason,
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
  apiKey: string
): Promise<ModerationResult> {
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
        { role: "user", content: `以下のメッセージをスコアリングしてください:\n\n${messageText}` },
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

  const parsed = JSON.parse(content) as { score?: number; reason?: string; flags?: string[] };
  const score = Math.max(0, Math.min(100, Number(parsed.score) ?? 50));
  return {
    score,
    passed: false, // 呼び出し元で threshold と比較する
    reason: parsed.reason,
    flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    model: "gpt-4o-mini",
  };
}

/**
 * API キー未設定時・API 失敗時のフォールバック。
 * 簡易ルールでブロックし、それ以外は通過させる。
 */
function fallbackScore(messageText: string, threshold: number): ModerationResult {
  const trimmed = messageText.trim();
  const flags: string[] = [];

  // 無意味な文字列の羅列（同じ文字が5回以上連続）
  if (/^(.)\1{4,}$/.test(trimmed)) {
    flags.push("gibberish");
    return { score: 0, passed: false, reason: "意味のない文字の羅列は投稿できません。", flags };
  }

  // 極端に短い（1〜2文字）
  if (trimmed.length <= 2) {
    flags.push("too_short");
    return { score: 0, passed: false, reason: "もう少し具体的なメッセージを入力してください。", flags };
  }

  // 明らかな不適切語（例: 簡易チェック）
  const blockedPatterns = [
    /死ね|殺す|消えろ/i,
    /バカ|馬鹿|あほ|アホ/i,
    /クソ|クソ|糞/i,
  ];
  for (const p of blockedPatterns) {
    if (p.test(trimmed)) {
      flags.push("inappropriate");
      return { score: 0, passed: false, reason: "不適切な表現が含まれています。内容を修正してください。", flags };
    }
  }

  // フォールバック: 通過（API 未設定時はブロックしない）
  return { score: 100, passed: true, model: "fallback" };
}
