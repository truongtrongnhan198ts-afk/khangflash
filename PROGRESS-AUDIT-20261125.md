# Daily progress audit, 25 November 2026

Baseline: d413133 (latest main at audit time). Latest Gemini changes affect voice CSS and its cache versions; they did not remove the core progress scripts.

## Reproduced production failure
From /schedule, day 1 displayed 791 vocabulary + 4 grammar items. Opening its flashcard link instead loaded 33 cards from the fallback plan. Rated three cards Nhớ rồi; the in-room count reached 3 and saves succeeded. Returning to /schedule showed 0/795 learned. Topic-based learning, independently, retained its exact known count across navigation and reload.

## Root cause
live-override.js, former clearLegacyUnbalancedPlan(), around line 657, removed localStorage key kf_vercel_plan_v1 whenever a saved plan lacked interleavedV2, and deleted IndexedDB database kf-device-learning-plan-v1 once. Ordinary KPlan.build/ensureGoal plans do not have interleavedV2. Navigating between schedule and flashcard therefore erased the day assignments; schedule rebuilt from unseen cards, while flashcard could fall back to plan.json. Stored review records survived but no longer matched the new daily assignments.
learning-plan.js ensureGoal() also treated a valid saved plan without the specific learningUpgrade stamp as disposable, rebuilding it from unseen cards with default settings.

## Fix
- Stop deleting either learning-plan store during bootstrap. Preserve existing day assignments and deadlines.
- ensureGoal accepts any existing nonempty day plan; the existing Task 2 upgrade stays available for its original eligible plans. Explicit reallocation and Thematic algorithms remain unchanged.
- Show exact learned/known/review counts on deck tiles; integer-rounded percentages previously displayed 0% for small saved progress. Nonzero progress now never displays 0%.
- Refresh library progress after bfcache restoration or returning to the tab.
- Bust loader/learning-plan caches across affected pages; refresh picker/library renderer versions.

## Validation
20 Node regression tests passed, including three rating-4 reviews followed by a new page context: original day retains all 4 assignments, with 3/4 learned and the original band/deadline. Includes previous persistence/outbox/quota, news/knowledge/notebook, voice, and usage/countability tests. New template tests cover all 12 tile designs and tiny progress in a 60,000-card deck.

No study records, FSRS logic, voice.js, full-plan.js, schedule-clean.js, or noun-countability.js changed. This prevents future plan resets; deleted historical day assignments cannot be reconstructed reliably without an older plan backup. Surviving card review records remain intact.

Additional audit finding, outside the clarified daily-progress repair: /api/backup still has an incomplete response contract for personal-backup.js. No backup/restore completion is claimed in this patch.
