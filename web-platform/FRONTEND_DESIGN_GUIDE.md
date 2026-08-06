# Frontend Design Guide — Skills & Tooling for UI/UX Work

> **For all contributors and AI agents.** When doing *any* UI/UX work on AfyaSolar Intelligence —
> designing, building, refactoring, or reviewing components, pages, layouts, animation, color, or
> typography — you **must** use the three tools below. The current v1 prototype does **not** follow
> modern UI/UX practices; v2 refactors the frontend using these.
>
> Read alongside [`TECH_STACK.md`](TECH_STACK.md) (the stack & standards) and
> [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) (what/why). **Last updated:** 2026-05-29

---

## The three tools (and when to use each)

| Tool | Type | Use it for |
|---|---|---|
| **ui-ux-pro-max** | Claude Code Skill (installed globally) | Design *decisions*: style/system selection, color palettes, font pairings, layout, spacing, accessibility & UX rules, chart selection. Invoke it **before and during** any UI work. |
| **Magic (@21st-dev)** | MCP server (user scope) | Generating/refining *concrete components* and finding inspiration & logos. Use to scaffold high-quality components, then adapt to our stack & standards. |
| **Framer Motion** | npm library (`framer-motion`, project dep) | All animation & micro-interactions: transitions, gestures, scroll/enter animations, layout animations. |

---

## 1. ui-ux-pro-max (Skill)

- **Status:** installed globally at `~/.claude/skills/ui-ux-pro-max`. Available in every session.
- **How to use:** invoke the `ui-ux-pro-max` skill at the start of any design task (and when
  choosing palettes, typography, or reviewing UI). It provides a searchable database of 67 styles,
  96 palettes, 57 font pairings, 99 UX guidelines, and 25 chart types, with **priority-ordered**
  rules (Accessibility and Touch/Interaction are CRITICAL — honor them first).
- **Mandate for this project:** treat its **Accessibility** and **Performance** rules as
  non-negotiable — they map directly to our rural-Tanzania, low-connectivity, WCAG 2.1 AA goals
  (see `TECH_STACK.md` §6).

## 2. Magic MCP (@21st-dev) — component generation

- **Status:** configured at **user scope** (`claude mcp add magic --scope user ...`), connected.
  The API key lives in the user's global Claude config — **never** commit it or paste it into the
  repo, docs, or `.env`.
- **How to use:** the Magic tools appear as `magic`/`21st`-prefixed MCP tools (discover them via
  ToolSearch, e.g. component builder, component refiner, inspiration, logo search). Use Magic to
  scaffold a high-quality starting point, then **always adapt the output** to our conventions:
  shadcn/Radix components, Tailwind tokens, `framer-motion` for animation, i18n strings (no
  hard-coded English), and the performance budget.
- **Guardrail:** Magic output is a starting point, not final code. Review for accessibility,
  bundle size, and dead dependencies before keeping it.

## 3. Framer Motion — animation

- **Status:** installed as a project dependency (`framer-motion`, v12). Import the modern API from
  `framer-motion` (e.g. `import { motion, AnimatePresence } from 'framer-motion'`).
- **Next.js App Router:** Framer Motion is client-side. Any file using it must start with
  `'use client'`. Keep animated pieces in small client components; keep pages as Server Components
  where possible so we don't ship extra JS.
- **Performance (rural / low-end devices) — required practices:**
  - Use **`LazyMotion`** with a feature bundle to cut payload, or import only what you use.
  - Prefer transform/opacity-based animations (GPU-friendly); avoid animating layout-thrashing
    properties.
  - Keep animations short and purposeful; this is a healthcare tool, not a showcase.
- **Accessibility — required:** honor reduced-motion. Use the `useReducedMotion()` hook (or
  `prefers-reduced-motion`) to disable/soften non-essential motion. Never gate information behind
  an animation.

---

## Workflow for any UI task (follow this order)

1. **Decide** with `ui-ux-pro-max` — confirm style, palette, typography, layout, and the relevant
   accessibility/UX rules for the component or page.
2. **Scaffold** with **Magic MCP** when you need a concrete component quickly — then refit to our
   stack (shadcn/Radix + Tailwind tokens).
3. **Animate** with **Framer Motion** — minimal, purposeful, reduced-motion-aware, `'use client'`.
4. **Verify** against `TECH_STACK.md` §6: accessibility (WCAG 2.1 AA), performance budget (slow
   3G / low-end Android), translatable strings, no secrets, no dead deps.

## Non-negotiables (project-specific)

- **Accessibility first** — WCAG 2.1 AA. Keyboard + screen-reader paths must work. Respect
  reduced-motion.
- **Performance budget** — assume bad networks and weak devices. Minimize client JS; lazy-load
  heavy UI (maps, charts, animation bundles).
- **Internationalization** — every user-facing string goes through next-intl (Swahili first). No
  hard-coded English in components.
- **Consistency** — Tailwind 4 tokens + shadcn/Radix primitives. Don't introduce competing UI
  libraries.

---

*If any guidance here conflicts with `TECH_STACK.md`, `TECH_STACK.md` wins for engineering rules
and this file wins for design-tooling workflow.*
