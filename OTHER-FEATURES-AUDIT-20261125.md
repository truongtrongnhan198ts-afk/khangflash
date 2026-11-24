# Progress and media audit — 25 November 2026

Baseline: a1c5ea0 (PR #4).

## Verified persistence
27 regression tests pass: FSRS reviews/history/activity/outbox recovery; grammar attempts; Writing drafts; podcast position; knowledge read/bookmark/note/word data and review dates; news read metadata and notebook notes; daily-plan assignments; voice settings and countability/usage rendering. No changes to voice.js, full-plan.js, schedule-clean.js or noun-countability.js.

Production browser checks before this patch:
- Knowledge article `recall`: old note from 24 November and the phrase `retrieve information from memory` survived reload. Bookmarked the article and marked it read; both survived reload.
- Saved `test yourself first` in the same article, reloaded, and found two saved words in Notebook. Rated the new phrase remembered; due changed from 25 November to 26 November and persisted after another reload.
- Daily flashcard persistence was already repaired and verified in PR #4.

## Fixed: incomplete backup/restore
personal-backup.js expected exportedAt, preview.summary and merge.message; the shim and api/backup.js instead returned placeholder JSON. The new local /api/backup contract exports study/practice/knowledge/news notebook records, localStorage and IndexedDB plans, and the eight manual completion flags. Preview does not write progress. Merge validates the format/account and adds only missing rows/plan/settings fields; existing records and conflicting drafts are preserved. Imports are idempotent. Corrupt stores and quota failures report failure rather than fake success. The server fallback now returns 503 honestly.

Added a visible “Sao lưu / khôi phục tiến độ” entry in the library/picker. Pending study, practice, knowledge and news outbox work must settle before export/import. Backups are local files, not an assertion of cloud or cross-device synchronization.

## Fixed: missing news/podcast endpoints
The repository had no API implementations or rewrites for /api/news, /api/podcasts or /api/news/article. Production news showed a non-JSON parse error and no articles. Added one Vercel media function and explicit rewrites. RSS is fetched from configured public publisher feeds; a provider failure does not discard successful providers. Failed requests return JSON errors. Full text is limited to supported VOA article pages; audio-only VOA pages are not labeled full text. Article URLs and redirect hosts are restricted; no arbitrary-URL proxy.

Live upstream smoke tests: 100 news items (four providers succeeded; VnExpress International temporarily unavailable), 100 podcast episodes (NPR, Guardian and VOA succeeded), and a VOA full article returned 19 paragraphs. These are upstream checks; production deployment UI verification is reported separately.
