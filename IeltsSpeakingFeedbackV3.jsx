"use client";
import React, { useState, useRef } from "react";

const cardStyle = {
  background: "#131c17",
  border: "1px solid #26382e",
  borderRadius: 12,
  padding: 18,
  color: "#e6f2ec",
  marginTop: 16,
};

const subCardStyle = {
  background: "#0d1410",
  border: "1px solid #223329",
  borderRadius: 10,
  padding: 14,
};

const btnStyle = {
  padding: "7px 12px",
  borderRadius: 8,
  background: "#1f3d2b",
  color: "#e6f2ec",
  border: "1px solid #36694a",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

function RetryDrillInline({ correction, apiEndpoint }) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const chunksRef = useRef([]);

  const startRetry = async () => {
    setError("");
    setVerdict(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = getSupportedMimeType();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setLoading(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          const res = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "retry_drill",
              audioBase64,
              mimeType: blob.type || "audio/webm",
              originalSpoken: correction.spoken,
              issue: correction.issue,
              targetUpgrade: correction.upgrade,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          setVerdict(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      recorder.start();
      setRecording(true);
    } catch (err) {
      setError(`Mic error: ${err.message}`);
    }
  };

  const stopRetry = () => {
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    setRecording(false);
  };

  return (
    <div style={{ marginTop: 8 }}>
      {!recording ? (
        <button onClick={startRetry} disabled={loading} style={btnStyle}>
          {loading ? "Đang chấm lại..." : "🎙 Nói lại câu này"}
        </button>
      ) : (
        <button onClick={stopRetry} style={{ ...btnStyle, background: "#7f1d1d", borderColor: "#ef4444" }}>
          ⏹ Dừng &amp; Chấm ngay
        </button>
      )}
      {error && <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>{error}</div>}
      {verdict && (
        <div
          style={{
            marginTop: 8,
            padding: 10,
            borderRadius: 8,
            background: verdict.passed ? "#0f291a" : "#2a1215",
            border: `1px solid ${verdict.passed ? "#4ade80" : "#f87171"}`,
            fontSize: 12,
          }}
        >
          <strong style={{ color: verdict.passed ? "#4ade80" : "#f87171" }}>
            {verdict.passed ? `ĐẠT (${verdict.score_10}/10)` : `CHƯA ĐẠT (${verdict.score_10}/10)`}
          </strong>
          {verdict.heard && <div style={{ color: "#94a3b8", marginTop: 3 }}>Nghe được: "{verdict.heard}"</div>}
          <div style={{ marginTop: 4 }}>{verdict.feedback_vi}</div>
          {verdict.next_tip_vi && <div style={{ color: "#fbbf24", marginTop: 3 }}>Mẹo: {verdict.next_tip_vi}</div>}
        </div>
      )}
    </div>
  );
}

export default function IeltsSpeakingFeedbackV3({
  data,
  question = "",
  apiEndpoint = "/api/ielts-speaking",
  onUseFollowup,
}) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  if (!data) return null;

  const criteria = [
    ["Fluency & Coherence", data.scores?.fluency_coherence],
    ["Lexical Resource", data.scores?.lexical_resource],
    ["Grammatical Range & Accuracy", data.scores?.grammatical_range_accuracy],
    ["Pronunciation", data.scores?.pronunciation],
  ];

  const quickPrompts = [
    "Tại sao mình bị trừ điểm ở bài này?",
    "Cách nối ý tự nhiên hơn cho câu này?",
    "Cho mình 3 collocation ăn điểm chủ đề này",
    "Giải thích kỹ hơn lỗi ngữ pháp của mình",
  ];

  const sendChat = async (textToSend) => {
    const msg = (textToSend ?? chatInput).trim();
    if (!msg || chatLoading) return;

    const nextHistory = [...chatMessages, { role: "user", text: msg }];
    setChatMessages(nextHistory);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          message: msg,
          chatHistory: chatMessages.slice(-8),
          question,
          evaluation: data,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setChatMessages([...nextHistory, { role: "assistant", text: json.reply }]);
    } catch (err) {
      setChatMessages([...nextHistory, { role: "assistant", text: `Lỗi: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={cardStyle}>
      {/* Header + Overall Band + Metrics */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "#8aa395", letterSpacing: 1 }}>OVERALL BAND SCORE</div>
          <div style={{ fontSize: 42, fontWeight: 900, color: "#4ade80", lineHeight: 1.1 }}>
            {Number(data.overall_band || 0).toFixed(1)}
          </div>
        </div>
        {data.metrics && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={subCardStyle}>
              <div style={{ fontSize: 11, color: "#8aa395" }}>TỐC ĐỘ NÓI</div>
              <div style={{ fontWeight: 700 }}>{data.metrics.estimated_wpm ?? "-"} WPM ({data.metrics.pace_assessment || "-"})</div>
            </div>
            <div style={subCardStyle}>
              <div style={{ fontSize: 11, color: "#8aa395" }}>SỐ TỪ</div>
              <div style={{ fontWeight: 700 }}>{data.metrics.word_count ?? "-"} từ</div>
            </div>
            <div style={subCardStyle}>
              <div style={{ fontSize: 11, color: "#8aa395" }}>FILLER WORDS</div>
              <div style={{ fontWeight: 700 }}>
                {Array.isArray(data.metrics.filler_words) && data.metrics.filler_words.length > 0
                  ? data.metrics.filler_words.join(", ")
                  : "Không đáng kể"}
              </div>
            </div>
          </div>
        )}
      </div>

      {data.summary_vi && (
        <p style={{ ...subCardStyle, marginTop: 14, borderLeft: "3px solid #4ade80", lineHeight: 1.6 }}>
          <strong>Nhận xét giám khảo: </strong>{data.summary_vi}
        </p>
      )}

      {/* 4 Criteria Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 14 }}>
        {criteria.map(([title, item]) => (
          <div key={title} style={subCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 14 }}>{title}</strong>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>{item?.band ?? "-"}</span>
            </div>
            {Array.isArray(item?.strengths) && item.strengths.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <div style={{ color: "#4ade80", fontWeight: 700 }}>Điểm mạnh:</div>
                <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                  {item.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {Array.isArray(item?.weaknesses) && item.weaknesses.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <div style={{ color: "#f87171", fontWeight: 700 }}>Điểm kéo band:</div>
                <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                  {item.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            {item?.next_band_tip && (
              <div style={{ marginTop: 8, fontSize: 13, color: "#fbbf24" }}>
                <strong>Cách lên +0.5 band:</strong> {item.next_band_tip}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Transcript */}
      <h3 style={{ marginTop: 18, marginBottom: 8 }}>Transcript nguyên văn</h3>
      <p style={{ ...subCardStyle, margin: 0, lineHeight: 1.6 }}>{data.transcript}</p>
      {data.metrics?.hesitation_note && (
        <p style={{ fontSize: 13, color: "#8aa395", marginTop: 6 }}>Nhịp nói &amp; ngập ngừng: {data.metrics.hesitation_note}</p>
      )}

      {/* Pronunciation Clinic */}
      {Array.isArray(data.pronunciation_clinic) && data.pronunciation_clinic.length > 0 && (
        <>
          <h3 style={{ marginTop: 18, marginBottom: 8 }}>Sửa phát âm (IPA)</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {data.pronunciation_clinic.map((p, idx) => (
              <div key={idx} style={subCardStyle}>
                <strong>{p.word}</strong> <span style={{ color: "#4ade80", fontFamily: "monospace" }}>{p.ipa}</span>
                <div style={{ fontSize: 13, color: "#f87171", marginTop: 4 }}>Lỗi: {p.issue_vi}</div>
                <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 2 }}>Cách sửa: {p.fix_tip_vi}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Targeted Corrections + Inline Retry Drill */}
      {Array.isArray(data.corrections) && data.corrections.length > 0 && (
        <>
          <h3 style={{ marginTop: 18, marginBottom: 8 }}>Sửa lỗi câu &amp; Luyện nói lại ngay (Retry Drill)</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {data.corrections.map((c, idx) => (
              <div key={idx} style={subCardStyle}>
                <div style={{ fontSize: 13, color: "#fca5a5" }}><strong>Bạn nói:</strong> {c.spoken}</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                  <strong>{c.issue}:</strong> {c.explanation_vi}
                </div>
                <div style={{ fontSize: 14, color: "#86efac", marginTop: 6 }}>
                  <strong>Nâng cấp Band 8.0+:</strong> {c.upgrade}
                </div>
                <RetryDrillInline correction={c} apiEndpoint={apiEndpoint} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Vocabulary Upgrades */}
      {Array.isArray(data.vocab_upgrades) && data.vocab_upgrades.length > 0 && (
        <>
          <h3 style={{ marginTop: 18, marginBottom: 8 }}>Nâng cấp từ vựng &amp; Collocation</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {data.vocab_upgrades.map((v, idx) => (
              <div key={idx} style={subCardStyle}>
                <span style={{ color: "#94a3b8" }}>{v.basic}</span> → <strong style={{ color: "#4ade80" }}>{v.advanced}</strong>{" "}
                <span style={{ fontSize: 11, color: "#fbbf24" }}>({v.type})</span>
                <div style={{ fontSize: 13, marginTop: 4, fontStyle: "italic" }}>"{v.example}"</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Two-tier Model Answers */}
      <h3 style={{ marginTop: 18, marginBottom: 8 }}>Bài mẫu từ chính ý của bạn</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {data.model_answer_band_7_5 && (
          <div style={subCardStyle}>
            <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700, marginBottom: 4 }}>BAND 7.5 (Tự nhiên, dễ áp dụng)</div>
            <div>{data.model_answer_band_7_5}</div>
          </div>
        )}
        {data.model_answer && (
          <div style={subCardStyle}>
            <div style={{ fontSize: 12, color: "#4ade80", fontWeight: 700, marginBottom: 4 }}>BAND 8.5 (Sắc bén, giàu collocation)</div>
            <div>{data.model_answer}</div>
          </div>
        )}
      </div>

      {/* Examiner Follow-up */}
      {data.examiner_followup && (
        <div style={{ ...subCardStyle, marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "#8aa395" }}>CÂU HỎI FOLLOW-UP CỦA GIÁM KHẢO</div>
            <div style={{ marginTop: 4 }}>{data.examiner_followup}</div>
          </div>
          {onUseFollowup && (
            <button onClick={() => onUseFollowup(data.examiner_followup)} style={btnStyle}>
              Trả lời câu này →
            </button>
          )}
        </div>
      )}

      {/* V3 Interactive Examiner Coach Chat */}
      <div style={{ ...subCardStyle, marginTop: 18, borderColor: "#36694a" }}>
        <h3 style={{ margin: "0 0 8px" }}>💬 Hỏi đáp trực tiếp với Giám Khảo AI</h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => sendChat(q)}
              disabled={chatLoading}
              style={{ ...btnStyle, fontSize: 12, padding: "5px 10px", background: "#13261b" }}
            >
              {q}
            </button>
          ))}
        </div>

        {chatMessages.length > 0 && (
          <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto", marginBottom: 10, paddingRight: 4 }}>
            {chatMessages.map((m, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: m.role === "user" ? "#1f3d2b" : "#131c17",
                  border: "1px solid #26382e",
                  fontSize: 13,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.55,
                }}
              >
                <strong style={{ color: m.role === "user" ? "#4ade80" : "#fbbf24" }}>
                  {m.role === "user" ? "Bạn: " : "Giám khảo AI: "}
                </strong>
                {m.text}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
            placeholder="Hỏi bất cứ gì về bài nói vừa rồi (VD: sao dùng từ này chưa tự nhiên?)..."
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: 8,
              background: "#131c17",
              color: "#e6f2ec",
              border: "1px solid #26382e",
              fontSize: 13,
            }}
          />
          <button onClick={() => sendChat()} disabled={chatLoading || !chatInput.trim()} style={btnStyle}>
            {chatLoading ? "Đang trả lời..." : "Gửi"}
          </button>
        </div>
      </div>
    </div>
  );
}
