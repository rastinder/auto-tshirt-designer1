import requests
import json
import sys
from datetime import datetime

def test_endpoint(url, method='GET', data=None, headers=None):
    """Test an endpoint and return the result"""
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers)
        else:
            response = requests.post(url, json=data, headers=headers)
        
        print(f"\nTesting {method} {url}")
        print(f"Status Code: {response.status_code}")
        
        try:
            print("Response:", json.dumps(response.json(), indent=2))
        except:
            print("Response:", response.text[:200] + "..." if len(response.text) > 200 else response.text)
        
        return response.status_code == 200
    except Exception as e:
        print(f"Error testing {url}: {str(e)}")
        return False

def run_tests(base_url):
    """Run all tests"""
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "tests": {}
    }
    
    # Test health endpoint
    results["tests"]["health"] = test_endpoint(f"{base_url}/test/health")
    
    # Test design endpoint
    results["tests"]["design"] = test_endpoint(
        f"{base_url}/test/design",
        method='POST',
        data={"prompt": "test design", "test_mode": True},
        headers={"Content-Type": "application/json"}
    )
    
    # Test background removal endpoint
    results["tests"]["background_removal"] = test_endpoint(
        f"{base_url}/test/background-removal",
        method='POST',
        data={"image_url": "test.png", "test_mode": True},
        headers={"Content-Type": "application/json"}
    )
    
    # Test workers endpoint
    results["tests"]["workers"] = test_endpoint(f"{base_url}/test/workers")
    
    # Test run-all endpoint
    results["tests"]["run_all"] = test_endpoint(f"{base_url}/test/run-all")
    
    # Print summary
    print("\nTest Summary:")
    for test, passed in results["tests"].items():
        print(f"{test}: {'✓' if passed else '✗'}")
    
    return results

if __name__ == "__main__":
    base_url = "https://aitshirts.in"
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    
    print(f"Running tests against {base_url}")
    run_tests(base_url)
