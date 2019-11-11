/**
 * Storage abstractions for storing keys, data, mappings, etc.
 * For now, uses the HTML5 localStorage API, but we probably want to change this
 * because localStorage is not secure.
 */

class ParanoidStorage {
  static servicesHash = 'SVC';

  static async getService(origin) {
    return await this.get(`${ParanoidStorage.servicesHash}:${origin}`);
  }

  static async setService(origin, service) {
    return await this.set(`${ParanoidStorage.servicesHash}:${origin}`, service);
  }

  static async createService(origin) {
    const service = { origin };
    this.setService(origin, service);
    return service;
  }

  static async setServiceKey(origin, key) {
    let service = await this.getService(origin);
    if (!service) service = { origin };
    service.key = key;
    await this.setService(origin, service);
  }

  static async setServiceUID(origin, uid) {
    let service = await this.getService(origin);
    if (!service) service = { origin };
    service.uid = uid;
    await this.setService(origin, service);
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
