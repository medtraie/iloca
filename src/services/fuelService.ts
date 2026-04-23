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

const KEY = "rental_app_fuel_logs";

function all(): FuelLog[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list: FuelLog[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function add(log: Omit<FuelLog, "id">): FuelLog {
  const item: FuelLog = { ...log, id: Date.now().toString(36) };
  const list = all();
  list.push(item);
  save(list);
  return item;
}

function byMonth(year: number, month: number): FuelLog[] {
  return all().filter((l) => {
    const d = new Date(l.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

function monthlyCost(year: number, month: number): number {
  return byMonth(year, month).reduce((s, l) => s + l.price, 0);
}

function consumptionPerVehicle(year: number, month: number): Record<string, number> {
  const map: Record<string, number> = {};
  byMonth(year, month).forEach((l) => {
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
