from django.shortcuts import render


# Create your views here.
def index(request):
    if 'uid' in request.session:
        context = {'uid':  request.session['uid']}
    else:
        context = {'uid':  -1}
    return render(request, 'index.html', context)

def paranoid_mappings(request):
    context = {}
    return render(request, 'map.json', context, content_type='application/json')
