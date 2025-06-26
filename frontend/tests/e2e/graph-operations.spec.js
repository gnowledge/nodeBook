import { test, expect } from '@playwright/test'

test.describe('Graph Operations', () => {
  test.beforeEach(async ({ page }) => {
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

    // Mock graph list
    await page.route('**/api/ndf/users/*/graphs', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'test-graph', title: 'Test Graph' }
        ])
      })
    })

    await page.goto('/')
  })

  test('should create a new graph', async ({ page }) => {
    // Mock graph creation
    await page.route('**/api/ndf/users/*/graphs/*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'new-graph', title: 'New Graph' })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ nodes: [], relations: [], attributes: [] })
        })
      }
    })

    // Click File menu
    await page.getByRole('button', { name: 'File ▾' }).click()
    
    // Click "New Graph"
    await page.getByText('+ New Graph').click()
    
    // Fill in graph name
    await page.getByRole('textbox').fill('New Graph')
    await page.keyboard.press('Enter')
    
    // Should show the new graph tab
    await expect(page.getByText('New Graph')).toBeVisible()
  })

  test('should open an existing graph', async ({ page }) => {
    // Mock graph data
    await page.route('**/api/ndf/users/*/graphs/*/polymorphic_composed', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          nodes: [
            {
              node_id: 'node1',
              name: 'Test Node',
              description: 'A test node'
            }
          ],
          relations: [],
          attributes: []
        })
      })
    })

    // Mock CNL data
    await page.route('**/api/ndf/users/*/graphs/*/cnl_md', async route => {
      await route.fulfill({
        status: 200,
        body: '# Test Graph\n\n- Test Node'
      })
    })

    // Click File menu
    await page.getByRole('button', { name: 'File ▾' }).click()
    
    // Click on existing graph
    await page.getByText('Test Graph').click()
    
    // Should show the graph content
    await expect(page.getByText('Test Node')).toBeVisible()
  })

  test('should add a new node', async ({ page }) => {
    // Mock empty graph
    await page.route('**/api/ndf/users/*/graphs/*/polymorphic_composed', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          nodes: [],
          relations: [],
          attributes: []
        })
      })
    })

    // Mock node creation
    await page.route('**/api/ndf/users/*/graphs/*/nodes', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          node_id: 'new-node',
          name: 'New Node'
        })
      })
    })

    // Open a graph first
    await page.getByRole('button', { name: 'File ▾' }).click()
    await page.getByText('Test Graph').click()
    
    // Click "Add Node" button
    await page.getByRole('button', { name: '+ Add Node' }).click()
    
    // Fill in node details
    await page.getByPlaceholder('e.g. mathematician').fill('New Node')
    await page.getByRole('button', { name: 'Add' }).click()
    
    // Should show the new node
    await expect(page.getByText('New Node')).toBeVisible()
  })

  test('should delete a graph', async ({ page }) => {
    // Mock graph deletion
    await page.route('**/api/ndf/users/*/graphs/*/delete', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Graph deleted' })
      })
    })

    // Mock graph data
    await page.route('**/api/ndf/users/*/graphs/*/polymorphic_composed', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          nodes: [],
          relations: [],
          attributes: []
        })
      })
    })

    // Open a graph
    await page.getByRole('button', { name: 'File ▾' }).click()
    await page.getByText('Test Graph').click()
    
    // Click delete button
    await page.getByRole('button', { name: '[Delete Graph]' }).click()
    
    // Confirm deletion
    page.on('dialog', dialog => dialog.accept())
    
    // Should redirect or show empty state
    await expect(page.getByText('Select or create a graph to begin')).toBeVisible()
  })
}) 