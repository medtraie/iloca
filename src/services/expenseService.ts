
import { localStorageService } from "@/services/localStorageService";
import { Expense, ExpenseAuditLog, ExpenseBudget, MonthlyExpense } from "@/types/expense";

const EXPENSE_DATA_TYPE = "expenses";
const MONTHLY_EXPENSE_DATA_TYPE = "monthly_expenses";
const EXPENSE_BUDGET_DATA_TYPE = "expense_budgets";
const EXPENSE_AUDIT_LOG_DATA_TYPE = "expense_audit_logs";

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const toMonthYear = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const expenseService = {
  async fetchExpenses(): Promise<Expense[]> {
    return localStorageService.getAll<Expense>(EXPENSE_DATA_TYPE);
  },

  async fetchMonthlyExpenses(): Promise<MonthlyExpense[]> {
    return localStorageService.getAll<MonthlyExpense>(MONTHLY_EXPENSE_DATA_TYPE);
  },

  async fetchBudgets(): Promise<ExpenseBudget[]> {
    return localStorageService.getAll<ExpenseBudget>(EXPENSE_BUDGET_DATA_TYPE);
  },

  async fetchAuditLogs(): Promise<ExpenseAuditLog[]> {
    return localStorageService.getAll<ExpenseAuditLog>(EXPENSE_AUDIT_LOG_DATA_TYPE);
  },

  async addExpense(expenseData: Omit<Expense, "id" | "created_at" | "updated_at">): Promise<Expense> {
    const monthlyExpense = expenseData.total_cost / (expenseData.period_months || 1);
    const newExpense = localStorageService.add<Expense>(EXPENSE_DATA_TYPE, {
      ...expenseData,
      monthly_cost: monthlyExpense,
      archived: Boolean(expenseData.archived),
      recurring_enabled: Boolean(expenseData.recurring_enabled),
      recurring_frequency: expenseData.recurring_frequency || "yearly",
      tags: expenseData.tags || [],
      parent_expense_id: expenseData.parent_expense_id ?? null,
      next_due_date: expenseData.next_due_date ?? expenseData.end_date
    });
    await this.createMonthlyExpenseRecords(newExpense);
    await this.appendAuditLog({
      expense_id: newExpense.id,
      action: "expense_added",
      details: `Ajout dépense ${newExpense.type}`,
      payload: { vehicle_id: newExpense.vehicle_id, total_cost: newExpense.total_cost }
    });
    return newExpense;
  },

  async updateExpense(id: string, expenseData: Partial<Expense>): Promise<Expense> {
    const existingExpense = localStorageService.get<Expense>(EXPENSE_DATA_TYPE, id);
    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    let updateData = { ...existingExpense, ...expenseData };

    if (expenseData.total_cost !== undefined || expenseData.period_months !== undefined) {
      const totalCost = expenseData.total_cost ?? existingExpense.total_cost;
      const periodMonths = expenseData.period_months ?? existingExpense.period_months;
      updateData.monthly_cost = totalCost / (periodMonths || 1);
    }

    const updatedExpense = localStorageService.update<Expense>(EXPENSE_DATA_TYPE, updateData);
    if (!updatedExpense) {
      throw new Error("Expense update failed");
    }

    if (
      expenseData.total_cost !== undefined ||
      expenseData.period_months !== undefined ||
      expenseData.start_date !== undefined ||
      expenseData.end_date !== undefined
    ) {
      await localStorageService.deleteWhere(MONTHLY_EXPENSE_DATA_TYPE, "expense_id", id);
      await this.createMonthlyExpenseRecords(updatedExpense);
    }

    await this.appendAuditLog({
      expense_id: updatedExpense.id,
      action: "expense_updated",
      details: `Mise à jour dépense ${updatedExpense.type}`,
      payload: { changed_keys: Object.keys(expenseData) }
    });

    return updatedExpense;
  },

  async deleteExpense(id: string): Promise<void> {
    const target = localStorageService.get<Expense>(EXPENSE_DATA_TYPE, id);
    localStorageService.delete(EXPENSE_DATA_TYPE, id);
    await localStorageService.deleteWhere(MONTHLY_EXPENSE_DATA_TYPE, "expense_id", id);
    await this.appendAuditLog({
      expense_id: id,
      action: "expense_deleted",
      details: "Suppression de dépense",
      payload: { type: target?.type, vehicle_id: target?.vehicle_id }
    });
  },

  async archiveExpense(id: string): Promise<Expense | null> {
    const expense = localStorageService.get<Expense>(EXPENSE_DATA_TYPE, id);
    if (!expense) {
      return null;
    }
    const updated = localStorageService.update<Expense>(EXPENSE_DATA_TYPE, id, { archived: true });
    if (updated) {
      await this.appendAuditLog({
        expense_id: id,
        action: "expense_archived",
        details: "Archivage de dépense"
      });
    }
    return updated;
  },

  async duplicateExpense(id: string): Promise<Expense | null> {
    const source = localStorageService.get<Expense>(EXPENSE_DATA_TYPE, id);
    if (!source) {
      return null;
    }
    const duplicated = await this.addExpense({
      vehicle_id: source.vehicle_id,
      type: source.type,
      total_cost: source.total_cost,
      start_date: source.start_date,
      end_date: source.end_date,
      period_months: source.period_months,
      monthly_cost: source.monthly_cost,
      document_url: source.document_url,
      notes: source.notes,
      tags: source.tags || [],
      recurring_enabled: source.recurring_enabled,
      recurring_frequency: source.recurring_frequency,
      archived: false,
      parent_expense_id: source.id,
      next_due_date: source.next_due_date
    });
    if (duplicated) {
      await this.appendAuditLog({
        expense_id: duplicated.id,
        action: "expense_duplicated",
        details: "Duplication de dépense",
        payload: { source_expense_id: source.id }
      });
    }
    return duplicated;
  },

  async upsertBudget(input: Omit<ExpenseBudget, "id" | "created_at" | "updated_at">): Promise<ExpenseBudget> {
    const budgets = localStorageService.getAll<ExpenseBudget>(EXPENSE_BUDGET_DATA_TYPE);
    const existing = budgets.find(
      (b) =>
        b.vehicle_id === input.vehicle_id &&
        b.expense_type === input.expense_type &&
        b.month_year === input.month_year
    );

    if (existing) {
      const updated = localStorageService.update<ExpenseBudget>(EXPENSE_BUDGET_DATA_TYPE, existing.id, {
        budget_amount: input.budget_amount
      });
      if (!updated) {
        throw new Error("Budget update failed");
      }
      await this.appendAuditLog({
        action: "budget_updated",
        details: "Mise à jour budget",
        payload: { vehicle_id: input.vehicle_id, expense_type: input.expense_type, month_year: input.month_year }
      });
      return updated;
    }

    const created = localStorageService.add<ExpenseBudget>(EXPENSE_BUDGET_DATA_TYPE, input);
    await this.appendAuditLog({
      action: "budget_updated",
      details: "Création budget",
      payload: { vehicle_id: input.vehicle_id, expense_type: input.expense_type, month_year: input.month_year }
    });
    return created;
  },

  async generateRecurringExpenses(referenceDate: Date = new Date()): Promise<Expense[]> {
    const expenses = localStorageService.getAll<Expense>(EXPENSE_DATA_TYPE);
    const recurring = expenses.filter((expense) => expense.recurring_enabled && !expense.archived);
    const knownExpenses = [...expenses];
    const generated: Expense[] = [];

    for (const template of recurring) {
      const frequency = template.recurring_frequency || "yearly";
      const monthsStep = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
      let cursorDate = template.next_due_date ? new Date(template.next_due_date) : new Date(template.end_date);
      if (Number.isNaN(cursorDate.getTime())) {
        continue;
      }
      let iterations = 0;

      while (cursorDate <= referenceDate && iterations < 120) {
        const periodStart = new Date(cursorDate);
        const periodEnd = addMonths(periodStart, Math.max(1, template.period_months || 1));
        periodEnd.setDate(periodEnd.getDate() - 1);
        const periodStartIso = periodStart.toISOString().slice(0, 10);
        const periodEndIso = periodEnd.toISOString().slice(0, 10);

        const duplicate = knownExpenses.some((expense) =>
          expense.parent_expense_id === template.id &&
          expense.start_date === periodStartIso &&
          expense.end_date === periodEndIso
        );

        if (!duplicate) {
          const newExpense = localStorageService.add<Expense>(EXPENSE_DATA_TYPE, {
            vehicle_id: template.vehicle_id,
            type: template.type,
            total_cost: template.total_cost,
            start_date: periodStartIso,
            end_date: periodEndIso,
            period_months: template.period_months,
            monthly_cost: template.monthly_cost,
            document_url: template.document_url,
            notes: template.notes,
            tags: template.tags || [],
            recurring_enabled: template.recurring_enabled,
            recurring_frequency: template.recurring_frequency,
            archived: false,
            parent_expense_id: template.id,
            next_due_date: periodEndIso
          });
          generated.push(newExpense);
          knownExpenses.push(newExpense);
          await this.createMonthlyExpenseRecords(newExpense);
          await this.appendAuditLog({
            expense_id: newExpense.id,
            action: "expense_recurring_generated",
            details: `Génération récurrente ${template.type}`,
            payload: { template_id: template.id, frequency, period_start: periodStartIso, period_end: periodEndIso }
          });
        }

        cursorDate = addMonths(cursorDate, monthsStep);
        iterations += 1;
      }

      if (iterations > 0) {
        localStorageService.update<Expense>(EXPENSE_DATA_TYPE, template.id, {
          next_due_date: cursorDate.toISOString().slice(0, 10)
        });
      }
    }

    return generated;
  },

  async createMonthlyExpenseRecords(expense: Expense): Promise<void> {
    const startDate = new Date(expense.start_date);
    const endDate = new Date(expense.end_date);
    const monthlyRecords: Omit<MonthlyExpense, "id" | "created_at" | "updated_at">[] = [];

    const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (currentDate <= endDate) {
      const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

      monthlyRecords.push({
        expense_id: expense.id,
        vehicle_id: expense.vehicle_id,
        month_year: monthYear,
        allocated_amount: expense.monthly_cost || 0,
        expense_type: expense.type,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    if (monthlyRecords.length > 0) {
      monthlyRecords.forEach((record) => {
        localStorageService.add(MONTHLY_EXPENSE_DATA_TYPE, record);
      });
    }
  },

  async appendAuditLog(log: Omit<ExpenseAuditLog, "id" | "created_at" | "updated_at">): Promise<ExpenseAuditLog> {
    return localStorageService.add<ExpenseAuditLog>(EXPENSE_AUDIT_LOG_DATA_TYPE, log);
  },

  computeBudgetActual(
    monthlyExpenses: MonthlyExpense[],
    budgets: ExpenseBudget[],
    monthYear: string
  ) {
    const monthData = monthlyExpenses.filter((entry) => toMonthYear(new Date(entry.month_year)) === monthYear);
    const groupedActual = monthData.reduce<Record<string, number>>((acc, entry) => {
      const keyByType = `${entry.vehicle_id}:${entry.expense_type}`;
      const keyAll = `${entry.vehicle_id}:all`;
      acc[keyByType] = (acc[keyByType] || 0) + Number(entry.allocated_amount || 0);
      acc[keyAll] = (acc[keyAll] || 0) + Number(entry.allocated_amount || 0);
      return acc;
    }, {});

    return budgets
      .filter((budget) => budget.month_year === monthYear)
      .map((budget) => {
        const key = `${budget.vehicle_id}:${budget.expense_type}`;
        const actual = groupedActual[key] || 0;
        const variance = actual - budget.budget_amount;
        const ratio = budget.budget_amount > 0 ? (actual / budget.budget_amount) * 100 : 0;
        return {
          ...budget,
          actual_amount: actual,
          variance,
          ratio
        };
      });
  }
};
