"""
Paranoid manager class. Interfaces directly with Keybase, and abstracts away all of the
file structure from the main app.

---

File structure for privately stored metadata is stored in /keybase/private, where
all files are encrypted as well as signed.

Example:
- File path:
  /keybase/private/irvinlim/paranoid/services/http:google.com:80/info.json (origin name)
- Contents:
  ```
  {"origin": "http://google.com:80"}
  ```

- File path:
  /keybase/private/irvinlim/paranoid/services/http:google.com:80/uids/1.json (service identity UID)
- Contents:
  ```
  {
    "key": "MIIC...",
    "fields": {
      "first_name": {
        "shared_with": ["malte"],
        "type": "str"
      },
      "last_name": {
        "shared_with": [],
        "type": "str"
      },
      "email": {
        "shared_with": [],
        "type": "str"
      },
    }
  }
  ```

File structure for (shared) identities is stored in /keybase/public, where files are only
signed by default. However, we enforce files to be encrypted for only the users who are
authorized to view the contents of the file.

Example:
- File path:
  /keybase/public/irvinlim/paranoid/ids/ac9055add1d71c8523362c02ec92232c9bb0c7fe26e46a095d4d821c56b533be
    (the hash is `sha256("http:google.com:80:1:first_name")`)
- Contents:
  ```
  BEGIN KEYBASE SALTPACK ENCRYPTED MESSAGE...
  ```
"""

import json
import os
from typing import List

from Crypto.Hash import SHA256

from keybase import KeybaseClient


class ParanoidException(Exception):
    pass


class ParanoidManager():
    def __init__(self, keybase: KeybaseClient):
        self.keybase = keybase

    def get_origins(self) -> List[str]:
        "Returns a list of origins."

        path = self.keybase.get_private('services')
        return self.keybase.list_dir(path)

    def get_service(self, origin):
        "Returns a service."

        # Check if origin exists
        path = self.keybase.get_private(os.path.join('services', origin))
        if not self.keybase.exists(path):
            return None

        # Get info
        path = self.keybase.get_private(os.path.join('services', origin, 'info.json'))
        return self.keybase.get_json(path)

    def set_service(self, origin, service):
        "Updates a service."

        # Make sure that paths exist
        path = self.keybase.get_private(os.path.join('services', origin))
        self.keybase.ensure_dir(path)
        path = self.keybase.get_private(os.path.join('services', origin, 'uids'))
        self.keybase.ensure_dir(path)

        # Save info
        path = self.keybase.get_private(os.path.join('services', origin, 'info.json'))
        self.keybase.put_file(path, json.dumps(service))

    def get_service_uids(self, origin) -> List[str]:
        "Returns a list of UIDs corresponding to all identities for a service."

        # Check if origin exists
        path = self.keybase.get_private(os.path.join('services', origin))
        if not self.keybase.exists(path):
            return []

        # Get identities
        path = self.keybase.get_private(os.path.join('services', origin, 'uids'))
        return [uid[:-5] for uid in self.keybase.list_dir(path, '*.json')]

    def get_service_identity(self, origin, uid):
        "Returns a service identity."

        # Check if origin and identity exists
        path = self.keybase.get_private(os.path.join('services', origin, 'uids', '{}.json'.format(uid)))
        if not self.keybase.exists(path):
            return None

        # Read service identity metadata
        return self.keybase.get_json(path)

    def set_service_identity(self, origin, uid, identity):
        "Updates a service identity."

        # Ensure that service exists
        service = self.get_service(origin)
        if service is None:
            raise ParanoidException('Service does not exist for origin: {}'.format(origin))

        # Ensure parent directory exists
        path = self.keybase.get_private(os.path.join('services', origin, 'uids'))
        self.keybase.ensure_dir(path)

        # Save service identity
        path = self.keybase.get_private(os.path.join('services', origin, 'uids', '{}.json'.format(uid)))
        return self.keybase.put_file(path, json.dumps(identity))

    def validate_field_name(self, identity, field_name):
        "Validates a field name for a service identity."

        fields = identity.get('fields')
        if not fields:
            raise ParanoidException('Malformed service identity')
        if field_name not in fields:
            raise ParanoidException('"{}" is not a valid field name for service identity'.format(field_name))

    def decrypt_data_file(self, origin, uid, field_name):
        "Decrypts a data file."

        # Construct field tuple <origin, uid, field_name>
        field_tuple = (origin, uid, field_name)
        field_hash = self.get_field_hash(field_tuple)

        # Check if data file exists
        data_path = self.keybase.get_public(os.path.join('ids', field_hash))
        if not self.keybase.exists(data_path):
            return None

        # Attempt to decrypt the data file
        return self.keybase.decrypt(data_path)

    def encrypt_data_file(self, origin, uid, field_name, data, shared_users):
        "Encrypts a data file with a new list of shared users."

        # Construct field tuple <origin, uid, field_name>
        field_tuple = (origin, uid, field_name)
        field_hash = self.get_field_hash(field_tuple)

        # If shared users is an empty list, add own username to prevent error
        if not shared_users:
            shared_users = [self.keybase.get_username()]

        # Write to the file encrypted for the list of users
        path = self.keybase.get_public(os.path.join('ids', field_hash))
        self.keybase.encrypt(path, data, shared_users)

    def reencrypt_data_file(self, origin, uid, field_name, shared_users):
        "Re-encrypts a data file with a new list of shared users."

        # Fetch existing data
        data = self.decrypt_data_file(origin, uid, field_name)
        if data is None:
            raise ParanoidException('Could not locate data file for {}:{}:{}'.format(origin, uid, field_name))

        # Re-encrypt the file with the new list of shared users
        self.encrypt_data_file(origin, uid, field_name, data, shared_users)

    def get_field_hash(self, field_tuple):
        "Return the SHA256 hash of a <origin, uid, field_name> tuple."
        origin, uid, field_name = field_tuple
        h = SHA256.new()
        key = '{}:{}:{}'.format(origin, uid, field_name)
        h.update(key.encode('utf-8'))
        return h.digest().hex()
