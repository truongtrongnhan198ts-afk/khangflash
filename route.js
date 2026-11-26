// Next.js App Router API Route (V3: Deep Grading + Retry Drill + Coach Chat)
import { NextResponse } from "next/server";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_BASE64_BYTES = 12 * 1024 * 1024;

const DEEP_SYSTEM_PROMPT = `You are a senior certified IELTS Speaking Examiner and Band 9.0 speaking coach.
You will receive a student's raw audio recording answering an IELTS Speaking prompt.
Listen carefully to the actual audio: pacing, pauses, hesitations, filler words (um, uh, like, you know), self-corrections, word stress, sentence stress, intonation, linking sounds, and mispronunciations.

CRITICAL RULES:
1. Be ruthlessly honest and diagnostic. Do NOT give generic praise like "Good job" or "Try to use more vocabulary". Quote exact phrases from the student's audio in every single critique.
2. If the audio is silent, noise-only, or unintelligible (< 3 words), set overall_band to 1.0, state clearly in Vietnamese and English that no clear speech was detected, and do NOT hallucinate a transcript.
3. Grade strictly against official IELTS Speaking Band Descriptors (0.0 to 9.0 in 0.5 increments). Calculate overall_band as the exact mean of the 4 criteria rounded to the nearest 0.5 (e.g. 6.25 -> 6.5, 6.125 -> 6.0, 6.75 -> 7.0).
4. Transcribe verbatim, keeping fillers ("um", "uh"), repetitions, false starts, and grammar errors intact.
5. Provide explanations and coaching summaries in clear, direct Vietnamese, while keeping English examples, upgrades, IPA, and model answers in natural English.

Return ONLY valid JSON matching this exact schema (keep all keys):
{
  "transcript": "Verbatim transcript with fillers and errors intact",
  "overall_band": 6.5,
  "summary_vi": "Nhận xét tổng quan thẳng thắn (2-3 câu) bằng tiếng Việt về điểm mạnh lớn nhất và nút thắt lớn nhất đang kéo band xuống.",
  "metrics": {
    "word_count": 65,
    "estimated_wpm": 118,
    "pace_assessment": "Hơi chậm / Ổn định / Hơi nhanh",
    "filler_words": ["um (3)", "like (2)"],
    "hesitation_note": "Nhận xét cụ thể về các khoảng ngập ngừng hoặc tự sửa sai trong audio"
  },
  "scores": {
    "fluency_coherence": {
      "band": 6.5,
      "feedback": "Tóm tắt ngắn gọn 1-2 câu",
      "strengths": ["Điểm làm tốt kèm trích dẫn cụ thể"],
      "weaknesses": ["Lỗi cụ thể đang kéo band xuống kèm trích dẫn"],
      "next_band_tip": "1 hành động cụ thể để tăng +0.5 band ở tiêu chí này"
    },
    "lexical_resource": {
      "band": 6.0,
      "feedback": "Tóm tắt ngắn gọn 1-2 câu",
      "strengths": ["..."],
      "weaknesses": ["..."],
      "next_band_tip": "..."
    },
    "grammatical_range_accuracy": {
      "band": 6.5,
      "feedback": "Tóm tắt ngắn gọn 1-2 câu",
      "strengths": ["..."],
      "weaknesses": ["..."],
      "next_band_tip": "..."
    },
    "pronunciation": {
      "band": 6.0,
      "feedback": "Tóm tắt ngắn gọn 1-2 câu",
      "strengths": ["..."],
      "weaknesses": ["..."],
      "next_band_tip": "..."
    }
  },
  "pronunciation_clinic": [
    {
      "word": "schedule",
      "issue_vi": "Đọc thiếu âm cuối /l/ hoặc sai trọng âm",
      "ipa": "/ˈʃedʒ.uːl/ (UK) or /ˈskedʒ.uːl/ (US)",
      "fix_tip_vi": "Mẹo chỉnh khẩu hình/trọng âm ngắn gọn"
    }
  ],
  "corrections": [
    {
      "spoken": "Exact flawed phrase the student said",
      "issue": "Grammar / Lexical / Cohesion / Pronunciation",
      "explanation_vi": "Giải thích ngắn gọn bằng tiếng Việt vì sao câu này chưa tự nhiên hoặc sai ngữ pháp",
      "upgrade": "Natural Band 8.0+ phrasing"
    }
  ],
  "vocab_upgrades": [
    {
      "basic": "plan my day",
      "advanced": "map out my schedule",
      "type": "Collocation / Idiom / Phrasal Verb",
      "example": "I usually map out my schedule the night before so I don't feel overwhelmed."
    }
  ],
  "model_answer": "Band 8.5 rewrite of the student's own ideas (concise, natural, idiomatic)",
  "model_answer_band_7_5": "Band 7.5 natural version that is easier to memorize and deliver smoothly",
  "examiner_followup": "One natural follow-up question to continue the speaking test"
}`;
const CHAT_SYSTEM_PROMPT = `You are a sharp, direct, Band 9.0 IELTS Speaking Coach talking 1-on-1 with a Vietnamese learner.
You have the exact IELTS question, the student's verbatim transcript, and their detailed band evaluation in context.
Rules:
- Answer in natural, direct Vietnamese (keep English examples/phrases in English).
- Zero fluff, zero robotic praise. Get straight to the point like a real senior coach.
- Reference the student's actual words from the transcript whenever relevant.
- Keep answers concise, actionable, and easy to read (use bullet points when giving examples or drills).`;
const RETRY_SYSTEM_PROMPT = `You are an IELTS Speaking pronunciation & phrasing drill coach.
The student is re-recording a specific upgraded sentence/phrase to fix an error from their previous answer.
Listen carefully to the audio and compare it against the target upgraded phrasing.
Be honest: check if they fixed the original error, delivered it smoothly without awkward pauses, and pronounced key words clearly.

Return ONLY valid JSON:
{
  "passed": true,
  "score_10": 8,
  "heard": "Verbatim transcript of what the student just said",
  "feedback_vi": "Nhận xét thẳng thắn (1-2 câu tiếng Việt) xem đã sửa được lỗi cũ chưa, độ trôi chảy và phát âm thế nào.",
  "next_tip_vi": "1 mẹo nhỏ để nói câu này tự nhiên hơn nữa (hoặc 'Đạt chuẩn, chuyển sang lỗi tiếp theo!')."
}`;

