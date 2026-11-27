import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/ielts-speaking.js";

const SAMPLE_BODY = {
  action: "evaluate",
  part: 1,
  question: "Do you prefer planning your day in advance?",
  audioBase64: "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
  mimeType: "audio/wav",
};

const VALID_FULL_RESPONSE = {
  transcript: "I usually plan my day before breakfast because it helps me stay focused and manage my work effectively every morning.",
  relevance: "on_topic",
  relevance_reason: "Trả lời trực tiếp câu hỏi.",
  audio_clear: true,
  audio_note: "",
  scores: {
    fluency_coherence: { band: 6.5, feedback: "Nhịp nói ổn.", evidence: "Ngập ngừng nhẹ trước cụm 'before breakfast'" },
    lexical_resource: { band: 6.5, feedback: "Từ phù hợp.", evidence: "manage my work effectively" },
    grammatical_range_accuracy: { band: 6.5, feedback: "Cấu trúc đúng.", evidence: "helps me stay focused" },
    pronunciation: { band: 6.5, feedback: "Phát âm rõ.", evidence: "Nhấn trọng âm rõ ở từ breakfast" },
  },
  corrections: [],
  model_answer: "I prefer mapping out my day before breakfast so I can stay focused.",
  examiner_followup: "What happens when your schedule changes unexpectedly?",
};

function makeRes() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end() { return this; },
  };
}

function mockGeminiJson(obj) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    async json() {
      return { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] };
    },
  };
}

test("1. Audio im lặng -> trả 422, không sinh transcript giả hay band", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const origFetch = global.fetch;
  global.fetch = async () => mockGeminiJson({ transcript: "" });
  try {
    const res = makeRes();
    await handler({ method: "POST", body: SAMPLE_BODY }, res);
    assert.equal(res.statusCode, 422);
    assert.match(res.body.error, /Không nghe rõ lời nói/);
  } finally {
    global.fetch = origFetch;
  }
});

test("2. Câu ngắn nghe rõ (8 từ) -> giữ transcript, overall_band = null, ghi mốc KhangFlash", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const origFetch = global.fetch;
  const shortTranscript = "Yes, I always plan my day before breakfast.";
  global.fetch = async () => mockGeminiJson({
    ...VALID_FULL_RESPONSE,
    transcript: shortTranscript,
    scores: {
      fluency_coherence: { band: 6, feedback: "Nói rõ.", evidence: "Ngập ngừng nhẹ trước cụm 'before breakfast'" },
      lexical_resource: { band: 6, feedback: "Từ cơ bản.", evidence: "plan my day" },
      grammatical_range_accuracy: { band: 6, feedback: "Câu đơn đúng.", evidence: "I always plan" },
      pronunciation: { band: 6.5, feedback: "Phát âm rõ.", evidence: "Nhấn trọng âm rõ ở breakfast" },
    },
  });
  try {
    const res = makeRes();
    await handler({ method: "POST", body: SAMPLE_BODY }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.transcript, shortTranscript);
    assert.equal(res.body.overall_band, null);
    assert.equal(res.body.scores.fluency_coherence.band, null);
    assert.equal(res.body.scores.pronunciation.band, 6.5);
    assert.match(res.body.assessment_note, /Mốc tham khảo của KhangFlash/);
  } finally {
    global.fetch = origFetch;
  }
});

