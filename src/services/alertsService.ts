type Severity = "info" | "warning" | "critical";

export type AlertItem = {
  id: string;
  type: "maintenance_due" | "insurance_expiration" | "vehicle_offline" | "fuel_abnormal" | "contract_expiration";
  severity: Severity;
  title: string;
  message: string;
  date: string;
  vehicleId?: string;
  contractId?: string;
};

import { localStorageService, Vehicle, Contract } from "@/services/localStorageService";
import { trackingService } from "./trackingService";
import { fuelService } from "./fuelService";

function compute(): AlertItem[] {
  const alerts: AlertItem[] = [];
  const vehicles = localStorageService.getAll<Vehicle>("vehicles");
  const contracts = localStorageService.getAll<Contract>("contracts");
  const now = new Date();
  vehicles.forEach((v) => {
    const offline = trackingService.isOffline(v.id);
    if (offline) {
      alerts.push({
        id: `offline_${v.id}`,
        type: "vehicle_offline",
        severity: "warning",
        title: "Véhicule hors ligne",
        message: `${v.marque || v.brand || "Véhicule"} ${v.modele || v.model || ""} semble hors ligne`,
        date: new Date().toISOString(),
        vehicleId: v.id,
      });
    }
    const km = v.kilometrage || v.km_depart || 0;
    if (km > 30000) {
      alerts.push({
        id: `maint_${v.id}`,
        type: "maintenance_due",
        severity: "info",
        title: "Maintenance recommandée",
        message: `Kilométrage ${km.toLocaleString()} km, vérifier l'entretien`,
        date: new Date().toISOString(),
        vehicleId: v.id,
      });
    }
    const any: any = v as any;
    if (any.insurance_expiration) {
      const exp = new Date(any.insurance_expiration);
      const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
      if (diff <= 14) {
        alerts.push({
          id: `ins_${v.id}`,
          type: "insurance_expiration",
          severity: diff <= 3 ? "critical" : "warning",
          title: "Assurance proche d'expiration",
          message: `Expire dans ${diff} jour(s)`,
          date: new Date().toISOString(),
          vehicleId: v.id,
        });
      }
    }
  });
  contracts.forEach((c) => {
    const end = new Date(c.end_date);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (diff >= 0 && diff <= 3 && c.status !== "completed" && c.status !== "ferme") {
      alerts.push({
        id: `contract_${c.id}`,
        type: "contract_expiration",
        severity: diff <= 1 ? "warning" : "info",
        title: "Contrat proche d'expiration",
        message: `Contrat ${c.contract_number} expire dans ${diff} jour(s)`,
        date: new Date().toISOString(),
        contractId: c.id,
      });
    }
  });
  const y = now.getFullYear();
  const m = now.getMonth();
  const cons = fuelService.consumptionPerVehicle(y, m);
  Object.keys(cons).forEach((vid) => {
    if (cons[vid] > 200) {
      alerts.push({
        id: `fuel_${vid}`,
        type: "fuel_abnormal",
        severity: "warning",
        title: "Consommation carburant élevée",
        message: `Consommation mensuelle ${Math.round(cons[vid])} L`,
        date: new Date().toISOString(),
        vehicleId: vid,
      });
    }
  });
  return alerts;
}

function groupCount(items: AlertItem[]) {
  return items.reduce(
    (acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    },
    {} as Record<Severity, number>
  );
}

export const alertsService = {
  compute,
  groupCount,
};
