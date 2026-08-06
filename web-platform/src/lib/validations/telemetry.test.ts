import { describe, it, expect } from "vitest"
import {
  deviceGatewayContractSchema,
  parseContractTs,
  mapGatewayContractToTelemetry,
} from "./telemetry"

describe("deviceGatewayContractSchema (§8.1)", () => {
  it("accepts a valid gateway payload", () => {
    const r = deviceGatewayContractSchema.safeParse({
      facility_id: "fac-1",
      ts: "2026-07-29T12:00:00.000Z",
      load_w: 1200,
      pv_w: 3400,
      batt_v: 51.2,
      batt_soc: 82,
      grid_present: true,
      temp_c: 31.5,
    })
    expect(r.success).toBe(true)
  })

  it("accepts epoch-millis ts and omitted optional fields", () => {
    const r = deviceGatewayContractSchema.safeParse({ facility_id: "fac-1", ts: 1_753_790_400_000 })
    expect(r.success).toBe(true)
  })

  it("rejects a payload missing facility_id", () => {
    const r = deviceGatewayContractSchema.safeParse({ ts: "2026-07-29T12:00:00.000Z" })
    expect(r.success).toBe(false)
  })

  it("rejects out-of-range values", () => {
    const r = deviceGatewayContractSchema.safeParse({
      facility_id: "fac-1",
      ts: "2026-07-29T12:00:00.000Z",
      batt_soc: 150,
    })
    expect(r.success).toBe(false)
  })
})

describe("parseContractTs", () => {
  it("parses ISO strings and epoch millis to the same instant", () => {
    const iso = parseContractTs("2026-07-29T12:00:00.000Z")
    const epoch = parseContractTs(iso.getTime())
    expect(epoch.getTime()).toBe(iso.getTime())
  })

  it("produces an invalid Date for garbage input (caller must guard)", () => {
    expect(Number.isNaN(parseContractTs("not-a-date").getTime())).toBe(true)
  })
})

describe("mapGatewayContractToTelemetry", () => {
  it("maps contract fields to a telemetry row and derives a gateway device id", () => {
    const row = mapGatewayContractToTelemetry(
      {
        facility_id: "fac-1",
        ts: "2026-07-29T12:00:00.000Z",
        load_w: 1200,
        pv_w: 3400,
        batt_v: 51.2,
        batt_soc: 82,
        grid_present: false,
        temp_c: 31.5,
      },
      "row-1",
    )
    expect(row.deviceId).toBe("gw-fac-1") // derived when device_id omitted
    expect(row.facilityId).toBe("fac-1")
    expect(row.power).toBe("1200.00")
    expect(row.solarGeneration).toBe("3.400") // pv_w -> kW
    expect(row.batteryLevel).toBe("82.00")
    expect(row.gridStatus).toBe("disconnected") // grid_present false
    expect(row.firmwareVersion).toBe("gateway")
  })

  it("uses an explicit device_id when provided and defaults grid to connected", () => {
    const row = mapGatewayContractToTelemetry(
      { facility_id: "fac-1", ts: "2026-07-29T12:00:00.000Z", device_id: "inv-9" },
      "row-2",
    )
    expect(row.deviceId).toBe("inv-9")
    expect(row.gridStatus).toBe("connected")
    expect(row.power).toBeUndefined()
  })
})
