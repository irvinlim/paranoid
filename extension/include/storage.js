// TODO: Set daemon URL from settings
const DAEMON_BASE_URL = 'http://127.0.0.1:5000';

class ParanoidStorage {
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
      throw new Error('Service does not exist');
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

  static async _get(path) {
    const url = new URL(path, DAEMON_BASE_URL);
    const res = await sendXHR('GET', url.href);
    return res.data;
  }

  static async _postJSON(path, data) {
    const url = new URL(path, DAEMON_BASE_URL);
    const json = JSON.stringify(data);
    await sendXHR('POST', url.href, json, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return data;
  }

  static async _post(path, data) {
    const url = new URL(path, DAEMON_BASE_URL);
    await sendXHR('POST', url.href, data);
    return data;
  }

  static async _remove(path) {
    const url = new URL(path, DAEMON_BASE_URL);
    await sendXHR('DELETE', url.href);
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
