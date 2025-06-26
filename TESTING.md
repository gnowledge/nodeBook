# NDF Studio Testing Guide

This document outlines the comprehensive testing strategy for NDF Studio, including unit tests, integration tests, end-to-end tests, and automated CI/CD pipeline.

## 🧪 Testing Strategy Overview

### Testing Pyramid
```
    /\
   /  \     E2E Tests (Few, Critical Paths)
  /____\    
 /      \   Integration Tests (API, Components)
/________\  Unit Tests (Many, Fast)
```

### Test Types

1. **Unit Tests** - Fast, isolated component/function tests
2. **Integration Tests** - API endpoint and component interaction tests  
3. **End-to-End Tests** - Full user workflow tests
4. **Security Tests** - Vulnerability scanning and security checks
5. **Performance Tests** - Load and stress testing (future)

## 🚀 Quick Start

### Install Dependencies

```bash
# Frontend testing dependencies
cd frontend
npm install

# Backend testing dependencies  
cd ../backend
pip install pytest pytest-cov pytest-asyncio httpx
```

### Run All Tests

```bash
# Frontend tests
cd frontend
npm run test:all

# Backend tests
cd ../backend
python -m pytest tests/ -v --cov=core
```

## 📋 Frontend Testing

### Unit Tests (Vitest + React Testing Library)

**Location:** `frontend/src/test/`

**Run Commands:**
```bash
npm run test          # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage report
```

**Example Test Structure:**
```javascript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should handle user interactions', () => {
    render(<MyComponent />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Clicked!')).toBeInTheDocument()
  })
})
```

### End-to-End Tests (Playwright)

**Location:** `frontend/tests/e2e/`

**Run Commands:**
```bash
npm run test:e2e        # Run E2E tests
npm run test:e2e:ui     # Run E2E tests with UI
npm run test:e2e:headed # Run E2E tests in headed mode
```

**Example E2E Test:**
```javascript
import { test, expect } from '@playwright/test'

test('user can login and create a graph', async ({ page }) => {
  await page.goto('/')
  
  // Login
  await page.fill('[data-testid="username"]', 'testuser')
  await page.fill('[data-testid="password"]', 'password')
  await page.click('[data-testid="login-button"]')
  
  // Create graph
  await page.click('[data-testid="new-graph"]')
  await page.fill('[data-testid="graph-name"]', 'My Graph')
  await page.click('[data-testid="create-button"]')
  
  // Verify
  await expect(page.getByText('My Graph')).toBeVisible()
})
```

### Test Coverage Goals

- **Unit Tests:** 80%+ coverage
- **Integration Tests:** Critical API endpoints
- **E2E Tests:** Core user workflows

## 🔧 Backend Testing

### Unit Tests (Pytest)

**Location:** `backend/tests/`

**Run Commands:**
```bash
python -m pytest tests/ -v                    # Run all tests
python -m pytest tests/ -v --cov=core         # With coverage
python -m pytest tests/ -k "test_auth"        # Run specific tests
```

**Example Test Structure:**
```python
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_create_user():
    response = client.post("/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    })
    assert response.status_code == 201
    assert response.json()["username"] == "testuser"

def test_login_user():
    response = client.post("/auth/login", data={
        "username": "testuser",
        "password": "password123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
```

### API Integration Tests

**Location:** `backend/tests/integration/`

Tests for:
- Authentication flows
- Graph CRUD operations
- Node and relation management
- Schema validation
- Error handling

## 🔒 Security Testing

### Automated Security Scans

**Backend (Bandit):**
```bash
pip install bandit
bandit -r backend/ -f json -o bandit-report.json
```

**Frontend (npm audit):**
```bash
cd frontend
npm audit --audit-level=moderate
```

### Manual Security Testing

1. **Authentication Testing**
   - Test token validation
   - Test authorization headers
   - Test session management

2. **Input Validation**
   - SQL injection prevention
   - XSS prevention
   - CSRF protection

3. **API Security**
   - Rate limiting
   - CORS configuration
   - HTTPS enforcement

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow

**Triggered on:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Pipeline Stages:**
1. **Backend Tests** - Unit tests, integration tests, coverage
2. **Frontend Tests** - Unit tests, linting, type checking
3. **E2E Tests** - Full application testing
4. **Security Scan** - Vulnerability scanning
5. **Build Check** - Production build verification

### Local Pre-commit Hook

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
set -e

echo "Running pre-commit checks..."

# Frontend checks
cd frontend
npm run lint
npm run test -- --run
npm run type-check

# Backend checks
cd ../backend
python -m pytest tests/ -v --tb=short

echo "All checks passed!"
```

## 📊 Test Reporting

### Coverage Reports

**Frontend:** `frontend/coverage/`
- HTML coverage report
- LCOV format for CI

**Backend:** `backend/htmlcov/`
- HTML coverage report
- XML format for CI

### E2E Test Reports

**Location:** `frontend/playwright-report/`
- HTML test report
- Screenshots on failure
- Video recordings
- Trace files

## 🛠️ Testing Best Practices

### Frontend Testing

1. **Component Testing**
   - Test component rendering
   - Test user interactions
   - Test state changes
   - Mock external dependencies

2. **Accessibility Testing**
   - Use `@testing-library/jest-dom` matchers
   - Test keyboard navigation
   - Test screen reader compatibility

3. **Performance Testing**
   - Test component render times
   - Test bundle size
   - Test memory leaks

### Backend Testing

1. **API Testing**
   - Test all HTTP methods
   - Test error responses
   - Test authentication/authorization
   - Test input validation

2. **Database Testing**
   - Use test database
   - Clean up after tests
   - Test transactions
   - Test migrations

3. **Integration Testing**
   - Test external service integration
   - Test file system operations
   - Test concurrent operations

## 🔧 Test Configuration

### Environment Variables

Create `.env.test`:
```bash
# Test database
DATABASE_URL=sqlite:///./test.db

# Test API settings
API_BASE_URL=http://localhost:8000

# Test user credentials
TEST_USERNAME=testuser
TEST_PASSWORD=testpass
```

### Test Data

**Location:** `tests/fixtures/`
- Sample graphs
- Test users
- Mock responses

## 📈 Performance Testing (Future)

### Load Testing

```bash
# Install k6
npm install -g k6

# Run load test
k6 run tests/performance/load-test.js
```

### Stress Testing

```bash
# Run stress test
k6 run tests/performance/stress-test.js
```

## 🐛 Debugging Tests

### Frontend Debugging

```bash
# Debug unit tests
npm run test:ui

# Debug E2E tests
npm run test:e2e:headed
```

### Backend Debugging

```bash
# Debug with pdb
python -m pytest tests/ -s --pdb

# Debug specific test
python -m pytest tests/test_auth.py::test_login -s --pdb
```

## 📝 Writing New Tests

### When to Write Tests

- **Always** for new features
- **Always** for bug fixes
- **Always** for critical paths
- **Consider** for refactoring

### Test Naming Convention

```
test_[functionality]_[scenario]_[expected_result]
```

Examples:
- `test_login_with_valid_credentials_should_succeed`
- `test_create_graph_without_auth_should_fail`
- `test_delete_node_should_remove_from_graph`

### Test Organization

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
├── fixtures/      # Test data
└── utils/         # Test utilities
```

## 🎯 Testing Checklist

Before committing code:

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Code coverage meets targets
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Security scan passes
- [ ] Performance tests pass (if applicable)

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/) 