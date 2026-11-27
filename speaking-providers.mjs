import { timingSafeEqual } from 'node:crypto';

const formats = {
  'audio/wav': 'wav', 'audio/mpeg': 'mp3', 'audio/mp4': 'mp4',
  'audio/m4a': 'm4a', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/flac': 'flac',
};
const formatFor = mime => formats[mime];

export async function transcribeWithOpenAI(audio, deadline) {
  const key = process.env.OPENAI_API_KEY;
  const format = formatFor(audio.mime_type);
  if (!key || !format || process.env.SPEAKING_TRANSCRIBE_PROVIDER !== 'openai') return null;
  const form = new FormData();
  form.append('file', new Blob([Buffer.from(audio.data, 'base64')], { type: audio.mime_type }), 'speaking.' + format);
  form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-transcribe');
  form.append('prompt', 'Verbatim English transcript. Keep filler words, false starts, repetitions and grammatical errors. Do not correct wording or invent speech.');
  const result = await providerJson('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: form,
  }, deadline, 10000);
  return typeof result?.text === 'string' && result.text.trim() ? result.text.trim() : null;
}

export async function scoreWithOpenAI(audio, prompt, context, deadline) {
  const key = process.env.OPENAI_API_KEY;
  const format = formatFor(audio.mime_type);
  if (!key || !['wav', 'mp3'].includes(format)) return null;
  const model = process.env.OPENAI_SPEAKING_MODEL || 'gpt-audio';
  const result = await providerJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, modalities: ['text'], temperature: 0, max_completion_tokens: 2048,
      messages: [
        { role: 'system', content: prompt + '\nReturn only a JSON object, with no markdown.' },
        { role: 'user', content: [
          { type: 'text', text: JSON.stringify(context) },
          { type: 'input_audio', input_audio: { data: audio.data, format } },
        ] },
      ],
    }),
  }, deadline, 15000);
  const text = result?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') return null;
  try {
    const score = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
    return score && typeof score === 'object' && !Array.isArray(score) ? { score, model } : null;
  } catch {
    return null;
  }
}

function isShortPcmWav(bytes) {
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') return false;
  let validFormat = false;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > bytes.length) return false;
    if (type === 'fmt ' && size >= 16) {
      validFormat = bytes.readUInt16LE(start) === 1 && bytes.readUInt16LE(start + 2) === 1 &&
        bytes.readUInt32LE(start + 4) === 16000 && bytes.readUInt16LE(start + 14) === 16;
    }
    if (type === 'data') return validFormat && size > 0 && size <= 30 * 32000;
    offset = start + size + (size % 2);
  }
  return false;
}

export async function assessPronunciation(audio, referenceText, deadline) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || '';
  if (!key || !/^[a-z0-9]+$/.test(region) || audio.mime_type !== 'audio/wav') return null;
  const bytes = Buffer.from(audio.data, 'base64');
  if (!isShortPcmWav(bytes)) return null;
  const options = Buffer.from(JSON.stringify({
    ReferenceText: referenceText, GradingSystem: 'HundredMark',
    Granularity: 'Phoneme', Dimension: 'Comprehensive', EnableMiscue: true,
  })).toString('base64');
  const result = await providerJson(
    'https://' + region + '.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed',
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key, 'Pronunciation-Assessment': options,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000', Accept: 'application/json',
      },
      body: bytes,
    }, deadline, 8000,
  );
  const best = result?.NBest?.[0];
  const assessment = best?.PronunciationAssessment ?? best;
  if (!Number.isFinite(assessment?.AccuracyScore)) return null;
  const words = (best.Words || []).slice(0, 30).flatMap(word => {
    const detail = word.PronunciationAssessment ?? word;
    return typeof word.Word === 'string' && Number.isFinite(detail.AccuracyScore)
      ? [{ word: word.Word, accuracy: detail.AccuracyScore, error: detail.ErrorType ?? null }]
      : [];
  });
  return { provider: 'azure', accuracy: assessment.AccuracyScore, words };
}

export function allowsComparison(req) {
  const expected = process.env.SPEAKING_COMPARE_TOKEN;
  const provided = req.headers?.['x-speaking-compare-token'];
  if (!expected || typeof provided !== 'string') return false;
  const left = Buffer.from(expected), right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function providerJson(url, init, deadline, capMs) {
  const timeout = Math.min(capMs, deadline - Date.now());
  if (timeout < 2000) return null;
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
