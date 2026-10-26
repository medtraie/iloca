import { useState, useEffect } from "react";
import { settingsRepository } from "@/repositories/settingsRepository";

export const SECURITY_PASSCODE = "SFTM@1.";
const STORAGE_KEY = "iloca:settings:hide_gps_modules";
const EVENT_NAME = "iloca:gps-visibility-change";

export const telemetryVisibilityService = {
  getIsHidden(): boolean {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  },

  verifyPasscode(code: string): boolean {
    return (code || "").trim() === SECURITY_PASSCODE;
  },

  setIsHidden(hidden: boolean): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, hidden ? "true" : "false");
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { hidden } }));
      // Asynchronously sync setting to cloud repository without blocking
      settingsRepository
        .upsertAppSettings({ hide_gps_modules: hidden })
        .catch((err) => console.warn("Failed to sync hide_gps_modules to cloud:", err));
    } catch (e) {
      console.warn("Could not save GPS visibility setting:", e);
    }
  },

  toggleWithCode(code: string): { success: boolean; newHiddenState?: boolean; error?: string } {
    if (!this.verifyPasscode(code)) {
      return { success: false, error: "Code d'autorisation incorrect." };
    }
    const current = this.getIsHidden();
    const next = !current;
    this.setIsHidden(next);
    return { success: true, newHiddenState: next };
  },

  subscribe(callback: (hidden: boolean) => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handleEvent = (e: any) => {
      callback(e?.detail?.hidden ?? this.getIsHidden());
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        callback(e.newValue === "true");
      }
    };
    window.addEventListener(EVENT_NAME, handleEvent);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, handleEvent);
      window.removeEventListener("storage", handleStorage);
    };
  },
};

export function useTelemetryVisibility() {
  const [isGpsHidden, setIsGpsHidden] = useState<boolean>(() =>
    telemetryVisibilityService.getIsHidden()
  );

  useEffect(() => {
    // Sync initial state from repository if available
    settingsRepository.listAppSettings().then((settings) => {
      if (settings && typeof settings.hide_gps_modules === "boolean") {
        if (settings.hide_gps_modules !== telemetryVisibilityService.getIsHidden()) {
          telemetryVisibilityService.setIsHidden(settings.hide_gps_modules);
        }
      }
    }).catch(() => {});

    return telemetryVisibilityService.subscribe((hidden) => {
      setIsGpsHidden(hidden);
    });
  }, []);

  return {
    isGpsHidden,
    setIsGpsHidden: (hidden: boolean) => telemetryVisibilityService.setIsHidden(hidden),
    toggleWithCode: (code: string) => telemetryVisibilityService.toggleWithCode(code),
    verifyPasscode: (code: string) => telemetryVisibilityService.verifyPasscode(code),
  };
}
