#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Server URL
SERVER_URL="http://localhost:8000"

echo "Testing API endpoints..."

# Test health endpoint
echo -n "Testing health endpoint... "
health_response=$(curl -s ${SERVER_URL}/)
if [[ $health_response == *"healthy"* ]]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "Response: $health_response"
fi

# Test design endpoint
echo -n "Testing design endpoint... "
design_response=$(curl -s -X POST ${SERVER_URL}/design \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test design","style":"test","priority":1}')
if [[ $design_response == *"task_id"* ]]; then
    echo -e "${GREEN}OK${NC}"
    task_id=$(echo $design_response | grep -o '"task_id":"[^"]*' | cut -d'"' -f4)
    
    # Test status endpoint
    echo -n "Testing status endpoint... "
    status_response=$(curl -s ${SERVER_URL}/status/${task_id})
    if [[ $status_response == *"task_id"* ]]; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        echo "Response: $status_response"
    fi
else
    echo -e "${RED}FAILED${NC}"
    echo "Response: $design_response"
fi