// Login.jsx
import React, { useState } from 'react';
import { API_BASE } from "./config";

export default function Login({ onLogin, onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const loginPayload = new URLSearchParams({ username: email, password });
      const res = await fetch(`${API_BASE}/auth/jwt/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: loginPayload
      });
      if (!res.ok) {
        throw new Error("Invalid credentials");
      }
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      const userRes = await fetch(`${API_BASE}/auth/whoami`, {
        headers: { Authorization: `Bearer ${data.access_token}` }
      });
      if (!userRes.ok) {
        throw new Error("Failed to fetch user info");
      }
      const user = await userRes.json();
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
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
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
