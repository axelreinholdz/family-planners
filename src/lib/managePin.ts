const STORAGE_KEY = "family-planners-manage-pin";
export const DEFAULT_MANAGE_PIN = "1234";

export function getManagePin(): string {
  if (typeof window === "undefined") return DEFAULT_MANAGE_PIN;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && /^\d{4,6}$/.test(stored)) return stored;
  return DEFAULT_MANAGE_PIN;
}

export function setManagePin(pin: string): void {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error("PIN måste vara 4–6 siffror");
  }
  window.localStorage.setItem(STORAGE_KEY, pin);
}

export function verifyManagePin(input: string): boolean {
  return input === getManagePin();
}

export function isDefaultManagePin(): boolean {
  return getManagePin() === DEFAULT_MANAGE_PIN;
}
