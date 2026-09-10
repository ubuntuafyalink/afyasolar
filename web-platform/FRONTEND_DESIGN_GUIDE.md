# Frontend Design Guide — UI/UX standards

> **For all contributors.** These standards apply to any UI/UX work on AfyaSolar
> Intelligence: designing, building, refactoring, or reviewing components, pages,
> layouts, animation, colour, or typography.
>
> Read alongside [`TECH_STACK.md`](docs/internal/TECH_STACK.md) for engineering rules.

---

## Design constraints that drive every decision

AfyaSolar runs in rural Tanzanian health facilities. Three constraints outrank
aesthetics, and every UI decision should be checked against them:

| Constraint | What it means in practice |
|---|---|
| **Low connectivity** | Assume slow 3G and intermittent connections. Minimise client JS, lazy-load heavy UI (maps, charts, animation bundles), and make loading and offline states first-class rather than afterthoughts. |
| **Low-end devices** | Assume weak Android hardware. Prefer transform and opacity animations, avoid layout thrashing, and keep bundle growth deliberate. |
| **Clinical use** | Staff read these screens while doing other work. Favour legibility and unambiguous state over decoration. Never gate information behind an animation or a hover. |

## Non-negotiables

- **Accessibility — WCAG 2.1 AA.** Keyboard and screen-reader paths must work.
  Respect `prefers-reduced-motion`. Colour is never the only carrier of meaning.
- **Performance budget.** Minimise client JavaScript. Keep pages as Server
  Components where possible, and push interactivity into small client components.
- **Internationalisation.** Every user-facing string goes through
  `src/lib/i18n/dictionaries.ts`. Swahili first: no hard-coded English in
  components.
- **Consistency.** Tailwind 4 tokens plus shadcn and Radix primitives. Do not
  introduce competing UI libraries.
- **Honest data.** Any surface rendering demo or simulated values must show
  `<DemoDataBadge />`. See `src/components/ui/demo-data-badge.tsx`.

---

## Animation — Framer Motion

Installed as a project dependency (`framer-motion`, v12). Import the modern API:
`import { motion, AnimatePresence } from 'framer-motion'`.

- **App Router.** Framer Motion is client-side, so any file using it must start with
  `'use client'`. Keep animated pieces in small client components.
- **Payload.** Use `LazyMotion` with a feature bundle, or import only what you use.
  The project provides `src/components/motion/lazy-motion-provider.tsx` and shared
  variants in `src/components/motion/variants.ts` — prefer these over ad-hoc values.
- **Restraint.** Keep animations short and purposeful. This is a healthcare tool,
  not a showcase.
- **Reduced motion.** Use the `useReducedMotion()` hook to disable or soften
  non-essential motion.

---

## Workflow for any UI task

1. **Decide.** Confirm layout, spacing, colour and typography against the existing
   Tailwind tokens and shadcn primitives before writing code. Reuse an existing
   component if one fits; the component inventory lives in `src/components/ui/`.
2. **Build.** Compose from shadcn and Radix primitives. New primitives need a reason.
3. **Animate.** Framer Motion, minimal and reduced-motion-aware, behind `'use client'`.
4. **Verify.** Accessibility (keyboard, contrast, screen reader), performance budget
   on a throttled connection, translatable strings, no secrets, no dead dependencies.

## Tooling

Use whatever editor and assistant you prefer. This project mandates no proprietary
design tool, plugin, or paid service — anything required to contribute is either in
the repository or installable from `package.json`.

---

*If any guidance here conflicts with `TECH_STACK.md`, `TECH_STACK.md` wins for
engineering rules and this file wins for design workflow.*
