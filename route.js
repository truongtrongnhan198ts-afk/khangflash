// Next.js App Router API Route: app/api/ielts-speaking/route.js
import { NextResponse } from "next/server";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_BASE64_BYTES = 12 * 1024 * 1024;

const SYSTEM_PROMPT = `You are a certified senior IELTS Speaking Examiner.
You will receive a student's raw audio recording answering an IELTS Speaking prompt.
Listen carefully to the actual audio — including hesitations, filler words (um, uh, like), pacing, intonation, word stress, mispronunciations, and self-corrections.

Grade strictly against official IELTS Speaking Band Descriptors (0.0 to 9.0 in 0.5 increments):
1. fluency_coherence: speech rate, hesitation/pauses, discourse markers, logical progression, topic development.
2. lexical_resource: vocabulary range, idiomaticity, collocations, precision, avoidance of repetition.
3. grammatical_range_accuracy: mix of simple/complex structures, tense control, clause variety, error frequency.
4. pronunciation: individual sounds, word/sentence stress, intonation, rhythm, intelligibility.

Rules:
- Be ruthlessly honest. Do not inflate scores. Most intermediate learners score 5.5-6.5.
- Calculate overall_band as the exact mean of the 4 criteria rounded to the nearest 0.5 (e.g., 6.25 -> 6.5, 6.125 -> 6.0, 6.75 -> 7.0).
- Transcribe verbatim, preserving fillers ("um", "uh"), false starts, and grammatical mistakes exactly as spoken.
- Quote exact phrases from the student's audio in every critique.
- Provide a natural examiner follow-up question appropriate for the current IELTS Part.

Return ONLY valid JSON matching this exact schema:
{
  "transcript": "Verbatim transcript with fillers and errors intact",
  "overall_band": 6.5,
  "scores": {
    "fluency_coherence": { "band": 6.5, "feedback": "Specific critique quoting audio evidence" },
    "lexical_resource": { "band": 6.0, "feedback": "Specific critique quoting audio evidence" },
    "grammatical_range_accuracy": { "band": 6.5, "feedback": "Specific critique quoting audio evidence" },
    "pronunciation": { "band": 6.5, "feedback": "Specific critique on stress, rhythm, clarity, and mispronounced words" }
  },
  "corrections": [
    {
      "spoken": "Exact flawed phrase the student said",
      "issue": "Grammar / Lexical / Cohesion / Pronunciation issue",
      "upgrade": "Natural Band 8.0+ phrasing"
    }
  ],
  "model_answer": "A concise Band 8.5 rewrite of the student's own ideas",
  "examiner_followup": "One natural follow-up question to continue the speaking test"
}`;

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

  const { audioBase64, mimeType, part, question, history } = body || {};
  if (!audioBase64 || !mimeType || !question) {
    return NextResponse.json(
      { error: "Missing required fields: audioBase64, mimeType, question." },
      { status: 400 }
    );
  }
  if (audioBase64.length > MAX_BASE64_BYTES) {
    return NextResponse.json(
      { error: "Audio clip too large. Keep answers under 3 minutes." },
      { status: 413 }
    );
  }

  const cleanMime = mimeType.split(";")[0].trim();
  const historyContext = Array.isArray(history) && history.length > 0
    ? `\nPrevious turns:\n${history.map((h, i) => `Turn ${i + 1} Q: ${h.question}\nTurn ${i + 1} A: ${h.transcript}`).join("\n")}\n`
    : "";

  const userPrompt = `IELTS Speaking ${part || "Part 1"}\nExaminer Question: "${question}"\n${historyContext}\nEvaluate the attached audio response strictly according to the IELTS rubric and return the JSON object.`;

  try {
    const upstream = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: userPrompt },
              { inline_data: { mime_type: cleanMime, data: audioBase64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.25,
        },
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return NextResponse.json(
        { error: `Gemini API error (${upstream.status})`, details: errText },
        { status: upstream.status === 429 ? 429 : 502 }
      );
    }

    const result = await upstream.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json({ error: "Empty response from Gemini." }, { status: 502 });
    }

    return NextResponse.json(JSON.parse(rawText), { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
