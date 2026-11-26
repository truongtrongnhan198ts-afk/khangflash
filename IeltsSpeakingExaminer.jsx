"use client";
import React, { useState, useRef, useEffect } from "react";

const PROMPTS = {
  "Part 1": [
    "Do you work or are you a student? What do you find most challenging about it?",
    "How has your hometown changed over the last five years?",
    "Do you prefer reading paper books or digital content? Why?",
  ],
  "Part 2": [
    "Describe a piece of technology you use every day that makes your life easier.\nYou should say:\n- what it is\n- how often you use it\n- what it helps you do\nand explain why you would find it difficult to live without it.",
    "Describe a difficult decision you made that had a positive outcome.\nYou should say:\n- what the decision was\n- when you made it\n- why it was difficult\nand explain how it turned out well.",
  ],
  "Part 3": [
    "To what extent is artificial intelligence replacing skills that humans still need to learn?",
    "Why do some people resist changes in their workplace even when those changes improve efficiency?",
    "Should governments invest more in public transport or in green infrastructure for private vehicles?",
  ],
};

function formatTime(s) {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function IeltsSpeakingExaminer({ apiEndpoint = "/api/ielts-speaking" }) {
  const [part, setPart] = useState("Part 1");
  const [question, setQuestion] = useState(PROMPTS["Part 1"][0]);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [status, setStatus] = useState("Ready");
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [prepSeconds, setPrepSeconds] = useState(60);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recTimerRef = useRef(null);
  const prepTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(recTimerRef.current);
      clearInterval(prepTimerRef.current);
    };
  }, []);

  const speakText = (text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const british = voices.find((v) => v.lang === "en-GB") || voices.find((v) => v.lang.startsWith("en"));
    if (british) utter.voice = british;
    utter.rate = 0.96;
    window.speechSynthesis.speak(utter);
  };

  const pickRandom = (targetPart = part) => {
    const list = PROMPTS[targetPart];
    const q = list[Math.floor(Math.random() * list.length)];
    setQuestion(q);
    if (autoSpeak) speakText(q);
  };

  const startPrep = () => {
    clearInterval(prepTimerRef.current);
    let left = 60;
    setPrepSeconds(left);
    prepTimerRef.current = setInterval(() => {
      left -= 1;
      setPrepSeconds(Math.max(0, left));
      if (left <= 0) {
        clearInterval(prepTimerRef.current);
        speakText("Your one minute preparation time is up. Please begin speaking now.");
      }
    }, 1000);
  };

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = getSupportedMimeType();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setStatus("Recording...");
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => {
        setRecSeconds((prev) => {
          const next = prev + 1;
          if (part === "Part 2" && next === 120) {
            speakText("Thank you. Two minutes are up.");
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      setError(`Mic error: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recTimerRef.current);
    setIsRecording(false);
    setStatus("Recorded");
  };

  const evaluate = async () => {
    if (!audioBlob) return;
    setError("");
    setLoading(true);
    setStatus("Evaluating audio...");

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioBlob.type || "audio/webm",
          part,
          question: question.trim(),
          history: history.slice(-4),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setResult(data);
      setHistory((prev) => [...prev, { question, transcript: data.transcript }]);
      setStatus("Graded");
      if (autoSpeak && data.examiner_followup) speakText(data.examiner_followup);
    } catch (err) {
      setError(`Evaluation failed: ${err.message}`);
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const useFollowup = () => {
    if (!result?.examiner_followup) return;
    setQuestion(result.examiner_followup);
    setAudioBlob(null);
    setAudioUrl("");
    if (autoSpeak) speakText(result.examiner_followup);
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 20, fontFamily: "system-ui, sans-serif", color: "#e6edf3", background: "#0e1117", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>IELTS Speaking AI Examiner</h2>
        <span style={{ padding: "4px 10px", borderRadius: 99, background: "#21262d", fontSize: 12, fontWeight: 700 }}>{status}</span>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <select
          value={part}
          onChange={(e) => {
            setPart(e.target.value);
            pickRandom(e.target.value);
          }}
          style={{ padding: "8px 10px", borderRadius: 6, background: "#161b22", color: "#e6edf3", border: "1px solid #30363d" }}
        >
          <option value="Part 1">Part 1 — Interview</option>
          <option value="Part 2">Part 2 — Cue Card (1m prep + 2m talk)</option>
          <option value="Part 3">Part 3 — Discussion</option>
        </select>
        <button onClick={() => pickRandom()} style={{ padding: "8px 12px", borderRadius: 6, cursor: "pointer" }}>Random Prompt</button>
        <button onClick={() => speakText(question)} style={{ padding: "8px 12px", borderRadius: 6, cursor: "pointer" }}>Listen to Examiner</button>
        <label style={{ fontSize: 13, color: "#8b949e" }}>
          <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} /> Auto-speak
        </label>
      </div>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: 10, borderRadius: 8, background: "#161b22", color: "#e6edf3", border: "1px solid #30363d", marginBottom: 12 }}
      />

      {part === "Part 2" && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <button onClick={startPrep} style={{ padding: "8px 12px", borderRadius: 6, cursor: "pointer" }}>Start 1-Min Prep</button>
          <strong style={{ fontFamily: "monospace", fontSize: 18, color: "#d29922" }}>{formatTime(prepSeconds)}</strong>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={startRecording} disabled={isRecording} style={{ padding: "9px 14px", borderRadius: 6, background: "#2f81f7", color: "#fff", border: "none", cursor: "pointer" }}>
            Start Recording
          </button>
          <button onClick={stopRecording} disabled={!isRecording} style={{ padding: "9px 14px", borderRadius: 6, background: "#f85149", color: "#fff", border: "none", cursor: "pointer" }}>
            Stop
          </button>
          <button onClick={evaluate} disabled={!audioBlob || loading} style={{ padding: "9px 14px", borderRadius: 6, background: "#3fb950", color: "#0b140d", fontWeight: 700, border: "none", cursor: "pointer" }}>
            {loading ? "Grading..." : "Evaluate Speaking"}
          </button>
        </div>
        <strong style={{ fontFamily: "monospace", fontSize: 20, color: "#d29922" }}>{formatTime(recSeconds)}</strong>
      </div>

      {audioUrl && <audio src={audioUrl} controls style={{ width: "100%", marginBottom: 12 }} />}
      {error && <p style={{ color: "#f85149" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 18, padding: 16, background: "#161b22", borderRadius: 10, border: "1px solid #30363d" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "#8b949e" }}>OVERALL BAND SCORE</div>
              <div style={{ fontSize: 38, fontWeight: 900, color: "#3fb950" }}>{Number(result.overall_band).toFixed(1)}</div>
            </div>
            <button onClick={useFollowup} style={{ padding: "9px 14px", borderRadius: 6, background: "#2f81f7", color: "#fff", border: "none", cursor: "pointer" }}>
              Answer Examiner Follow-up
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, margin: "14px 0" }}>
            {[
              ["Fluency & Coherence", result.scores?.fluency_coherence],
              ["Lexical Resource", result.scores?.lexical_resource],
              ["Grammar", result.scores?.grammatical_range_accuracy],
              ["Pronunciation", result.scores?.pronunciation],
            ].map(([label, item]) => (
              <div key={label} style={{ background: "#0d1117", padding: 12, borderRadius: 8, border: "1px solid #30363d" }}>
                <div style={{ fontSize: 12, color: "#8b949e" }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#2f81f7" }}>{item?.band ?? "-"}</div>
                <p style={{ fontSize: 13, color: "#8b949e", margin: "6px 0 0" }}>{item?.feedback}</p>
              </div>
            ))}
          </div>

          <h3>Verbatim Transcript</h3>
          <p style={{ background: "#0d1117", padding: 12, borderRadius: 8 }}>{result.transcript}</p>

          <h3>Targeted Corrections (Band 8.0+ Upgrades)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #30363d", padding: 8, textAlign: "left" }}>What You Said</th>
                <th style={{ border: "1px solid #30363d", padding: 8, textAlign: "left" }}>Issue</th>
                <th style={{ border: "1px solid #30363d", padding: 8, textAlign: "left" }}>Band 8.0+ Upgrade</th>
              </tr>
            </thead>
            <tbody>
              {(result.corrections || []).map((c, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #30363d", padding: 8 }}>{c.spoken}</td>
                  <td style={{ border: "1px solid #30363d", padding: 8 }}>{c.issue}</td>
                  <td style={{ border: "1px solid #30363d", padding: 8 }}>{c.upgrade}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ marginTop: 16 }}>Band 8.5 Model Rewrite</h3>
          <p style={{ background: "#0d1117", padding: 12, borderRadius: 8 }}>{result.model_answer}</p>

          <h3>Examiner Follow-up</h3>
          <p style={{ background: "#0d1117", padding: 12, borderRadius: 8 }}>{result.examiner_followup}</p>
        </div>
      )}
    </div>
  );
}
