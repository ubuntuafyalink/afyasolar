/**
 * Feature flags for the additive facility "v2" experience (CEO spec Parts 7–15).
 *
 * The new facility sections (Today, Fridge, Power, Reports, Assistant, Channels)
 * and enhancements are gated here so a half-finished backlog never degrades the
 * live facility dashboard. Toggle off by setting NEXT_PUBLIC_FACILITY_V2=0.
 *
 * Existing sections are unaffected by this flag.
 */
export const FACILITY_V2_ENABLED = process.env.NEXT_PUBLIC_FACILITY_V2 !== "0"
