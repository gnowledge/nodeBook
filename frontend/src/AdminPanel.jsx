import React, { useState, useEffect } from 'react';
import { getAuthBase } from './config';
import { authenticatedFetch, safeJsonParse } from './utils/authUtils';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('approvals'); // Default to approvals tab
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    is_superuser: false,
    is_active: true
  });

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'approvals') {
      fetchPendingApprovals();
    } else if (activeTab === 'stats') {
      fetchStats();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch(`${getAuthBase()}/admin/users`);
      const data = await safeJsonParse(response);
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch(`${getAuthBase()}/admin/pending-approvals`);
      const data = await safeJsonParse(response);
      setPendingApprovals(data.pending_users || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch(`${getAuthBase()}/admin/stats`);
      const data = await safeJsonParse(response);
      setStats(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedFetch(`${getAuthBase()}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await safeJsonParse(response);
      setShowCreateForm(false);
      setFormData({ username: '', email: '', password: '', is_superuser: false, is_active: true });
      fetchUsers(); // Refresh the list
      
      alert(`User '${data.user.username}' created successfully!`);
    } catch (err) {
      setError(err.message);
      console.error('Error creating user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const updateData = { ...formData };
      delete updateData.password; // Don't send password in updates
      
      const response = await authenticatedFetch(`${getAuthBase()}/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const data = await safeJsonParse(response);
      setShowEditForm(false);
      setSelectedUser(null);
      setFormData({ username: '', email: '', password: '', is_superuser: false, is_active: true });
      fetchUsers(); // Refresh the list
      
      alert(`User '${data.user.username}' updated successfully!`);
    } catch (err) {
      setError(err.message);
      console.error('Error updating user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteUser = async (user) => {
    if (!confirm(`Promote '${user.username}' to superuser?`)) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedFetch(`${getAuthBase()}/admin/users/${user.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin promotion' })
      });
      
      const data = await safeJsonParse(response);
      fetchUsers(); // Refresh the list
      
      alert(data.message);
    } catch (err) {
      setError(err.message);
      console.error('Error promoting user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteUser = async (user) => {
    if (!confirm(`Demote '${user.username}' from superuser?`)) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedFetch(`${getAuthBase()}/admin/users/${user.id}/demote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin demotion' })
      });
      
      const data = await safeJsonParse(response);
      fetchUsers(); // Refresh the list
      
      alert(data.message);
    } catch (err) {
      setError(err.message);
      console.error('Error demoting user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Delete user '${user.username}'? This action cannot be undone.`)) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedFetch(`${getAuthBase()}/admin/users/${user.id}`, {
        method: 'DELETE'
      });
      
      const data = await safeJsonParse(response);
      fetchUsers(); // Refresh the list
      
      alert(data.message);
    } catch (err) {
      setError(err.message);
      console.error('Error deleting user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (user, approved) => {
    const action = approved ? 'approve' : 'reject';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user '${user.username}'?`)) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedFetch(`${getAuthBase()}/admin/users/${user.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approved: approved,
          reason: approved ? 'Approved by admin' : 'Rejected by admin'
        })
      });
      
      const data = await safeJsonParse(response);
      fetchPendingApprovals(); // Refresh the list
      
      alert(data.message);
    } catch (err) {
      setError(err.message);
      console.error(`Error ${action}ing user:`, err);
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      is_superuser: user.is_superuser,
      is_active: user.is_active
    });
    setShowEditForm(true);
  };

  const UserForm = ({ onSubmit, title, submitText }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          {!showEditForm && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
          )}
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_superuser}
                onChange={(e) => setFormData({ ...formData, is_superuser: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Superuser</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Active</span>
            </label>
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '...' : submitText}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setShowEditForm(false);
                setSelectedUser(null);
                setFormData({ username: '', email: '', password: '', is_superuser: false, is_active: true });
              }}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 rounded ${activeTab === 'approvals' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Approvals
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Statistics
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">User Management</h3>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Create User
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_superuser ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.is_superuser ? 'Superuser' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => openEditForm(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        {!user.is_superuser ? (
                          <button
                            onClick={() => handlePromoteUser(user)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Promote
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDemoteUser(user)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Demote
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'approvals' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Pending User Approvals</h3>
          {loading ? (
            <div className="text-center py-8">Loading pending approvals...</div>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No pending user approvals.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Institution
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approval Note
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingApprovals.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{user.institution}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={user.approval_note}>
                          {user.approval_note}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleApproveUser(user, true)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproveUser(user, false)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">System Statistics</h3>
          {loading ? (
            <div className="text-center py-8">Loading statistics...</div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-100 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total_users}</div>
                <div className="text-sm text-blue-800">Total Users</div>
              </div>
              <div className="bg-green-100 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.active_users}</div>
                <div className="text-sm text-green-800">Active Users</div>
              </div>
              <div className="bg-purple-100 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.superusers}</div>
                <div className="text-sm text-purple-800">Superusers</div>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{stats.regular_users}</div>
                <div className="text-sm text-gray-800">Regular Users</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No statistics available</div>
          )}
        </div>
      )}

      {showCreateForm && (
        <UserForm
          onSubmit={handleCreateUser}
          title="Create New User"
          submitText="Create User"
        />
      )}

      {showEditForm && (
        <UserForm
          onSubmit={handleUpdateUser}
          title="Edit User"
          submitText="Update User"
        />
      )}
    </div>
  );
};

export default AdminPanel; 