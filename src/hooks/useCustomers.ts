
import { useState, useEffect } from 'react';
import { localStorageService, Customer } from '@/services/localStorageService';
import { useToast } from '@/hooks/use-toast';

export type { Customer };

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = localStorageService.getAll<Customer>('customers');
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب العملاء",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newCustomer = localStorageService.create<Customer>('customers', customerData);
      setCustomers(prev => [...prev, newCustomer]);
      toast({
        title: "تم بنجاح",
        description: "تم إنشاء العميل بنجاح"
      });
      return newCustomer;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة العميل",
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
