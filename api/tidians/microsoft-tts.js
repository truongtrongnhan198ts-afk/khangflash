/* KhangFlash Microsoft Online TTS Serverless API (/api/tidians/microsoft-tts)
 * Zero-dependency CommonJS handler for Vercel Node.js (18/20/22/24/26).
 * Supports GET (sample) and POST ({ text, voice, pitch, rate, stream }).
 */
'use strict';

const https = require('node:https');
const crypto = require('node:crypto');

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
const EDGE_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_FULL_VERSION} Safari/537.36 Edg/${CHROMIUM_FULL_VERSION}`;
const EDGE_ORIGIN = 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold';
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

const SAMPLE_TEXTS = {
  'en-GB-SoniaNeural': 'Clear pronunciation and steady practice build lasting confidence.',
  'en-GB-RyanNeural': 'Clear pronunciation and steady practice build lasting confidence.',
  'en-US-GuyNeural': 'Clear pronunciation and steady practice build lasting confidence.',
  'en-US-ChristopherNeural': 'Clear pronunciation and steady practice build lasting confidence.'
};

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
  if (raw === undefined || raw === null || raw === '') return '+0Hz';
  const s = String(raw).trim();
  if (/^[+-]?\d+(?:\.\d+)?(?:Hz|%|st)$/i.test(s)) {
    return /^[+-]/.test(s) ? s : '+' + s;
  }
  const n = Number(s);
  if (Number.isFinite(n)) {
    const clamped = Math.max(-50, Math.min(50, Math.round(n)));
    return (clamped >= 0 ? '+' : '') + clamped + 'Hz';
  }
  return '+0Hz';
}

function normalizeRate(raw) {
  if (raw === undefined || raw === null || raw === '') return '+0%';
  const s = String(raw).trim();
  if (/^[+-]?\d+%$/.test(s)) return /^[+-]/.test(s) ? s : '+' + s;
  const n = Number(s);
  if (Number.isFinite(n) && n > 0.4 && n < 2.5) {
    const pct = Math.max(-50, Math.min(100, Math.round((n - 1) * 100)));
    return (pct >= 0 ? '+' : '') + pct + '%';
  }
  return '+0%';
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSecMsGec() {
  const WIN_EPOCH_OFFSET = 11644473600n;
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  let ticks = nowSec + WIN_EPOCH_OFFSET;
  ticks -= ticks % 300n;
  ticks *= 10000000n;
  return crypto
    .createHash('sha256')
    .update(`${ticks.toString()}${TRUSTED_CLIENT_TOKEN}`, 'ascii')
    .digest('hex')
    .toUpperCase();
}

function buildWsFrame(opcode, payloadBuf) {
  const len = payloadBuf.length;
  const maskKey = crypto.randomBytes(4);
  let header;
  if (len < 126) {
    header = Buffer.alloc(6);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | len;
    maskKey.copy(header, 2);
  } else if (len < 65536) {
    header = Buffer.alloc(8);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
    maskKey.copy(header, 4);
  } else {
    header = Buffer.alloc(14);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(len), 2);
    maskKey.copy(header, 10);
  }
  const masked = Buffer.allocUnsafe(len);
  for (let i = 0; i < len; i++) {
    masked[i] = payloadBuf[i] ^ maskKey[i & 3];
  }
  return Buffer.concat([header, masked]);
}

function buildSsml(text, voice, pitch, rate) {
  const lang = voice.split('-').slice(0, 2).join('-') || 'en-GB';
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
    `<voice name='${voice}'>` +
    `<prosody pitch='${pitch}' rate='${rate}' volume='+0%'>${escapeXml(text)}</prosody>` +
    `</voice></speak>`
  );
}

function synthesizeViaEdgeWs(endpointUrl, { text, voice, pitch, rate, timeoutMs = 9000 }) {
  return new Promise((resolve, reject) => {
    const u = new URL(endpointUrl);
    const wsKey = crypto.randomBytes(16).toString('base64');
    const reqId = crypto.randomBytes(16).toString('hex');
    const audioChunks = [];
    let settled = false;
    let socketRef = null;
    let recvBuf = Buffer.alloc(0);
    let fragOpcode = 0;
    let fragParts = [];

    const timer = setTimeout(() => {
      finish(new Error('Hết thời gian chờ kết nối giọng Microsoft.'));
    }, timeoutMs);

    function finish(err, data) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (socketRef && !socketRef.destroyed) {
        try { socketRef.end(); } catch {}
        try { socketRef.destroy(); } catch {}
      }
      if (err) reject(err);
      else resolve(data);
    }

    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Key': wsKey,
        'Sec-WebSocket-Version': '13',
        'Origin': EDGE_ORIGIN,
        'User-Agent': EDGE_UA,
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    req.on('response', (res) => {
      finish(new Error(`Máy chủ Microsoft từ chối kết nối (HTTP ${res.statusCode}).`));
    });

    req.on('error', (err) => {
      finish(new Error(`Lỗi kết nối Microsoft TTS: ${err.message}`));
    });

    req.on('upgrade', (res, socket, head) => {
      socketRef = socket;
      const now = new Date().toUTCString();
      const configMsg =
        `X-Timestamp:${now}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
                outputFormat: OUTPUT_FORMAT
              }
            }
          }
        });

      const ssml = buildSsml(text, voice, pitch, rate);
      const ssmlMsg =
        `X-RequestId:${reqId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${now}\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml;

      socket.write(buildWsFrame(0x1, Buffer.from(configMsg, 'utf8')));
      socket.write(buildWsFrame(0x1, Buffer.from(ssmlMsg, 'utf8')));

      function handleMessage(opcode, payload) {
        if (opcode === 0x1) {
          const msg = payload.toString('utf8');
          if (msg.includes('Path:turn.end')) {
            const out = Buffer.concat(audioChunks);
            if (out.length < 300) {
              finish(new Error('Dữ liệu âm thanh Microsoft trả về quá ngắn.'));
            } else {
              finish(null, out);
            }
          }
        } else if (opcode === 0x2) {
          if (payload.length >= 2) {
            const headerLen = payload.readUInt16BE(0);
            const bodyStart = 2 + headerLen;
            if (bodyStart <= payload.length) {
              const headerText = payload.subarray(2, bodyStart).toString('utf8');
              if (headerText.includes('Path:audio')) {
                audioChunks.push(payload.subarray(bodyStart));
              }
            }
          }
        } else if (opcode === 0x9) {
          try { socket.write(buildWsFrame(0xA, payload)); } catch {}
        } else if (opcode === 0x8) {
          const out = Buffer.concat(audioChunks);
          if (out.length >= 300) finish(null, out);
          else finish(new Error('Kết nối giọng Microsoft bị đóng trước khi hoàn tất.'));
        }
      }

      function processChunk(chunk) {
        if (!chunk || !chunk.length) return;
        recvBuf = recvBuf.length ? Buffer.concat([recvBuf, chunk]) : chunk;

        while (recvBuf.length >= 2) {
          const b0 = recvBuf[0];
          const b1 = recvBuf[1];
          const fin = (b0 & 0x80) !== 0;
          const opcode = b0 & 0x0f;
          const masked = (b1 & 0x80) !== 0;
          let payloadLen = b1 & 0x7f;
          let offset = 2;

          if (payloadLen === 126) {
            if (recvBuf.length < offset + 2) break;
            payloadLen = recvBuf.readUInt16BE(offset);
            offset += 2;
          } else if (payloadLen === 127) {
            if (recvBuf.length < offset + 8) break;
            payloadLen = Number(recvBuf.readBigUInt64BE(offset));
            offset += 8;
          }

          let maskKey = null;
          if (masked) {
            if (recvBuf.length < offset + 4) break;
            maskKey = recvBuf.subarray(offset, offset + 4);
            offset += 4;
          }

          if (recvBuf.length < offset + payloadLen) break;

          let payload = recvBuf.subarray(offset, offset + payloadLen);
          recvBuf = recvBuf.subarray(offset + payloadLen);

          if (masked && maskKey) {
            const unmasked = Buffer.allocUnsafe(payload.length);
            for (let i = 0; i < payload.length; i++) unmasked[i] = payload[i] ^ maskKey[i & 3];
            payload = unmasked;
          }

          if (opcode >= 0x8) {
            handleMessage(opcode, payload);
            continue;
          }

          if (opcode !== 0) {
            fragOpcode = opcode;
            fragParts = [payload];
          } else {
            fragParts.push(payload);
          }

          if (fin) {
            const full = fragParts.length === 1 ? fragParts[0] : Buffer.concat(fragParts);
            const finalOpcode = fragOpcode;
            fragOpcode = 0;
            fragParts = [];
            handleMessage(finalOpcode, full);
          }
        }
      }

      if (head && head.length) processChunk(head);
      socket.on('data', processChunk);
      socket.on('error', (err) => finish(new Error(`Lỗi luồng Microsoft TTS: ${err.message}`)));
      socket.on('close', () => {
        if (!settled) {
          const out = Buffer.concat(audioChunks);
          if (out.length >= 300) finish(null, out);
          else finish(new Error('Kết nối Microsoft TTS đã đóng sớm.'));
        }
      });
    });

    req.end();
  });
}

async function synthesizeViaAzureRest({ text, voice, pitch, rate }) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';
  if (!key) return null;

  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': OUTPUT_FORMAT,
      'User-Agent': 'KhangFlash'
    },
    body: buildSsml(text, voice, pitch, rate)
  });

  if (!res.ok) {
    throw new Error(`Azure Speech HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function synthesizeMicrosoft(opts) {
  if (process.env.AZURE_SPEECH_KEY) {
    const buf = await synthesizeViaAzureRest(opts);
    if (buf && buf.length >= 300) return { buffer: buf, provider: 'azure-rest' };
  }

  const connId = crypto.randomBytes(16).toString('hex');
  const endpoints = [
    {
      name: 'edge-v2',
      url: `wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1?Ocp-Apim-Subscription-Key=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connId}`
    },
    {
      name: 'edge-v1',
      url: `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connId}`
    }
  ];

  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const buffer = await synthesizeViaEdgeWs(ep.url, opts);
      return { buffer, provider: ep.name };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Chưa kết nối được giọng Microsoft.');
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
    if (!text) {
      text = SAMPLE_TEXTS[voice] || 'Clear pronunciation and steady practice build lasting confidence.';
    }
    text = text.replace(/\s+/g, ' ').slice(0, 1200);

    const { buffer, provider } = await synthesizeMicrosoft({ text, voice, pitch, rate });

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

// Export helpers for unit testing
module.exports._test = { resolveVoice, normalizePitch, normalizeRate, escapeXml, generateSecMsGec, buildWsFrame, buildSsml };
