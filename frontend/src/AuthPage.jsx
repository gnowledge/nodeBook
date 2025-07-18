// AuthPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthBase } from './config';
import Login from './Login';
import Register from './Register';

export default function AuthPage({ onAuth }) {
  const [tab, setTab] = useState('login');
  const [user, setUser] = useState(null);
  const [adminMode, setAdminMode] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // If a token is present, check whoami
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${getAuthBase()}/whoami`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setUser(data);
          setAdminMode(data.is_superuser || false);
        })
        .catch(() => {
          localStorage.removeItem('token');
        });
    }
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      {/* Logo at the top, centered */}
      <img
        src="./logo.png"
        alt="NodeBook Logo"
        style={{ width: 120, height: 120 }}
        className="mb-6"
      />
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to Node Book</h1>
        <p className="text-gray-700 max-w-md mx-auto">
          Node Book is an open, mobile-friendly knowledge construction platform using Controlled Natural Language (CNL) to represent knowledge as node-neighborhoods. Please log in to access your workspace and save your knowledge graphs.
        </p>
      </div>
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 w-full max-w-md">
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={() => setTab('login')}
            className={`px-4 py-2 rounded ${tab === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Login
          </button>
          {adminMode && (
            <button
              onClick={() => setTab('register')}
              className={`px-4 py-2 rounded ${tab === 'register' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            >
              Register
            </button>
          )}
        </div>
        {tab === 'login' && <Login onLogin={(user) => { setUser(user); if (onAuth) onAuth(); }} />}
        {tab === 'register' && adminMode && <Register onRegister={() => setTab('login')} />}
      </div>
      {/* Footer */}
      <footer className="w-full text-center text-xs text-gray-500 py-2 mt-8 fixed bottom-0 left-0 bg-transparent">
        <a
          href="https://github.com/gnowledge/nodeBook"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          a free and open source software
        </a>
      </footer>
    </div>
  );
}
