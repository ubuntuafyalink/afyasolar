import { describe, it, expect, vi } from "vitest"
import {
  resolveSmsChannel,
  SmartSmsAdapter,
  AfricasTalkingAdapter,
} from "./channel"

describe("resolveSmsChannel", () => {
  it("selects SmartSMS by default and for unknown providers", () => {
    expect(resolveSmsChannel("smartsms").name).toBe("smartsms")
    expect(resolveSmsChannel("unknown-provider").name).toBe("smartsms")
    expect(resolveSmsChannel("").name).toBe("smartsms")
  })

  it("selects Africa's Talking when requested", () => {
    expect(resolveSmsChannel("africastalking").name).toBe("africastalking")
    expect(resolveSmsChannel("AfricasTalking").name).toBe("africastalking") // case-insensitive
  })
})

describe("SmartSmsAdapter", () => {
  it("delegates to the injected sender and tags the provider", async () => {
    const sender = vi.fn().mockResolvedValue({ success: true, message: "SMS sent successfully" })
    const adapter = new SmartSmsAdapter(sender)
    const result = await adapter.send({ to: "0712345678", message: "hi" })
    expect(sender).toHaveBeenCalledWith({ to: "0712345678", message: "hi" })
    expect(result).toEqual({ success: true, message: "SMS sent successfully", provider: "smartsms" })
  })

  it("passes through a failure result", async () => {
    const sender = vi.fn().mockResolvedValue({ success: false, message: "bad number" })
    const result = await new SmartSmsAdapter(sender).send({ to: "x", message: "hi" })
    expect(result.success).toBe(false)
    expect(result.provider).toBe("smartsms")
  })
})

describe("AfricasTalkingAdapter (skeleton)", () => {
  it("is not configured without credentials and throws a clear error on send", async () => {
    const adapter = new AfricasTalkingAdapter({})
    expect(adapter.isConfigured()).toBe(false)
    await expect(adapter.send({ to: "0712345678", message: "hi" })).rejects.toThrow(/not configured/i)
  })

  it("reports configured with credentials but is still an unimplemented skeleton", async () => {
    const adapter = new AfricasTalkingAdapter({ username: "u", apiKey: "k" })
    expect(adapter.isConfigured()).toBe(true)
    await expect(adapter.send({ to: "0712345678", message: "hi" })).rejects.toThrow(/not implemented/i)
  })
})
