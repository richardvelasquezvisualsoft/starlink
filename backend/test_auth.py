import requests
import json

base_url = "http://localhost:8050/api/v1"

# Login to get token
login_data = {
    "username": "reseller.admin@example.com", 
    "password": "password"
}
# wait, what's a valid reseller user? The user said: "El reseller actual usa la cuenta ACC-VS-100200"
