import { createClient, SupabaseClient } from "@supabase/supabase-js";

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

let client: SupabaseClient | null = null;

const getSupabaseUrl = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (envUrl) return envUrl;
  const fallbackRef = "wypifrsooooeejfckomg";
  return `https://${fallbackRef}.supabase.co`;
};

const getSupabaseKey = () => {
  const publishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const legacyAnon = import.meta.env.VITE_SUPABASE_LEGACY_ANON_KEY as string | undefined;
  return publishable || anon || legacyAnon || "";
};

export const isSupabaseConfigured = () => Boolean(getSupabaseUrl() && getSupabaseKey());

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  client = createClient(getSupabaseUrl(), getSupabaseKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  return client;
};

export async function saveGpsSnapshot(snapshotType: string, payload: JsonValue) {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    await sb.from("gpswox_snapshots").insert({
      snapshot_type: snapshotType,
      payload,
      source: "gpswox"
    });
  } catch {
  }
}

export async function upsertGpsDevicesCache(
  devices: Array<{ external_id: string; name: string; plate?: string; payload: JsonValue }>
) {
  const sb = getSupabaseClient();
  if (!sb || !devices.length) return;
  try {
    await sb.from("gpswox_devices_cache").upsert(devices, { onConflict: "external_id" });
  } catch {
  }
}

export async function getLatestCachedPayload(tableName: string): Promise<JsonValue[] | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from(tableName)
      .select("payload")
      .order("id", { ascending: false })
      .limit(1);
    const row = data?.[0] as { payload?: JsonValue | JsonValue[] } | undefined;
    if (!row?.payload) return null;
    if (Array.isArray(row.payload)) return row.payload;
    return [row.payload];
  } catch {
    return null;
  }
}

export async function getLatestSnapshotPayload(snapshotType: string): Promise<JsonValue[] | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from("gpswox_snapshots")
      .select("payload")
      .eq("snapshot_type", snapshotType)
      .order("id", { ascending: false })
      .limit(1);
    const row = data?.[0] as { payload?: JsonValue | JsonValue[] } | undefined;
    if (!row?.payload) return null;
    if (Array.isArray(row.payload)) return row.payload;
    return [row.payload];
  } catch {
    return null;
  }
}
