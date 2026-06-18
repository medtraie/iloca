import { useState, useEffect } from 'react';
import { vehiclesRepository } from '@/repositories/vehiclesRepository';
import { contractsRepository } from '@/repositories/contractsRepository';
import { customersRepository } from '@/repositories/customersRepository';
import { expensesRepository } from '@/repositories/expensesRepository';
import { repairsRepository } from '@/repositories/repairsRepository';
import { Vehicle, Contract, Customer } from '@/types/appData';
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

      const [vehicles, customers, contracts, expenses, repairs] = await Promise.all([
        vehiclesRepository.listVehicles(),
        customersRepository.listCustomers(),
        contractsRepository.getAll(),
        expensesRepository.getAllExpenses(),
        repairsRepository.getAll()
      ]);

      const vehicleStats = vehicles.reduce((acc, vehicle) => {
        acc.total++;
        if (vehicle.etat_vehicule === 'disponible') acc.available++;
        else if (vehicle.etat_vehicule === 'loue') acc.rented++;
        else if (vehicle.etat_vehicule === 'maintenance') acc.maintenance++;
        return acc;
      }, { total: 0, available: 0, rented: 0, maintenance: 0 });

      const customersCount = customers.length;

      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const contractStats = contracts.reduce((acc, contract) => {
        acc.total++;
        
        if (['signed', 'sent', 'ouvert'].includes(contract.status)) {
          acc.active++;
        }
        if (contract.status === 'completed' || contract.status === 'ferme') {
          acc.completed++;
        }

        const contractDate = new Date(contract.created_at || now);
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

      // Prepare recent activity
      const activities: RecentActivity[] = [];

      contracts.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 2).forEach(contract => {
        activities.push({
          id: contract.id,
          type: 'contract',
          title: 'Nouveau contrat créé',
          description: `Contrat ${contract.contract_number} - ${contract.customer_name}`,
          timestamp: contract.created_at || now.toISOString(),
          icon: 'file-text'
        });
      });

      customers.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 2).forEach(customer => {
        activities.push({
          id: customer.id,
          type: 'customer',
          title: 'Nouveau client enregistré',
          description: `${customer.first_name || ''} ${customer.last_name}`,
          timestamp: customer.created_at || now.toISOString(),
          icon: 'users'
        });
      });

      expenses.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 2).forEach((expense: any) => {
        activities.push({
          id: expense.id,
          type: 'expense',
          title: 'Nouvelle dépense ajoutée',
          description: `${expense.type} - ${Number(expense.monthly_cost || expense.total_cost).toLocaleString()} DH`,
          timestamp: expense.created_at || now.toISOString(),
          icon: 'file-text'
        });
      });

      repairs.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 2).forEach((repair: any) => {
        activities.push({
          id: repair.id,
          type: 'repair',
          title: 'Nouvelle réparation enregistrée',
          description: `${repair.typeReparation} - ${Number(repair.cout).toLocaleString()} DH`,
          timestamp: repair.created_at || now.toISOString(),
          icon: 'wrench'
        });
      });

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 6));

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Erreur",
        description: "حدث خطأ أثناء جلب إحصائيات لوحة التحكم",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    recentActivity,
    loading,
    refetch: fetchStats
  };
};
