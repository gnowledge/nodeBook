import React from "react";
import { useUserInfo } from "./UserIdContext";
import { Link, useNavigate } from "react-router-dom";

export default function UserBar() {
  const { userId, username } = useUserInfo();
  const navigate = useNavigate();

  const handleLogin = () => navigate("/login");
  const handleLogout = () => navigate("/logout");

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-blue-900 text-white shadow">
      <div className="flex items-center">
        <img
          src="/logo.png"
          alt="NodeBook Logo"
          style={{ width: 60, height: 60 }}
          className="mr-3"
        />
        <div className="text-2xl font-bold tracking-wide">
          <Link to="/" className="hover:underline">Node Book</Link>
        </div>
      </div>
      <div>
        {userId ? (
          <>
            <span className="mr-4">Logged in as <b>{username}</b></span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded text-white font-semibold"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={handleLogin}
            className="bg-green-500 hover:bg-green-600 px-4 py-1 rounded text-white font-semibold"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}
