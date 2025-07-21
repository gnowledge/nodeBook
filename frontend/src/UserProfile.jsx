import React, { useState } from 'react';
import { getAuthBase } from './config';
import { useUserInfo } from './UserIdContext';

export default function UserProfile() {
  const { userId, username } = useUserInfo();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    // Add more checks as needed (uppercase, number, etc.)
    return null;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getAuthBase()}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePassword(false);
      } else {
        setError(data.detail || 'Failed to change password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white border shadow rounded">
      <h2 className="text-2xl font-bold mb-4">User Profile</h2>
      <div className="mb-4">
        <div><b>Username:</b> {username}</div>
        <div><b>User ID:</b> {userId}</div>
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={() => setShowChangePassword(true)}
      >
        Change Password
      </button>
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              {error && <div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
              {message && <div className="p-2 bg-green-100 border border-green-400 text-green-700 rounded">{message}</div>}
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                  onClick={() => setShowChangePassword(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 