import { describe, it, expect, afterEach } from "vitest"
import { isManagementPanelUser, managementPanelEmail } from "./management-panel"

const ORIGINAL = process.env.MANAGEMENT_PANEL_EMAIL
const ORIGINAL_PUBLIC = process.env.NEXT_PUBLIC_MANAGEMENT_PANEL_EMAIL

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.MANAGEMENT_PANEL_EMAIL
  else process.env.MANAGEMENT_PANEL_EMAIL = ORIGINAL
  if (ORIGINAL_PUBLIC === undefined) delete process.env.NEXT_PUBLIC_MANAGEMENT_PANEL_EMAIL
  else process.env.NEXT_PUBLIC_MANAGEMENT_PANEL_EMAIL = ORIGINAL_PUBLIC
})

describe("managementPanelEmail", () => {
  it("falls back to the built-in address when nothing is configured", () => {
    delete process.env.MANAGEMENT_PANEL_EMAIL
    delete process.env.NEXT_PUBLIC_MANAGEMENT_PANEL_EMAIL
    expect(managementPanelEmail()).toBe("services@ubuntuafyalink.co.tz")
  })

  it("lets a self-hosted deployment override it", () => {
    process.env.MANAGEMENT_PANEL_EMAIL = "ops@clinic.example"
    expect(managementPanelEmail()).toBe("ops@clinic.example")
  })

  it("prefers the server variable over the public one", () => {
    process.env.MANAGEMENT_PANEL_EMAIL = "server@example.org"
    process.env.NEXT_PUBLIC_MANAGEMENT_PANEL_EMAIL = "client@example.org"
    expect(managementPanelEmail()).toBe("server@example.org")
  })

  it("normalises case so configuration is not case-sensitive", () => {
    process.env.MANAGEMENT_PANEL_EMAIL = "Ops@Clinic.Example"
    expect(managementPanelEmail()).toBe("ops@clinic.example")
  })
})

describe("isManagementPanelUser", () => {
  it("rejects a missing address rather than matching an empty string", () => {
    expect(isManagementPanelUser(undefined)).toBe(false)
    expect(isManagementPanelUser(null)).toBe(false)
    expect(isManagementPanelUser("")).toBe(false)
  })

  it("matches the configured account regardless of case", () => {
    process.env.MANAGEMENT_PANEL_EMAIL = "ops@clinic.example"
    expect(isManagementPanelUser("ops@clinic.example")).toBe(true)
    expect(isManagementPanelUser("OPS@Clinic.Example")).toBe(true)
  })

  it("rejects any other account", () => {
    process.env.MANAGEMENT_PANEL_EMAIL = "ops@clinic.example"
    expect(isManagementPanelUser("someone.else@clinic.example")).toBe(false)
    expect(isManagementPanelUser("ops@clinic.example.attacker.test")).toBe(false)
  })
})
