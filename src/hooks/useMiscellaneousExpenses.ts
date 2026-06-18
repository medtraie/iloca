import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { miscellaneousExpensesRepository } from '@/repositories/miscellaneousExpensesRepository';

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

export const useMiscellaneousExpenses = () => {
  const [expenses, setExpenses] = useState<MiscellaneousExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await miscellaneousExpensesRepository.getAll();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching miscellaneous expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async (expenseData: Omit<MiscellaneousExpense, 'id' | 'created_at'>) => {
    try {
      const newExpense = await miscellaneousExpensesRepository.create(expenseData);
      setExpenses(prev => [newExpense, ...prev]);
      
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

  const updateExpense = async (id: string, updates: Partial<MiscellaneousExpense>) => {
    try {
      const updatedExpense = await miscellaneousExpensesRepository.update(id, updates);
      setExpenses(prev => prev.map(exp => exp.id === id ? updatedExpense : exp));
      
      toast({
        title: "Succès",
        description: "Dépense diverse mise à jour"
      });
      return updatedExpense;
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

  const deleteExpense = async (id: string) => {
    try {
      await miscellaneousExpensesRepository.delete(id);
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      
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