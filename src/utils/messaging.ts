import type { Message } from '../types/index.js';

export function sendMessage<T>(msg: Message): Promise<T> {
  return chrome.runtime.sendMessage(msg) as Promise<T>;
}
