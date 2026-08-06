/**
 * A blinking caret shown at the end of streaming text to convey "AI typing".
 * Hidden from assistive tech (the streamed text itself is announced).
 */
export function TypingCursor() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-primary align-middle"
    />
  )
}
