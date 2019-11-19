from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),

    # Paranoid authentication flows
    path('register', views.paranoid_register),
    path('login', views.paranoid_login),
    path('logout', views.paranoid_logout),
]
