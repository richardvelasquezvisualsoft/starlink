import re

with open("backend/app/models.py", "r") as f:
    content = f.read()

words_to_singular = {
    "CatalogoAlertas": "CatalogoAlerta",
    "AlertasLog": "AlertaLog",
    "ComandosRemotosLog": "ComandoRemotoLog",
    "CatalogoOperacionesRemotas": "CatalogoOperacionRemota"
}

for plural, singular in words_to_singular.items():
    content = re.sub(r'\b' + plural + r'\b', singular, content)

with open("backend/app/models.py", "w") as f:
    f.write(content)
