import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/ielts-speaking.js";

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

function fullValidEvaluation(overrides = {}) {
  return {
    transcript:
      "I usually wake up around seven in the morning, make a quick cup of coffee, and review my daily routine before heading to work.",
    relevance: "on_topic",
    relevance_reason: "Trả lời trực tiếp câu hỏi về thói quen buổi sáng.",
    audio_clear: true,
    audio_note: "",
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

test("1. Audio im lặng trả 422 và không chấm điểm", async () => {
  await withMockEnv(
    async () => geminiOk({ transcript: "" }),
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
      assert.equal(res.statusCode, 422);
      assert.match(res.payload.error, /Không nghe rõ lời nói/i);
    }
  );
});

test("2. Câu ngắn 8 từ nghe rõ -> overall_band null, fluency/lexical/grammar null, pronunciation giữ điểm khi dẫn chứng hợp lệ", async () => {
  const shortEval = fullValidEvaluation({
    transcript: "I wake up early and drink black coffee.",
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

  await withMockEnv(
    async () => geminiOk(shortEval),
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
      assert.equal(res.payload.overall_band, null);
      assert.equal(res.payload.scores.fluency_coherence.band, null);
      assert.equal(res.payload.scores.lexical_resource.band, null);
      assert.equal(res.payload.scores.grammatical_range_accuracy.band, null);
      assert.equal(res.payload.scores.pronunciation.band, 6.5);
      assert.match(res.payload.assessment_note, /8 từ/);
    }
  );
});

test("3. Thiếu dẫn chứng hoặc chép trần transcript làm dẫn chứng -> band null", async () => {
  const badEvidenceEval = fullValidEvaluation();
  badEvidenceEval.scores.fluency_coherence.evidence = "make a quick cup of coffee";
  badEvidenceEval.scores.lexical_resource.evidence = "";
  badEvidenceEval.scores.pronunciation.evidence = "heading to work";

  await withMockEnv(
    async () => geminiOk(badEvidenceEval),
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
      assert.equal(res.payload.scores.fluency_coherence.band, null);
      assert.equal(res.payload.scores.fluency_coherence.evidence, "");
      assert.equal(res.payload.scores.lexical_resource.band, null);
      assert.equal(res.payload.scores.pronunciation.band, null);
      assert.equal(res.payload.scores.pronunciation.evidence, "");
      assert.equal(res.payload.scores.grammatical_range_accuracy.band, 6.0);
      assert.equal(res.payload.overall_band, null);
    }
  );
});

test("4. Timeout lần 1 tự retry 1 lần trong ngân sách (và 503 retry); nếu cả 2 lần đều timeout trả 504", async () => {
  let calls = 0;
  await withMockEnv(
    async (_url, init) => {
      calls++;
      if (calls === 1) return hangUntilAbort(init.signal);
      return geminiOk(fullValidEvaluation());
    },
    {
      GEMINI_BUDGET_MS: 600,
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
      assert.equal(calls, 2);
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

  let calls503 = 0;
  await withMockEnv(
    async () => {
      calls503++;
      if (calls503 === 1) return new Response("unavailable", { status: 503 });
      return geminiOk(fullValidEvaluation());
    },
    {
      GEMINI_BUDGET_MS: 1000,
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
      assert.equal(calls503, 2);
      assert.equal(res.statusCode, 200);
      assert.equal(res.payload.overall_band, 6.5);
    }
  );
});

test("5. 429 có Retry-After hợp lệ (số giây và HTTP-date) tự đợi và retry 1 lần thành công", async () => {
  let numericCalls = 0;
  await withMockEnv(
    async () => {
      numericCalls++;
      if (numericCalls === 1) {
        return new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "0.05" },
        });
      }
      return geminiOk(fullValidEvaluation());
    },
    {
      GEMINI_BUDGET_MS: 2000,
      GEMINI_MIN_RETRY_WINDOW_MS: 100,
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
      assert.equal(numericCalls, 2);
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
        return new Response("rate limited", {
          status: 429,
          headers: { "retry-after": retryAt },
        });
      }
      return geminiOk(fullValidEvaluation());
    },
    {
      GEMINI_BUDGET_MS: 5000,
      GEMINI_MIN_RETRY_WINDOW_MS: 100,
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
      assert.equal(dateCalls, 2);
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
      return new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "60" },
      });
    },
    {
      GEMINI_BUDGET_MS: 52000,
      GEMINI_MIN_RETRY_WINDOW_MS: 8000,
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
      const elapsed = Date.now() - started;
      assert.equal(calls, 1);
      assert.ok(elapsed < 500, `Expected immediate return, got ${elapsed}ms`);
      assert.equal(res.statusCode, 429);
      assert.match(res.payload.error, /Thử chấm lại/i);
    }
  );
});

test("7. Dẫn chứng âm thanh chung chung ('Phát âm khá rõ', 'Nói khá trôi chảy') bị loại và trả band null", async () => {
  const genericEval = fullValidEvaluation();
  genericEval.scores.pronunciation.evidence = "Phát âm khá rõ";
  genericEval.scores.fluency_coherence.evidence = "Nói khá trôi chảy và tự nhiên";

  await withMockEnv(
    async () => geminiOk(genericEval),
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
      assert.equal(res.payload.scores.pronunciation.band, null);
      assert.equal(res.payload.scores.pronunciation.evidence, "");
      assert.equal(res.payload.scores.fluency_coherence.band, null);
      assert.equal(res.payload.scores.fluency_coherence.evidence, "");
      assert.equal(res.payload.overall_band, null);
    }
  );
});

