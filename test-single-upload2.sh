#!/bin/bash
cd frontend
npx playwright test file-upload-and-conflicts --grep "should upload new files to existing project successfully" --reporter=line