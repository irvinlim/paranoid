from django.apps import AppConfig


class EvilConfig(AppConfig):
    name = 'evil'
    verbose_name = 'Evil Django app that tries to exfiltrate private user data with XSS'
