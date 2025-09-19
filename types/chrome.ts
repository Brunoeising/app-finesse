// types/chrome.ts
export interface ChromeStorage {
  get(keys: string[]): Promise<Record<string, any>>;
  set(items: Record<string, any>): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

export interface ChromeAlarm {
  name: string;
  periodInMinutes: number;
}