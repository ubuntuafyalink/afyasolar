import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './stat-card'

describe('StatCard', () => {
  it('renders the title and value', () => {
    render(<StatCard title="Facilities" value={86} />)
    expect(screen.getByText('Facilities')).toBeInTheDocument()
    expect(screen.getByText('86')).toBeInTheDocument()
  })

  it('renders a delta chip with the percentage', () => {
    render(<StatCard title="Revenue" value={100} delta={{ value: 12, direction: 'up' }} />)
    expect(screen.getByText('12%')).toBeInTheDocument()
  })

  it('adds pointer affordance when interactive', () => {
    const { container } = render(<StatCard title="X" value={1} interactive />)
    const card = container.querySelector('[data-slot="stat-card"]')
    expect(card?.className).toContain('cursor-pointer')
  })

  it('omits the accent bar when showAccent is false', () => {
    const { container } = render(<StatCard title="X" value={1} showAccent={false} />)
    // accent bar is the only absolutely-positioned left strip span
    expect(container.querySelector('span[aria-hidden].absolute')).toBeNull()
  })
})
