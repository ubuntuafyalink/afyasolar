import { describe, it, expect } from 'vitest'
import { projectCvi, projectCviFromTrend, CVI_2050_BUMP } from './nasa-power'

const base = { composite: 40, byHazard: { flood: 40, drought: 40, heat: 40, storm: 40 } }

describe('projectCvi (flat fallback)', () => {
  it('returns the baseline unchanged for 2030', () => {
    expect(projectCvi(base, 2030)).toEqual(base)
  })

  it('bumps each hazard by the 2050 constant (clamped to 100)', () => {
    const p = projectCvi(base, 2050)
    expect(p.byHazard.flood).toBe(40 + CVI_2050_BUMP)
    expect(p.composite).toBe(40 + CVI_2050_BUMP)
  })

  it('never exceeds 100', () => {
    const hot = { composite: 95, byHazard: { flood: 95, drought: 95, heat: 95, storm: 95 } }
    expect(projectCvi(hot, 2050).byHazard.heat).toBeLessThanOrEqual(100)
  })
})

describe('projectCviFromTrend', () => {
  const rising = [
    { year: 2020, flood: 30, drought: 30, heat: 30, storm: 30 },
    { year: 2021, flood: 35, drought: 35, heat: 35, storm: 35 },
    { year: 2022, flood: 40, drought: 40, heat: 40, storm: 40 },
  ]

  it('extrapolates a rising trend and stays within 0..100', () => {
    const p = projectCviFromTrend(rising as never, 2030)
    expect(p.method).toBe('trend-extrapolation')
    expect(p.horizonYears).toBe(2030 - 2022)
    expect(p.composite).toBeGreaterThanOrEqual(40)
    expect(p.composite).toBeLessThanOrEqual(100)
    for (const v of Object.values(p.byHazard)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
  })

  it('handles an empty trend without throwing', () => {
    const p = projectCviFromTrend([] as never, 2050)
    expect(p.composite).toBe(0)
  })
})
