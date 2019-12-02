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

File structure:

services/
  http:google.com:80/       <-- origin name
    info.json               <-- service metadata
    identities/
      100/                  <-- identity UID
        info.json           <-- identity data: public key + field mappings
        sharing.json        <-- sharing metadata
"""

import json
import os

import click
from flask import Flask, jsonify, request
from flask_cors import CORS

from keybase import KeybaseClient
from utils import JsonResponse


class ParanoidException(Exception):
    pass


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
    "Fetches a service by origin, as well as a list of identities."

    # Check if origin exists
    path = keybase.get_private(os.path.join('services', origin))
    if not keybase.exists(path):
        return JsonResponse()

    # Get info
    path = keybase.get_private(os.path.join('services', origin, 'info.json'))
    try:
        info = json.loads(keybase.get_file(path))
    except json.JSONDecodeError as e:
        app.logger.info('[!] Could not decode {}: {}'.format(path, e))
        return JsonResponse()

    # Get identities
    path = keybase.get_private(os.path.join('services', origin, 'identities'))
    identities = keybase.list_dir(path)

    return JsonResponse({
        'info': info,
        'identities': identities,
    })


@app.route('/services/<origin>', methods=['POST'])
def put_service(origin):
    "Upserts a service by origin."

    # Make sure paths exists
    path = keybase.get_private(os.path.join('services', origin))
    keybase.ensure_dir(path)
    path = keybase.get_private(os.path.join('services', origin, 'identities'))
    keybase.ensure_dir(path)

    # Save info
    path = keybase.get_private(os.path.join('services', origin, 'info.json'))
    keybase.put_file(path, request.data.decode('utf-8'))

    return JsonResponse()


@app.route('/services/<origin>/identities/<uid>', methods=['GET'])
def get_service_identity(origin, uid):
    "Fetches a list of fields and their values for a service identity."

    # Check if origin and identity exists
    path = keybase.get_private(os.path.join('services', origin, 'identities', uid))
    if not keybase.exists(path):
        return JsonResponse()

    # Read service identity
    path = keybase.get_private(os.path.join('services', origin, 'identities', uid, 'info.json'))
    try:
        info = json.loads(keybase.get_file(path))
    except json.JSONDecodeError as e:
        app.logger.info('[!] Could not decode {}: {}'.format(path, e))
        return JsonResponse()

    return JsonResponse(info)


@app.route('/services/<origin>/identities/<uid>', methods=['POST'])
def put_service_identity(origin, uid):
    "Upserts an identity for a service."

    # Check if origin exists
    path = keybase.get_private(os.path.join('services', origin))
    if not keybase.exists(path):
        raise ParanoidException('Service does not exist for origin: {}'.format(origin))

    # Create dirs for new identity
    path = keybase.get_private(os.path.join('services', origin, 'identities'))
    keybase.ensure_dir(path)
    path = keybase.get_private(os.path.join('services', origin, 'identities', uid))
    keybase.ensure_dir(path)

    # Store identity metadata
    path = keybase.get_private(os.path.join('services', origin, 'identities', uid, 'info.json'))
    keybase.put_file(path, request.data.decode('utf-8'))

    return JsonResponse()


@app.errorhandler(500)
def internal_error(error):
    res = {'status': 'error'}

    original_exception = getattr(error, 'original_exception', None)
    if original_exception:
        res['error'] = str(original_exception)

    return jsonify(res), 500


def init_default_files():
    files = {}
    dirs = [
        'services',
    ]

    for path, data in files.items():
        fullpath = keybase.get_private(path)
        data = json.dumps(data)
        if keybase.ensure_file(fullpath, data):
            click.echo('Initialized {} on first run'.format(fullpath))

    for path in dirs:
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
