from django.db import models


# Create your models here.
class User(models.Model):
    uid = models.AutoField(primary_key=True)
    pub_key = models.CharField(unique=True, max_length=344)  #len(JSEncrypt.getPublicBaseKeyB64()) = 334
