import requests

url = "http://localhost:8050/api/auth/login"
data = {"email": "reseller@starlink.com", "password": "password123"}
try:
    r = requests.post(url, json=data)
    print("Login status:", r.status_code)
    if r.status_code == 200:
        token = r.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        r_perfil = requests.get("http://localhost:8050/api/perfil", headers=headers)
        print("Perfil status:", r_perfil.status_code)
        try:
            print("Perfil response:", r_perfil.json())
        except Exception as e:
            print("Perfil text:", r_perfil.text)
except Exception as e:
    print("Exception:", e)
