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
"""

import json
import os

import click
from flask import Flask, jsonify, request
from flask_cors import CORS

from auth import get_token, require_token
from keybase import KeybaseClient
from paranoid import ParanoidException, ParanoidManager
from utils import JsonResponse

# Create new Flask app
app = Flask('paranoid-daemon')

# Enable Cross-Origin Resource Sharing (CORS)
CORS(app)

# Create Keybase client
keybase = KeybaseClient()

# Create Paranoid manager
paranoid = ParanoidManager(keybase)


@app.route('/')
def index():
    "Simple index route for healthchecks."
    return JsonResponse()


@app.route('/auth')
def auth():
    "Simple index route for testing the authorization token."
    return JsonResponse()


@app.route('/services', methods=['GET'])
def get_services():
    "Fetches a list of services."

    origins = paranoid.get_origins()
    return JsonResponse(origins)


@app.route('/services/<origin>', methods=['GET'])
def get_service(origin):
    "Fetches a service by origin, as well as a list of UIDs (corresponding to unique identities)."

    service = paranoid.get_service(origin)
    if not service:
        return JsonResponse()

    uids = paranoid.get_service_uids(origin)

    return JsonResponse({
        'info': service,
        'uids': uids,
    })


@app.route('/services/<origin>/foreign_map', methods=['GET'])
def get_service_foreign_map(origin):
    "Fetches a foreign map for a service."

    foreign_map = paranoid.resolve_foreign_map(origin)
    return JsonResponse(foreign_map)


@app.route('/services/<origin>/foreign_map/<uid>/<field_name>/<username>', methods=['POST'])
def add_foreign_map(origin, uid, field_name, username):
    "Adds a foreign map mapping for an origin."

    paranoid.add_foreign_map(origin, uid, field_name, username)
    return JsonResponse()


@app.route('/services/<origin>/foreign_map', methods=['DELETE'])
def remove_foreign_map(origin, uid, field_name, username):
    "Deletes a foreign map mapping for an origin."

    paranoid.remove_foreign_map(origin, uid, field_name, username)
    return JsonResponse()


@app.route('/services/<origin>', methods=['POST'])
def put_service(origin):
    "Upserts a service by origin."

    data = request.get_json()
    paranoid.set_service(origin, data)

    return JsonResponse()


@app.route('/services/<origin>/identities/<uid>', methods=['GET'])
def get_service_identity(origin, uid):
    "Fetches a list of fields and their values for a service identity."

    # Read service identity
    info = paranoid.get_service_identity(origin, uid)
    if info is None:
        return JsonResponse()

    # Read individual service identity field mappings
    info['map'] = {}
    for field in info.get('fields'):
        data = paranoid.decrypt_data_file(origin, uid, field)
        if data is not None:
            info['map'][field] = data

    return JsonResponse(info)


@app.route('/services/<origin>/identities/<uid>', methods=['POST'])
def put_service_identity(origin, uid):
    "Inserts an identity for a service."

    # Get service
    service = paranoid.get_service(origin)
    if service is None:
        raise ParanoidException('Service does not exist for origin: {}'.format(origin))

    # Make sure that service identity doesn't already exist
    if paranoid.get_service_identity(origin, uid) is not None:
        raise ParanoidException('Service identity already exists for {}:{}'.format(origin, uid))

    # Decode request data as JSON
    data = request.get_json()
    key = data.get('key')
    field_names = data.get('fields')

    if not key:
        raise ParanoidException('Service identity key not specified')
    if not field_names:
        raise ParanoidException('Service identity fields not specified')

    # Prepare identity metadata object
    info = {
        'origin': service.get('origin'),
        'uid': uid,
        'key': key,
        'fields': {},
    }
    for field_name in field_names:
        info['fields'][field_name] = {
            'type': 'str',
            'shared_with': [],
        }

    # Store identity metadata
    paranoid.set_service_identity(origin, uid, info)

    return JsonResponse()


@app.route('/services/<origin>/identities/<uid>/<field_name>', methods=['POST'])
def put_service_identity_mapping(origin, uid, field_name):
    "Updates an identity mapping for a service."

    # Read service identity
    info = paranoid.get_service_identity(origin, uid)
    if info is None:
        raise ParanoidException('Service identity does not exist for {}:{}'.format(origin, uid))

    # Validate field name
    paranoid.validate_field_name(info, field_name)

    # Get list of shared users for this field mapping
    shared_users = info['fields'][field_name].get('shared_with', [])

    # Encrypt the data file with the list of shared users
    paranoid.encrypt_data_file(origin, uid, field_name, request.data.decode('utf-8'), shared_users)

    return JsonResponse()


@app.route('/services/<origin>/identities/<uid>/<field_name>/share/<username>', methods=['POST'])
def share_service_identity_mapping(origin, uid, field_name, username):
    "Shares a field with a Keybase user."

    # Read service
    service = paranoid.get_service(origin)
    if service is None:
        raise ParanoidException('Service does not exist for origin {}'.format(origin))

    # Read service identity
    info = paranoid.get_service_identity(origin, uid)
    if info is None:
        raise ParanoidException('Service identity does not exist for {}:{}'.format(origin, uid))

    # Validate field name
    paranoid.validate_field_name(info, field_name)

    # Get list of shared users for this field mapping
    shared_users = info['fields'][field_name].get('shared_with', [])

    # Make sure username is not already shared with
    if username in shared_users:
        raise ParanoidException('"{}" already has access to {}:{}'.format(username, origin, uid))

    # Add username to list of shared users
    shared_users.append(username)

    # Re-encrypt the file with the new list of shared users
    paranoid.reencrypt_data_file(origin, uid, field_name, shared_users)

    # If there is no error, update the identity metadata
    info['fields'][field_name]['shared_with'] = shared_users
    paranoid.set_service_identity(origin, uid, info)

    # Send a share request.
    # We send the full origin (stored in the service) instead of the origin key.
    full_origin = service.get('origin')
    paranoid.send_share_request(full_origin, uid, field_name, username)

    return JsonResponse()


@app.route('/services/<origin>/identities/<uid>/<field_name>/share/<username>', methods=['DELETE'])
def unshare_service_identity_mapping(origin, uid, field_name, username):
    "Unshares a field with a Keybase user."

    # Read service identity
    info = paranoid.get_service_identity(origin, uid)
    if info is None:
        raise ParanoidException('Service identity does not exist for {}:{}'.format(origin, uid))

    # Validate field name
    paranoid.validate_field_name(info, field_name)

    # Get list of shared users for this field mapping
    shared_users = info['fields'][field_name].get('shared_with', [])

    # Make sure username is shared with
    if username not in shared_users:
        raise ParanoidException('"{}" did not have access to {}:{}'.format(username, origin, uid))

    # Remove username from list of shared users
    shared_users.remove(username)

    # Re-encrypt the file with the new list of shared users
    paranoid.reencrypt_data_file(origin, uid, field_name, shared_users)

    # If there is no error, update the identity metadata
    info['fields'][field_name]['shared_with'] = shared_users
    paranoid.set_service_identity(origin, uid, info)

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
@click.option(
    '--disable-auth',
    is_flag=True,
    default=False,
    help='Disables authentication for development. This is insecure and opens up secrets to be leaked via CSRF!',
)
@click.option(
    '--disable-chat',
    is_flag=True,
    default=False,
    help='Disables sending of Keybase chat messages. This might be useful during development.',
)
def main(port, base_path, disable_auth, disable_chat):
    if disable_auth:
        click.secho(' * Authentication disabled for server.')
        click.secho('   WARNING: This opens up the server to be vulnerable to CSRF, which could leak secrets to other sites.', fg='red')
    else:
        # Registers all routes to require an authorization session token
        require_token(app)

        # Print session token
        print(' * Session token generated (paste into browser extension settings):\n\n{}\n'.format(get_token()))

    # Initialize Keybase client
    keybase.init(base_path=base_path)

    # Initialize Paranoid manager
    paranoid.init(disable_chat=disable_chat)

    # Initialize default files
    init_default_files()

    # Start Flask server
    app.run(host='127.0.0.1', port=port)


if __name__ == "__main__":
    main()
