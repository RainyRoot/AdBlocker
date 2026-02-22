import type { ExtensionStorage } from '../types/index.js';

export async function storageGet<K extends keyof ExtensionStorage>(
  key: K
): Promise<ExtensionStorage[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as ExtensionStorage[K] | undefined;
}

export async function storageSet<K extends keyof ExtensionStorage>(
  key: K,
  value: ExtensionStorage[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}
