import requests
import sys

BASE_URL = "http://127.0.0.1:8050/api"

def run_tests():
    print("Starting Starlink Fleet API Integration Tests...")
    
    # 1. Test Login
    login_payload = {
        "email": "admin@starlink.com",
        "password": "admin123"
    }
    try:
        login_res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
        if login_res.status_code != 200:
            print(f"[-] Login failed. Status: {login_res.status_code}, Body: {login_res.text}")
            sys.exit(1)
        token = login_res.json().get("access_token")
        print("[+] Login successful. Token obtained.")
    except Exception as e:
        print(f"[-] Login request failed: {e}")
        sys.exit(1)
        
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # 2. Test Get Me
    try:
        me_res = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        assert me_res.status_code == 200
        print(f"[+] Get current user successful. User: {me_res.json().get('nombre')}")
    except Exception as e:
        print(f"[-] Get current user failed: {e}")
        sys.exit(1)
        
    # 3. Test Dashboard KPIs
    try:
        kpis_res = requests.get(f"{BASE_URL}/dashboard/kpis", headers=headers)
        assert kpis_res.status_code == 200
        data = kpis_res.json()
        print(f"[+] Dashboard KPIs fetch successful:")
        print(f"    - Total Terminals: {data.get('total_terminals')}")
        print(f"    - Active Terminals: {data.get('active_terminals')}")
        print(f"    - Critical Alerts: {data.get('critical_alerts')}")
        print(f"    - Avg Latency: {data.get('avg_latency_ms')} ms")
        print(f"    - Total Data Consumed: {data.get('total_data_usage_gb')} GB")
    except Exception as e:
        print(f"[-] Dashboard KPIs failed: {e}")
        sys.exit(1)
        
    # 4. Test Telemetry Chart
    try:
        chart_res = requests.get(f"{BASE_URL}/dashboard/chart", headers=headers)
        assert chart_res.status_code == 200
        print(f"[+] Telemetry chart history fetch successful. Data points: {len(chart_res.json())}")
    except Exception as e:
        print(f"[-] Telemetry chart failed: {e}")
        sys.exit(1)
        
    # 5. Test CRUD Cuentas
    try:
        cuentas_res = requests.get(f"{BASE_URL}/cuentas", headers=headers)
        assert cuentas_res.status_code == 200
        print(f"[+] CRUD Cuentas fetch successful. Cuentas count: {len(cuentas_res.json())}")
    except Exception as e:
        print(f"[-] CRUD Cuentas failed: {e}")
        sys.exit(1)
        
    print("\n[+] All integration tests passed successfully!")

if __name__ == "__main__":
    run_tests()
