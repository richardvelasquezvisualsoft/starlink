import requests

url = "http://localhost:8050/api/auth/login"
data = {"email": "reseller@starlink.com", "password": "password123"}
r = requests.post(url, json=data)
token = r.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

r_sol = requests.get("http://localhost:8050/api/solicitudes", headers=headers, allow_redirects=False)
print("Without slash:", r_sol.status_code)

r_sol2 = requests.get("http://localhost:8050/api/solicitudes/", headers=headers)
print("With slash:", r_sol2.status_code)
if r_sol2.status_code != 200:
    print(r_sol2.text)
