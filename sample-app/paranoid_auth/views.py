from django.http import HttpResponse, HttpResponseForbidden
from django.middleware import csrf
from django.shortcuts import render, redirect
from django.template import loader
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from app.models import User
from paranoid_auth.models import NonceChallenge
from django.db import IntegrityError
import json
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Hash import SHA
from Crypto import Random
from base64 import b64decode, b64encode
from Crypto.Signature import pkcs1_15
from Crypto.Hash import MD5
from paranoid_auth.helper import random_string_generator


# Landing page to login.
def index(request):
    context = {'csrftoken': csrf.get_token(request)}
    return render(request, 'auth/index.html', context)


# Path for authentication flow completion.
def done(request):
    return HttpResponse("Authentication flow complete. You may now close this window.")


# Paranoid authentication callback for registration flow.
# Receives the user's public key. Create a new user, assign a UID to the user and associate public key with UID.
@require_POST
def paranoid_register(request):
    pubkey = request.POST.get('pub_key')
    if not pubkey:
        return HttpResponseForbidden()

    newUser = User(pub_key=pubkey)
    try:
        newUser.save()
        context = {}
        response =  {
            "status": "success",
            "uid": newUser.uid,
        }
    except IntegrityError as e:
        print(e.args[0])
        if 'UNIQUE constraint' in e.args[0]:
            existing_user = User.objects.get(pub_key=pubkey)
            response =  {
                "status": "success",
                "uid": existing_user.uid,
            }
        else:
            return HttpResponseForbidden()
    
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

    #Get user pub key
    user = User.objects.get(uid=uid)
    pub_key = RSA.importKey(b64decode(user.pub_key))

    if challenge_id is None or signature is None:
        #Generate challenge
        
        challenge = NonceChallenge(uid=uid, nonce=random_string_generator())
        challenge.save()
        print(challenge.nonce)
        cipher_rsa = PKCS1_v1_5.new(pub_key)
        ciphertext = cipher_rsa.encrypt(bytes(str(challenge.nonce), encoding="utf-8"))
        response =  {
            "status": "success",
            "challenge_id": challenge.challenge_id,
            "nonce": b64encode(ciphertext).decode('utf8').replace("'", '"'),
        }
        
    else:
        if challenge_id is not None and signature is not None:
            #Verify challenge reply
            challengeObj = NonceChallenge.objects.get(challenge_id=challenge_id)
            payload = "{}:{}".format(challengeObj.challenge_id,challengeObj.nonce)
            
            #signature = b64decode(signature)
            #print(signature)
            #cipher_rsa = pkcs1_15.new(pub_key)
            h = MD5.new()
            h.update(payload.encode())
            print(h.hexdigest())
            #decrypted_nonce = cipher_rsa.verify(h, signature)
            if h.hexdigest() == signature:
                #create session
                request.session['uid'] = user.uid
                # response =  {
                #     "status": "success",
                # }
                return HttpResponse("Login Successful. You may now close this window.")
            
        else:
            return HttpResponseForbidden()

    return HttpResponse(json.dumps(response), content_type="application/json")

# Paranoid logout request.
@csrf_exempt
def paranoid_logout(request):
    try:
        del request.session['uid']
    except KeyError:
        pass
    return redirect('/')