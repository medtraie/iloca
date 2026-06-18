import { fuelRepository } from "@/repositories/fuelRepository";

export type FuelLog = {
  id: string;
  vehicleId: string;
  driver?: string;
  quantity: number;
  price: number;
  station?: string;
  date: string;
  odometer?: number;
};

async function all(): Promise<FuelLog[]> {
  return fuelRepository.getAll();
}

async function add(log: Omit<FuelLog, "id">): Promise<FuelLog> {
  return fuelRepository.create(log);
}

async function byMonth(year: number, month: number): Promise<FuelLog[]> {
  return fuelRepository.getByMonth(year, month);
}

async function monthlyCost(year: number, month: number): Promise<number> {
  const logs = await byMonth(year, month);
  return logs.reduce((s, l) => s + l.price, 0);
}

async function consumptionPerVehicle(year: number, month: number): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  const logs = await byMonth(year, month);
  logs.forEach((l) => {
    map[l.vehicleId] = (map[l.vehicleId] || 0) + l.quantity;
  });
  return map;
}

export const fuelService = {
  all,
  add,
  byMonth,
  monthlyCost,
  consumptionPerVehicle,
};
