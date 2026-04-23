
export interface Contract {
  id: string;
  customer_name?: string;
  vehicle?: string;
  start_date?: string;
  end_date?: string;
  daily_rate?: number;
  total_amount?: number;
  status?: 'ouvert' | 'ferme' | 'draft' | 'sent' | 'signed' | 'completed' | 'cancelled';
}

export interface FilterState {
  periode: { start: string; end: string };
  vehicleId: string;
  tenantName: string;
  contractStatus: string;
  vehicleStatus: string;
  expenseType: string;
}

export interface TenantData {
  name: string;
  contracts: Contract[];
  totalContracts: number;
  totalDays: number;
  totalAmount: number;
  averageDaily: number;
}
