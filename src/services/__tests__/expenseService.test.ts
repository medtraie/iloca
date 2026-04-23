import { beforeEach, describe, expect, it } from "vitest"
import { expenseService } from "@/services/expenseService"
import { localStorageService } from "@/services/localStorageService"

const ensureLocalStorage = () => {
  if (typeof globalThis.localStorage !== "undefined") return
  const store = new Map<string, string>()
  const mockStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    }
  }
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
    configurable: true
  })
}

describe("expenseService recurring generation", () => {
  beforeEach(() => {
    ensureLocalStorage()
    localStorageService.clearAllData()
  })

  it("generates all overdue recurring expenses and advances next due date", async () => {
    const template = await expenseService.addExpense({
      vehicle_id: "vehicle-1",
      type: "assurance",
      total_cost: 1200,
      start_date: "2025-01-01",
      end_date: "2025-01-31",
      period_months: 1,
      monthly_cost: 1200,
      notes: "Template",
      recurring_enabled: true,
      recurring_frequency: "monthly",
      archived: false,
      next_due_date: "2025-12-01"
    })

    const generated = await expenseService.generateRecurringExpenses(new Date("2026-03-15T00:00:00.000Z"))
    expect(generated.length).toBe(4)

    const refreshed = await expenseService.fetchExpenses()
    const fromTemplate = refreshed.filter((expense) => expense.parent_expense_id === template.id)
    expect(fromTemplate.length).toBe(4)
    expect(new Set(fromTemplate.map((expense) => expense.start_date)).size).toBe(4)

    const refreshedTemplate = refreshed.find((expense) => expense.id === template.id)
    expect(refreshedTemplate?.next_due_date).toBe("2026-04-01")
  })

  it("does not duplicate recurring expenses when called repeatedly", async () => {
    const template = await expenseService.addExpense({
      vehicle_id: "vehicle-2",
      type: "vignette",
      total_cost: 600,
      start_date: "2025-06-01",
      end_date: "2025-06-30",
      period_months: 1,
      monthly_cost: 600,
      recurring_enabled: true,
      recurring_frequency: "quarterly",
      archived: false,
      next_due_date: "2025-09-01"
    })

    const first = await expenseService.generateRecurringExpenses(new Date("2026-03-15T00:00:00.000Z"))
    const second = await expenseService.generateRecurringExpenses(new Date("2026-03-15T00:00:00.000Z"))

    expect(first.length).toBeGreaterThan(0)
    expect(second.length).toBe(0)

    const expenses = await expenseService.fetchExpenses()
    const generated = expenses.filter((expense) => expense.parent_expense_id === template.id)
    expect(new Set(generated.map((expense) => `${expense.start_date}:${expense.end_date}`)).size).toBe(generated.length)
  })
})
