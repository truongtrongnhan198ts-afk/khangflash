/**
 * KhangFlash Speaking Audio Enhancer (Zero-dependency Vanilla JS, fail-open).
 * - Cross-browser MIME selection (Chrome / Firefox / Safari iOS) under 3 MB.
 * - Optional gentle noise filter (80 Hz high-pass rumble cut + soft compressor)
 *   preserving final consonants (/s/, /t/, /θ/) needed for IELTS Pronunciation grading.
 * - Real-time RMS Voice Activity Detection (VAD) & pause telemetry (durationSec,
 *   pauseCount, longPauseCount, maxPauseMs, speechRatio, isSilent).
 */

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

export function pickSupportedMimeType(isTypeSupported = (m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
  for (const mime of MIME_CANDIDATES) {
    try {
      if (isTypeSupported(mime)) return mime;
    } catch {}
  }
  return "audio/webm";
}

/**
 * Pure telemetry analyzer over RMS energy frames (unit-testable in Node & browser).
 * @param {number[]} rmsFrames - RMS amplitude per frame (0.0 - 1.0)
 * @param {number} frameMs - duration per frame in ms (default 50ms)
 * @param {object} [opts]
 */
export function analyzeSpeechFrames(rmsFrames, frameMs = 50, opts = {}) {
  const voiceThreshold = opts.voiceThreshold ?? 0.015;
  const pauseMinMs = opts.pauseMinMs ?? 450;
  const longPauseMinMs = opts.longPauseMinMs ?? 1000;

  if (!Array.isArray(rmsFrames) || !rmsFrames.length) {
    return {
      durationSec: 0,
      speechSec: 0,
      speechRatio: 0,
      pauseCount: 0,
      longPauseCount: 0,
      maxPauseMs: 0,
      isSilent: true,
    };
  }

  let voicedFrames = 0;
  let seenVoice = false;
  let currentSilenceMs = 0;
  let pauseCount = 0;
  let longPauseCount = 0;
  let maxPauseMs = 0;

  for (const rms of rmsFrames) {
    if (rms >= voiceThreshold) {
      if (seenVoice && currentSilenceMs >= pauseMinMs) {
        pauseCount++;
        if (currentSilenceMs >= longPauseMinMs) longPauseCount++;
        if (currentSilenceMs > maxPauseMs) maxPauseMs = currentSilenceMs;
      }
      seenVoice = true;
      currentSilenceMs = 0;
      voicedFrames++;
    } else if (seenVoice) {
      currentSilenceMs += frameMs;
    }
  }

  const totalMs = rmsFrames.length * frameMs;
  const speechMs = voicedFrames * frameMs;
  return {
    durationSec: Number((totalMs / 1000).toFixed(1)),
    speechSec: Number((speechMs / 1000).toFixed(1)),
    speechRatio: totalMs > 0 ? Number((speechMs / totalMs).toFixed(2)) : 0,
    pauseCount,
    longPauseCount,
    maxPauseMs: Math.round(maxPauseMs),
    isSilent: speechMs < 350,
  };
}

/**
 * Create a clean, fail-open recording session with optional gentle filtering and live VAD telemetry.
 * Usage in ielts-speaking.js:
 *   const rec = await createCleanRecorder({ denoise: true, onLevel: (rms) => ... });
 *   rec.start();
 *   const { blob, mimeType, audioMetrics } = await rec.stop();
 */
export async function createCleanRecorder(options = {}) {
  const denoise = options.denoise !== false;
  const frameMs = options.frameMs || 50;
  const rawStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      autoGainControl: true,
      noiseSuppression: denoise,
    },
  });

  let audioCtx = null;
  let recordStream = rawStream;
  let analyser = null;

  // Fail-open Web Audio filter chain: 80 Hz high-pass (rumble cut) + soft compressor
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(rawStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;

      if (denoise) {
        const highpass = audioCtx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 80;
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.15;
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(highpass);
        highpass.connect(compressor);
        compressor.connect(analyser);
        compressor.connect(dest);
        recordStream = dest.stream;
      } else {
        source.connect(analyser);
      }
    }
  } catch {
    recordStream = rawStream;
  }

  const mimeType = pickSupportedMimeType();
  const recorder = new MediaRecorder(recordStream, {
    mimeType,
    audioBitsPerSecond: options.audioBitsPerSecond || 48000,
  });

  const chunks = [];
  const rmsFrames = [];
  let timerId = null;

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  function startSampling() {
    if (!analyser) return;
    const buf = new Float32Array(analyser.fftSize);
    timerId = setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
      const rms = Math.sqrt(sumSq / buf.length);
      rmsFrames.push(rms);
      options.onLevel?.(rms);
    }, frameMs);
  }

  function cleanup() {
    if (timerId) clearInterval(timerId);
    rawStream.getTracks().forEach((t) => t.stop());
    if (audioCtx && audioCtx.state !== "closed") audioCtx.close().catch(() => {});
  }

  return {
    mimeType,
    start() {
      startSampling();
      recorder.start(250);
    },
    stop() {
      return new Promise((resolve, reject) => {
        recorder.onerror = (err) => {
          cleanup();
          reject(err);
        };
        recorder.onstop = () => {
          cleanup();
          const blob = new Blob(chunks, { type: mimeType });
          const audioMetrics = analyzeSpeechFrames(rmsFrames, frameMs);
          resolve({ blob, mimeType, audioMetrics });
        };
        if (recorder.state !== "inactive") recorder.stop();
        else {
          cleanup();
          resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType, audioMetrics: analyzeSpeechFrames(rmsFrames, frameMs) });
        }
      });
    },
  };
}
