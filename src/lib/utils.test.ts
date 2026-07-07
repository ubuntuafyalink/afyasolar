import { describe, it, expect } from 'vitest'
import { cn, formatCurrency } from './utils'

describe('formatCurrency', () => {
  it('formats whole amounts with thousands grouping and no decimals', () => {
    const s = formatCurrency(21900)
    expect(s).toContain('21,900')
    expect(s).not.toContain('.')
  })

  it('rounds fractional amounts to whole shillings', () => {
    expect(formatCurrency(1234.9)).toContain('1,235')
  })

  it('treats null and undefined as zero', () => {
    expect(formatCurrency(null)).toContain('0')
    expect(formatCurrency(undefined)).toContain('0')
  })

  it('returns a safe string for NaN', () => {
    expect(formatCurrency(NaN)).toBe('0 TZS')
  })
})

describe('cn', () => {
  it('merges conflicting tailwind classes, keeping the last', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('drops falsy values', () => {
    expect(cn('a', false as unknown as string, undefined, 'c')).toBe('a c')
  })
})
