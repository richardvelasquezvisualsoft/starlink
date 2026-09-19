import requests

def test_api():
    try:
        # We need a token. We can get it by logging in as CLIENTE.
        res = requests.post("http://localhost:8000/api/auth/login", data={"username": "cliente", "password": "password"})
        token = res.json().get("access_token")
        if not token:
            print("Login failed")
            return
        
        headers = {"Authorization": f"Bearer {token}"}
        res2 = requests.get("http://localhost:8000/api/lineas-servicio", headers=headers)
        data = res2.json()
        print(f"Status: {res2.status_code}")
        if data and isinstance(data, list) and len(data) > 0:
            print("First item direcciones:", data[0].get("direcciones_servicio"))
        else:
            print("No data or empty list")
    except Exception as e:
        print(f"Error: {e}")

test_api()
