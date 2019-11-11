from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('done', views.done),

    # Paranoid authentication flows
    path('paranoid/register', views.paranoid_register),
    path('paranoid/login/request', views.paranoid_login_request),
    path('paranoid/login/answer', views.paranoid_login_answer),
]
