import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display login page by default', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.getByText('Welcome to Node Book')).toBeVisible()
    await expect(page.getByText('Login to NDF-Studio')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
  })

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/')
    
    // Try to submit empty form
    await page.getByRole('button', { name: 'Login' }).click()
    
    // Should show validation errors
    await expect(page.getByText('Username or Email')).toBeVisible()
    await expect(page.getByText('Password')).toBeVisible()
  })

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/')
    
    // Fill in invalid credentials
    await page.getByPlaceholder('Username or Email').fill('invalid@example.com')
    await page.getByPlaceholder('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Login' }).click()
    
    // Should show error message
    await expect(page.getByText(/Invalid credentials|Login failed/)).toBeVisible()
  })

  test('should navigate to main app after successful login', async ({ page }) => {
    // Mock successful login response
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-token',
          user: { id: 'user123', username: 'testuser' }
        })
      })
    })

    // Mock successful whoami response
    await page.route('**/auth/whoami', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user123',
          username: 'testuser'
        })
      })
    })

    await page.goto('/')
    
    // Fill in credentials
    await page.getByPlaceholder('Username or Email').fill('test@example.com')
    await page.getByPlaceholder('Password').fill('password123')
    await page.getByRole('button', { name: 'Login' }).click()
    
    // Should redirect to main app
    await expect(page.getByText('Logged in as testuser')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-token')
    })

    // Mock whoami response
    await page.route('**/auth/whoami', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user123',
          username: 'testuser'
        })
      })
    })

    await page.goto('/')
    
    // Should be logged in
    await expect(page.getByText('Logged in as testuser')).toBeVisible()
    
    // Click logout
    await page.getByRole('button', { name: 'Logout' }).click()
    
    // Should redirect to login page
    await expect(page.getByText('Welcome to Node Book')).toBeVisible()
  })
}) 