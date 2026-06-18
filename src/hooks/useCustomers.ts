import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { customersRepository } from '@/repositories/customersRepository';
import type { Customer } from '@/types/appData';

export type { Customer };

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customersRepository.listCustomers();
      setCustomers(data);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء جلب العملاء",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newCustomer = await customersRepository.createCustomer(customerData);
      setCustomers(prev => [...prev, newCustomer]);
      toast({
        title: "تم بنجاح",
        description: "تم إنشاء العميل بنجاح"
      });
      return newCustomer;
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إضافة العميل",
        variant: "destructive"
      });
      return null;
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    addCustomer,
    refetch: fetchCustomers
  };
};
