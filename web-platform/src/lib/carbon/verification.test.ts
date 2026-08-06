import { describe, it, expect } from "vitest"
import {
  canTransition,
  formatCertificateId,
  CARBON_ACTION_TARGET,
  CARBON_ACTION_ALLOWED_FROM,
} from "./verification"

describe("carbon verification state machine", () => {
  it("maps each action to the status it moves the credit into", () => {
    expect(CARBON_ACTION_TARGET.verify).toBe("verified")
    expect(CARBON_ACTION_TARGET.certify).toBe("certified")
    expect(CARBON_ACTION_TARGET.reject).toBe("rejected")
  })

  it("allows verify only from pending", () => {
    expect(canTransition("pending", "verify")).toBe(true)
    expect(canTransition("verified", "verify")).toBe(false)
    expect(canTransition("certified", "verify")).toBe(false)
  })

  it("allows certify only from verified", () => {
    expect(canTransition("verified", "certify")).toBe(true)
    expect(canTransition("pending", "certify")).toBe(false)
  })

  it("allows reject from pending or verified, but not from a terminal state", () => {
    expect(canTransition("pending", "reject")).toBe(true)
    expect(canTransition("verified", "reject")).toBe(true)
    expect(canTransition("certified", "reject")).toBe(false)
    expect(canTransition("rejected", "reject")).toBe(false)
  })

  it("treats null/undefined/unknown current status as non-transitionable", () => {
    expect(canTransition(null, "verify")).toBe(false)
    expect(canTransition(undefined, "verify")).toBe(false)
    expect(canTransition("", "verify")).toBe(false)
    expect(canTransition("bogus", "verify")).toBe(false)
  })

  it("keeps the allowed-from table in sync with the reject fan-in", () => {
    expect(CARBON_ACTION_ALLOWED_FROM.reject).toEqual(["pending", "verified"])
  })
})

describe("formatCertificateId", () => {
  it("builds CC-<year>-<8 uppercase hex> from a uuid, stripping dashes", () => {
    expect(formatCertificateId(2026, "a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(
      "CC-2026-A1B2C3D4",
    )
  })

  it("uses fewer than 8 chars when the raw id is short", () => {
    expect(formatCertificateId(2025, "abc")).toBe("CC-2025-ABC")
  })
})
