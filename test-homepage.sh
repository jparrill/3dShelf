#!/bin/bash
cd frontend
npx playwright test homepage --reporter=line --max-failures=3