
import { useState, useEffect } from 'react';
import { expenseService } from '@/services/expenseService';
import { useExpenseToasts } from '@/utils/expenseUtils';
import { Expense, ExpenseAlert, ExpenseAuditLog, ExpenseBudget, MonthlyExpense } from '@/types/expense';
import { isAfter, isBefore, addDays, parseISO, subMonths, format } from "date-fns";

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([]);
  const [budgets, setBudgets] = useState<ExpenseBudget[]>([]);
  const [auditLogs, setAuditLogs] = useState<ExpenseAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showError, showSuccess } = useExpenseToasts();

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await expenseService.fetchExpenses();
      setExpenses(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur s’est produite lors du chargement des dépenses";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyExpenses = async () => {
    try {
      setError(null);
      const data = await expenseService.fetchMonthlyExpenses();
      setMonthlyExpenses(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur s’est produite lors du chargement des dépenses mensuelles";
      setError(errorMessage);
      console.error('Hook error fetching monthly expenses:', error);
    }
  };

  const fetchBudgets = async () => {
    try {
      setError(null);
      const data = await expenseService.fetchBudgets();
      setBudgets(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur s’est produite lors du chargement des budgets";
      setError(errorMessage);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setError(null);
      const data = await expenseService.fetchAuditLogs();
      setAuditLogs(data.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 200));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur s’est produite lors du chargement du journal d’audit";
      setError(errorMessage);
    }
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'monthly_cost'>) => {
    try {
      setError(null);
      const newExpense = await expenseService.addExpense(expenseData);
      setExpenses(prev => [newExpense, ...prev]);
      showSuccess("Dépense ajoutée avec succès");
      
      await Promise.all([fetchMonthlyExpenses(), fetchAuditLogs()]);
      return newExpense;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l’ajout de la dépense";
      setError(errorMessage);
      showError(errorMessage);
      return null;
    }
  };

  const updateExpense = async (id: string, expenseData: Partial<Expense>) => {
    try {
      setError(null);
      const updatedExpense = await expenseService.updateExpense(id, expenseData);
      setExpenses(prev => prev.map(exp => exp.id === id ? updatedExpense : exp));
      showSuccess("Dépense mise à jour avec succès");
      
      await Promise.all([fetchMonthlyExpenses(), fetchAuditLogs()]);
      return updatedExpense;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la mise à jour de la dépense";
      setError(errorMessage);
      showError(errorMessage);
      return null;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      setError(null);
      await expenseService.deleteExpense(id);
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      showSuccess("Dépense supprimée avec succès");
      
      await Promise.all([fetchMonthlyExpenses(), fetchAuditLogs()]);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la suppression de la dépense";
      setError(errorMessage);
      showError(errorMessage);
      return false;
    }
  };

  const duplicateExpense = async (id: string) => {
    try {
      setError(null);
      const duplicated = await expenseService.duplicateExpense(id);
      if (!duplicated) {
        showError("Impossible de dupliquer cette dépense");
        return null;
      }
      setExpenses(prev => [duplicated, ...prev]);
      await Promise.all([fetchMonthlyExpenses(), fetchAuditLogs()]);
      showSuccess("Dépense dupliquée avec succès");
      return duplicated;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la duplication";
      setError(errorMessage);
      showError(errorMessage);
      return null;
    }
  };

  const archiveExpense = async (id: string) => {
    try {
      setError(null);
      const archived = await expenseService.archiveExpense(id);
      if (!archived) {
        showError("Impossible d’archiver cette dépense");
        return null;
      }
      setExpenses(prev => prev.map(exp => exp.id === id ? archived : exp));
      await fetchAuditLogs();
      showSuccess("Dépense archivée");
      return archived;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l’archivage";
      setError(errorMessage);
      showError(errorMessage);
      return null;
    }
  };

  const upsertBudget = async (input: Omit<ExpenseBudget, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      const budget = await expenseService.upsertBudget(input);
      setBudgets(prev => {
        const found = prev.find(
          b => b.vehicle_id === budget.vehicle_id && b.expense_type === budget.expense_type && b.month_year === budget.month_year
        );
        if (found) {
          return prev.map(b => b.id === budget.id ? budget : b);
        }
        return [budget, ...prev];
      });
      await fetchAuditLogs();
      showSuccess("Budget enregistré");
      return budget;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l’enregistrement du budget";
      setError(errorMessage);
      showError(errorMessage);
      return null;
    }
  };

  const refetch = async () => {
    await expenseService.generateRecurringExpenses();
    await Promise.all([fetchExpenses(), fetchMonthlyExpenses(), fetchBudgets(), fetchAuditLogs()]);
  };

  const alerts: ExpenseAlert[] = (() => {
    const items: ExpenseAlert[] = [];
    const now = new Date();
    const alertDeadline = addDays(now, 30);
    const dueTypes: Array<Expense["type"]> = ["assurance", "vignette", "visite_technique"];
    const relevantExpenses = expenses.filter(expense => !expense.archived);

    relevantExpenses.forEach((expense) => {
      if (!dueTypes.includes(expense.type)) {
        return;
      }
      const due = parseISO(expense.end_date);
      if (Number.isNaN(due.getTime())) {
        return;
      }
      if (isAfter(due, now) && isBefore(due, alertDeadline)) {
        items.push({
          id: `due_${expense.id}`,
          kind: "due_soon",
          level: "warning",
          title: "Échéance proche",
          description: `${expense.type} arrive à échéance le ${format(due, "dd/MM/yyyy")}`,
          expense_id: expense.id,
          vehicle_id: expense.vehicle_id,
          type: expense.type
        });
      }
    });

    const anomalyScopeStart = subMonths(now, 8).toISOString().slice(0, 7);
    const groupedByVehicleType = monthlyExpenses.reduce<Record<string, Array<{ month: string; amount: number }>>>((acc, entry) => {
      const monthKey = entry.month_year.slice(0, 7);
      if (monthKey < anomalyScopeStart) {
        return acc;
      }
      const key = `${entry.vehicle_id}:${entry.expense_type}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({ month: monthKey, amount: Number(entry.allocated_amount || 0) });
      return acc;
    }, {});

    Object.entries(groupedByVehicleType).forEach(([key, rows]) => {
      if (rows.length < 4) {
        return;
      }
      const values = [...rows]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((row) => row.amount);
      const [vehicle_id, type] = key.split(":");
      const current = values[values.length - 1];
      const history = values.slice(0, -1);
      const baseline = history.reduce((sum, value) => sum + value, 0) / history.length;
      if (baseline <= 0) {
        return;
      }
      const variance = history.reduce((sum, value) => sum + (value - baseline) ** 2, 0) / history.length;
      const stdDev = Math.sqrt(variance);
      const zScore = stdDev > 0 ? (current - baseline) / stdDev : 0;
      const median = [...history].sort((a, b) => a - b)[Math.floor(history.length / 2)];
      const mad = [...history]
        .map((value) => Math.abs(value - median))
        .sort((a, b) => a - b)[Math.floor(history.length / 2)] || 0;
      const robustScore = mad > 0 ? (0.6745 * (current - median)) / mad : 0;
      const surge = ((current / baseline) - 1) * 100;
      const absoluteDrift = current - baseline;

      if ((surge >= 45 && absoluteDrift >= Math.max(250, baseline * 0.2)) || zScore >= 2.4 || robustScore >= 3.5) {
        items.push({
          id: `anomaly_${key}`,
          kind: "anomaly",
          level: "critical",
          title: "Hausse anormale détectée",
          description: `${type} dépasse la moyenne récente de ${Math.round(surge)}% (${Math.round(current).toLocaleString()} DH)`,
          vehicle_id,
          type: type as Expense["type"]
        });
      }
    });

    const currentMonthKey = now.toISOString().slice(0, 7);
    const currentMonthEntries = monthlyExpenses.filter((entry) => entry.month_year.slice(0, 7) === currentMonthKey);
    const actualByBudgetKey = currentMonthEntries.reduce<Record<string, number>>((acc, entry) => {
      const typeKey = `${entry.vehicle_id}:${entry.expense_type}`;
      const allKey = `${entry.vehicle_id}:all`;
      acc[typeKey] = (acc[typeKey] || 0) + Number(entry.allocated_amount || 0);
      acc[allKey] = (acc[allKey] || 0) + Number(entry.allocated_amount || 0);
      return acc;
    }, {});

    budgets
      .filter((budget) => budget.month_year === currentMonthKey && budget.budget_amount > 0)
      .forEach((budget) => {
        const key = `${budget.vehicle_id}:${budget.expense_type}`;
        const actual = actualByBudgetKey[key] || 0;
        const ratio = (actual / budget.budget_amount) * 100;
        if (ratio >= 105) {
          items.push({
            id: `budget_${budget.id}`,
            kind: "anomaly",
            level: ratio >= 125 ? "critical" : "warning",
            title: "Dépassement budgétaire",
            description: `${budget.expense_type} à ${Math.round(ratio)}% du budget (${Math.round(actual).toLocaleString()} DH / ${Math.round(budget.budget_amount).toLocaleString()} DH)`,
            vehicle_id: budget.vehicle_id,
            type: budget.expense_type === "all" ? undefined : budget.expense_type
          });
        }
      });

    const levelRank = { critical: 0, warning: 1, info: 2 };
    return items
      .sort((a, b) => levelRank[a.level] - levelRank[b.level])
      .slice(0, 12);
  })();

  useEffect(() => {
    refetch();
  }, []);

  return {
    expenses,
    monthlyExpenses,
    budgets,
    auditLogs,
    alerts,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    duplicateExpense,
    archiveExpense,
    upsertBudget,
    refetch
  };
};
