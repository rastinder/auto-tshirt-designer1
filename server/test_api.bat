@echo off
echo Testing API endpoints...

echo.
echo 1. Testing health check...
curl http://localhost:8000/test/health

echo.
echo 2. Testing design generation (test mode)...
curl -X POST http://localhost:8000/test/design -H "Content-Type: application/json" -d "{\"prompt\": \"a cool t-shirt design\", \"test_mode\": true}"

echo.
echo 3. Testing background removal (test mode)...
curl -X POST http://localhost:8000/test/background-removal -H "Content-Type: application/json" -d "{\"image_url\": \"https://example.com/image.png\", \"test_mode\": true}"

echo.
echo 4. Testing worker status...
curl http://localhost:8000/test/workers

echo.
echo All tests completed!
pause
