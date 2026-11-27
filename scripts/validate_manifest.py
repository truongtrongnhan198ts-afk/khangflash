#!/usr/bin/env python3
"""Validate IELTS Speaking benchmark manifest.jsonl before running benchmark-200.mjs."""

import argparse
import hashlib
import json
import sys
from collections import Counter, defaultdict
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
REQUIRED_FIELDS = (
    "id",
    "part",
    "question",
    "audio_path",
    "mime_type",
    "speaker_id",
    "human_band",
    "source",
    "license",
    "sha256",
)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate IELTS Speaking benchmark manifest.")
    parser.add_argument("manifest", help="Path to manifest.jsonl")
    parser.add_argument("--expected-counts", default="70,60,70", help="Expected Part 1,2,3 counts (default: 70,60,70).")
    args = parser.parse_args()

    expected = dict(zip((1, 2, 3), (int(x) for x in args.expected_counts.split(","))))
    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        print(f"[FAIL] Manifest not found: {manifest_path}", file=sys.stderr)
        sys.exit(1)

    errors: list[str] = []
    part_counts = Counter()
    seen_ids: set[str] = set()
    seen_hashes: set[str] = set()
    speaker_splits: dict[str, set[str]] = defaultdict(set)
    total = 0

    with manifest_path.open("r", encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            if not line.strip():
                continue
            total += 1
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                errors.append(f"Line {lineno}: invalid JSON ({exc})")
                continue

            for field in REQUIRED_FIELDS:
                if field not in row or row[field] in (None, ""):
                    errors.append(f"Line {lineno}: missing required field '{field}'")

            sample_id = str(row.get("id", ""))
            if sample_id in seen_ids:
                errors.append(f"Line {lineno}: duplicate id '{sample_id}'")
            seen_ids.add(sample_id)

            part = row.get("part")
            if part not in (1, 2, 3):
                errors.append(f"Line {lineno} ({sample_id}): invalid part '{part}'")
            else:
                part_counts[part] += 1

            band = row.get("human_band")
            if not isinstance(band, (int, float)) or band < 0 or band > 9 or (band * 2) % 1 != 0:
                errors.append(f"Line {lineno} ({sample_id}): invalid human_band '{band}'")

            mime = str(row.get("mime_type", "")).split(";")[0].strip().lower()
            if mime not in ALLOWED_MIMES:
                errors.append(f"Line {lineno} ({sample_id}): unsupported mime_type '{mime}'")

            audio_path = Path(str(row.get("audio_path", "")))
            if not audio_path.exists():
                errors.append(f"Line {lineno} ({sample_id}): audio file not found '{audio_path}'")
            else:
                size = audio_path.stat().st_size
                if size == 0 or size > MAX_BYTES:
                    errors.append(f"Line {lineno} ({sample_id}): audio size {size} bytes outside (0, {MAX_BYTES}]")
                actual_hash = sha256_file(audio_path)
                if actual_hash != row.get("sha256"):
                    errors.append(f"Line {lineno} ({sample_id}): sha256 mismatch")
                if actual_hash in seen_hashes:
                    errors.append(f"Line {lineno} ({sample_id}): duplicate audio sha256 {actual_hash[:12]}")
                seen_hashes.add(actual_hash)

            if row.get("split"):
                speaker_splits[str(row.get("speaker_id"))].add(str(row["split"]))

    for part, want in expected.items():
        if part_counts[part] != want:
            errors.append(f"Part {part} count mismatch: got {part_counts[part]}, expected {want}")

    leaking_speakers = [spk for spk, splits in speaker_splits.items() if len(splits) > 1]
    if leaking_speakers:
        errors.append(f"Speaker leakage across splits: {leaking_speakers[:10]}")

    print(
        f"Checked {total} rows | Part 1: {part_counts[1]}/{expected[1]}, "
        f"Part 2: {part_counts[2]}/{expected[2]}, Part 3: {part_counts[3]}/{expected[3]} | "
        f"Unique SHA-256: {len(seen_hashes)} | Errors: {len(errors)}"
    )
    if errors:
        for err in errors[:30]:
            print(f"  - {err}", file=sys.stderr)
        sys.exit(1)
    print("[OK] Manifest valid.")


if __name__ == "__main__":
    main()
