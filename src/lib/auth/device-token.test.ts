import { describe, it, expect } from "vitest"
import { extractBearerToken, isValidDeviceToken } from "./device-token"

describe("extractBearerToken", () => {
  it("extracts the token from a Bearer header (case-insensitive)", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123")
    expect(extractBearerToken("bearer xyz")).toBe("xyz")
    expect(extractBearerToken("Bearer   spaced-token  ")).toBe("spaced-token")
  })

  it("returns null for missing or malformed headers", () => {
    expect(extractBearerToken(null)).toBeNull()
    expect(extractBearerToken(undefined)).toBeNull()
    expect(extractBearerToken("")).toBeNull()
    expect(extractBearerToken("Basic abc")).toBeNull()
    expect(extractBearerToken("abc123")).toBeNull()
  })
})

describe("isValidDeviceToken", () => {
  it("accepts a matching token", () => {
    expect(isValidDeviceToken("Bearer secret-token", "secret-token")).toBe(true)
  })

  it("rejects a wrong token", () => {
    expect(isValidDeviceToken("Bearer wrong", "secret-token")).toBe(false)
  })

  it("fails closed when header or expected token is missing", () => {
    expect(isValidDeviceToken(null, "secret-token")).toBe(false)
    expect(isValidDeviceToken("Bearer secret-token", undefined)).toBe(false)
    expect(isValidDeviceToken("Bearer secret-token", "")).toBe(false)
    expect(isValidDeviceToken(null, null)).toBe(false)
  })
})
