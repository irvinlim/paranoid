/**
 * Storage abstractions for storing keys, data, mappings, etc.
 * For now, uses the HTML5 localStorage API, but we probably want to change this
 * because localStorage is not secure.
 */

class ParanoidStorage {
  static async getOrigin(origin) {
    return await this.get(`ORIGIN:${origin}`);
  }

  static async createOrigin(origin) {
    const data = { origin };
    await this.set(`ORIGIN:${origin}`, data);
    return data;
  }

  static async setOriginKey(origin, key) {
    let obj = await this.get(`ORIGIN:${origin}`);
    if (!obj) obj = { origin };
    obj.key = key;
    await this.set(`ORIGIN:${origin}`, obj);
  }

  static async setOriginUID(origin, uid) {
    let obj = await this.get(`ORIGIN:${origin}`);
    if (!obj) obj = { origin };
    origin.uid = uid;
    await this.set(`ORIGIN:${origin}`, obj);
  }

  static async get(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], function(items) {
        if (chrome.runtime.lastError) {
          resolve(undefined);
        } else {
          resolve(items[key]);
        }
      });
    });
  }

  static async set(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
        } else {
          resolve();
        }
      });
    });
  }

  static async _getAll() {
    return new Promise(resolve => {
      chrome.storage.local.get(null, function(items) {
        resolve(items);
      });
    });
  }
}
