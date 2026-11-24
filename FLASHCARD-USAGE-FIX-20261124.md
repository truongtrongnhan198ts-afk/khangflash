# Restore front-of-card usage

Base: 5c34ddd. Root: reference-ui.js study() removed the old word-class block and added a POS label but never rendered card/variant usagePattern or usage. app.js showed usage only on the back/details. noun-countability.js only appends its own badge; it did not delete source usage data.

Audited the supplement CARDS arrays: all 48,137 supplement cards retain usage metadata. The base data also retains 3,930 nonempty variant usage entries (not unique card counts). Some base variants have empty usage; no patterns are invented for those.

Render the selected sense's usagePattern/usage (including originalSource) first, then top-level card usage. Do not borrow another sense's structure. Add one text-only front row, update it on reused cards, remove it on a card without usage, preserve literal S + V / angle brackets, and keep countability badges. Refresh shared UI cache versions on all pages that import reference-ui.js.

17 regression tests passed, including usage+Uncountable coexistence, navigation cleanup, selected-sense precedence, literal text safety and the prior voice/progress suites. No source vocabulary, SRS, voice, noun classifier or schedule changes.
