import { Data } from '../data/data';
import { Storage } from './storage';

const TRUSTED_WEBSITES_ID = 'trusted-websites';

export class TrustedWebsitesController {
  private static loaded: boolean = false;
  private static trustedWebsites: Set<string> = new Set();

  public static isTrusted(hostname: string): boolean {
    return this.trustedWebsites.has(hostname);
  }

  public static async addToTrusted(hostname: string): Promise<void> {
    await this.load();
    if (!this.trustedWebsites.has(hostname)) {
      this.trustedWebsites.add(hostname);
      await this.saveToDB(TRUSTED_WEBSITES_ID, this.trustedWebsites);
    }
  }

  public static async removeFromTrusted(hostnames: Array<string>): Promise<void> {
    await this.load();
    let changes = false;
    hostnames.forEach(hostname => {
      if (this.trustedWebsites.has(hostname)) {
        this.trustedWebsites.delete(hostname);
        changes = true;
      }
    });

    if (changes) {
      await this.saveToDB(TRUSTED_WEBSITES_ID, this.trustedWebsites);
    }
  }

  public static getTrustedWebsites(): Array<string> {
    return [...this.trustedWebsites];
  }

  // ---- DB

  public static async load() {
    if (!this.loaded) {
      this.trustedWebsites = await this.getTrustedWebsitesFromDB(TRUSTED_WEBSITES_ID);
      this.loaded = true;
    }
  }

  public static reset() {
    this.loaded = false;
    this.trustedWebsites = new Set();
  }

  private static async getTrustedWebsitesFromDB(id: string): Promise<Set<string>> {
    const data = await Data.getItemById(id);
    if (!data || !data.value) {
      return new Set();
    }

    return new Set(data.value);
  }

  private static async saveToDB(id: string, hostnames: Set<string>): Promise<void> {
    await Storage.put(id, [...hostnames]);
  }
}
