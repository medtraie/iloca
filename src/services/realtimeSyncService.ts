import { getSupabaseClient } from "@/services/supabaseService";
import { QueryClient } from "@tanstack/react-query";

type SyncCallback = (payload: { table: string; eventType: string; new: any; old: any }) => void;

const listeners = new Set<SyncCallback>();
let isSubscribed = false;

export const realtimeSyncService = {
  /**
   * Subscribe to real-time database changes across all core tables
   * to ensure instant synchronization between Web, Android, and iOS (Flutter).
   */
  init(queryClient?: QueryClient) {
    if (isSubscribed) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    isSubscribed = true;

    const tables = [
      "clients",
      "vehicles",
      "contracts",
      "payments",
      "expenses",
      "miscellaneous_expenses",
      "repairs",
      "invoices",
      "app_settings",
      "gpswox_settings",
      "gpswox_devices_cache",
    ];

    const channel = supabase.channel("iloca-cross-platform-sync");

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          // Notify custom listeners (hooks & pages)
          listeners.forEach((cb) => {
            try {
              cb({
                table,
                eventType: payload.eventType,
                new: payload.new,
                old: payload.old,
              });
            } catch (err) {
              console.warn("[RealtimeSync] listener error:", err);
            }
          });

          // Dispatch global DOM custom event so any component can react immediately
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("iloca:realtime-sync", {
                detail: { table, eventType: payload.eventType, new: payload.new, old: payload.old },
              })
            );
          }

          // Invalidate React Query caches if present
          if (queryClient) {
            queryClient.invalidateQueries();
          }
        }
      );
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.info("[RealtimeSync] Connected: Instant sync active between Web, Android & iOS.");
      }
    });
  },

  subscribe(callback: SyncCallback): () => void {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },
};
