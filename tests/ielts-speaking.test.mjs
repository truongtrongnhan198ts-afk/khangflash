import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/ielts-speaking.js";
import { analyzeSpeechFrames, pickSupportedMimeType } from "../speaking-audio-enhancer.js";

const SAMPLE_AUDIO = Buffer.from("RIFFxxxxWAVEfmt ").toString("base64");

function makeReq(body, method = "POST") {
  return { method, body };
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
    end() {
      return this;
    },
  };
}

function geminiOk(payloadObj) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payloadObj) }] } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

function hangUntilAbort(signal) {
  return new Promise((_resolve, reject) => {
    const keepAlive = setTimeout(() => reject(new Error("mock hang expired")), 5000);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(keepAlive);
        const err = new Error("aborted");
        err.name = "TimeoutError";
        reject(err);
      },
      { once: true }
    );
  });
}

function pass1Valid(overrides = {}) {
  return {
    transcript:
      "I usually wake up around seven in the morning, make a quick cup of coffee, and review my daily routine before heading to work.",
    audio_clear: true,
    audio_note: "",
    acoustic_events: [
      "0:04 · Ngập ngừng 1 nhịp trước cụm 'daily routine' ở giữa câu.",
      "0:07 · Nuốt âm cuối /k/ ở từ 'quick' và lên giọng nhẹ ở cuối câu.",
    ],
    ...overrides,
  };
}

function pass2Valid(overrides = {}) {
  return {
    relevance: "on_topic",
    relevance_reason: "Trả lời trực tiếp câu hỏi về thói quen buổi sáng.",
    scores: {
      fluency_coherence: {
        band: 6.5,
        feedback: "Nhịp nói tương đối ổn định, có ngập ngừng nhẹ.",
        evidence: "0:04 · Ngập ngừng 1 nhịp trước cụm 'daily routine' ở giữa câu.",
      },
      lexical_resource: {
        band: 6.5,
        feedback: "Dùng cụm từ tự nhiên cho chủ đề sinh hoạt.",
        evidence: "make a quick cup of coffee",
      },
      grammatical_range_accuracy: {
        band: 6.0,
        feedback: "Cấu trúc thì hiện tại đơn chính xác.",
        evidence: "I usually wake up around seven",
      },
      pronunciation: {
        band: 6.0,
        feedback: "Phát âm dễ hiểu, đôi lúc nuốt âm cuối.",
        evidence: "0:07 · Nuốt âm cuối /k/ ở từ 'quick' và lên giọng nhẹ ở cuối câu.",
      },
    },
    corrections: [],
    model_answer: "I normally wake up at seven and plan my morning tasks over coffee.",
    examiner_followup: "Do you follow the same routine on weekends?",
    ...overrides,
  };
}

function twoPassFetch(p1Obj, p2Obj) {
  let step = 0;
  return async () => {
    step++;
    if (step === 1) return geminiOk(p1Obj);
    return geminiOk(p2Obj);
  };
}

async function withMockEnv(fetchImpl, envOverrides, fn) {
  const origFetch = globalThis.fetch;
  const origInfo = console.info;
  const origEnv = {};
  const logs = [];
  const keys = [
    "GEMINI_API_KEY",
    "GEMINI_BUDGET_MS",
    "GEMINI_ATTEMPT_TIMEOUT_MS",
    "GEMINI_MIN_RETRY_WINDOW_MS",
    "GEMINI_RETRY_BACKOFF_MS",
    "GEMINI_CALIBRATION_JSON",
  ];
  for (const k of keys) origEnv[k] = process.env[k];

  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.GEMINI_CALIBRATION_JSON;
  for (const [k, v] of Object.entries(envOverrides || {})) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = String(v);
  }
  globalThis.fetch = fetchImpl;
  console.info = (msg) => {
    try {
      logs.push(JSON.parse(msg));
    } catch {
      logs.push(msg);
    }
  };

  try {
    return await fn(logs);
  } finally {
    globalThis.fetch = origFetch;
    console.info = origInfo;
    for (const k of keys) {
      if (origEnv[k] === undefined) delete process.env[k];
      else process.env[k] = origEnv[k];
    }
  }
}

