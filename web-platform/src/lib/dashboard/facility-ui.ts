/**
 * Shared UI helpers for the additive facility "v2" sections.
 */

/**
 * Consistent, clearly-visible keyboard focus indicator (WCAG 2.2 AA) for custom
 * interactive elements that don't use the shared <Button> component.
 */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/**
 * Maps a 0100 score to a status bar colour token. Shared across facility "v2"
 * score visualisations so the green/amber/red thresholds stay consistent.
 */
export function scoreBarColor(score: number): string {
  if (score >= 70) return "bg-success"
  if (score >= 45) return "bg-warning"
  return "bg-destructive"
}
