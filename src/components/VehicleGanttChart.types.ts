
export interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
}

export interface Contract {
  id: string;
  customer_name?: string;
  // For compatibility with VehicleGanttChart.tsx
  customerName?: string;
  vehicle?: string;
  vehicleId?: string;
  start_date?: string;
  end_date?: string;
  status?: 'ouvert' | 'ferme' | 'draft' | 'sent' | 'signed' | 'completed' | 'cancelled';
  nombreDeJour?: number;
  prolongationAu?: string;
  nombreDeJourProlonge?: number;
}

export interface FilterState {
  periode: { start: string; end: string };
  vehicleId: string;
  tenantName: string;
  contractStatus: string;
  vehicleStatus: string;
  expenseType: string;
}
