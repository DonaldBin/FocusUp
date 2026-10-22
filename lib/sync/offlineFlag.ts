/** Dev / test helper: force offline queue without Chrome Offline (which blocks localhost). */

export const FORCE_OFFLINE_KEY = "focusup.forceOffline";

export function isForceOffline(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.sessionStorage.getItem(FORCE_OFFLINE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setForceOffline(on: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (on) {
      window.sessionStorage.setItem(FORCE_OFFLINE_KEY, "1");
    } else {
      window.sessionStorage.removeItem(FORCE_OFFLINE_KEY);
    }
    window.dispatchEvent(new Event("focusup-sync-queue-changed"));
  } catch {
    // ignore
  }
}
