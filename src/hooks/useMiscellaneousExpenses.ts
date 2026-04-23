import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface MiscellaneousExpense {
  id: string;
  expense_type: string;
  custom_expense_type?: string;
  amount: number;
  payment_method: 'Espèces' | 'Virement' | 'Chèque';
  expense_date: string;
  notes?: string;
  created_at: string;
}

export const EXPENSE_TYPES = [
  'Bureau',
  'Salaire',
  'CNSS',
  'Loyer',
  'Électricité',
  'Équipement',
  'Charge bureau',
  'Autre'
];

const STORAGE_KEY = 'miscellaneous_expenses';

export const useMiscellaneousExpenses = () => {
  const [expenses, setExpenses] = useState<MiscellaneousExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchExpenses = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : [];
      setExpenses(data.sort((a: MiscellaneousExpense, b: MiscellaneousExpense) => 
        new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
      ));
    } catch (error) {
      console.error('Error fetching miscellaneous expenses:', error);
      setExpenses([]);
    }
  };

  const addExpense = (expenseData: Omit<MiscellaneousExpense, 'id' | 'created_at'>) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const currentExpenses = stored ? JSON.parse(stored) : [];
      
      const newExpense: MiscellaneousExpense = {
        ...expenseData,
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString()
      };
      
      const updatedExpenses = [...currentExpenses, newExpense];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedExpenses));
      
      fetchExpenses();
      
      toast({
        title: "Succès",
        description: "Dépense diverse ajoutée avec succès"
      });
      return newExpense;
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la dépense diverse",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateExpense = (id: string, updates: Partial<MiscellaneousExpense>) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const currentExpenses = stored ? JSON.parse(stored) : [];
      
      const updatedExpenses = currentExpenses.map((exp: MiscellaneousExpense) =>
        exp.id === id ? { ...exp, ...updates } : exp
      );
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedExpenses));
      fetchExpenses();
      
      toast({
        title: "Succès",
        description: "Dépense diverse mise à jour"
      });
      return updatedExpenses.find((exp: MiscellaneousExpense) => exp.id === id);
    } catch (error: any) {
      console.error('Error updating expense:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la dépense diverse",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteExpense = (id: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const currentExpenses = stored ? JSON.parse(stored) : [];
      
      const updatedExpenses = currentExpenses.filter((exp: MiscellaneousExpense) => exp.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedExpenses));
      
      fetchExpenses();
      
      toast({
        title: "Succès",
        description: "Dépense diverse supprimée"
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la dépense diverse",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  return {
    expenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses
  };
};