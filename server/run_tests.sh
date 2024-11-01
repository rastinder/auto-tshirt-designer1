#!/bin/bash
echo "Running server tests..."

# Activate virtual environment
source ../venv/bin/activate

# Set Python path
export PYTHONPATH=$PYTHONPATH:$(pwd)/..

# Run tests
python test_connection.py