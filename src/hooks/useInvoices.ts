import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { invoicesRepository } from '@/repositories/invoicesRepository';
import type { Invoice } from '@/types/appData';

export type { Invoice };

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoicesRepository.listInvoices();
      setInvoices(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du chargement des factures",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addInvoice = async (invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newInvoice = await invoicesRepository.createInvoice(invoiceData);
      setInvoices(prev => [newInvoice, ...prev]);
      
      toast({
        title: "Succès",
        description: "Facture créée avec succès"
      });
      return newInvoice;
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la création de la facture",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    try {
      const updatedInvoice = await invoicesRepository.updateInvoice(id, updates);
      setInvoices(prev => prev.map(inv => inv.id === id ? updatedInvoice : inv));
      
      toast({
        title: "Succès",
        description: "Facture mise à jour avec succès"
      });
      
      return updatedInvoice;
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la mise à jour de la facture",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await invoicesRepository.deleteInvoice(id);
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      
      toast({
        title: "Succès",
        description: "Facture supprimée avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la suppression de la facture",
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
