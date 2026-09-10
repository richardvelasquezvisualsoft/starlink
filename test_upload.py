import requests

url = "http://localhost:8050/api/auth/login"
data = {"email": "reseller@starlink.com", "password": "password123"}
r = requests.post(url, json=data)
token = r.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

# Create a dummy image
with open("dummy.png", "wb") as f:
    f.write(b"\x89PNG\r\n\x1a\n")

with open("dummy.png", "rb") as f:
    files = {"file": ("dummy.png", f, "image/png")}
    r_upload = requests.post("http://localhost:8050/api/perfil/foto", headers=headers, files=files)
    print(r_upload.status_code)
    print(r_upload.json())
