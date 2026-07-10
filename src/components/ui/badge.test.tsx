import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies the soft success tonal variant', () => {
    render(<Badge variant="successSoft">OK</Badge>)
    const el = screen.getByText('OK')
    expect(el.className).toContain('bg-success/10')
    expect(el.className).toContain('text-success')
  })

  it('applies the muted variant', () => {
    render(<Badge variant="muted">3 logins</Badge>)
    expect(screen.getByText('3 logins').className).toContain('bg-muted')
  })
})
