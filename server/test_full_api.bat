@echo off
setlocal EnableDelayedExpansion

set "API_URL=https://aitshirts.in/api"
set "FRONTEND_URL=https://aitshirts.in"

echo ========================================
echo Comprehensive API Testing - AI T-Shirt Designer
echo ========================================

echo.
echo Testing Backend API Endpoints...
echo ----------------------------------------

echo.
echo 1. Backend Health Check
curl -s "%API_URL%/test/health"

echo.
echo 2. Worker Status
curl -s "%API_URL%/test/workers"

echo.
echo 3. Testing Design Generation API
echo 3.1. Test Mode
curl -X POST "%API_URL%/test/design" ^
     -H "Content-Type: application/json" ^
     -d "{\"prompt\": \"a cool t-shirt design\", \"test_mode\": true}"

echo.
echo 3.2. Real Design Generation
curl -X POST "%API_URL%/design" ^
     -H "Content-Type: application/json" ^
     -d "{\"prompt\": \"modern abstract t-shirt design\"}"

echo.
echo 4. Testing Background Removal
curl -X POST "%API_URL%/test/background-removal" ^
     -H "Content-Type: application/json" ^
     -d "{\"image_url\": \"https://example.com/image.png\", \"test_mode\": true}"

echo.
echo 5. Testing Design History
curl -s "%API_URL%/previous-designs"

echo.
echo Testing Frontend Integration...
echo ----------------------------------------

echo.
echo 6. Frontend Health Check
curl -s "%FRONTEND_URL%/health"

echo.
echo 7. Testing Design Customization Endpoints
echo 7.1. Get Available Colors
curl -s "%API_URL%/colors"

echo.
echo 7.2. Get Available Sizes
curl -s "%API_URL%/sizes"

echo.
echo 8. Testing Design Manipulation
echo 8.1. Color Transparency
curl -X POST "%API_URL%/color-transparency" ^
     -H "Content-Type: application/json" ^
     -d "{\"color\": \"#FF0000\", \"tolerance\": 0.5}"

echo.
echo 9. Testing Error Handling
echo 9.1. Invalid Design Request
curl -X POST "%API_URL%/design" ^
     -H "Content-Type: application/json" ^
     -d "{\"invalid\": true}"

echo.
echo 9.2. Invalid Background Removal
curl -X POST "%API_URL%/remove-background" ^
     -H "Content-Type: application/json" ^
     -d "{\"invalid\": true}"

echo.
echo 10. Performance Test
echo 10.1. Response Times
for /L %%i in (1,1,3) do (
    echo Request %%i
    curl -w "%%{time_total}\n" -s -o nul "%API_URL%/test/health"
)

echo.
echo ========================================
echo Test Results Summary
echo ========================================
echo 1. Backend Health: Tested
echo 2. Worker Status: Tested
echo 3. Design Generation: Tested (Test Mode + Real)
echo 4. Background Removal: Tested
echo 5. Design History: Tested
echo 6. Frontend Integration: Tested
echo 7. Design Customization: Tested
echo 8. Design Manipulation: Tested
echo 9. Error Handling: Tested
echo 10. Performance: Tested
echo.
echo Note: Check each response above for actual status and data
echo ========================================

pause
