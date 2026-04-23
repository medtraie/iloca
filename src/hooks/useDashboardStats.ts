import { useState, useEffect } from 'react';
import { localStorageService, Vehicle, Contract, Customer } from '@/services/localStorageService';
import { useToast } from '@/hooks/use-toast';

export interface DashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  maintenanceVehicles: number;
  totalCustomers: number;
  activeContracts: number;
  totalContracts: number;
  completedContracts: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyRepairs: number;
  todayContracts: number;
  todayRevenue: number;
}

export interface RecentActivity {
  id: string;
  type: 'contract' | 'customer' | 'vehicle' | 'expense' | 'repair';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    availableVehicles: 0,
    rentedVehicles: 0,
    maintenanceVehicles: 0,
    totalCustomers: 0,
    activeContracts: 0,
    totalContracts: 0,
    completedContracts: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    monthlyRepairs: 0,
    todayContracts: 0,
    todayRevenue: 0,
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch vehicles stats from localStorage
      const vehicles = localStorageService.getAll<Vehicle>('vehicles');
      const vehicleStats = vehicles.reduce((acc, vehicle) => {
        acc.total++;
        if (vehicle.etat_vehicule === 'disponible') acc.available++;
        else if (vehicle.etat_vehicule === 'loue') acc.rented++;
        else if (vehicle.etat_vehicule === 'maintenance') acc.maintenance++;
        return acc;
      }, { total: 0, available: 0, rented: 0, maintenance: 0 });

      // Fetch customers count
      const customers = localStorageService.getAll<Customer>('customers');
      const customersCount = customers.length;

      // Fetch contracts stats
      const contracts = localStorageService.getAll<Contract>('contracts');
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const contractStats = contracts.reduce((acc, contract) => {
        acc.total++;
        
        if (['signed', 'sent'].includes(contract.status)) {
          acc.active++;
        }
        if (contract.status === 'completed') {
          acc.completed++;
        }

        const contractDate = new Date(contract.created_at);
        const contractDay = new Date(contractDate.getFullYear(), contractDate.getMonth(), contractDate.getDate());
        
        if (contractDate >= currentMonth) {
          acc.monthlyRevenue += Number(contract.total_amount) || 0;
        }
        
        if (contractDay.getTime() === today.getTime()) {
          acc.todayContracts++;
          acc.todayRevenue += Number(contract.total_amount) || 0;
        }

        return acc;
      }, { 
        total: 0, 
        active: 0, 
        completed: 0, 
        monthlyRevenue: 0, 
        todayContracts: 0, 
        todayRevenue: 0 
      });

      // Calculate monthly expenses and repairs
      const expenses = localStorageService.getAll('expenses') as any[];
      const repairs = localStorageService.getAll('repairs') as any[];
      
      const totalMonthlyExpenses = expenses
        .filter((expense: any) => {
          const expenseDate = new Date(expense.created_at || expense.start_date);
          return expenseDate >= currentMonth;
        })
        .reduce((sum: number, expense: any) => sum + (Number(expense.monthly_cost) || Number(expense.total_cost) || 0), 0);

      const totalMonthlyRepairs = repairs
        .filter((repair: any) => {
          const repairDate = new Date(repair.created_at || repair.date_reparation);
          return repairDate >= currentMonth;
        })
        .reduce((sum: number, repair: any) => sum + (Number(repair.cout) || 0), 0);

      setStats({
        totalVehicles: vehicleStats.total,
        availableVehicles: vehicleStats.available,
        rentedVehicles: vehicleStats.rented,
        maintenanceVehicles: vehicleStats.maintenance,
        totalCustomers: customersCount,
        activeContracts: contractStats.active,
        totalContracts: contractStats.total,
        completedContracts: contractStats.completed,
        monthlyRevenue: contractStats.monthlyRevenue,
        monthlyExpenses: totalMonthlyExpenses,
        monthlyRepairs: totalMonthlyRepairs,
        todayContracts: contractStats.todayContracts,
        todayRevenue: contractStats.todayRevenue,
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب إحصائيات لوحة التحكم",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const activities: RecentActivity[] = [];

      // Recent contracts
      const recentContracts = localStorageService.getAll<Contract>('contracts')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2);

      recentContracts.forEach(contract => {
        activities.push({
          id: contract.id,
          type: 'contract',
          title: 'Nouveau contrat créé',
          description: `Contrat ${contract.contract_number} - ${contract.customer_name}`,
          timestamp: contract.created_at,
          icon: 'file-text'
        });
      });

      // Recent customers
      const recentCustomers = localStorageService.getAll<Customer>('customers')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2);

      recentCustomers.forEach(customer => {
        activities.push({
          id: customer.id,
          type: 'customer',
          title: 'Nouveau client enregistré',
          description: `${customer.first_name || ''} ${customer.last_name}`,
          timestamp: customer.created_at,
          icon: 'users'
        });
      });

      // Recent expenses
      const recentExpenses = (localStorageService.getAll('expenses') as any[])
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2);

      recentExpenses.forEach((expense: any) => {
        activities.push({
          id: expense.id,
          type: 'expense',
          title: 'Nouvelle dépense ajoutée',
          description: `${expense.type} - ${Number(expense.monthly_cost || expense.total_cost).toLocaleString()} DH`,
          timestamp: expense.created_at,
          icon: 'file-text'
        });
      });

      // Recent repairs
      const recentRepairs = (localStorageService.getAll('repairs') as any[])
        .sort((a: any, b: any) => new Date(b.created_at || b.date_reparation).getTime() - new Date(a.created_at || a.date_reparation).getTime())
        .slice(0, 2);

      recentRepairs.forEach((repair: any) => {
        activities.push({
          id: repair.id,
          type: 'repair',
          title: 'Nouvelle réparation enregistrée',
          description: `${repair.typeReparation} - ${Number(repair.cout).toLocaleString()} DH`,
          timestamp: repair.created_at || repair.date_reparation,
          icon: 'wrench'
        });
      });

      // Recent vehicles
      const recentVehicles = localStorageService.getAll<Vehicle>('vehicles')
        .sort((a, b) => new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime())
        .slice(0, 1);

      recentVehicles.forEach(vehicle => {
        activities.push({
          id: vehicle.id,
          type: 'vehicle',
          title: 'Nouveau véhicule ajouté',
          description: `${vehicle.marque} ${vehicle.modele} - ${vehicle.immatriculation}`,
          timestamp: vehicle.created_at || new Date().toISOString(),
          icon: 'users'
        });
      });

      // Sort all activities by timestamp and limit to 6
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setRecentActivity(activities.slice(0, 6));

    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  return {
    stats,
    recentActivity,
    loading,
    refetch: () => {
      fetchStats();
      fetchRecentActivity();
    }
  };
};