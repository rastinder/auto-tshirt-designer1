import httpx
import asyncio
import logging
from fastapi.testclient import TestClient
from main import app

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_server():
    """Test server endpoints"""
    client = TestClient(app)
    
    # Test health endpoint
    logger.info("Testing health endpoint...")
    response = client.get("/")
    assert response.status_code == 200, "Health check failed"
    logger.info("Health check passed")

    # Test design endpoint
    logger.info("Testing design endpoint...")
    test_data = {
        "prompt": "test design",
        "style": "test",
        "priority": 1
    }
    response = client.post("/design", json=test_data)
    assert response.status_code == 200, "Design endpoint failed"
    task_id = response.json().get("task_id")
    logger.info(f"Design endpoint passed - task_id: {task_id}")

    # Test WebSocket
    logger.info("Testing WebSocket connection...")
    with client.websocket_connect("/ws") as websocket:
        data = {"type": "connect", "worker_id": "test-worker"}
        websocket.send_json(data)
        response = websocket.receive_json()
        assert response["type"] == "connected", "WebSocket connection failed"
        logger.info("WebSocket test passed")

    logger.info("All tests passed!")

if __name__ == "__main__":
    test_server()