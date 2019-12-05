const SESSION_TOKEN_KEY = 'session_token';
const DAEMON_URL_KEY = 'daemon_url';

class ParanoidStorage {
  static async checkAlive() {
    try {
      await this._get('/');
      return true;
    } catch {
      return false;
    }
  }

  static async checkToken() {
    try {
      await this._get('/auth');
      return true;
    } catch {
      return false;
    }
  }

  static async getOrigins() {
    const originKeys = await this._get('services');
    return originKeys.map(key => this.keyToOrigin(key));
  }

  static async getService(origin) {
    return await this._get(`services/${this.originToKey(origin)}`);
  }

  static async setService(origin, service) {
    return await this._postJSON(`services/${this.originToKey(origin)}`, service);
  }

  static async deleteService(origin) {
    return await this._remove(`services/${this.originToKey(origin)}`);
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
      foreign_map: {},
    });

    return created;
  }

  static async getServiceIdentities(origin) {
    const service = await this.getService(origin);
    if (!service) {
      return [];
    }

    return await Promise.all(service.uids.map(uid => this.getServiceIdentity(origin, uid)));
  }

  static async getServiceIdentity(origin, uid) {
    return await this._get(`services/${this.originToKey(origin)}/identities/${uid}`);
  }

  static async setServiceIdentity(origin, uid, identity) {
    return await this._postJSON(`services/${this.originToKey(origin)}/identities/${uid}`, identity);
  }

  static async deleteServiceIdentity(origin, uid) {
    return await this._remove(`services/${this.originToKey(origin)}/identities/${uid}`);
  }

  static async createServiceIdentity(origin, uid, key, fields) {
    if (!origin || !uid) {
      throw new Error(`Origin and uid are required: origin=${origin} uid=${uid}`);
    }

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
      fields,
    });

    return created;
  }

  static async setServiceIdentityMap(origin, uid, map_key, map_value) {
    return await this._post(
      `services/${this.originToKey(origin)}/identities/${uid}/${map_key}`,
      map_value
    );
  }

  static async getServiceForeignMap(origin) {
    return await this._get(`services/${this.originToKey(origin)}/foreign_map`);
  }

  static async addServiceForeignMap(origin, uid, field_name, username) {
    return await this._post(
      `services/${this.originToKey(origin)}/foreign_map/${uid}/${field_name}/${username}`
    );
  }

  static async removeServiceForeignMap(origin, uid, field_name, username) {
    return await this._remove(
      `services/${this.originToKey(origin)}/foreign_map/${uid}/${field_name}/${username}`
    );
  }

  static async getLocal(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], function(items) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(items[key]);
        }
      });
    });
  }

  static async setLocal(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, function(items) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  static async getDaemonURL() {
    return await this.getLocal(DAEMON_URL_KEY);
  }

  static async setDaemonURL(url) {
    return await this.setLocal(DAEMON_URL_KEY, url);
  }

  static async getSessionToken() {
    return await this.getLocal(SESSION_TOKEN_KEY);
  }

  static async setSessionToken(token) {
    return await this.setLocal(SESSION_TOKEN_KEY, token);
  }

  static async _get(path) {
    const url = new URL(path, await this.getDaemonURL());
    const res = await sendXHR('GET', url.href, null, {
      headers: {
        Authorization: await this.getSessionToken(),
      },
    });
    return res.data;
  }

  static async _postJSON(path, data) {
    const url = new URL(path, await this.getDaemonURL());
    const json = JSON.stringify(data);
    await sendXHR('POST', url.href, json, {
      headers: {
        Authorization: await this.getSessionToken(),
        'Content-Type': 'application/json',
      },
    });
    return data;
  }

  static async _post(path, data) {
    const url = new URL(path, await this.getDaemonURL());
    await sendXHR('POST', url.href, data, {
      headers: {
        Authorization: await this.getSessionToken(),
      },
    });
    return data;
  }

  static async _remove(path) {
    const url = new URL(path, await this.getDaemonURL());
    await sendXHR('DELETE', url.href, null, {
      headers: {
        Authorization: await this.getSessionToken(),
      },
    });
  }

  static keyToOrigin(key) {
    const regExp = new RegExp(
      /^(?<scheme>[a-z]+):(?<hostname>[a-z0-9]+[a-z0-9-]*(?:\.[a-z0-9-]+)*):(?<port>\d+)$/
    );
    if (!regExp.test(key)) {
      throw new Error(`${key} is not an originKey`);
    }

    const matches = key.match(regExp);
    if (matches === null || !('groups' in matches)) {
      throw new Error(`${key} is not an originKey`);
    }

    const { scheme, hostname, port } = matches.groups;
    return `${scheme}://${hostname}:${port}`;
  }

  static originToKey(origin) {
    const regExp = new RegExp(
      /^(?<scheme>[a-z]+):\/\/(?<hostname>[a-z0-9]+[a-z0-9-]*(?:\.[a-z0-9-]+)*)(?::(?<port>\d+))?$/
    );
    if (!regExp.test(origin)) {
      throw new Error(`${origin} is not an origin`);
    }

    const matches = origin.match(regExp);
    if (matches === null || !('groups' in matches)) {
      throw new Error(`${origin} is not an origin`);
    }

    let { scheme, hostname, port } = matches.groups;

    // Assume well-defined scheme/port combinations
    if (!port || port.length === 0) {
      switch (scheme) {
        case 'http':
          port = '80';
          break;
        case 'https':
          port = '443';
          break;
        default:
          throw new Error(`No port explicitly defined, no default for scheme ${scheme}`);
      }
    }

    return `${scheme}:${hostname}:${port}`;
  }
}
