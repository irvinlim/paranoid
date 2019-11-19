from django.shortcuts import render
from app.models import User


# Create your views here.
def index(request):
    userlist = User.objects.all()
    if 'uid' in request.session:
        context = {'auth_uid': request.session['uid'], 'users': userlist}
    else:
        context = {'auth_uid': -1, 'users': userlist}
    return render(request, 'index.html', context)


def paranoid_mappings(request):
    context = {}
    return render(request, 'map.json', context, content_type='application/json')
