import { z } from 'zod'
import type { DeviceTelemetry } from '@/lib/db/schema-telemetry'

/**
 * Device → ingestion JSON contract (spec §8.1). This is the minimal, versioned
 * payload an inverter cloud adapter or local Modbus/ESP32 gateway posts to
 * /api/devices/telemetry authenticated with a device token (not a web session).
 * Additive changes only.
 *
 *   { facility_id, ts, load_w, pv_w, batt_v, batt_soc, grid_present, temp_c }
 *
 * device_id is optional (the §8.1 contract is per-facility); when omitted a
 * stable gateway device id is derived as `gw-<facility_id>`.
 */
export const deviceGatewayContractSchema = z.object({
  facility_id: z.string().min(1, 'facility_id is required'),
  /** ISO-8601 datetime string or epoch milliseconds. */
  ts: z.union([z.string().min(1), z.number().int().nonnegative()]),
  device_id: z.string().min(1).optional(),
  load_w: z.number().min(0).max(1_000_000).optional(),
  pv_w: z.number().min(0).max(1_000_000).optional(),
  batt_v: z.number().min(0).max(1000).optional(),
  batt_soc: z.number().min(0).max(100).optional(),
  grid_present: z.boolean().optional(),
  temp_c: z.number().min(-40).max(120).optional(),
})

export type DeviceGatewayContract = z.infer<typeof deviceGatewayContractSchema>

/** Parse the contract `ts` (ISO string or epoch ms) into a Date. */
export function parseContractTs(ts: string | number): Date {
  return typeof ts === 'number' ? new Date(ts) : new Date(ts)
}

/**
 * Map a validated gateway contract to a device_telemetry insert row. Pure and
 * unit-tested. pv_w (instantaneous PV watts) is stored as kW in solarGeneration;
 * grid_present toggles gridStatus. Rows are labeled firmwareVersion "gateway".
 */
export function mapGatewayContractToTelemetry(
  c: DeviceGatewayContract,
  id: string,
): DeviceTelemetry {
  const deviceId = c.device_id ?? `gw-${c.facility_id}`
  return {
    id,
    deviceId,
    facilityId: c.facility_id,
    timestamp: parseContractTs(c.ts),
    power: c.load_w != null ? c.load_w.toFixed(2) : undefined,
    solarGeneration: c.pv_w != null ? (c.pv_w / 1000).toFixed(3) : undefined,
    batteryVoltage: c.batt_v != null ? c.batt_v.toFixed(2) : undefined,
    batteryLevel: c.batt_soc != null ? c.batt_soc.toFixed(2) : undefined,
    temperature: c.temp_c != null ? c.temp_c.toFixed(2) : undefined,
    gridStatus: c.grid_present === false ? 'disconnected' : 'connected',
    deviceStatus: 'normal',
    firmwareVersion: 'gateway',
    location: 'gateway',
  }
}

/**
 * Schema for validating incoming telemetry data from devices
 */
export const telemetrySchema = z.object({
  // Device identification
  deviceId: z.string().uuid('Invalid device ID format'),
  
  // Timestamp
  timestamp: z.string().datetime('Invalid timestamp format'),
  
  // Electrical measurements (optional as not all devices provide all metrics)
  voltage: z.number().min(0).max(500).optional(),
  current: z.number().min(0).max(100).optional(),
  power: z.number().min(0).optional(),
  energy: z.number().min(0).optional(),
  frequency: z.number().min(45).max(65).optional(),
  
  // Solar specific metrics
  solarGeneration: z.number().min(0).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  batteryVoltage: z.number().min(0).max(50).optional(),
  temperature: z.number().min(-20).max(80).optional(),
  
  // System status
  gridStatus: z.enum(['connected', 'disconnected', 'backup', 'unknown']).optional(),
  deviceStatus: z.enum(['normal', 'warning', 'error', 'maintenance', 'offline']).optional(),
  signalStrength: z.number().min(-120).max(0).optional(), // RSSI in dBm
  uptime: z.number().min(0).optional(),
  
  // Performance metrics
  efficiency: z.number().min(0).max(100).optional(),
  powerFactor: z.number().min(-1).max(1).optional(),
  
  // Alerts and errors
  alertCode: z.string().max(50).optional(),
  alertMessage: z.string().max(500).optional(),
  
  // Metadata
  firmwareVersion: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
})

/**
 * Schema for device health updates
 */
export const deviceHealthSchema = z.object({
  deviceId: z.string().uuid(),
  onlineStatus: z.boolean(),
  lastSeen: z.string().datetime(),
  efficiency: z.number().min(0).max(100).optional(),
  batteryHealth: z.number().min(0).max(100).optional(),
  temperatureAvg: z.number().min(-20).max(80).optional(),
  errorCount: z.number().min(0).optional(),
  warningCount: z.number().min(0).optional(),
  maintenanceDue: z.boolean().optional(),
  firmwareVersion: z.string().max(50).optional(),
})

/**
 * Schema for device alerts
 */
export const deviceAlertSchema = z.object({
  deviceId: z.string().uuid(),
  facilityId: z.string().uuid(),
  alertType: z.enum(['error', 'warning', 'info', 'maintenance']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  code: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  threshold: z.number().optional(),
  actualValue: z.number().optional(),
  alertData: z.string().optional(), // JSON string
})

/**
 * Schema for device performance analytics
 */
export const performanceAnalyticsSchema = z.object({
  deviceId: z.string().uuid(),
  facilityId: z.string().uuid(),
  period: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  totalEnergy: z.number().min(0).optional(),
  solarEnergy: z.number().min(0).optional(),
  gridEnergy: z.number().min(0).optional(),
  avgPower: z.number().min(0).optional(),
  peakPower: z.number().min(0).optional(),
  efficiency: z.number().min(0).max(100).optional(),
  uptime: z.number().min(0).optional(),
  downtime: z.number().min(0).optional(),
  availability: z.number().min(0).max(100).optional(),
  avgTemperature: z.number().min(-20).max(80).optional(),
  maxTemperature: z.number().min(-20).max(80).optional(),
  minTemperature: z.number().min(-20).max(80).optional(),
  costSavings: z.number().min(0).optional(),
  co2Avoided: z.number().min(0).optional(),
  dataPoints: z.number().min(0).optional(),
  dataQuality: z.number().min(0).max(100).optional(),
})

/**
 * Schema for telemetry query parameters
 */
export const telemetryQuerySchema = z.object({
  deviceId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(1000)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  deviceStatus: z.enum(['normal', 'warning', 'error', 'maintenance', 'offline']).optional(),
  period: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
})

/**
 * Schema for device registration/claiming
 */
export const deviceRegistrationSchema = z.object({
  serialNumber: z.string().min(5).max(50),
  deviceType: z.enum(['eyedro', 'afyasolar', 'generic', 'smart_meter']),
  model: z.string().min(1).max(100).optional(),
  manufacturer: z.string().min(1).max(100).optional(),
  firmwareVersion: z.string().max(50).optional(),
  installLocation: z.string().max(200).optional(),
  coordinates: z.string().max(50).optional(), // GPS coordinates
  facilityId: z.string().uuid().optional(),
})

// Export types for use in components
export type TelemetryData = z.infer<typeof telemetrySchema>
export type DeviceHealthData = z.infer<typeof deviceHealthSchema>
export type DeviceAlertData = z.infer<typeof deviceAlertSchema>
export type PerformanceAnalyticsData = z.infer<typeof performanceAnalyticsSchema>
export type TelemetryQueryParams = z.infer<typeof telemetryQuerySchema>
export type DeviceRegistrationData = z.infer<typeof deviceRegistrationSchema>
