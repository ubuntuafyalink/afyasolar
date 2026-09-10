import { describe, it, expect, vi, afterEach } from "vitest"
import { modelLabel, fetchAiForecast } from "./ai-forecast-service"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("modelLabel", () => {
  it("falls back to a generic label when no model is reported", () => {
    expect(modelLabel(undefined)).toBe("Chronos")
    expect(modelLabel("")).toBe("Chronos")
  })

  it("recognises the AutoGluon model names the service actually returns", () => {
    expect(modelLabel("ChronosFineTuned[bolt_small]")).toBe("Chronos fine-tuned")
    expect(modelLabel("ChronosZeroShot[bolt_small]")).toBe("Chronos zero-shot")
    expect(modelLabel("SeasonalNaive")).toBe("Seasonal baseline")
  })

  it("matches case-insensitively", () => {
    expect(modelLabel("chronosfinetuned")).toBe("Chronos fine-tuned")
    expect(modelLabel("SEASONALNAIVE")).toBe("Seasonal baseline")
  })

  it("passes through an unrecognised model name rather than hiding it", () => {
    expect(modelLabel("SomeFutureModel")).toBe("SomeFutureModel")
  })
})

describe("fetchAiForecast", () => {
  function stubFetch(response: { ok: boolean; status?: number; body: unknown }) {
    const spy = vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status ?? 200,
      json: async () => response.body,
    })
    vi.stubGlobal("fetch", spy)
    return spy
  }

  it("defaults to the monthly horizon and omits optional parameters", async () => {
    const spy = stubFetch({ ok: true, body: { location_id: "ea_m6_39" } })
    await fetchAiForecast({ lat: -6.79, lon: 39.21 })

    const url = spy.mock.calls[0][0] as string
    expect(url).toContain("/api/ai/forecast?")
    const params = new URLSearchParams(url.split("?")[1])
    expect(params.get("lat")).toBe("-6.79")
    expect(params.get("lon")).toBe("39.21")
    expect(params.get("horizon")).toBe("monthly")
    expect(params.has("system_kw")).toBe(false)
    expect(params.has("months")).toBe(false)
  })

  it("forwards the optional system size and window when supplied", async () => {
    const spy = stubFetch({ ok: true, body: {} })
    await fetchAiForecast({ lat: 1, lon: 2, horizon: "daily", systemKw: 5.5, months: 12 })

    const params = new URLSearchParams((spy.mock.calls[0][0] as string).split("?")[1])
    expect(params.get("horizon")).toBe("daily")
    expect(params.get("system_kw")).toBe("5.5")
    expect(params.get("months")).toBe("12")
  })

  it("sends zero values instead of dropping them as falsy", async () => {
    const spy = stubFetch({ ok: true, body: {} })
    await fetchAiForecast({ lat: 0, lon: 0, systemKw: 0, months: 0 })

    const params = new URLSearchParams((spy.mock.calls[0][0] as string).split("?")[1])
    expect(params.get("system_kw")).toBe("0")
    expect(params.get("months")).toBe("0")
  })

  it("surfaces the service's error message on a failed response", async () => {
    stubFetch({ ok: false, status: 503, body: { error: { message: "model not loaded" } } })
    await expect(fetchAiForecast({ lat: 1, lon: 2 })).rejects.toThrow("model not loaded")
  })

  it("falls back to the status code when the error body is unusable", async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json")
      },
    })
    vi.stubGlobal("fetch", spy)
    await expect(fetchAiForecast({ lat: 1, lon: 2 })).rejects.toThrow("AI forecast failed (502)")
  })

  it("returns the parsed forecast on success", async () => {
    stubFetch({ ok: true, body: { location_id: "ea_m6_39", horizon: "monthly" } })
    const out = await fetchAiForecast({ lat: -6.79, lon: 39.21 })
    expect(out.location_id).toBe("ea_m6_39")
    expect(out.horizon).toBe("monthly")
  })
})
