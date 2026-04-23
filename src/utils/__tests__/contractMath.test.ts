import { describe, it, expect } from 'vitest'
import { daysBetween, computeTotal } from '@/utils/contractMath'

describe('contractMath', () => {
  it('calculates daysBetween basic range', () => {
    const days = daysBetween('2024-01-01', '2024-01-05')
    expect(days).toBe(4)
  })

  it('calculates daysBetween inclusive same day as 1', () => {
    const days = daysBetween('2024-01-01', '2024-01-01', { inclusive: true })
    expect(days).toBe(1)
  })

  it('computeTotal multiplies day rate by duration', () => {
    expect(computeTotal(200, 5)).toBe(1000)
  })
})
