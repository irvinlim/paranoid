from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('done', views.done),

    # Paranoid authentication flows
    path('paranoid/register', views.paranoid_register),
    path('paranoid/login', views.paranoid_login),
]
