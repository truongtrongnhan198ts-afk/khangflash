#!/usr/bin/env node
/**
 * Benchmark IELTS Speaking evaluator on a validated manifest.jsonl.
 * Features: concurrency=2, resumable JSONL checkpoint, CSV export, MAE/Bias/Latency/Top-10 error report.
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    manifest: "benchmark/manifest.jsonl",
    endpoint: "https://khangflash.vercel.app/api/ielts-speaking",
    checkpoint: "benchmark/results.jsonl",
    csv: "benchmark/results.csv",
    concurrency: 2,
  };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--manifest") args.manifest = argv[++i];
    else if (flag === "--endpoint") args.endpoint = argv[++i];
    else if (flag === "--checkpoint") args.checkpoint = argv[++i];
    else if (flag === "--csv") args.csv = argv[++i];
    else if (flag === "--concurrency") args.concurrency = Math.max(1, Number(argv[++i]) || 2);
  }
  return args;
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function csvEscape(val) {
  const str = val === null || val === undefined ? "" : String(val);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function evaluateSample(sample, endpoint) {
  const audioBase64 = fs.readFileSync(sample.audio_path).toString("base64");
  const started = Date.now();
  let status = 0;
  let aiBand = null;
  let relevance = "";
  let assessmentNote = "";
  let errorMsg = "";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "evaluate",
        part: sample.part,
        question: sample.question,
        audioBase64,
        mimeType: sample.mime_type,
      }),
    });
    status = res.status;
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      aiBand = Number.isFinite(data.overall_band) ? data.overall_band : null;
      relevance = data.relevance || "";
      assessmentNote = data.assessment_note || "";
    } else {
      errorMsg = data.error || `HTTP ${status}`;
    }
  } catch (err) {
    errorMsg = err?.message || String(err);
  }

  const latencyMs = Date.now() - started;
  const signedError = aiBand !== null ? Number((aiBand - sample.human_band).toFixed(2)) : null;
  const absError = signedError !== null ? Number(Math.abs(signedError).toFixed(2)) : null;

  return {
    id: sample.id,
    part: sample.part,
    speaker_id: sample.speaker_id,
    human_band: sample.human_band,
    ai_band: aiBand,
    error: signedError,
    abs_error: absError,
    status,
    latency_ms: latencyMs,
    relevance,
    assessment_note: assessmentNote,
    http_error: errorMsg,
  };
}

function writeCsv(rows, csvPath) {
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  const headers = [
    "id",
    "part",
    "speaker_id",
    "human_band",
    "ai_band",
    "error",
    "abs_error",
    "status",
    "latency_ms",
    "relevance",
    "assessment_note",
    "http_error",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  }
  fs.writeFileSync(csvPath, lines.join("\n") + "\n", "utf8");
}

function printSummary(rows) {
  const scored = rows.filter((r) => r.ai_band !== null);
  const latencies = rows.map((r) => r.latency_ms).sort((a, b) => a - b);
  const mae = scored.length
    ? scored.reduce((s, r) => s + r.abs_error, 0) / scored.length
    : null;
  const bias = scored.length
    ? scored.reduce((s, r) => s + r.error, 0) / scored.length
    : null;
  const within05 = scored.length
    ? (scored.filter((r) => r.abs_error <= 0.5).length / scored.length) * 100
    : 0;
  const within10 = scored.length
    ? (scored.filter((r) => r.abs_error <= 1.0).length / scored.length) * 100
    : 0;

  console.log("\n=== BENCHMARK SUMMARY ===");
  console.log(`Total: ${rows.length} | Scored: ${scored.length} | Null/Failed: ${rows.length - scored.length}`);
  console.log(`MAE: ${mae !== null ? mae.toFixed(3) : "N/A"} | Bias (AI - Human): ${bias !== null ? bias.toFixed(3) : "N/A"}`);
  console.log(`Within ±0.5: ${within05.toFixed(1)}% | Within ±1.0: ${within10.toFixed(1)}%`);
  console.log(`Latency p50: ${percentile(latencies, 50)}ms | p95: ${percentile(latencies, 95)}ms`);

  for (const part of [1, 2, 3]) {
    const pRows = scored.filter((r) => r.part === part);
    if (!pRows.length) continue;
    const pMae = pRows.reduce((s, r) => s + r.abs_error, 0) / pRows.length;
    const pBias = pRows.reduce((s, r) => s + r.error, 0) / pRows.length;
    console.log(`  Part ${part} (n=${pRows.length}): MAE=${pMae.toFixed(3)}, Bias=${pBias.toFixed(3)}`);
  }

  const top10 = [...scored].sort((a, b) => b.abs_error - a.abs_error).slice(0, 10);
  console.log("\n=== TOP 10 LARGEST ERRORS ===");
  for (const r of top10) {
    console.log(
      `  ${r.id} (P${r.part}, spk=${r.speaker_id}): human=${r.human_band}, ai=${r.ai_band}, diff=${r.error}, rel=${r.relevance}`
    );
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const samples = readJsonl(args.manifest);
  if (!samples.length) {
    console.error(`No samples found in ${args.manifest}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(args.checkpoint), { recursive: true });
  const existing = readJsonl(args.checkpoint);
  const doneMap = new Map(existing.map((r) => [r.id, r]));
  const pending = samples.filter((s) => !doneMap.has(s.id));

  console.log(
    `Loaded ${samples.length} samples (${doneMap.size} cached in checkpoint, ${pending.length} pending, concurrency=${args.concurrency}).`
  );

  let cursor = 0;
  async function worker() {
    while (cursor < pending.length) {
      const sample = pending[cursor++];
      const record = await evaluateSample(sample, args.endpoint);
      doneMap.set(record.id, record);
      fs.appendFileSync(args.checkpoint, JSON.stringify(record) + "\n", "utf8");
      console.log(
        `[${doneMap.size}/${samples.length}] ${record.id}: status=${record.status} ai=${record.ai_band} human=${record.human_band} (${record.latency_ms}ms)`
      );
    }
  }

  await Promise.all(Array.from({ length: Math.min(args.concurrency, pending.length || 1) }, worker));

  const ordered = samples.map((s) => doneMap.get(s.id)).filter(Boolean);
  writeCsv(ordered, args.csv);
  printSummary(ordered);
  console.log(`\nExported CSV: ${args.csv}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
