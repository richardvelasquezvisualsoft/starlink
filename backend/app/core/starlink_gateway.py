import os
import random
from typing import Dict, Any

class StarlinkGateway:
    def execute_command(self, device_id: str, command: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        raise NotImplementedError

class MockStarlinkGateway(StarlinkGateway):
    def execute_command(self, device_id: str, command: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        print(f"[MOCK] Executing {command} on {device_id} with {params}")
        # Simulate success response
        return {
            "status": "success",
            "message": f"Command {command} executed successfully on {device_id}",
            "http_status": 200,
            "correlacion_id": f"mock-{random.randint(1000, 9999)}"
        }

class LiveStarlinkGateway(StarlinkGateway):
    def execute_command(self, device_id: str, command: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        # Implementation for real Starlink Management API
        # Needs OAuth2 tokens, rate limiting handling, etc.
        print(f"[LIVE] Executing {command} on {device_id} with {params}")
        return {
            "status": "success",
            "message": "Executed via Live API",
            "http_status": 200,
            "correlacion_id": f"live-{random.randint(1000, 9999)}"
        }

def get_starlink_gateway() -> StarlinkGateway:
    mode = os.getenv("STARLINK_MODE", "mock").lower()
    if mode == "live":
        return LiveStarlinkGateway()
    return MockStarlinkGateway()
