import React, { useState } from 'react';
import { getAuthBase } from './config';

export default function ForgotPasswordForm({ onClose }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${getAuthBase()}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Password reset email sent successfully!');
        setEmail('');
      } else {
        setError(data.detail || 'Failed to send password reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Forgot Password</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email address"
              required
            />
          </div>

          {message && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {message}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          <p>Enter your email address and we'll send you a link to reset your password.</p>
          <p className="mt-2">
            Don't have access to your email? Contact an administrator for assistance.
          </p>
        </div>
      </div>
    </div>
  );
} 