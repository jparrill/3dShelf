#!/bin/bash
cd frontend
echo "🎯 FINAL E2E TEST RESULTS"
echo "========================="
npx playwright test --reporter=line | tail -5