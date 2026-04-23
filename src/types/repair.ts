
export interface Repair {
  id: string;
  vehicleId: string;
  vehicleInfo: {
    marque: string;
    modele: string;
    immatriculation: string;
  };
  typeReparation: "Mécanique" | "Électrique" | "Garage";
  cout: number;
  paye: number;
  dette: number;
  dateReparation: string;
  paymentMethod: 'Espèces' | 'Virement' | 'Chèque';
  checkName?: string;
  checkReference?: string;
  checkDate?: string;
  checkDepositDate?: string;
  pieceJointe?: {
    fileName: string;
    fileUrl: string;
    fileType: string;
  };
  dueDate?: string;
  slaTargetDays?: number;
  operationalStatus?: "en_maintenance" | "pret_pour_retour" | "immobilise_long";
  payments?: RepairPayment[];
  updates?: RepairUpdate[];
  note: string;
  created_at: string;
  updated_at: string;
}

export interface RepairPayment {
  id: string;
  amount: number;
  date: string;
  method: "Espèces" | "Virement" | "Chèque";
  note?: string;
}

export interface RepairUpdate {
  id: string;
  date: string;
  label: string;
}

export interface RepairFormData {
  vehicleId: string;
  typeReparation: "Mécanique" | "Électrique" | "Garage";
  cout: number;
  paye?: number;
  dette?: number;
  dateReparation: string;
  paymentMethod: 'Espèces' | 'Virement' | 'Chèque';
  dueDate?: string;
  slaTargetDays?: number;
  operationalStatus?: "en_maintenance" | "pret_pour_retour" | "immobilise_long";
  payments?: RepairPayment[];
  checkName?: string;
  checkReference?: string;
  checkDate?: string;
  checkDepositDate?: string;
  note: string;
  pieceJointe?: File;
}
