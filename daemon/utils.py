from flask import jsonify


def JsonResponse(data):
    res = {
        'status': 'success',
        'data': data,
    }

    return jsonify(res)
