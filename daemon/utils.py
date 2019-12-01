from flask import jsonify


def JsonResponse(data=None):
    res = {
        'status': 'success',
    }

    if data:
        res['data'] = data

    return jsonify(res)
