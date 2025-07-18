// Register.jsx
import React, { useState } from 'react';
import { getServerAddress } from "./config";

export default function Register({ onRegister }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [institution, setInstitution] = useState('');
  const [serverAddress, setServerAddress] = useState(() => localStorage.getItem('serverAddress') || 'https://api.nodeBook.in');
  const [errorMsg, setErrorMsg] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // Save server address to localStorage
      localStorage.setItem('serverAddress', serverAddress);
      const res = await fetch(`${getServerAddress()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username, 
          email, 
          password, 
          approval_note: approvalNote,
          institution: institution
        })
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
    <div className="max-w-md mx-auto mt-10 p-6 bg-white border shadow rounded">
      <h2 className="text-xl font-bold mb-4 text-center">Create Account</h2>
      <p className="text-sm text-gray-600 mb-4 text-center">
        Registration requires admin approval. Please provide your details below.
      </p>
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
        <div>
          <input
            type="text"
            placeholder="Institution/School/College"
            className="w-full p-2 border rounded"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Please specify your institution, school, or college
          </p>
        </div>
        <div>
          <textarea
            placeholder="Please introduce yourself and explain why you want to use NodeBook..."
            className="w-full p-2 border rounded h-24 resize-none"
            value={approvalNote}
            onChange={(e) => setApprovalNote(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Tell us about yourself, your background, and why you want to use NodeBook
          </p>
        </div>
        {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}
        {success && (
          <div className="text-green-600 text-sm p-3 bg-green-50 border border-green-200 rounded">
            <strong>Registration successful!</strong><br/>
            Your account has been created and is pending admin approval. 
            You will be able to login once an administrator approves your account.
          </div>
        )}
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
