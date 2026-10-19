---
target: Owner Dashboard
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\691-88734065 System Analysis and Designs\\Project-POS\\project\\frontend\\src\\components\\owner\\OwnerView.jsx"
target_fingerprint: "sha256:36980c87e1f620c64ac4645dffc1daf6287a6efce2126b436a0c015eee4a0798"
target_path: "C:\\691-88734065 System Analysis and Designs\\Project-POS\\project\\frontend\\src\\components\\owner\\OwnerView.jsx"
timestamp: 2026-10-19T05-27-52Z
slug: frontend-src-components-owner-ownerview-jsx
---
# Dashboard Design Critique

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | Live and refresh exist, but no last-updated time or stale/error state after a later refresh failure. |
| 2 | Match System / Real World | 3/4 | Thai labels and THB are clear; internal FR/Use Case codes appear in user-facing copy. |
| 3 | User Control and Freedom | 2/4 | Branch, search, and status filters exist; no visible clear-filter, export, or undo. |
| 4 | Consistency and Standards | 3/4 | Warm visual language is coherent; branch scope is repeated in the app navigation and dashboard. |
| 5 | Error Prevention | 2/4 | Reporting periods are unclear or mixed, increasing the chance of comparing unlike values. |
| 6 | Recognition Rather Than Recall | 3/4 | KPI and table labels are visible, but users must infer time scope for some summaries. |
| 7 | Flexibility and Efficiency | 2/4 | Search/filter/refresh work, but no date presets, export, keyboard shortcuts, or bulk workflow. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Warm cafe surface is coherent; KPI, analytics, menu management, and a dense ledger share one long page. |
| 9 | Error Recovery | 1/4 | Initial load offers retry; post-load fetch errors may be hidden while stale data remains. |
| 10 | Help and Documentation | 1/4 | No contextual metric definitions or dashboard help were observed. |
| **Total** | | **22/40** | **Acceptable** |

## Design Specificity Verdict

**2/4 — A coherent cafe skin over a mostly category-standard analytics layout.** Warm cream/espresso colors, Prompt typography, Thai baht, menu names, and payment labels fit the POS. KPI cards, ranked products, payment breakdown, and ledger could transfer almost unchanged to another retail dashboard.

**Deterministic scan:** Impeccable detector returned `[]` (0 findings) for `OwnerView.jsx`. Automated markup checks do not cover the data-period and stale-state interpretation issues below.

## Overall Impression

The page starts calm and scannable, but owner confidence drops when the time scope and freshness of the figures are unclear. The biggest opportunity is to make every section answer a consistent period-based question and disclose stale data.

## What's Working

- Four headline KPIs establish a clear first-scan hierarchy.
- Top sellers pair comparison bars with item quantity and revenue.
- Ledger uses explicit status and payment labels rather than relying on color alone.

## Priority Issues

1. **[P1] Silent stale dashboard after refresh failure.** Live implies freshness, but a failed refresh after data has loaded may be hidden. Owners can act on old sales or order figures. Show last-success time and a compact stale/error banner with retry while preserving the existing data. Suggested: `$impeccable harden` or `$impeccable clarify`.
2. **[P1] Reporting periods are unclear or inconsistent.** Today Sales, accumulated/completed totals, payment “all-time” totals, top sellers, and the latest 50 orders use or imply different scopes. Owners cannot answer consistent period-based questions. Add period presets and bind metrics to the selected scope, or label each section's scope. Suggested: `$impeccable shape` or `$impeccable clarify`.
3. **[P2] Ledger decision set is dense.** Six table columns, search, and four status filters make record-by-record auditing slow. Move secondary details to an expandable row or drawer, clarify filter state, and provide a clear action. Suggested: `$impeccable distill` or `$impeccable layout`.
4. **[P2] KPIs show totals without movement.** Owners see current state but not change against the previous period. Add a restrained comparison with explicit reference dates and change meaning. Suggested: `$impeccable shape`.
5. **[P3] Internal jargon and duplicate branch affordances.** `(FR-05, Use Case 08)` adds project noise; the same branch appears in app navigation and the dashboard. Remove requirement codes and label the dashboard selector as the report branch. Suggested: `$impeccable clarify`.

## Persona Red Flags

- **Alex (Power User):** Five-second refresh can interrupt ledger scanning without a last-updated signal; no date presets/export; search and status filters only support one-record-at-a-time review.
- **Sam (Accessibility):** Search input sets `outline:none`, suppressing the global focus-visible treatment; stale/error changes are not announced; chart bars are decorative divs whose values depend on adjacent text.

## Minor Observations

- At the inspected desktop height, Top Sellers and payment panels continue below the first viewport; the ledger requires scrolling.
- Sticky navigation may cover the ledger title while scrolling.
- Recent orders are capped at 50 without a visible cap or pagination.
- Current Top 5 counts tie, with no visible tie context.

## Questions to Consider

- What should the owner decide in the first 10 seconds: staffing, replenishment, or sales review?
- Would one selected reporting period across every metric make decisions clearer than the current mixed scopes?
