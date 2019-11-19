from django.urls import path

from . import views

urlpatterns = [
    path('', views.index),
    path('callback', views.evil_callback),
]
