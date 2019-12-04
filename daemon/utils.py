from flask import jsonify


def JsonResponse(data=None):
    res = {
        'status': 'success',
    }

    if data is not None:
        res['data'] = data

    return jsonify(res)
