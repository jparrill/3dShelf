#!/bin/bash
cd frontend
echo "🧪 Testing E2E Progress Report"
echo "================================"

echo ""
echo "📋 Testing core functionality..."
npx playwright test simple-test project-creation --reporter=line

echo ""
echo "📋 Testing homepage functionality..."
npx playwright test homepage --reporter=line

echo ""
echo "📋 Overall progress summary:"
npx playwright test --reporter=line | tail -10