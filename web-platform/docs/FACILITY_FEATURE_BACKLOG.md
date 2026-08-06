# Facility Dashboard Feature Backlog (Groups A–L)

> Additive-only, facility-side implementation of the CEO spec
> (`AFYASOLAR_INTELLIGENCE_DEVELOPER_SPEC_v3.1.pdf`, Parts 7–15). Each increment
> is self-contained, independently verifiable, and committed on its own. No
> existing facility behavior, route, API, auth, proxy, or DB schema is modified.

## Locked decisions (override the spec where noted)
- **Desktop-first, not mobile-first.** New "Today/Fridge/Power/Reports" are new
  sidebar sections; a responsive bottom nav is an optional `<lg`-only enhancement.
- **English only.** No Swahili, no i18n framework. SALAMA/HATARI → **SAFE/DANGER**;
  Leo/Friji/Umeme/Ripoti → **Today/Fridge/Power/Reports**. L51 is descoped.
- **framer-motion** re-added (`LazyMotion` + reduced-motion guard, ≤300ms).
- **`[data]` features** are UI shells fed by `src/lib/dashboard/facility-demo-data.ts`
  with a visible "Demo data" badge + `// TODO: wire real source`. No live
  DB/payment/SMS/email calls.

## Integration & safety pattern
- New components in `src/components/dashboard/facility/`, lazy-mounted via
  `next/dynamic` in [facility-dashboard-content.tsx](../src/components/dashboard/facility-dashboard-content.tsx).
- New sections gated by `FACILITY_V2_ENABLED` in
  `src/lib/dashboard/facility-features.ts` (default `true` on the `facility-features`
  branch).
- Adding a section = 1 `NavSection` union entry + 1 nav item + 1 render branch;
  existing branches untouched.
- Verify each increment with `npm run type-check` + `npm run lint`
  (+ `npm run build` periodically). Never run mutating/dev flows. Commit per
  increment (conventional commits).

---

## Increment 0 — Foundation
Branch + framer-motion + `facility-features.ts` flag + `facility-demo-data.ts`
(deterministic, mirrors `src/lib/efficiency-climate/simulation.ts`) +
`demo-data-badge.tsx` + `lazy-motion-provider.tsx`.

## A. Today home (new section `today`)
- **A1** 3-card glanceable home (fridge / power / tasks) + nav section
- **A2** Fridge hero card (SAFE/DANGER, temp, last-checked)
- **A3** Power-today card (expected hours, battery %, expected solar)
- **A4** Pending-tasks card
- **A5** Optional responsive bottom nav (`<lg` only)

## B. Cold chain (new section `fridge`)
- **B6** 24h temp chart w/ 2–8°C safe band
- **B7** Events list (door/excursion/manual/maintenance)
- **B8** "Measure temp now" camera/OCR capture (OCR stubbed)
- **B9** "Problem with fridge" guided troubleshooting
- **B10** `[data]` Predictive cold-chain failure alert

## C. Power (new section `power`)
- **C11** Current power-source indicator
- **C12** Power-flow (Sankey) diagram
- **C13** 24h stacked-area chart by source
- **C14** 12h forecast (source + battery %)
- **C15** Service-hours-remaining estimate
- **C16** `[data]` 7-day solar generation forecast

## D. Reports (new section `reports`)
- **D17** Daily report form (patients, vaccinated, deliveries, problem note)
- **D18** One-field-at-a-time stepper + voice-note recorder
- **D19** `[data]` Offline-first submit (IndexedDB) + sync + DHIS2 queue stub

## E. Energy efficiency & audit (enhance `energy-efficiency`)
- **E20** (exists) Device-and-load builder
- **E21** (exists) MEU + sizing engine
- **E22** 15-parameter Minimum Viable Audit form
- **E23** Three-output report (waste / cash saved / cost-per-service-hour)
- **E24** `[data]` Bill/receipt photo OCR
- **E25** `[data]` Eco-Pulse EPI feedback

## F. Climate resilience CRiPHC v2.0 (enhance `climate-resilience`)
- **F26** Upgrade assessment to 7 dimensions (add Workforce + WASH)
- **F27** (exists) 5-point scoring + evidence capture
- **F28** Results & adaptation plan (RCS + tier + top risks)
- **F29** `[data]` Quantitative hazard score (NASA POWER/ERA5)
- **F30** `[data]` Resi-Health Grid CVI (0–100, by hazard, 2030/2050)

## G. Adaptation plan & recommendations
- **G31** Ranked recs w/ expected resilience gain + cost
- **G32** ECM-catalogue actions
- **G33** Localized plan

## H. Financing & payments (enhance `package-selection` / `bills-payment`)
- **H34** (exists) Package selection
- **H35** EaaS contract view (fee, saving, break-even, asset-transfer)
- **H36** (exists) Invoice request
- **H37** (exists) Payment history / mobile money / PAYG
- **H38** (exists) Carbon credits
- **H39** `[data]` Revenue-Linked Smart-Splitter view
- **H40** `[data]` NHIF Receivables Escrow status

## I. Alerts & notifications (enhance `notifications`)
- **I41** (exists) Notifications center
- **I42** `[data]` Heatwave alert
- **I43** `[data]` Flood alert
- **I44** `[data]` Outage-probability alert
- **I45** `[data]` Climate-disease alert
- **I46** `[data]` Daily 6:30am status push (WhatsApp+SMS) — surface only

## J. AI co-pilot & forecasts (new section `assistant`)
- **J47** `[data]` GenAI co-pilot (English)
- **J48** `[data]` "What-if" simulation

## K. Channels (new section `channels`)
- **K49** `[data]` WhatsApp conversational preview
- **K50** `[data]` SMS/USSD fallback preview

## L. Cross-cutting
- **L51** ~~Swahili default + EN toggle~~ — DESCOPED (English-only)
- **L52** Offline + PWA — satisfied by the existing PWA (`public/manifest.json` +
  `public/sw.js`, wired in `app/layout.tsx`): new sections live on the already-
  cached `/dashboard/facility` route, and Reports adds genuine IndexedDB offline
  data entry. No service-worker changes (avoids touching existing behavior).
- **L53** Accessibility WCAG 2.2 AA — explicit `FOCUS_RING` (`facility-ui.ts`)
  on all custom interactive elements; ≥44px tap targets; aria labels/roles;
  reduced-motion honored via `MotionConfig`.
- **L54** Desktop-first responsive — new sections use desktop-first grids
  (`lg:grid-cols-*`, stacked on mobile); the bottom nav is `<lg`-only.

---

## Verification (per increment)
1. `npm run type-check` 2. `npm run lint` 3. `npm run build` (periodic)
4. Read-only check that existing sections are unchanged (no mutations)
5. Conventional commit 6. 2-line summary before next increment.
