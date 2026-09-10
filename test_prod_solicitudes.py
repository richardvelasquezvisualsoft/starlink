import requests

url = "https://starlink.hospedajesvelasquez.com/api/auth/login"
data = {"email": "reseller@starlink.com", "password": "password123"}
r = requests.post(url, json=data)
token = r.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

r_sol = requests.get("https://starlink.hospedajesvelasquez.com/api/solicitudes", headers=headers)
print("solicitudes:", r_sol.status_code, r_sol.text[:100])

r_sol2 = requests.get("https://starlink.hospedajesvelasquez.com/api/solicitudes/", headers=headers)
print("solicitudes/:", r_sol2.status_code, r_sol2.text[:100])

