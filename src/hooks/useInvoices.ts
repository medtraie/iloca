import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerICE: string;
  invoiceDate: string;
  description: string;
  totalHT: number;
  tva: number;
  totalTTC: number;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'overdue';
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'invoices';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInvoices = () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem(STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : [];
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des factures",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addInvoice = async (invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newInvoice: Invoice = {
        ...invoiceData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const stored = localStorage.getItem(STORAGE_KEY);
      const existingInvoices = stored ? JSON.parse(stored) : [];
      const updatedInvoices = [...existingInvoices, newInvoice];
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
      setInvoices(updatedInvoices);
      
      toast({
        title: "Succès",
        description: "Facture créée avec succès"
      });
      return newInvoice;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de la facture",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const existingInvoices: Invoice[] = stored ? JSON.parse(stored) : [];
      
      const updatedInvoices = existingInvoices.map(inv => 
        inv.id === id 
          ? { ...inv, ...updates, updated_at: new Date().toISOString() }
          : inv
      );
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
      setInvoices(updatedInvoices);
      
      toast({
        title: "Succès",
        description: "Facture mise à jour avec succès"
      });
      
      return updatedInvoices.find(inv => inv.id === id) || null;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la facture",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const existingInvoices: Invoice[] = stored ? JSON.parse(stored) : [];
      
      const updatedInvoices = existingInvoices.filter(inv => inv.id !== id);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedInvoices));
      setInvoices(updatedInvoices);
      
      toast({
        title: "Succès",
        description: "Facture supprimée avec succès"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de la facture",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return {
    invoices,
    loading,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    refetch: fetchInvoices
  };
};