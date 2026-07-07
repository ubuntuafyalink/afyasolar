import { describe, it, expect } from 'vitest'
import {
  sortNotifications,
  timeAgo,
  notificationTarget,
  type AdminNotification,
} from './notification-model'

const mk = (
  id: string,
  severity: AdminNotification['severity'],
  timestamp?: string,
): AdminNotification => ({
  id,
  severity,
  category: 'climate',
  title: id,
  message: '',
  timestamp,
})

describe('sortNotifications', () => {
  it('orders by severity, most urgent first', () => {
    const out = sortNotifications([mk('a', 'info'), mk('b', 'critical'), mk('c', 'medium'), mk('d', 'high')])
    expect(out.map((n) => n.id)).toEqual(['b', 'd', 'c', 'a'])
  })

  it('breaks ties by most recent timestamp', () => {
    const out = sortNotifications([
      mk('old', 'high', '2020-01-01T00:00:00Z'),
      mk('new', 'high', '2024-01-01T00:00:00Z'),
    ])
    expect(out.map((n) => n.id)).toEqual(['new', 'old'])
  })

  it('does not mutate the input array', () => {
    const input = [mk('a', 'info'), mk('b', 'critical')]
    const snapshot = input.map((n) => n.id)
    sortNotifications(input)
    expect(input.map((n) => n.id)).toEqual(snapshot)
  })
})

describe('timeAgo', () => {
  const now = Date.parse('2026-07-03T12:00:00Z')

  it('returns "" for missing or invalid timestamps', () => {
    expect(timeAgo(null, now)).toBe('')
    expect(timeAgo(undefined, now)).toBe('')
    expect(timeAgo('not-a-date', now)).toBe('')
  })

  it('formats minutes, hours and days', () => {
    expect(timeAgo('2026-07-03T11:30:00Z', now)).toBe('30m ago')
    expect(timeAgo('2026-07-03T09:00:00Z', now)).toBe('3h ago')
    expect(timeAgo('2026-06-30T12:00:00Z', now)).toBe('3d ago')
  })

  it('shows "just now" under a minute', () => {
    expect(timeAgo('2026-07-03T11:59:30Z', now)).toBe('just now')
  })
})

describe('notificationTarget', () => {
  it('maps climate to the climate-outlook section (facility-focusable)', () => {
    expect(notificationTarget(mk('x', 'high'))).toEqual({ section: 'climate-outlook', focusFacility: true })
  })

  it('returns null for categories with no admin drill-down page', () => {
    expect(notificationTarget({ ...mk('x', 'high'), category: 'support' })).toBeNull()
  })
})
