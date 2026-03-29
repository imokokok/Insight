import { TellorClient } from './tellor';

let tellorClientInstance: TellorClient | null = null;

export function getTellorClient(): TellorClient {
  if (!tellorClientInstance) {
    tellorClientInstance = new TellorClient();
  }
  return tellorClientInstance;
}

export function resetTellorClient(): void {
  tellorClientInstance = null;
}

export { TellorClient };
