import json
from base64 import b64decode, b64encode

from Crypto import Random
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Hash import SHA256
from Crypto.PublicKey import RSA
from Crypto.Signature import pkcs1_15
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseForbidden
from django.middleware import csrf
from django.shortcuts import redirect, render
from django.template import loader
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from app.models import User
from paranoid_auth.helper import random_string_generator
from paranoid_auth.models import NonceChallenge


# Landing page to login.
def index(request):
    context = {'csrftoken': csrf.get_token(request)}
    return render(request, 'auth/index.html', context)


# Paranoid authentication callback for registration flow.
# Receives the user's public key. Create a new user, assign a UID to the user and associate public key with UID.
@require_POST
def paranoid_register(request):
    pubkey = request.POST.get('pub_key')
    if not pubkey:
        return HttpResponseForbidden()

    # Create new or fetch existing User model instance based on public key
    new_user = User(pub_key=pubkey)
    try:
        new_user.save()
        uid = new_user.uid
    except IntegrityError as e:
        print(e.args[0])
        if 'UNIQUE constraint' not in e.args[0]:
            return HttpResponseForbidden()

        existing_user = User.objects.get(pub_key=pubkey)
        uid = existing_user.uid

    response = {
        "status": "success",
        "uid": uid,
    }
    return HttpResponse(json.dumps(response), content_type="application/json")


# Paranoid authentication callback for a login request.
# Case 1: Receives a UID. Returns a challenge (nonce) and keeps track of the active challenge.
# Case 2: Receives a UID and encrypted nonce. Receives an answer to a login challenge. Verifies the answer against the stored public key. If authorized, returns a session token.
@csrf_exempt
@require_POST
def paranoid_login(request):
    challenge_id = request.POST.get('challenge_id')
    signature = request.POST.get('signature')
    uid = request.POST.get('uid')

    # Get user's pub key
    user = User.objects.get(uid=uid)
    pub_key = RSA.importKey(b64decode(user.pub_key))

    # Client is requesting a new challenge
    if challenge_id is None or signature is None:
        # Generate challenge
        challenge = NonceChallenge(uid=uid, nonce=random_string_generator())
        challenge.save()

        print('Generated new nonce challenge: uid={} id={} nonce={}'.format(uid, challenge.challenge_id, challenge.nonce))

        # Encrypt nonce with public key
        cipher_rsa = PKCS1_v1_5.new(pub_key)
        ciphertext = cipher_rsa.encrypt(bytes(str(challenge.nonce), encoding="utf-8"))
        response = {
            "status": "success",
            "challenge_id": challenge.challenge_id,
            "nonce": b64encode(ciphertext).decode('utf8').replace("'", '"'),
        }

        return HttpResponse(json.dumps(response), content_type="application/json")

    # Client is replying with an answer to a challenge
    elif challenge_id is not None and signature is not None:
        # Verify challenge reply
        challengeObj = NonceChallenge.objects.get(challenge_id=challenge_id)
        payload = "{}:{}".format(challengeObj.challenge_id, challengeObj.nonce)

        # Construct expected hash
        h = SHA256.new()
        h.update(payload.encode())
        expected = h.hexdigest()

        # Verify the expected hash
        if expected != signature:
            return HttpResponseForbidden()

        # Create session and return HTML
        request.session['uid'] = user.uid
        return HttpResponse("Login Successful. You may now close this window.")

    else:
        return HttpResponseForbidden()


# Paranoid logout request.
@csrf_exempt
def paranoid_logout(request):
    try:
        del request.session['uid']
    except KeyError:
        pass
    return redirect('/')
