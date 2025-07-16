// Register.jsx
import React, { useState } from 'react';
import { AUTH_BASE } from "./config";

export default function Register({ onRegister }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverAddress, setServerAddress] = useState(() => localStorage.getItem('serverAddress') || 'https://api.nodeBook.in');
  const [errorMsg, setErrorMsg] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // Save server address to localStorage
      localStorage.setItem('serverAddress', serverAddress);
      const res = await fetch(`${AUTH_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Registration failed");
      }
      setSuccess(true);
      if (onRegister) onRegister();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10 p-4 bg-white border shadow rounded">
      <h2 className="text-xl font-bold mb-4 text-center">Create Account</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Server Address"
            className="w-full p-2 border rounded mb-2"
            value={serverAddress}
            onChange={e => setServerAddress(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the backend server address (e.g., https://api.nodeBook.in)
          </p>
        </div>
        <div>
          <input
            type="text"
            placeholder="Username"
            className="w-full p-2 border rounded"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Choose a unique username for your account
          </p>
        </div>
        <div>
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            You'll be able to login with either username or email
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
        {success && <div className="text-green-600 text-sm">Registration successful! Please login.</div>}
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          Register
        </button>
      </form>
    </div>
  );
}
