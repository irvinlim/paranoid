from django.db import models


# Create your models here.
class NonceChallenge(models.Model):
    challenge_id = models.AutoField(primary_key=True)
    nonce = models.CharField(max_length=30)
    uid = models.PositiveIntegerField()
    completed = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
