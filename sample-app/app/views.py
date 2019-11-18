from django.shortcuts import render


# Create your views here.
def index(request):
    context = {}
    return render(request, 'index.html', context)

def paranoid_mappings(request):
    context = {}
    return render(request, 'map.json', context, content_type='application/json')