test("1. Audio im lặng dừng ngay sau Pass 1, trả 422 và không tốn Pass 2", async () => {
  let calls = 0;
  await withMockEnv(
    async () => {
      calls++;
      return geminiOk({ transcript: "", audio_clear: false, audio_note: "", acoustic_events: [] });
    },
    {},
    async () => {
      const res = makeRes();
      await handler(
        makeReq({
          action: "evaluate",
          part: 1,
          question: "Describe your morning routine.",
          audioBase64: SAMPLE_AUDIO,
          mimeType: "audio/webm",
        }),
        res
      );
      assert.equal(calls, 1);
      assert.equal(res.statusCode, 422);
      assert.match(res.payload.error, /Không nghe rõ lời nói/i);
    }
  );
});

test("2. Câu ngắn 8 từ nghe rõ -> overall_band null, fluency/lexical/grammar null, pronunciation giữ điểm khi dẫn chứng hợp lệ", async () => {
  const p1 = pass1Valid({ transcript: "I wake up early and drink black coffee." });
  const p2 = pass2Valid({
    scores: {
      fluency_coherence: {
        band: 6.0,
        feedback: "Câu trả lời quá ngắn.",
        evidence: "0:02 · Ngắt nhịp rõ sau từ 'early' ở giữa câu.",
      },
      lexical_resource: {
        band: 6.0,
        feedback: "Từ vựng cơ bản.",
        evidence: "drink black coffee",
      },
      grammatical_range_accuracy: {
        band: 6.0,
        feedback: "Câu đơn đúng ngữ pháp.",
        evidence: "I wake up early",
      },
      pronunciation: {
        band: 6.5,
        feedback: "Bật âm rõ ràng.",
        evidence: "0:03 · Bật âm cuối /k/ rõ ở từ 'black' và xuống giọng ở cuối câu.",
      },
    },
  });

  await withMockEnv(twoPassFetch(p1, p2), {}, async () => {
    const res = makeRes();
    await handler(
      makeReq({
        action: "evaluate",
        part: 1,
        question: "Describe your morning routine.",
        audioBase64: SAMPLE_AUDIO,
        mimeType: "audio/webm",
      }),
      res
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.overall_band, null);
    assert.equal(res.payload.scores.fluency_coherence.band, null);
    assert.equal(res.payload.scores.lexical_resource.band, null);
    assert.equal(res.payload.scores.grammatical_range_accuracy.band, null);
    assert.equal(res.payload.scores.pronunciation.band, 6.5);
    assert.match(res.payload.assessment_note, /8 từ/);
  });
});

test("3. Thiếu dẫn chứng hoặc chép trần transcript làm dẫn chứng -> band null", async () => {
  const p2 = pass2Valid();
  p2.scores.fluency_coherence.evidence = "make a quick cup of coffee";
  p2.scores.lexical_resource.evidence = "";
  p2.scores.pronunciation.evidence = "heading to work";

  await withMockEnv(twoPassFetch(pass1Valid(), p2), {}, async () => {
    const res = makeRes();
    await handler(
      makeReq({
        action: "evaluate",
        part: 1,
        question: "Describe your morning routine.",
        audioBase64: SAMPLE_AUDIO,
        mimeType: "audio/webm",
      }),
      res
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.scores.fluency_coherence.band, null);
    assert.equal(res.payload.scores.fluency_coherence.evidence, "");
    assert.equal(res.payload.scores.lexical_resource.band, null);
    assert.equal(res.payload.scores.pronunciation.band, null);
    assert.equal(res.payload.scores.pronunciation.evidence, "");
    assert.equal(res.payload.scores.grammatical_range_accuracy.band, 6.0);
    assert.equal(res.payload.overall_band, null);
  });
});

