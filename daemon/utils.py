from Crypto.Hash import SHA256
from flask import jsonify


def JsonResponse(data=None):
    res = {
        'status': 'success',
    }

    if data is not None:
        res['data'] = data

    return jsonify(res)


def get_field_hash(field_tuple):
    "Return the SHA256 hash of a <origin, uid, field_name> tuple."
    origin, uid, field_name = field_tuple
    h = SHA256.new()
    key = '{}:{}:{}'.format(origin, uid, field_name)
    h.update(key.encode('utf-8'))
    return h.digest().hex()
