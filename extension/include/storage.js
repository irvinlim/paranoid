/**
 * Storage abstractions for storing keys, data, mappings, etc.
 * For now, uses the HTML5 localStorage API, but we probably want to change this
 * because localStorage is not secure.
 */

class ParanoidStorage {
  static async addOrigin(origin) {
    let origins = await this.getOrigins();
    if (!origins) {
      origins = [];
    }

    if (!origins.includes(origin)) {
      origins.push(origin);
      this.set('origins', origins);
    }
  }

  static async getOrigins() {
    return await this.get('origins');
  }

  static async getService(origin) {
    return await this.get(`services/${origin}`);
  }

  static async setService(origin, service) {
    return await this.set(`services/${origin}`, service);
  }

  static async deleteService(origin) {
    return await this.remove(`services/${origin}`);
  }

  static async createService(origin) {
    // Ensure identity doesn't already exist
    const service = await this.getService(origin);
    if (service) {
      throw new Error(`Service already exists for ${origin}`);
    }

    // Create new service
    const created = await this.setService(origin, {
      origin,
      uids: [],
      foreign_map: {},
    });

    // Create origin mapping
    await this.addOrigin(origin);

    return created;
  }

  static async getServiceIdentities(origin) {
    const service = await this.getService(origin);
    if (!service) {
      throw new Error('Service does not exist');
    }

    return await Promise.all(service.uids.map(uid => this.getServiceIdentity(origin, uid)));
  }

  static async getServiceIdentity(origin, uid) {
    return await this.get(`services/${origin}/identities/${uid}`);
  }

  static async setServiceIdentity(origin, uid, identity) {
    return await this.set(`services/${origin}/identities/${uid}`, identity);
  }

  static async deleteServiceIdentity(origin, uid) {
    return await this.remove(`services/${origin}/identities/${uid}`);
  }

  static async createServiceIdentity(origin, uid, key) {
    // Ensure service exists
    const service = await this.getService(origin);
    if (!service) {
      await this.setService(origin, service, { origin, foreign_map: {} });
    }

    // Ensure identity doesn't already exist
    const identity = await this.getServiceIdentity(origin, uid);
    if (identity) {
      throw new Error(`Identity already exists for ${origin}:${uid}`);
    }

    // Create new identity for service
    const created = await this.setServiceIdentity(origin, uid, {
      origin,
      uid,
      key,
      map: {},
    });

    // Add new mapping to service
    if (!service.uids.includes(uid)) {
      service.uids.push(uid);
      await this.setService(origin, service);
    }

    return created;
  }

  static async setServiceForeignMap(origin, foreign_uid, map_key, map_value) {
    let service = await this.getService(origin);
    if (!service) {
      throw new Error('Service does not exist');
    }

    if (!(foreign_uid in service.foreign_map)) {
      service.foreign_map[foreign_uid] = {};
    }
    service.foreign_map[foreign_uid][map_key] = map_value;
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
          resolve(value);
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
