#!/bin/bash
cd frontend
npx playwright test file-upload-and-conflicts --reporter=line --max-failures=3