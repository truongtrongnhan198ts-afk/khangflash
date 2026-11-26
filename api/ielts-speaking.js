// Vercel Serverless Function: /api/ielts-speaking
// Works with Vite, React, plain HTML, or Next.js Pages Router

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_BASE64_BYTES = 4 * 1024 * 1024;

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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed. Use POST." });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY in Vercel Environment Variables." });

  const { audioBase64, mimeType, part, question, history } = req.body || {};
  if (typeof audioBase64 !== "string" || !audioBase64 || typeof mimeType !== "string" || typeof question !== "string" || !question.trim() || question.length > 2000) {
    return res.status(400).json({ error: "Missing required fields: audioBase64, mimeType, question." });
  }
  if (audioBase64.length > MAX_BASE64_BYTES) {
    return res.status(413).json({ error: "Audio clip too large. Keep answers under 3 minutes." });
  }

  const cleanMime = mimeType.split(";")[0].trim().toLowerCase();
  if (!["audio/webm","audio/mp4","audio/ogg","audio/wav","audio/mpeg","audio/m4a","audio/aac","audio/flac"].includes(cleanMime)) {
    return res.status(415).json({ error: "Định dạng bản thu không được hỗ trợ." });
  }
  const historyContext = Array.isArray(history) && history.length > 0
    ? `\nPrevious turns:\n${history.map((h, i) => `Turn ${i + 1} Q: ${h.question}\nTurn ${i + 1} A: ${h.transcript}`).join("\n")}\n`
    : "";

  const userPrompt = `IELTS Speaking ${part || "Part 1"}\nExaminer Question: "${question}"\n${historyContext}\nEvaluate the attached audio response strictly according to the IELTS rubric and return the JSON object.`;

  try {
    const upstream = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(25000),
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
      return res.status(upstream.status === 429 ? 429 : 502).json({
        error: `Gemini API error (${upstream.status})`,
      });
    }

    const result = await upstream.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return res.status(502).json({ error: "Empty response from Gemini." });

    const resultBody=JSON.parse(rawText);
    const ids=["fluency_coherence","lexical_resource","grammatical_range_accuracy","pronunciation"];
    const valid=ids.every(id=>{
      const score=resultBody?.scores?.[id];
      return Number.isFinite(score?.band)&&score.band>=0&&score.band<=9&&typeof score.feedback==="string";
    });
    if(!valid||typeof resultBody.transcript!=="string"||!resultBody.transcript.trim()){
      return res.status(502).json({error:"Gemini chưa trả được kết quả đủ để chấm bản thu."});
    }
    resultBody.overall_band=Math.round(ids.reduce((sum,id)=>sum+resultBody.scores[id].band,0)/2)/2;
    return res.status(200).json(resultBody);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