test("4. Timeout lần 1 tự retry 1 lần trong ngân sách (và 503 retry); nếu cả 2 lần đều timeout trả 504", async () => {
  let calls = 0;
  await withMockEnv(
    async (_url, init) => {
      calls++;
      if (calls === 1) return hangUntilAbort(init.signal);
      if (calls === 2) return geminiOk(pass1Valid());
      return geminiOk(pass2Valid());
    },
    {
      GEMINI_BUDGET_MS: 800,
      GEMINI_ATTEMPT_TIMEOUT_MS: 60,
      GEMINI_MIN_RETRY_WINDOW_MS: 50,
      GEMINI_RETRY_BACKOFF_MS: 20,
    },
    async () => {
      const res = makeRes();
      await handler(
        makeReq({
          action: "evaluate",
          part: 1,
          question: "Describe your morning routine.",
          audioBase64: SAMPLE_AUDIO,
          mimeType: "audio/webm",
        }),
        res
      );
      assert.equal(calls, 3);
      assert.equal(res.statusCode, 200);
      assert.equal(res.payload.overall_band, 6.5);
    }
  );

  let callsFail = 0;
  await withMockEnv(
    async (_url, init) => {
      callsFail++;
      return hangUntilAbort(init.signal);
    },
    {
      GEMINI_BUDGET_MS: 250,
      GEMINI_ATTEMPT_TIMEOUT_MS: 50,
      GEMINI_MIN_RETRY_WINDOW_MS: 40,
      GEMINI_RETRY_BACKOFF_MS: 20,
    },
    async () => {
      const res = makeRes();
      await handler(
        makeReq({
          action: "evaluate",
          part: 1,
          question: "Describe your morning routine.",
          audioBase64: SAMPLE_AUDIO,
          mimeType: "audio/webm",
        }),
        res
      );
      assert.equal(callsFail, 2);
      assert.equal(res.statusCode, 504);
      assert.match(res.payload.error, /thử lại/i);
    }
  );
});

test("5. 429 có Retry-After hợp lệ (số giây và HTTP-date) tự đợi và retry 1 lần thành công", async () => {
  let numericCalls = 0;
  await withMockEnv(
    async () => {
      numericCalls++;
      if (numericCalls === 1) {
        return new Response("rate limited", { status: 429, headers: { "retry-after": "0.05" } });
      }
      if (numericCalls === 2) return geminiOk(pass1Valid());
      return geminiOk(pass2Valid());
    },
    { GEMINI_BUDGET_MS: 2000, GEMINI_MIN_RETRY_WINDOW_MS: 100 },
    async () => {
      const res = makeRes();
      await handler(
        makeReq({
          action: "evaluate",
          part: 1,
          question: "Describe your morning routine.",
          audioBase64: SAMPLE_AUDIO,
          mimeType: "audio/webm",
        }),
        res
      );
      assert.equal(numericCalls, 3);
      assert.equal(res.statusCode, 200);
      assert.equal(res.payload.overall_band, 6.5);
    }
  );

  let dateCalls = 0;
  await withMockEnv(
    async () => {
      dateCalls++;
      if (dateCalls === 1) {
        const retryAt = new Date(Date.now() + 100).toUTCString();
        return new Response("rate limited", { status: 429, headers: { "retry-after": retryAt } });
      }
      if (dateCalls === 2) return geminiOk(pass1Valid());
      return geminiOk(pass2Valid());
    },
    { GEMINI_BUDGET_MS: 5000, GEMINI_MIN_RETRY_WINDOW_MS: 100 },
    async () => {
      const res = makeRes();
      await handler(
        makeReq({
          action: "evaluate",
          part: 1,
          question: "Describe your morning routine.",
          audioBase64: SAMPLE_AUDIO,
          mimeType: "audio/webm",
        }),
        res
      );
      assert.equal(dateCalls, 3);
      assert.equal(res.statusCode, 200);
      assert.equal(res.payload.overall_band, 6.5);
    }
  );
});

test("6. 429 có Retry-After vượt ngân sách không đợi, trả ngay 429 tiếng Việt để bấm Thử chấm lại", async () => {
  let calls = 0;
  const started = Date.now();
  await withMockEnv(
    async () => {
      calls++;
      return new Response("rate limited", { status: 429, headers: { "retry-after": "60" } });
    },
    { GEMINI_BUDGET_MS: 52000, GEMINI_MIN_RETRY_WINDOW_MS: 8000 },
    async () => {
      const res = makeRes();
      await handler(
        makeReq({
          action: "evaluate",
          part: 1,
          question: "Describe your morning routine.",
          audioBase64: SAMPLE_AUDIO,
          mimeType: "audio/webm",
        }),
        res
      );
      const elapsed = Date.now() - started;
      assert.equal(calls, 1);
      assert.ok(elapsed < 500, `Expected immediate return, got ${elapsed}ms`);
      assert.equal(res.statusCode, 429);
      assert.match(res.payload.error, /Thử chấm lại/i);
    }
  );
});

