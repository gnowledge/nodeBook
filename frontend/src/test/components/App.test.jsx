import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../../App'

// Mock the UserIdContext
vi.mock('../../UserIdContext', () => ({
  UserIdContext: {
    Provider: ({ children, value }) => children,
  },
}))

// Mock the config
vi.mock('../../config', () => ({
  AUTH_BASE: 'http://localhost:8000/auth',
}))

describe('App Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders login page when no token is present', () => {
    render(<App />)
    expect(screen.getByText(/Welcome to Node Book/i)).toBeInTheDocument()
    expect(screen.getByText(/Login to NDF-Studio/i)).toBeInTheDocument()
  })

  it('renders main app when token is present', async () => {
    // Mock localStorage to return a token
    localStorage.getItem.mockReturnValue('fake-token')
    
    // Mock successful whoami response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'user123', username: 'testuser' })
    })

    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText(/Node Book/i)).toBeInTheDocument()
    })
  })

  it('handles authentication error gracefully', async () => {
    localStorage.getItem.mockReturnValue('invalid-token')
    
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401
    })

    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText(/Welcome to Node Book/i)).toBeInTheDocument()
    })
  })
}) 