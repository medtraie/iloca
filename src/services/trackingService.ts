import { trackingRepository, Position } from "@/repositories/trackingRepository";

async function getPositions(vehicleId: string): Promise<Position[]> {
  return trackingRepository.getPositions(vehicleId);
}

async function setPositions(vehicleId: string, positions: Position[]) {
  return trackingRepository.setPositions(vehicleId, positions);
}

async function addPosition(vehicleId: string, p: Position) {
  return trackingRepository.addPosition(vehicleId, p);
}

async function lastPosition(vehicleId: string): Promise<Position | null> {
  const arr = await getPositions(vehicleId);
  return arr.length ? arr[arr.length - 1] : null;
}

async function seedDemoPositions(vehicleId: string) {
  const base = { lat: 33.5731, lng: -7.5898 };
  const now = Date.now();
  const pts: Position[] = [];
  for (let i = 0; i < 20; i++) {
    const offLat = (Math.random() - 0.5) * 0.04;
    const offLng = (Math.random() - 0.5) * 0.04;
    pts.push({
      timestamp: now - (20 - i) * 60000,
      lat: base.lat + offLat,
      lng: base.lng + offLng,
      speed: Math.round(30 + Math.random() * 40),
    });
  }
  await setPositions(vehicleId, pts);
}

async function clearPositions(vehicleId: string) {
  return trackingRepository.clearPositions(vehicleId);
}

async function isOffline(vehicleId: string, maxAgeMs = 24 * 3600 * 1000): Promise<boolean> {
  const last = await lastPosition(vehicleId);
  if (!last) return true;
  return Date.now() - last.timestamp > maxAgeMs;
}

export const trackingService = {
  getPositions,
  setPositions,
  addPosition,
  lastPosition,
  seedDemoPositions,
  clearPositions,
  isOffline,
};
