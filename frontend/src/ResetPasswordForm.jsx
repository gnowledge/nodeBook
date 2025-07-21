import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getAuthBase } from './config';

export default function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setError('Invalid reset link. Please request a new password reset.');
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validate passwords
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${getAuthBase()}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          new_password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Password reset successfully!');
        setPassword('');
        setConfirmPassword('');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.detail || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-center mb-4">Password Reset</h2>
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/login')}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-center mb-6">Reset Your Password</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your new password"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 8 characters long
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm your new password"
              required
            />
          </div>

          {message && (
            <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              {message}
              <p className="text-sm mt-2">Redirecting to login page...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Back to Login
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600 text-center">
          <p>Make sure to use a strong password that you can remember.</p>
        </div>
      </div>
    </div>
  );
} 