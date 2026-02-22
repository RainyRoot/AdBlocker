import { storageGet, storageSet } from './storage.js';

let pending = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

export function incrementBlockedCount(): void {
  pending++;
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    const current = (await storageGet('blockedCount')) ?? 0;
    await storageSet('blockedCount', current + pending);
    pending = 0;
  }, 1000);
}
