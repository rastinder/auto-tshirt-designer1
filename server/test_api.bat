@echo off
echo Testing API endpoints...

echo.
echo 1. Testing health check...
curl https://aitshirts.in/test/health

echo.
echo 2. Testing design generation (test mode)...
curl -X POST https://aitshirts.in/test/design -H "Content-Type: application/json" -d "{\"prompt\": \"a cool t-shirt design\", \"test_mode\": true}"

echo.
echo 3. Testing background removal (test mode)...
curl -X POST https://aitshirts.in/test/background-removal -H "Content-Type: application/json" -d "{\"image_url\": \"https://example.com/image.png\", \"test_mode\": true}"

echo.
echo 4. Testing worker status...
curl https://aitshirts.in/test/workers

echo.
echo 5. Testing all endpoints at once...
curl https://aitshirts.in/test/run-all

echo.
echo All tests completed!
pause
