#!/bin/bash
cd frontend
npx playwright test "should upload new files to existing project successfully" --reporter=line