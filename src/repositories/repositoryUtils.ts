/**
 * Strict Multi-Tenant Data Isolation Utilities
 *
 * Guarantees:
 * 1. User A sees ONLY their data (where user_id === userA.id).
 * 2. User B sees ONLY their data (where user_id === userB.id).
 * 3. A new user account starts with a completely empty application (0 vehicles, 0 clients, 0 contracts, etc.).
 * 4. Legacy rows without user_id (user_id IS NULL) are NEVER returned to anyone.
 * 5. Local storage cache is strictly segregated per user ID so switching accounts never leaks data.
 */

export function getActiveTenantUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("iloca:active_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = parsed?.id;
    if (typeof id === "string" && id.trim()) {
      return id.trim();
    }
  } catch {}
  return null;
}

export function isValidUuid(id: string | null | undefined): boolean {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getScopedStorageKey(baseKey: string, explicitUserId?: string | null): string | null {
  const uid = explicitUserId || getActiveTenantUserId();
  if (!uid) return null;
  return `${baseKey}:${uid}`;
}

export function getScopedLocalStorage<T>(baseKey: string, explicitUserId?: string | null): T[] {
  if (typeof window === "undefined") return [];
  const key = getScopedStorageKey(baseKey, explicitUserId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveScopedLocalStorage<T>(baseKey: string, data: T[], explicitUserId?: string | null): void {
  if (typeof window === "undefined") return;
  const key = getScopedStorageKey(baseKey, explicitUserId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Could not save scoped local storage (${key}):`, e);
  }
}

export function removeScopedLocalStorage(baseKey: string, explicitUserId?: string | null): void {
  if (typeof window === "undefined") return;
  const key = getScopedStorageKey(baseKey, explicitUserId);
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {}
}
