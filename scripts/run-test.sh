#!/bin/bash

# Simple test runner script
echo "Running E2E tests from frontend directory..."

# Navigate to frontend directory and run tests
cd frontend
npx playwright test project-creation --reporter=line