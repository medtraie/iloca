
export interface Expense {
  id: string;
  vehicle_id: string;
  type: 'vignette' | 'assurance' | 'visite_technique' | 'gps' | 'credit' | 'reparation';
  total_cost: number;
  start_date: string;
  end_date: string;
  period_months: number;
  monthly_cost: number;
  document_url?: string;
  notes?: string;
  tags?: string[];
  recurring_enabled?: boolean;
  recurring_frequency?: 'monthly' | 'quarterly' | 'yearly';
  archived?: boolean;
  parent_expense_id?: string | null;
  next_due_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyExpense {
  id: string;
  expense_id: string | null; // Allow null for repair expense triggered by logs
  vehicle_id: string;
  month_year: string;
  allocated_amount: number;
  expense_type: 'vignette' | 'assurance' | 'visite_technique' | 'gps' | 'credit' | 'reparation';
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseBudget {
  id: string;
  vehicle_id: string;
  expense_type: Expense['type'] | 'all';
  month_year: string;
  budget_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseAuditLog {
  id: string;
  expense_id?: string | null;
  action:
    | 'expense_added'
    | 'expense_updated'
    | 'expense_deleted'
    | 'expense_archived'
    | 'expense_duplicated'
    | 'expense_recurring_generated'
    | 'budget_updated';
  details: string;
  payload?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExpenseAlert {
  id: string;
  title: string;
  description: string;
  level: 'info' | 'warning' | 'critical';
  kind: 'due_soon' | 'anomaly';
  expense_id?: string;
  vehicle_id?: string;
  type?: Expense['type'];
}