test("8. Tính chính xác speech_metrics (word_count, filler_rate_pct, lexical_diversity, WPM từ durationSec)", async () => {
  const fillerEval = fullValidEvaluation({
    transcript:
      "Um I usually uh wake up at seven, er make a quick cup of coffee, um and review my daily routine before work.",
  });

  await withMockEnv(
    async () => geminiOk(fillerEval),
    {},
    async () => {
      const res = makeRes();
      await handler(
        makeReq({
          action: "evaluate",
          part: 1,
          durationSec: 12,
          question: "Describe your morning routine.",
          audioBase64: SAMPLE_AUDIO,
          mimeType: "audio/webm",
        }),
        res
      );
      assert.equal(res.statusCode, 200);
      assert.equal(res.payload.speech_metrics.word_count, 23);
      assert.equal(res.payload.speech_metrics.filler_count, 4);
      assert.equal(res.payload.speech_metrics.filler_rate_pct, 17.4);
      assert.equal(res.payload.speech_metrics.wpm, 115);
      assert.ok(res.payload.speech_metrics.lexical_diversity > 0.7);
      assert.match(res.payload.assessment_note, /từ đệm ngập ngừng cao/i);
    }
  );
});

test("9. Tự lọc bỏ correction bịa (spoken không tồn tại trong transcript) và giữ correction hợp lệ kèm rule_tag", async () => {
  const corrEval = fullValidEvaluation({
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

  await withMockEnv(
    async () => geminiOk(corrEval),
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
      assert.equal(res.payload.corrections.length, 1);
      assert.equal(res.payload.corrections[0].spoken, "make a quick cup of coffee");
      assert.equal(res.payload.corrections[0].category, "vocabulary");
      assert.equal(res.payload.corrections[0].rule_tag, "natural_collocation");
    }
  );
});

test("10. Áp dụng GEMINI_CALIBRATION_JSON theo Part và tiêu chí, làm tròn về bước 0.5 và tính lại overall_band", async () => {
  await withMockEnv(
    async () => geminiOk(fullValidEvaluation()),
    {
      GEMINI_CALIBRATION_JSON: JSON.stringify({
        part_1: { fluency_coherence: -0.5, lexical_resource: -0.5 },
      }),
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
      assert.equal(res.statusCode, 200);
      assert.equal(res.payload.scores.fluency_coherence.band, 6.0);
      assert.equal(res.payload.scores.lexical_resource.band, 6.0);
      assert.equal(res.payload.scores.grammatical_range_accuracy.band, 6.0);
      assert.equal(res.payload.scores.pronunciation.band, 6.0);
      assert.equal(res.payload.overall_band, 6.0);
      assert.deepEqual(res.payload.calibration_applied, {
        fluency_coherence: -0.5,
        lexical_resource: -0.5,
      });
    }
  );
});

test("11. Tự chuẩn hóa điểm lẻ (không phải bội số 0.5) về đúng thang 0.5 chuẩn IELTS", async () => {
  const oddBandEval = fullValidEvaluation();
  oddBandEval.scores.fluency_coherence.band = 6.3;
  oddBandEval.scores.pronunciation.band = 5.8;

  await withMockEnv(
    async () => geminiOk(oddBandEval),
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
      assert.equal(res.payload.scores.fluency_coherence.band, 6.5);
      assert.equal(res.payload.scores.pronunciation.band, 6.0);
      assert.equal(res.payload.overall_band, 6.5);
    }
  );
});

test("12. Giữ nguyên log riêng từng attempt (lần đầu + lần retry) và log tổng hợp speaking.evaluation_result từ 852c8fb", async () => {
  let calls = 0;
  await withMockEnv(
    async () => {
      calls++;
      if (calls === 1) return new Response("busy", { status: 503 });
      return geminiOk(fullValidEvaluation());
    },
    {
      GEMINI_BUDGET_MS: 2000,
      GEMINI_MIN_RETRY_WINDOW_MS: 100,
      GEMINI_RETRY_BACKOFF_MS: 20,
    },
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
      assert.equal(attemptLogs.length, 2);
      assert.equal(attemptLogs[0].attempt, 1);
      assert.equal(attemptLogs[0].upstream_status, 503);
      assert.equal(attemptLogs[0].outcome, "http_error");
      assert.equal(attemptLogs[1].attempt, 2);
      assert.equal(attemptLogs[1].upstream_status, 200);
      assert.equal(attemptLogs[1].outcome, "success");
      assert.equal(summaryLog.retried, true);
      assert.equal(summaryLog.attempts, 2);
      assert.equal(summaryLog.first_attempt_outcome, "http_error");
      assert.equal(summaryLog.first_upstream_status, 503);
      assert.equal(summaryLog.outcome, "band");
    }
  );
});

test("13. Giữ nguyên yêu cầu mốc thời gian M:SS · observation trong prompt và giữ nguyên chuỗi mốc khi trả về cho nút Nghe lại từ mốc", async () => {
  let capturedPrompt = "";
  await withMockEnv(
    async (_url, init) => {
      const body = JSON.parse(init.body);
      capturedPrompt = body.system_instruction.parts[0].text;
      return geminiOk(fullValidEvaluation());
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
      assert.match(capturedPrompt, /M:SS · observation/);
      assert.match(res.payload.scores.fluency_coherence.evidence, /^0:04 · /);
      assert.match(res.payload.scores.pronunciation.evidence, /^0:07 · /);
    }
  );
});
