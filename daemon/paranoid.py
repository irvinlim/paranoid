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
  /keybase/private/irvinlim/paranoid/services/http:google.com:80/foreign_map.json (origin name)
- Contents:
  ```
  [
    {
      "username": "brandontjs",
      "uid": "1",
      "field_name": "first_name"
    }
  ]
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
from typing import Dict, List
from urllib.parse import urlencode

from Crypto.Hash import SHA256

from keybase import KeybaseClient
from cache import ParanoidCache


class ParanoidException(Exception):
    pass


class ParanoidManager():
    def __init__(self, keybase: KeybaseClient):
        self.keybase = keybase
        self.cache = ParanoidCache()

    def init(self, disable_chat=False):
        self.disable_chat = disable_chat

    def get_origins(self) -> List[str]:
        "Returns a list of origins."

        # Check if cache hit
        data, cache_hit = self.cache.get_origins()
        if not cache_hit:
            path = self.keybase.get_private('services')

            # Convert origin filenames to origin keys
            data = [ParanoidManager.origin_filename_to_key(filename) for filename in self.keybase.list_dir(path)]

            #Update cache
            self.cache.add_origins(data)

        return data

    def get_service(self, origin):
        "Returns a service."

        # Check if cache hit
        data, cache_hit = self.cache.get_service(origin)
        if not cache_hit:
            # Check if origin and service exists
            path = self.get_service_path(origin)
            if not self.keybase.exists(path):
                return None

            path = self.get_service_path(origin, 'info.json')
            if not self.keybase.exists(path):
                return None

            # Get info
            data = self.keybase.get_json(path)

            #Update cache
            self.cache.set_service(origin, data)

        return data

    def set_service(self, origin, service):
        "Updates a service."

        # Make sure that paths exist
        path = self.get_service_path(origin)
        self.keybase.ensure_dir(path)
        path = self.get_service_path(origin, 'uids')
        self.keybase.ensure_dir(path)

        # Save info
        path = self.get_service_path(origin, 'info.json')
        self.keybase.put_file(path, json.dumps(service))

        # Update Cache
        self.cache.set_service(origin, json.dumps(service))

    def get_service_uids(self, origin) -> List[str]:
        "Returns a list of UIDs corresponding to all identities for a service."

        # Check if cache hit
        data, cache_hit = self.cache.get_service_uids(origin)
        if not cache_hit:
            # Check if origin exists
            path = self.get_service_path(origin)
            if not self.keybase.exists(path):
                return []

            # Get identities
            path = self.get_service_path(origin, 'uids')
            data = [uid[:-5] for uid in self.keybase.list_dir(path, '*.json')]

            #Update cache 
            self.cache.add_service_uids(origin, data)

        return data 

    def get_service_identity(self, origin, uid):
        "Returns a service identity."

        # Check if cache hit
        data, cache_hit = self.cache.get_service_identity(origin, uid)
        if not cache_hit:
            # Check if origin and identity exists
            path = self.get_service_path(origin, os.path.join('uids', '{}.json'.format(uid)))
            if not self.keybase.exists(path):
                return None

            # Read service identity metadata
            data = self.keybase.get_json(path)

            #Update cache 
            self.cache.set_service_identity(origin, uid, data)

        return data

    def set_service_identity(self, origin, uid, identity):
        "Updates a service identity."

        # Ensure that service exists
        service = self.get_service(origin)
        if service is None:
            raise ParanoidException('Service does not exist for origin: {}'.format(origin))

        # Ensure parent directory exists
        path = self.get_service_path(origin, 'uids')
        self.keybase.ensure_dir(path)

        # Save service identity
        path = self.get_service_path(origin, os.path.join('uids', '{}.json'.format(uid)))
        return self.keybase.put_file(path, json.dumps(identity))

        # Update Cache
        self.cache.set_service_identity(origin, uid, json.dumps(identity))

    def get_foreign_map(self, origin):
        "Returns the unresolved foreign map for a given origin."

        # Check if cache hit
        data, cache_hit = self.cache.get_foreign_map(origin)
        if not cache_hit:
            # Check if path exists
            path = self.get_service_path(origin, 'foreign_map.json')
            if not self.keybase.exists(path):
                return None

            # Read all mappings for origin
            data = self.keybase.get_json(path)

            #Update cache 
            self.cache.set_foreign_map(origin, data)

        return data

    def set_foreign_map(self, origin, foreign_map):
        "Returns the unresolved foreign map for a given origin."

        # Ensure that origin path exists
        path = self.get_service_path(origin)
        self.keybase.ensure_dir(path)

        # Save foreign map
        path = self.get_service_path(origin, 'foreign_map.json')
        data = self.keybase.put_file(path, json.dumps(foreign_map))

        #Update cache 
        self.cache.set_foreign_map(origin, data)

        return data

    def resolve_foreign_map(self, origin) -> List[Dict[str, str]]:
        "Returns a list of resolved foreign mappings for a given origin."

        # Read all mappings for origin
        foreign_map = self.get_foreign_map(origin)
        if foreign_map is None:
            return {}

        # Resolve each mapping
        resolved = {}
        for mapping in foreign_map:
            username = mapping.get('username')
            uid = mapping.get('uid')
            field_name = mapping.get('field_name')

            if not username or not uid or not field_name:
                continue

            # Attempt to decrypt the data file
            value = self.decrypt_data_file(origin, uid, field_name, username=username)
            if value is None:
                continue

            # Store resolved value in mapping
            if uid not in resolved:
                resolved[uid] = {}
            resolved[uid][field_name] = value

        return resolved

    def add_foreign_map(self, origin, uid, field_name, username):
        "Adds a new foreign map for a given origin."

        # Get existing foreign map
        foreign_map = self.get_foreign_map(origin)
        if foreign_map is None:
            foreign_map = []

        # Check if <uid, field_name, username> already exists in foreign map,
        # at the same time clean up any invalid entries
        new_map = []
        for mapping in foreign_map:
            map_username = mapping.get('username')
            map_uid = mapping.get('uid')
            map_field_name = mapping.get('field_name')

            if not map_username or not map_uid or not map_field_name:
                continue

            if map_username == username and map_uid == uid and map_field_name == field_name:
                raise ParanoidException('Mapping already exists for ({}, {}, {})'.format(uid, field_name, username))

            new_map.append({
                'username': map_username,
                'uid': map_uid,
                'field_name': map_field_name,
            })

        # Finally add the mapping
        new_map.append({
            'username': username,
            'uid': uid,
            'field_name': field_name,
        })

        # Write the mapping to file
        return self.set_foreign_map(origin, new_map)

    def remove_foreign_map(self, origin, uid, field_name, username):
        "Removes a new foreign map for a given origin."

        # Get existing foreign map
        foreign_map = self.get_foreign_map(origin)
        if foreign_map is None:
            raise ParanoidException('Foreign map does not exist for origin: {}'.format(origin))

        # Check if <uid, field_name, username> already exists in foreign map,
        # at the same time clean up any invalid entries
        found = False
        new_map = []
        for mapping in foreign_map:
            map_username = mapping.get('username')
            map_uid = mapping.get('uid')
            map_field_name = mapping.get('field_name')

            if not map_username or not map_uid or not map_field_name:
                continue

            if map_username == username and map_uid == uid and map_field_name == field_name:
                found = True
                continue

            new_map.append({
                'username': map_username,
                'uid': map_uid,
                'field_name': map_field_name,
            })

        # If mapping was not found, throw an error
        if not found:
            raise ParanoidException('Mapping does not exist for ({}, {}, {})'.format(uid, field_name, username))

        # Write the mapping to file
        return self.set_foreign_map(origin, new_map)

    def validate_field_name(self, identity, field_name):
        "Validates a field name for a service identity."

        fields = identity.get('fields')
        if not fields:
            raise ParanoidException('Malformed service identity')
        if field_name not in fields:
            raise ParanoidException('"{}" is not a valid field name for service identity'.format(field_name))

    def decrypt_data_file(self, origin, uid, field_name, username=None):
        "Decrypts a data file."

        # Check if cache hit
        data, cache_hit = self.cache.decrypt_data_file(origin, uid, field_name)
        if not cache_hit:
            # Construct field tuple <origin, uid, field_name>
            field_tuple = (origin, uid, field_name)
            field_hash = self.get_field_hash(field_tuple)

            # Check if data file exists
            data_path = self.keybase.get_public(os.path.join('ids', field_hash), username=username)
            if not self.keybase.exists(data_path):
                return None

            # Attempt to decrypt the data file
            data = self.keybase.decrypt(data_path)

            #Update cache
            self.cache.encrypt_data_file(origin, uid, field_name, data)

        return data

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

        #Update cache
        self.cache.encrypt_data_file(origin, uid, field_name, data)

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

    def get_service_path(self, origin: str, path: str = '') -> str:
        "Returns the path relative to a service. This method converts the origin key to a origin filename format."
        filename = ParanoidManager.origin_key_to_filename(origin)
        return self.keybase.get_private(os.path.join('services', filename, path))

    def send_share_request(self, origin, uid, field_name, username):
        "Sends a share request via Keybase chat."

        if self.disable_chat:
            return

        # Create share request URL query string
        query = urlencode({
            'origin': origin,
            'uid': uid,
            'field_name': field_name,
            'username': self.keybase.get_username(),
        })

        # Create message text
        text = """Hi @{}, I would like to share my information with you on Paranoid! :ghost:

Please copy and paste the following URL into your Paranoid-enabled browser to accept my share request, thank you! :smile:

```
web+paranoid://share_request?{}
```
""".format(username, query)

        # Send chat message
        self.keybase.send_chat(username, text)

    @staticmethod
    def origin_filename_to_key(filename: str):
        "Converts origin filenames to the format expected by the client."
        return filename.replace('@', ':')

    @staticmethod
    def origin_key_to_filename(key: str):
        """
        Converts origin keys to filenames that can be saved on all platforms.
        Notably windows prevents colons in filenames, so we use '@' symbols instead,
        which is not a valid character in origins either.
        """
        return key.replace(':', '@')
