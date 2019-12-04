import secrets
from functools import lru_cache

from flask import jsonify, request


@lru_cache(maxsize=1)
def get_token():
    "Generates a 2048-bit (256 byte) session token at server start, and returns the token cached using LRU."
    return secrets.token_hex(256)


def check_token():
    "Checks whether the request contains the Authorization header with the correct token."

    authorization = request.headers.get('Authorization')
    if not authorization or not secrets.compare_digest(authorization, get_token()):
        return jsonify({'status': 'unauthorized'}), 403


def require_token(app):
    "Registers a before_request handler to run before each Flask request."
    app.before_request(check_token)
