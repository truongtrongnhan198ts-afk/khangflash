/* KhangFlash Microsoft Online TTS Serverless API (/api/tidians/microsoft-tts)
 * Uses node-edge-tts ^1.2.12 (Sec-MS-GEC v2 / CS64-SHA256) + optional Azure Speech key.
 * Supports GET (sample) and POST ({ text, voice, pitch, rate, stream }).
 */
'use strict';

const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

const VOICE_MAP = {
  'microsoft-sonia': 'en-GB-SoniaNeural',
  'sonia': 'en-GB-SoniaNeural',
  'microsoft-ryan': 'en-GB-RyanNeural',
  'ryan': 'en-GB-RyanNeural',
  'microsoft-libby': 'en-GB-LibbyNeural',
  'libby': 'en-GB-LibbyNeural',
  'microsoft-maisie': 'en-GB-MaisieNeural',
  'maisie': 'en-GB-MaisieNeural',
  'microsoft-thomas': 'en-GB-ThomasNeural',
  'thomas': 'en-GB-ThomasNeural',
  'microsoft-guy': 'en-US-GuyNeural',
  'guy': 'en-US-GuyNeural',
  'microsoft-christopher': 'en-US-ChristopherNeural',
  'christopher': 'en-US-ChristopherNeural',
  'chris': 'en-US-ChristopherNeural',
  'microsoft-jenny': 'en-US-JennyNeural',
  'jenny': 'en-US-JennyNeural',
  'microsoft-aria': 'en-US-AriaNeural',
  'aria': 'en-US-AriaNeural',
  'microsoft-ava': 'en-US-AvaNeural',
  'ava': 'en-US-AvaNeural',
  'microsoft-andrew': 'en-US-AndrewNeural',
  'andrew': 'en-US-AndrewNeural',
  'microsoft-brian': 'en-US-BrianNeural',
  'brian': 'en-US-BrianNeural',
  'microsoft-emma': 'en-US-EmmaNeural',
  'emma': 'en-US-EmmaNeural',
  'microsoft-steffan': 'en-US-SteffanNeural',
  'steffan': 'en-US-SteffanNeural',
  'microsoft-natasha': 'en-AU-NatashaNeural',
  'natasha': 'en-AU-NatashaNeural',
  'microsoft-william': 'en-AU-WilliamNeural',
  'william': 'en-AU-WilliamNeural'
};

const DEFAULT_SAMPLE = 'Clear pronunciation and steady practice build lasting confidence.';

function resolveVoice(raw) {
  const s = String(raw || '').trim();
  if (!s) return 'en-GB-SoniaNeural';
  if (/^[a-z]{2}-[A-Z]{2}-[A-Za-z0-9]+Neural$/.test(s)) return s;
  const key = s.toLowerCase().replace(/^ms-/, 'microsoft-');
  if (VOICE_MAP[key]) return VOICE_MAP[key];
  const bare = key.replace(/^microsoft-/, '').replace(/-uk$|-us$|-au$/, '');
  if (VOICE_MAP[bare]) return VOICE_MAP[bare];
  return 'en-GB-SoniaNeural';
}

function normalizePitch(raw) {
  if (raw === undefined || raw === null || raw === '' || raw === 'default') return 'default';
  const s = String(raw).trim();
  if (/^[+-]?\d+(?:\.\d+)?(?:Hz|%|st)$/i.test(s)) {
    return /^[+-]/.test(s) ? s : '+' + s;
  }
  const n = Number(s);
  if (Number.isFinite(n)) {
    if (Math.round(n) === 0) return 'default';
    const clamped = Math.max(-50, Math.min(50, Math.round(n)));
    return (clamped >= 0 ? '+' : '') + clamped + 'Hz';
  }
  return 'default';
}

function normalizeRate(raw) {
  if (raw === undefined || raw === null || raw === '' || raw === 'default') return 'default';
  const s = String(raw).trim();
  if (/^[+-]?\d+%$/.test(s)) return /^[+-]/.test(s) ? s : '+' + s;
  const n = Number(s);
  if (Number.isFinite(n) && n > 0.4 && n < 2.5) {
    const pct = Math.max(-50, Math.min(100, Math.round((n - 1) * 100)));
    return pct === 0 ? 'default' : (pct > 0 ? '+' : '') + pct + '%';
  }
  return 'default';
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function synthesizeViaAzureRest({ text, voice, pitch, rate }) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';
  if (!key) return null;
  const lang = voice.split('-').slice(0, 2).join('-') || 'en-GB';
  const ssml =
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
    `<voice name='${voice}'>` +
    `<prosody pitch='${pitch === 'default' ? '+0Hz' : pitch}' rate='${rate === 'default' ? '+0%' : rate}'>${escapeXml(text)}</prosody>` +
    `</voice></speak>`;

  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': OUTPUT_FORMAT,
      'User-Agent': 'KhangFlash'
    },
    body: ssml
  });
  if (!res.ok) throw new Error(`Azure Speech HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function synthesizeViaNodeEdgeTts({ text, voice, pitch, rate }) {
  const { EdgeTTS } = require('node-edge-tts');
  const lang = voice.split('-').slice(0, 2).join('-') || 'en-GB';
  const tts = new EdgeTTS({
    voice,
    lang,
    outputFormat: OUTPUT_FORMAT,
    pitch,
    rate,
    timeout: 10000
  });

  const chunks = [];
  for await (const chunk of tts.streamAudio(text)) {
    if (Buffer.isBuffer(chunk)) chunks.push(chunk);
  }
  const out = Buffer.concat(chunks);
  if (out.length < 300) {
    throw new Error('Dữ liệu âm thanh Microsoft trả về quá ngắn.');
  }
  return out;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const query = req.query || {};
    const body = req.method === 'POST' ? await readJsonBody(req) : {};
    const voice = resolveVoice(body.voice || query.voice);
    const pitch = normalizePitch(body.pitch !== undefined ? body.pitch : query.pitch);
    const rate = normalizeRate(body.rate !== undefined ? body.rate : query.rate);

    let text = String(body.text || query.text || '').trim();
    if (!text) text = DEFAULT_SAMPLE;
    text = text.replace(/\s+/g, ' ').slice(0, 1200);

    let buffer = null;
    let provider = 'node-edge-tts-v2';
    if (process.env.AZURE_SPEECH_KEY) {
      buffer = await synthesizeViaAzureRest({ text, voice, pitch, rate });
      provider = 'azure-rest';
    }
    if (!buffer) {
      buffer = await synthesizeViaNodeEdgeTts({ text, voice, pitch, rate });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    res.setHeader('X-TTS-Voice', voice);
    res.setHeader('X-TTS-Provider', provider);
    return res.status(200).send(buffer);
  } catch (err) {
    return res.status(502).json({
      error: err && err.message ? err.message : 'Chưa kết nối được giọng Microsoft.'
    });
  }
};

module.exports._test = { resolveVoice, normalizePitch, normalizeRate, escapeXml };
