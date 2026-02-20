# 3DShelf - TODO & Tasks

## 🚀 High Priority

### 🔒 Security Scanning Implementation
**Status**: Pending
**Priority**: High
**Assignee**: TBD
**Estimated Effort**: 2-4 hours

**Description**:
Implement and fix the security scanning workflow that was temporarily disabled in the CI pipeline.

**Technical Details**:
- **Issue**: Gosec security scanner fails to install correctly in GitHub Actions CI
- **Root Cause**: PATH and Go binary installation issues in CI environment
- **Current Status**: Security scan job disabled with `if: false` in `.github/workflows/backend-tests.yml`

**Tasks**:
1. [ ] Debug Gosec installation issues in CI environment
2. [ ] Fix PATH configuration for Go binaries in GitHub Actions
3. [ ] Test gosec scanner locally and in CI
4. [ ] Configure proper SARIF report generation and upload
5. [ ] Re-enable security scan in CI workflow
6. [ ] Verify Trivy vulnerability scanner integration
7. [ ] Add security scan to required status checks

**Acceptance Criteria**:
- [ ] Security scan job passes successfully in CI
- [ ] Gosec reports are uploaded to GitHub Security tab
- [ ] Trivy vulnerability reports are generated
- [ ] No false positives block the CI pipeline
- [ ] Security scan is non-blocking but visible in PR checks

**Reference**:
- Security scan was disabled in commit: `fix: Enhance Gosec installation debugging and PATH management`
- Related workflow file: `.github/workflows/backend-tests.yml` (lines 119-179)
- Test results show consistent failures due to tool installation issues

**Implementation Notes**:
```bash
# Commands that need to work in CI:
go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest
gosec -fmt sarif -out gosec-report.sarif -quiet ./...
```

---

## 📝 Medium Priority

### 🧪 Test Coverage Improvements
**Status**: Not Started
**Priority**: Medium

**Description**:
Improve test coverage in areas with lower coverage percentages.

**Current Coverage**: 75.3% (Target: >80%)

**Areas for Improvement**:
- `backend/internal/handlers`: 84.2% → 90%+
- `backend/pkg/database`: 90% → 95%+
- `backend/pkg/scanner`: 85.9% → 90%+

---

### 📱 Frontend Integration Tests
**Status**: Partially Complete
**Priority**: Medium

**Description**:
Complete and fix frontend integration tests that are currently disabled.

**Issues**:
- MSW (Mock Service Worker) requires BroadcastChannel polyfills
- TypeScript type conflicts in test files
- Need to configure proper test environment for integration tests

---

## 🔧 Low Priority

### 🏗️ Build Optimization
**Status**: Not Started
**Priority**: Low

**Description**:
Optimize CI build times and resource usage.

**Ideas**:
- Cache optimization for Go modules and npm dependencies
- Parallel test execution improvements
- Docker layer caching for containerized builds

---

### 📊 Performance Monitoring
**Status**: Not Started
**Priority**: Low

**Description**:
Add performance monitoring and benchmarking to CI pipeline.

**Goals**:
- Benchmark critical code paths
- Monitor performance regression
- Set performance budgets

---

## ✅ Completed

### ✅ Comprehensive Testing Infrastructure
**Completed**: ✅
**Description**: Implemented complete testing infrastructure with 75.3% coverage, 123 total tests across backend and frontend.

### ✅ CI/CD Pipeline Optimization
**Completed**: ✅
**Description**: Streamlined CI from 6 jobs to 2, updated to Go 1.25, fixed dependency caching.

### ✅ Code Quality Standards
**Completed**: ✅
**Description**: Implemented linting, formatting, and quality checks with appropriate thresholds.

---

## 📋 Guidelines

### Adding New Tasks
1. Use the template format above
2. Include technical details and acceptance criteria
3. Assign priority level (High/Medium/Low)
4. Reference related commits or files
5. Update status as work progresses

### Status Values
- **Not Started**: No work has been done
- **Pending**: Ready to start, waiting for assignment
- **In Progress**: Currently being worked on
- **Partially Complete**: Some work done, needs finishing
- **Completed**: ✅ Task finished and verified

---

*Last Updated: February 12, 2026*
*Project: 3DShelf Testing Infrastructure*