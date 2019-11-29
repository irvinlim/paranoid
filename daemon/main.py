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

import click
from flask import Flask, Response, jsonify

from keybase import KeybaseClient

# Create new Flask app
app = Flask('paranoid-daemon')

# Create Keybase client
keybase = KeybaseClient()


# Fetches a list of origins
@app.route('/origins', methods=['GET'])
def get_origins():
    path = keybase.get_private('origins.json')
    return Response(keybase.get_file(path), content_type='application/json')


@app.errorhandler(500)
def internal_error(error):
    res = {'status': 'error'}

    original_exception = getattr(error, 'original_exception', None)
    if original_exception:
        res['error'] = str(original_exception)

    return jsonify(res), 500


def init_default_files():
    files = {
        'origins.json': {},
    }

    for path, data in files.items():
        fullpath = keybase.get_private(path)
        data = json.dumps(data)
        if keybase.ensure_file(fullpath, data):
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
    app.run(port=port)


if __name__ == "__main__":
    main()
