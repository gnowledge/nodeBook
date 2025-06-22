// Login.jsx
import React, { useState } from 'react';
import { AUTH_BASE } from "./config";

export default function Login({ onLogin, onAuth }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const loginPayload = {
        username_or_email: usernameOrEmail,
        password: password
      };
      const res = await fetch(`${AUTH_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginPayload)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Invalid credentials");
      }
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      
      // Use the user data from the login response
      const user = data.user;
      if (onLogin) onLogin(user);  // Pass user to parent app
      if (onAuth) await onAuth();  // Refresh userId context in App.jsx
    } catch (err) {
      setErrorMsg(err.message || "Login failed");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10 p-4 bg-white border shadow rounded">
      <h2 className="text-xl font-bold mb-4 text-center">Login to NDF-Studio</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
        <input
            type="text"
            placeholder="Username or Email"
          className="w-full p-2 border rounded"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
          required
        />
          <p className="text-xs text-gray-500 mt-1">
            You can login with either your username or email address
          </p>
        </div>
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
