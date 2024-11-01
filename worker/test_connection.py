import httpx
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_server_connection():
    """Test connection to the server using HTTP"""
    try:
        with httpx.Client() as client:
            response = client.get('http://localhost:8000')
            logger.info(f"Server connection test - Status code: {response.status_code}")
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Connection test failed: {str(e)}")
        return False

def main():
    logger.info("Starting connection test...")
    success = test_server_connection()
    logger.info(f"Server Connection Test: {'✓' if success else '✗'}")
    return success

if __name__ == "__main__":
    main()