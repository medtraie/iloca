import { describe, it, expect } from 'vitest'
import { recalculateContractFinancials } from '@/utils/contractFinancialStatus'
import type { Contract } from '@/services/localStorageService'
import { daysBetween } from '@/utils/contractMath'

describe('contract financials', () => {
  it('recalculates total based on days and daily rate', () => {
    const contract: Contract = {
      id: 'c1',
      contract_number: 'C001',
      customer_name: 'Test',
      vehicle: 'Peugeot 208 2023',
      start_date: '2024-01-01',
      end_date: '2024-01-05',
      daily_rate: 300,
      total_amount: 0,
      status: 'ferme',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const result = recalculateContractFinancials(contract)
    const expectedDays = daysBetween(contract.start_date, contract.end_date)
    expect(result.total_amount).toBe(expectedDays * (contract.daily_rate || 0))
    expect(result.contract_data?.originalDays).toBe(expectedDays)
  })
})
