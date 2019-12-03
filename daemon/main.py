#!/usr/bin/env python
"""
Paranoid helper daemon.

Interacts with the host filesystem on behalf of the browser extension,
in order to store and fetch items from KBFS.

This is done by opening a TLS connection from the browser extension
to the daemon server, so that all secrets are encrypted.

Note that because the browser extension does not store any keys, not even
in localStorage, it can only depend on the daemon to provide secure storage
of mappings.

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
    "fields": ["first_name", "last_name", "email"],
    "shared_with": ["malte"]
  }
  ```

File structure for (shared) identities is stored in /keybase/public, where files are only
signed by default. However, we enforce files to be encrypted for only the users who are
authorized to view the contents of the file.

Example:
- File path:
  /keybase/public/irvinlim/paranoid/ids/ac9055add1d71c8523362c02ec92232c9bb0c7fe26e46a095d4d821c56b533be.json
    (the hash is `sha256("http:google.com:80:1:first_name")`)
- Contents:
  ```
  Irvin
  ```
"""

import json
import os

import click
from flask import Flask, jsonify, request
from flask_cors import CORS

from keybase import KeybaseClient
from utils import JsonResponse, get_field_hash


class ParanoidException(Exception):
    pass


def get_json(path):
    try:
        return json.loads(keybase.get_file(path))
    except json.JSONDecodeError as e:
        app.logger.info('[!] Could not decode {}: {}'.format(path, e))
        return None


# Create new Flask app
app = Flask('paranoid-daemon')

# Enable Cross-Origin Resource Sharing (CORS)
CORS(app)

# Create Keybase client
keybase = KeybaseClient()


@app.route('/services', methods=['GET'])
def get_services():
    "Fetches a list of services."

    path = keybase.get_private('services')
    data = keybase.list_dir(path)
    return JsonResponse(data)


@app.route('/services/<origin>', methods=['GET'])
def get_service(origin):
    "Fetches a service by origin, as well as a list of UIDs (corresponding to unique identities)."

    # Check if origin exists
    path = keybase.get_private(os.path.join('services', origin))
    if not keybase.exists(path):
        return JsonResponse()

    # Get info
    path = keybase.get_private(os.path.join('services', origin, 'info.json'))
    info = get_json(path)
    if not info:
        return JsonResponse()

    # Get identities
    path = keybase.get_private(os.path.join('services', origin, 'uids'))
    uids = [uid[:-5] for uid in keybase.list_dir(path, '*.json')]

    return JsonResponse({
        'info': info,
        'uids': uids,
    })


@app.route('/services/<origin>', methods=['POST'])
def put_service(origin):
    "Upserts a service by origin."

    # Make sure paths exists
    path = keybase.get_private(os.path.join('services', origin))
    keybase.ensure_dir(path)
    path = keybase.get_private(os.path.join('services', origin, 'uids'))
    keybase.ensure_dir(path)

    # Save info
    path = keybase.get_private(os.path.join('services', origin, 'info.json'))
    keybase.put_file(path, request.data.decode('utf-8'))

    return JsonResponse()


@app.route('/services/<origin>/identities/<uid>', methods=['GET'])
def get_service_identity(origin, uid):
    "Fetches a list of fields and their values for a service identity."

    # Check if origin and identity exists
    path = keybase.get_private(os.path.join('services', origin, 'uids', '{}.json'.format(uid)))
    if not keybase.exists(path):
        return JsonResponse()

    # Read service identity metadata
    info = get_json(path)
    if not info:
        return JsonResponse()

    # Read individual service identity field mappings
    info['map'] = {}
    for field in info.get('fields'):
        # Construct field tuple <origin, uid, field_name>
        field_tuple = (origin, uid, field)

        # Look in public folder for field value
        field_hash = get_field_hash(field_tuple)
        path = keybase.get_public(os.path.join('ids', field_hash))
        if not keybase.exists(path):
            continue

        # Attempt to decrypt the data
        data = keybase.decrypt(path)
        if not data:
            continue
        info['map'][field] = data

    return JsonResponse(info)


@app.route('/services/<origin>/identities/<uid>', methods=['POST'])
def put_service_identity(origin, uid):
    "Upserts an identity for a service."

    # Decode request data as JSON
    data = request.data.decode('utf-8')
    data = json.loads(data)

    # Check if origin exists
    path = keybase.get_private(os.path.join('services', origin))
    if not keybase.exists(path):
        raise ParanoidException('Service does not exist for origin: {}'.format(origin))

    # Create private dirs for new identity
    path = keybase.get_private(os.path.join('services', origin, 'uids'))
    keybase.ensure_dir(path)

    # Store identity metadata
    path = keybase.get_private(os.path.join('services', origin, 'uids', '{}.json'.format(uid)))
    keybase.put_file(path, json.dumps(data))

    return JsonResponse()


@app.route('/services/<origin>/identities/<uid>/<field_name>', methods=['POST'])
def put_service_identity_mapping(origin, uid, field_name):
    "Upserts an identity mapping for a service."

    # Check if origin and identity exists
    path = keybase.get_private(os.path.join('services', origin, 'uids', '{}.json'.format(uid)))
    if not keybase.exists(path):
        raise ParanoidException('Service identity does not exist for {}:{}'.format(origin, uid))

    # Read service identity metadata
    info = get_json(path)
    if not info:
        raise ParanoidException('Service identity does not exist for {}:{}'.format(origin, uid))

    # Only store mapping for a valid field name
    if field_name not in info.get('fields'):
        raise ParanoidException('"{}" is not a valid field name for service identity'.format(field_name))

    # Get list of shared users for this field mapping
    shared_users = info.get('shared_with', [])
    if not shared_users:
        # If not currently shared with anyone, pass in own username
        shared_users = [keybase.get_username()]

    # Construct field tuple <origin, uid, field_name>
    field_tuple = (origin, uid, field_name)

    # Write to the file encrypted for the list of users
    field_hash = get_field_hash(field_tuple)
    path = keybase.get_public(os.path.join('ids', field_hash))
    keybase.encrypt(path, request.data.decode('utf-8'), shared_users)

    return JsonResponse()


@app.errorhandler(500)
def internal_error(error):
    res = {'status': 'error'}

    original_exception = getattr(error, 'original_exception', None)
    if original_exception:
        res['error'] = str(original_exception)

    return jsonify(res), 500


def init_default_files():
    dirs = {'private': ['services'], 'public': ['ids']}

    for path in dirs['public']:
        fullpath = keybase.get_public(path)
        if keybase.ensure_dir(fullpath):
            click.echo('Initialized {} on first run'.format(fullpath))

    for path in dirs['private']:
        fullpath = keybase.get_private(path)
        if keybase.ensure_dir(fullpath):
            click.echo('Initialized {} on first run'.format(fullpath))


@click.command()
@click.option('--port', help='Port to start the server on. Defaults to 5000.', type=int)
@click.option(
    '--base-path',
    default='paranoid',
    help='Base path to look up Paranoid files. Defaults to "paranoid", which means that '
    'files will be located in /keybase/private/<username>/paranoid.',
)
def main(port, base_path):
    # Initialize Keybase client
    keybase.init(base_path=base_path)

    # Initialize default files
    init_default_files()

    # Start Flask server
    app.run(host='127.0.0.1', port=port)


if __name__ == "__main__":
    main()
