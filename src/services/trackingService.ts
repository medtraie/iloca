type Position = {
  timestamp: number;
  lat: number;
  lng: number;
  speed?: number;
};

const key = (vehicleId: string) => `rental_app_tracking_${vehicleId}`;

function getPositions(vehicleId: string): Position[] {
  try {
    const raw = localStorage.getItem(key(vehicleId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setPositions(vehicleId: string, positions: Position[]) {
  localStorage.setItem(key(vehicleId), JSON.stringify(positions));
}

function addPosition(vehicleId: string, p: Position) {
  const arr = getPositions(vehicleId);
  arr.push(p);
  setPositions(vehicleId, arr);
}

function lastPosition(vehicleId: string): Position | null {
  const arr = getPositions(vehicleId);
  return arr.length ? arr[arr.length - 1] : null;
}

function seedDemoPositions(vehicleId: string) {
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
  setPositions(vehicleId, pts);
}

function clearPositions(vehicleId: string) {
  localStorage.removeItem(key(vehicleId));
}

function isOffline(vehicleId: string, maxAgeMs = 24 * 3600 * 1000): boolean {
  const last = lastPosition(vehicleId);
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