test("7. Dẫn chứng âm thanh chung chung ('Phát âm khá rõ', 'Nói khá trôi chảy') bị loại và trả band null", async () => {
  const p2 = pass2Valid();
  p2.scores.pronunciation.evidence = "Phát âm khá rõ";
  p2.scores.fluency_coherence.evidence = "Nói khá trôi chảy và tự nhiên";

  await withMockEnv(twoPassFetch(pass1Valid(), p2), {}, async () => {
    const res = makeRes();
    await handler(
      makeReq({
        action: "evaluate",
        part: 1,
        question: "Describe your morning routine.",
        audioBase64: SAMPLE_AUDIO,
        mimeType: "audio/webm",
      }),
      res
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.scores.pronunciation.band, null);
    assert.equal(res.payload.scores.fluency_coherence.band, null);
    assert.equal(res.payload.overall_band, null);
  });
});

test("8. Tính speech_metrics (word_count, filler_rate_pct, WPM, pause_count, speech_ratio) và bơm thẳng vào Pass 2", async () => {
  const p1 = pass1Valid({
    transcript:
      "Um I usually uh wake up at seven, er make a quick cup of coffee, um and review my daily routine before work.",
  });
  let pass2Body = null;
  let step = 0;
  await withMockEnv(
    async (_url, init) => {
      step++;
      if (step === 1) return geminiOk(p1);
      pass2Body = JSON.parse(init.body);
      return geminiOk(pass2Valid());
    },
    {},
    async () => {
      const res = makeRes();
      await handler(
        makeReq({
          action: "evaluate",
          part: 1,
          durationSec: 12,
          audioMetrics: { pauseCount: 3, longPauseCount: 1, maxPauseMs: 1250, speechRatio: 0.72 },
          question: "Describe your morning routine.",
          audioBase64: SAMPLE_AUDIO,
          mimeType: "audio/webm",
        }),
        res
      );
      assert.equal(res.statusCode, 200);
      assert.equal(res.payload.speech_metrics.word_count, 23);
      assert.equal(res.payload.speech_metrics.filler_count, 4);
      assert.equal(res.payload.speech_metrics.wpm, 115);
      assert.equal(res.payload.speech_metrics.pause_count, 3);
      assert.equal(res.payload.speech_metrics.max_pause_ms, 1250);
      assert.equal(res.payload.speech_metrics.speech_ratio, 0.72);
      assert.match(res.payload.assessment_note, /từ đệm ngập ngừng cao/i);
      // Verify Pass 2 received the computed metrics + Band 4-8 anchor prompt
      const pass2Prompt = pass2Body.system_instruction.parts[0].text;
      const pass2Payload = JSON.parse(pass2Body.contents[0].parts[0].text);
      assert.match(pass2Prompt, /Band 4:/);
      assert.match(pass2Prompt, /Band 8:/);
      assert.match(pass2Prompt, /8.5–9.0 style/);
      assert.ok(pass2Body.contents[0].parts[1].inline_data.data);
      assert.equal(pass2Payload.speech_metrics.wpm, 115);
      assert.equal(pass2Payload.speech_metrics.pause_count, 3);
    }
  );
});

test("9. Tự lọc bỏ correction bịa và giữ correction hợp lệ kèm category & rule_tag", async () => {
  const p2 = pass2Valid({
    corrections: [
      {
        spoken: "make a quick cup of coffee",
        category: "vocabulary",
        rule_tag: "Natural Collocation",
        issue: "Có thể dùng cụm tự nhiên hơn",
        explanation_vi: "Thêm sắc thái tự nhiên.",
        upgrade: "brew a quick cup of coffee",
      },
      {
        spoken: "I am go to school yesterday",
        category: "grammar",
        rule_tag: "past_tense",
        issue: "Sai thì quá khứ",
        explanation_vi: "Câu bịa không có trong transcript.",
        upgrade: "I went to school yesterday",
      },
    ],
  });

  await withMockEnv(twoPassFetch(pass1Valid(), p2), {}, async () => {
    const res = makeRes();
    await handler(
      makeReq({
        action: "evaluate",
        part: 1,
        question: "Describe your morning routine.",
        audioBase64: SAMPLE_AUDIO,
        mimeType: "audio/webm",
      }),
      res
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.corrections.length, 1);
    assert.equal(res.payload.corrections[0].category, "vocabulary");
    assert.equal(res.payload.corrections[0].rule_tag, "natural_collocation");
  });
});

