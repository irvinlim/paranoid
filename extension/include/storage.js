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

  static async deleteService(origin) {
    return await this.remove(`${ParanoidStorage.servicesHash}:${origin}`);
  }

  static async createService(origin) {
    const service = { origin, map: {}, foreign_map: {} };
    this.setService(origin, service);
    return service;
  }

  static async setServiceKey(origin, key) {
    let service = await this.getService(origin);
    if (!service) service = createService(origin);
    service.key = key;
    await this.setService(origin, service);
  }

  static async setServiceUID(origin, uid) {
    let service = await this.getService(origin);
    if (!service) service = createService(origin);
    service.uid = uid;
    await this.setService(origin, service);
  }

  static async setServiceMap(origin, map_key, map_value) {
    let service = await this.getService(origin);
    if (!service) service = createService(origin);
    service.map[map_key] = map_value;
    await this.setService(origin, service);
  }

  static async setServiceForeignMap(origin, foreign_uid, map_key, map_value) {
    let service = await this.getService(origin);
    if (!service) service = createService(origin);
    if (!(foreign_uid in service.foreign_map)) {
      service.foreign_map[foreign_uid] = {};
    }
    service.foreign_map[foreign_uid][map_key] = map_value;
    await this.setService(origin, service);
  }

  static async get(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get([key], function(items) {
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
      chrome.storage.sync.set({ [key]: value }, function() {
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
      chrome.storage.sync.get(null, function(items) {
        resolve(items);
      });
    });
  }
}
