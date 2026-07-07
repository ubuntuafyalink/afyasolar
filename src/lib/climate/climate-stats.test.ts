import { describe, it, expect } from 'vitest'
import { olsFit } from './climate-stats'

describe('olsFit', () => {
  it('recovers slope and intercept of a perfect line y = 2x + 1', () => {
    const fit = olsFit([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ])
    expect(fit.slope).toBeCloseTo(2, 6)
    expect(fit.intercept).toBeCloseTo(1, 6)
    expect(fit.stdErr).toBeCloseTo(0, 6)
  })

  it('returns slope 0 for a single point (uses its y as intercept)', () => {
    expect(olsFit([{ x: 5, y: 9 }])).toEqual({ slope: 0, intercept: 9, stdErr: 0 })
  })

  it('returns slope 0 when x has no variance', () => {
    expect(olsFit([{ x: 2, y: 1 }, { x: 2, y: 5 }]).slope).toBe(0)
  })

  it('computes a positive slope for a rising series', () => {
    const fit = olsFit([
      { x: 2020, y: 30 },
      { x: 2021, y: 35 },
      { x: 2022, y: 40 },
    ])
    expect(fit.slope).toBeGreaterThan(0)
  })
})