test("10. Áp dụng GEMINI_CALIBRATION_JSON theo Part & tiêu chí, làm tròn 0.5 và tính lại overall_band", async () => {
  await withMockEnv(
    twoPassFetch(pass1Valid(), pass2Valid()),
    { GEMINI_CALIBRATION_JSON: JSON.stringify({ part_1: { fluency_coherence: -0.5, lexical_resource: -0.5 } }) },
    async () => {
      const res = makeRes();
      await handler(
        makeReq({
          action: "evaluate",
          part: 1,
          question: "Describe your morning routine.",
          audioBase64: SAMPLE_AUDIO,
          mimeType: "audio/webm",
        }),
        res
      );
      assert.equal(res.statusCode, 200);
      assert.equal(res.payload.overall_band, 6.0);
      assert.deepEqual(res.payload.calibration_applied, { fluency_coherence: -0.5, lexical_resource: -0.5 });
    }
  );
});

test("11. Chuẩn hóa điểm lẻ về đúng bước 0.5 chuẩn IELTS", async () => {
  const p2 = pass2Valid();
  p2.scores.fluency_coherence.band = 6.3;
  p2.scores.pronunciation.band = 5.8;

  await withMockEnv(twoPassFetch(pass1Valid(), p2), {}, async () => {
    const res = makeRes();
    await handler(
      makeReq({
        action: "evaluate",
        part: 1,
        question: "Describe your morning routine.",
        audioBase64: SAMPLE_AUDIO,
        mimeType: "audio/webm",
      }),
      res
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.scores.fluency_coherence.band, 6.5);
    assert.equal(res.payload.scores.pronunciation.band, 6.0);
  });
});

test("12. Giữ nguyên log riêng từng attempt (lần đầu + retry) và speaking.evaluation_result từ 852c8fb", async () => {
  let calls = 0;
  await withMockEnv(
    async () => {
      calls++;
      if (calls === 1) return new Response("busy", { status: 503 });
      if (calls === 2) return geminiOk(pass1Valid());
      return geminiOk(pass2Valid());
    },
    { GEMINI_BUDGET_MS: 2000, GEMINI_MIN_RETRY_WINDOW_MS: 100, GEMINI_RETRY_BACKOFF_MS: 20 },
    async (logs) => {
      const res = makeRes();
      await handler(
        makeReq({
          action: "evaluate",
          part: 1,
          question: "Describe your morning routine.",
          audioBase64: SAMPLE_AUDIO,
          mimeType: "audio/webm",
        }),
        res
      );
      assert.equal(res.statusCode, 200);
      const attemptLogs = logs.filter((l) => l.event === "speaking.gemini_attempt");
      const summaryLog = logs.find((l) => l.event === "speaking.evaluation_result");
      assert.equal(attemptLogs.length, 3);
      assert.equal(attemptLogs[0].stage, "transcribe");
      assert.equal(attemptLogs[0].attempt, 1);
      assert.equal(attemptLogs[0].upstream_status, 503);
      assert.equal(attemptLogs[1].stage, "transcribe");
      assert.equal(attemptLogs[1].attempt, 2);
      assert.equal(attemptLogs[2].stage, "score");
      assert.equal(summaryLog.retried, true);
      assert.equal(summaryLog.first_upstream_status, 503);
      assert.equal(summaryLog.outcome, "band");
    }
  );
});

