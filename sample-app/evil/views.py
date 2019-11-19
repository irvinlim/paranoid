from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from app.models import User


def index(request):
    userlist = User.objects.all()
    if 'uid' in request.session:
        context = {'auth_uid': request.session['uid'], 'users': userlist}
    else:
        context = {'auth_uid': -1, 'users': userlist}
    return render(request, 'evil.html', context)


# Prints out data received from server via callback from evil JS
@csrf_exempt
@require_POST
def evil_callback(request):
    data = request.POST.get('html')
    print('Evil app tried to exfiltrate HTML from page: \n{}\n'.format(data))
    return HttpResponse()
