#!/usr/bin/env python3
"""Prepare 200 real-speaker IELTS Speaking audio samples (70 Part 1, 60 Part 2, 70 Part 3).

Supports local CSV/JSONL metadata + audio files or Hugging Face datasets.
Enforces: license verification, <= 3 MB per file (via ffmpeg transcode if needed),
SHA-256 deduplication, and speaker_id-disjoint train/dev/test splits.
"""

import argparse
import csv
import hashlib
import json
import mimetypes
import os
import shutil
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

MAX_BYTES = 3 * 1024 * 1024
ALLOWED_MIMES = {
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
    "audio/mpeg",
    "audio/m4a",
    "audio/aac",
    "audio/flac",
}
APPROVED_LICENSE_TOKENS = (
    "cc-by",
    "cc0",
    "mit",
    "apache-2.0",
    "bsd",
    "eduhk",
    "academic-research-approved",
)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def verify_license(license_str: str, allow_override: bool) -> None:
    norm = (license_str or "").strip().lower()
    if any(tok in norm for tok in APPROVED_LICENSE_TOKENS):
        return
    if allow_override and norm:
        return
    raise SystemExit(
        f"[BLOCKED] License '{license_str}' is not in approved list {APPROVED_LICENSE_TOKENS}. "
        "Verify Hugging Face / EdUHK dataset terms first or pass --confirm-license."
    )


def guess_mime(path: Path) -> str:
    ext = path.suffix.lower()
    mapping = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".webm": "audio/webm",
        ".ogg": "audio/ogg",
        ".m4a": "audio/m4a",
        ".mp4": "audio/mp4",
        ".aac": "audio/aac",
        ".flac": "audio/flac",
    }
    if ext in mapping:
        return mapping[ext]
    guessed, _ = mimetypes.guess_type(str(path))
    return guessed or "audio/mpeg"


def ensure_under_3mb(src: Path, dst_dir: Path, sample_id: str) -> tuple[Path, str]:
    dst_dir.mkdir(parents=True, exist_ok=True)
    mime = guess_mime(src)
    if src.stat().st_size <= MAX_BYTES and mime in ALLOWED_MIMES:
        dst = dst_dir / f"{sample_id}{src.suffix.lower() or '.mp3'}"
        shutil.copy2(src, dst)
        return dst, mime

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError(
            f"File {src} exceeds 3 MB or unsupported MIME ({mime}), and ffmpeg is not installed."
        )
    dst = dst_dir / f"{sample_id}.mp3"
    for bitrate in ("64k", "48k", "32k"):
        cmd = [
            ffmpeg,
            "-y",
            "-i",
            str(src),
            "-ac",
            "1",
            "-ar",
            "16000",
            "-b:a",
            bitrate,
            str(dst),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if dst.stat().st_size <= MAX_BYTES:
            return dst, "audio/mpeg"
    raise RuntimeError(f"Could not compress {src} below 3 MB even at 32k mono MP3.")


def assign_speaker_splits(records: list[dict], dev_ratio: float = 0.2) -> None:
    speakers = sorted({str(r["speaker_id"]) for r in records})
    split_map = {}
    for spk in speakers:
        digest = int(hashlib.sha256(spk.encode("utf-8")).hexdigest()[:8], 16)
        split_map[spk] = "dev" if (digest % 100) < int(dev_ratio * 100) else "test"
    for r in records:
        r["split"] = split_map[str(r["speaker_id"])]


def load_local_metadata(meta_path: Path) -> list[dict]:
    if meta_path.suffix.lower() == ".jsonl":
        with meta_path.open("r", encoding="utf-8") as f:
            return [json.loads(line) for line in f if line.strip()]
    with meta_path.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare 200-sample IELTS Speaking benchmark manifest.")
    parser.add_argument("--input-meta", required=True, help="Path to source metadata CSV or JSONL.")
    parser.add_argument("--audio-root", default=".", help="Base directory for relative audio_path entries.")
    parser.add_argument("--out-dir", default="benchmark", help="Output directory for audio/ and manifest.jsonl.")
    parser.add_argument("--license", required=True, help="Dataset license string (e.g. CC-BY-4.0 or EdUHK-Academic).")
    parser.add_argument("--source", default="local", help="Dataset source identifier (e.g. huggingface/<repo> or EdUHK).")
    parser.add_argument("--confirm-license", action="store_true", help="Confirm license if using custom institutional terms.")
    parser.add_argument("--quotas", default="70,60,70", help="Part 1,2,3 quotas (default: 70,60,70).")
    args = parser.parse_args()

    verify_license(args.license, args.confirm_license)
    q1, q2, q3 = (int(x) for x in args.quotas.split(","))
    target_quotas = {1: q1, 2: q2, 3: q3}

    rows = load_local_metadata(Path(args.input_meta))
    audio_root = Path(args.audio_root)
    out_dir = Path(args.out_dir)
    audio_out = out_dir / "audio"
    seen_hashes: set[str] = set()
    by_part: dict[int, list[dict]] = defaultdict(list)

    for idx, row in enumerate(rows):
        part = int(str(row["part"]).strip())
        if part not in target_quotas or len(by_part[part]) >= target_quotas[part]:
            continue
        raw_path = Path(row["audio_path"])
        src = raw_path if raw_path.is_absolute() else (audio_root / raw_path)
        if not src.exists():
            continue

        sample_id = str(row.get("id") or f"p{part}_{idx:04d}")
        dst_path, mime = ensure_under_3mb(src, audio_out, sample_id)
        digest = sha256_file(dst_path)
        if digest in seen_hashes:
            dst_path.unlink(missing_ok=True)
            continue
        seen_hashes.add(digest)

        human_band = float(row["human_band"])
        by_part[part].append(
            {
                "id": sample_id,
                "part": part,
                "question": str(row["question"]).strip(),
                "audio_path": str(dst_path),
                "mime_type": mime,
                "speaker_id": str(row["speaker_id"]).strip(),
                "human_band": round(human_band * 2) / 2,
                "source": str(row.get("source") or args.source),
                "license": str(row.get("license") or args.license),
                "sha256": digest,
                "bytes": dst_path.stat().st_size,
            }
        )

    selected = by_part[1] + by_part[2] + by_part[3]
    assign_speaker_splits(selected)
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.jsonl"
    with manifest_path.open("w", encoding="utf-8") as f:
        for item in selected:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    print(
        f"Wrote {len(selected)} samples to {manifest_path} "
        f"(Part 1: {len(by_part[1])}/{q1}, Part 2: {len(by_part[2])}/{q2}, Part 3: {len(by_part[3])}/{q3})."
    )
    if any(len(by_part[p]) < target_quotas[p] for p in (1, 2, 3)):
        sys.exit(2)


if __name__ == "__main__":
    main()