test("13. Giữ nguyên yêu cầu mốc thời gian M:SS · observation trong prompt và giữ nguyên mốc trả về cho nút Nghe lại từ mốc", async () => {
  const prompts = [];
  let step = 0;
  await withMockEnv(
    async (_url, init) => {
      step++;
      prompts.push(JSON.parse(init.body).system_instruction.parts[0].text);
      return step === 1 ? geminiOk(pass1Valid()) : geminiOk(pass2Valid());
    },
    {},
    async () => {
      const res = makeRes();
      await handler(
        makeReq({
          action: "evaluate",
          part: 1,
          question: "Describe your morning routine.",
          audioBase64: SAMPLE_AUDIO,
          mimeType: "audio/webm",
        }),
        res
      );
      assert.equal(res.statusCode, 200);
      assert.match(prompts[0], /M:SS · observation/);
      assert.match(prompts[1], /M:SS · observation/);
      assert.match(res.payload.scores.fluency_coherence.evidence, /^0:04 · /);
      assert.match(res.payload.scores.pronunciation.evidence, /^0:07 · /);
    }
  );
});

test("14. action 'ideas' trả về 2 góc trả lời, dàn ý và collocations; báo 400 nếu thiếu câu hỏi", async () => {
  const mockIdeas = {
    angle_1: {
      title_vi: "Thói quen thực tế buổi sáng",
      stance: "Keeping a short morning routine helps me stay calm before work.",
      outline: ["Wake up at 7 AM", "Brew coffee and check priorities", "Avoid scrolling social media"],
      opening_line: "To be honest, I try to keep my mornings pretty simple.",
    },
    angle_2: {
      title_vi: "So sánh trước đây và hiện tại",
      stance: "My routine has become much more structured since I started working full-time.",
      outline: ["Used to sleep in during university", "Now exercise for 15 minutes", "Feel noticeably more productive"],
      opening_line: "Actually, my morning routine has changed quite a bit over the past couple of years.",
    },
    collocations: [
      { phrase: "hit the ground running", meaning_vi: "bắt đầu ngày mới năng suất ngay", example: "A quick coffee helps me hit the ground running." },
    ],
    pitfalls_vi: ["Tránh liệt kê giờ giấc máy móc kiểu 'I wake up at 6, brush my teeth at 6:05'."],
  };

  await withMockEnv(async () => geminiOk(mockIdeas), {}, async () => {
    const badRes = makeRes();
    await handler(makeReq({ action: "ideas", part: 1, question: "" }), badRes);
    assert.equal(badRes.statusCode, 400);

    const okRes = makeRes();
    await handler(
      makeReq({ action: "ideas", part: 1, targetBand: 7.5, question: "Describe your morning routine." }),
      okRes
    );
    assert.equal(okRes.statusCode, 200);
    assert.equal(okRes.payload.target_band, 7.5);
    assert.equal(okRes.payload.angle_1.outline.length, 3);
    assert.equal(okRes.payload.angle_2.outline.length, 3);
    assert.equal(okRes.payload.collocations.length, 1);
  });
});

test("15. speaking-audio-enhancer: đo chính xác khoảng lặng VAD (>450ms, >1000ms), speechRatio và phát hiện im lặng", () => {
  // 50ms per frame: 10 voiced (500ms) + 12 silent (600ms -> 1 pause) + 10 voiced + 24 silent (1200ms -> 1 long pause) + 10 voiced
  const frames = [
    ...Array(10).fill(0.08),
    ...Array(12).fill(0.002),
    ...Array(10).fill(0.07),
    ...Array(24).fill(0.001),
    ...Array(10).fill(0.09),
  ];
  const m = analyzeSpeechFrames(frames, 50);
  assert.equal(m.isSilent, false);
  assert.equal(m.pauseCount, 2);
  assert.equal(m.longPauseCount, 1);
  assert.equal(m.maxPauseMs, 1200);
  assert.equal(m.durationSec, 3.3);

  const silent = analyzeSpeechFrames(Array(20).fill(0.001), 50);
  assert.equal(silent.isSilent, true);
  assert.equal(silent.speechRatio, 0);
});

test("16. speaking-audio-enhancer: chọn đúng MIME đa trình duyệt (fallback Safari audio/mp4)", () => {
  assert.equal(pickSupportedMimeType((m) => m === "audio/mp4"), "audio/mp4");
  assert.equal(pickSupportedMimeType((m) => m === "audio/webm;codecs=opus"), "audio/webm;codecs=opus");
});
