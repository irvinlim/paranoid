from django.http import HttpResponse, HttpResponseForbidden
from django.middleware import csrf
from django.shortcuts import render
from django.template import loader
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST


# Landing page to login.
def index(request):
    context = {'csrftoken': csrf.get_token(request)}
    return render(request, 'auth/index.html', context)


# Path for authentication flow completion.
def done(request):
    return HttpResponse("Authentication flow complete. You may now close this window.")


# Paranoid authentication callback for registration flow.
# Receives the user's public key. Create a new user, assign a UID to the user and associate public key with UID.
@csrf_exempt
@require_POST
def paranoid_register(request):
    pubkey = request.POST.get('pubkey')
    if not pubkey:
        return HttpResponseForbidden()

    context = {}
    return HttpResponse("Registration request: UID should be returned here.")


# Paranoid authentication callback for a login request.
# Receives a UID. Returns a challenge (nonce) and keeps track of the active challenge.
@require_POST
def paranoid_login_request(request):
    context = {}
    return HttpResponse("Login request: Challenge (and unique challenge ID) should be returned here.")


# Paranoid authentication callback for a login answer.
# Receives an answer to a login challenge. Verifies the answer against the stored public key.
# If authorized, returns a session token.
@require_POST
def paranoid_login_answer(request):
    context = {}
    return HttpResponse("Login answer: If authorized, session token should be set (in the normal way via Set-Cookie headers).")