async function callGemini(apiKey, payload) {
  const upstream = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    const status = upstream.status === 429 ? 429 : 502;
    throw { status, error: `Gemini API error (${upstream.status})`, details: errText };
  }

  const result = await upstream.json();
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw { status: 502, error: "Empty response from Gemini." };
  }
  return rawText;
}

async function handleAction(body, apiKey) {
  const action = body?.action || "evaluate";

  // 1. INTERACTIVE COACH CHAT
  if (action === "chat") {
    const { message, chatHistory, question, evaluation } = body;
    if (!message || !String(message).trim()) {
      throw { status: 400, error: "Missing chat message." };
    }

    const contextBlock = `IELTS Question: "${question || "N/A"}"
Student Transcript: "${evaluation?.transcript || "N/A"}"
Overall Band: ${evaluation?.overall_band ?? "N/A"}
Scores: FC=${evaluation?.scores?.fluency_coherence?.band ?? "-"}, LR=${evaluation?.scores?.lexical_resource?.band ?? "-"}, GR=${evaluation?.scores?.grammatical_range_accuracy?.band ?? "-"}, PR=${evaluation?.scores?.pronunciation?.band ?? "-"}
Summary: ${evaluation?.summary_vi || ""}`;

    const contents = [
      { role: "user", parts: [{ text: `Context of the student's recent IELTS Speaking attempt:\n${contextBlock}` }] },
      { role: "model", parts: [{ text: "Đã nắm rõ bài nói và bảng điểm. Bạn muốn hỏi gì cứ hỏi thẳng." }] },
    ];

    if (Array.isArray(chatHistory)) {
      chatHistory.slice(-8).forEach((m) => {
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: String(m.text || "") }],
        });
      });
    }
    contents.push({ role: "user", parts: [{ text: String(message).trim() }] });

    const reply = await callGemini(apiKey, {
      system_instruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.45, maxOutputTokens: 1024 },
    });
    return { reply };
  }

  // 2. TARGETED RETRY DRILL
  if (action === "retry_drill") {
    const { audioBase64, mimeType, originalSpoken, targetUpgrade, issue } = body;
    if (!audioBase64 || !mimeType || !targetUpgrade) {
      throw { status: 400, error: "Missing audioBase64, mimeType, or targetUpgrade." };
    }
    if (audioBase64.length > MAX_BASE64_BYTES) {
      throw { status: 413, error: "Audio clip too large." };
    }

    const cleanMime = mimeType.split(";")[0].trim();
    const prompt = `Original flawed phrase: "${originalSpoken || ""}"
Issue being fixed: "${issue || ""}"
Target Band 8.0+ upgrade: "${targetUpgrade}"
Listen to the student's retry audio and return the JSON verdict.`;

    const rawText = await callGemini(apiKey, {
      system_instruction: { parts: [{ text: RETRY_SYSTEM_PROMPT }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inline_data: { mime_type: cleanMime, data: audioBase64 } },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 1024 },
    });
    return JSON.parse(rawText);
  }

  // 3. DEFAULT: FULL DEEP IELTS EVALUATION (V2/V3)
  const { audioBase64, mimeType, part, question, history } = body || {};
  if (!audioBase64 || !mimeType || !question) {
    throw { status: 400, error: "Missing required fields: audioBase64, mimeType, question." };
  }
  if (audioBase64.length > MAX_BASE64_BYTES) {
    throw { status: 413, error: "Audio clip too large. Keep answers under 3 minutes." };
  }

  const cleanMime = mimeType.split(";")[0].trim();
  const historyContext = Array.isArray(history) && history.length > 0
    ? `\nPrevious turns:\n${history.map((h, i) => `Turn ${i + 1} Q: ${h.question}\nTurn ${i + 1} A: ${h.transcript}`).join("\n")}\n`
    : "";

  const userPrompt = `IELTS Speaking ${part || "Part 1"}\nExaminer Question: "${question}"\n${historyContext}\nAnalyze the attached audio deeply and return the exact JSON schema.`;

  const rawText = await callGemini(apiKey, {
    system_instruction: { parts: [{ text: DEEP_SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          { text: userPrompt },
          { inline_data: { mime_type: cleanMime, data: audioBase64 } },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 4096 },
  });
  return JSON.parse(rawText);
}


export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY in Vercel Environment Variables." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const data = await handleAction(body, apiKey);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error: err?.error || err?.message || "Internal server error",
        ...(err?.details ? { details: err.details } : {}),
      },
      { status: err?.status || 500 }
    );
  }
}