test("3. Thiếu dẫn chứng hoặc chỉ chép cụm trần ở Trôi chảy/Phát âm -> xóa evidence, band = null", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const origFetch = global.fetch;
  global.fetch = async () => mockGeminiJson({
    ...VALID_FULL_RESPONSE,
    scores: {
      fluency_coherence: { band: 6.5, feedback: "Khá trôi chảy.", evidence: "before breakfast" },
      lexical_resource: { band: 6.5, feedback: "Từ phù hợp.", evidence: "invented phrase not spoken" },
      grammatical_range_accuracy: { band: 6.5, feedback: "Cấu trúc đúng.", evidence: "helps me stay focused" },
      pronunciation: { band: 6.5, feedback: "Rõ ràng.", evidence: "" },
    },
  });
  try {
    const res = makeRes();
    await handler({ method: "POST", body: SAMPLE_BODY }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.scores.fluency_coherence.evidence, "");
    assert.equal(res.body.scores.fluency_coherence.band, null);
    assert.equal(res.body.scores.lexical_resource.evidence, "");
    assert.equal(res.body.scores.lexical_resource.band, null);
    assert.equal(res.body.scores.pronunciation.evidence, "");
    assert.equal(res.body.scores.pronunciation.band, null);
    assert.equal(res.body.scores.grammatical_range_accuracy.band, 6.5);
    assert.equal(res.body.overall_band, null);
  } finally {
    global.fetch = origFetch;
  }
});

test("4. Timeout (AbortError) -> thử lại tối đa 1 lần (2 lượt gọi) rồi trả 504", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const origFetch = global.fetch;
  const origTimeout = AbortSignal.timeout;
  let calls = 0;

  AbortSignal.timeout = () => {
    const c = new AbortController();
    setTimeout(() => c.abort(), 10);
    return c.signal;
  };
  global.fetch = (_url, { signal }) => {
    calls++;
    return new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" })));
    });
  };

  try {
    const res = makeRes();
    await handler({ method: "POST", body: SAMPLE_BODY }, res);
    assert.equal(calls, 2);
    assert.equal(res.statusCode, 504);
    assert.match(res.body.error, /quá lâu/);
  } finally {
    global.fetch = origFetch;
    AbortSignal.timeout = origTimeout;
  }
});

test("5. Lỗi 429 có Retry-After hợp lệ (số giây & HTTP-date) -> đợi và thử lại 1 lần rồi thành công", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const origFetch = global.fetch;
  for (const headerVal of ["0.05", new Date(Date.now() + 50).toUTCString()]) {
    let calls = 0;
    global.fetch = async () => {
      calls++;
      if (calls === 1) return { ok: false, status: 429, headers: new Headers({ "Retry-After": headerVal }) };
      return mockGeminiJson(VALID_FULL_RESPONSE);
    };
    try {
      const res = makeRes();
      await handler({ method: "POST", body: SAMPLE_BODY }, res);
      assert.equal(calls, 2);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.overall_band, 6.5);
    } finally {
      global.fetch = origFetch;
    }
  }
});

test("6. Lỗi 429 có Retry-After vượt ngân sách -> không retry, trả ngay 429 kèm hướng dẫn Thử chấm lại", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const origFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return { ok: false, status: 429, headers: new Headers({ "Retry-After": "60" }) };
  };
  try {
    const res = makeRes();
    await handler({ method: "POST", body: SAMPLE_BODY }, res);
    assert.equal(calls, 1);
    assert.equal(res.statusCode, 429);
    assert.match(res.body.error, /Thử chấm lại/);
  } finally {
    global.fetch = origFetch;
  }
});

test("7. Dẫn chứng âm thanh chung chung ('Phát âm khá rõ') -> loại bỏ, trả band: null", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  const origFetch = global.fetch;
  global.fetch = async () => mockGeminiJson({
    ...VALID_FULL_RESPONSE,
    scores: {
      ...VALID_FULL_RESPONSE.scores,
      fluency_coherence: { band: 6.5, feedback: "Tốc độ ổn.", evidence: "Nói khá trôi chảy và tự nhiên" },
      pronunciation: { band: 6.5, feedback: "Dễ nghe.", evidence: "Phát âm khá rõ" },
    },
  });
  try {
    const res = makeRes();
    await handler({ method: "POST", body: SAMPLE_BODY }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.scores.fluency_coherence.evidence, "");
    assert.equal(res.body.scores.fluency_coherence.band, null);
    assert.equal(res.body.scores.pronunciation.evidence, "");
    assert.equal(res.body.scores.pronunciation.band, null);
    assert.equal(res.body.overall_band, null);
  } finally {
    global.fetch = origFetch;
  }
});
