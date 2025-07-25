import React, { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import NDFStudioLayout from "./NDFStudioLayout";
import AuthPage from "./AuthPage";
import { UserIdContext } from "./UserIdContext";
import { DifficultyProvider } from "./DifficultyContext";
import { getAuthBase } from "./config";
import UserBar from "./UserBar";
import AuthStatus from "./components/AuthStatus";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import UpdateNotification from "./components/UpdateNotification";

const MAIN_TABS = ['display', 'graph', 'cnl', 'kb'];
const DEV_TABS = ['json', 'yaml'];

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

function Logout() {
  localStorage.removeItem("token");
  // Force a complete page reload to clear all state
  window.location.reload();
  return null; // This won't render since we're reloading
}

function App() {
  const [userInfo, setUserInfo] = useState({ userId: null, username: null, is_superuser: false }); // Store userId, username, and is_superuser

  // Helper to update userInfo from /auth/whoami
  const fetchAndSetUserInfo = async () => {
    const token = localStorage.getItem("token");
    
    if (token) {
      try {
        const res = await fetch(`${getAuthBase()}/whoami`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.id && data.username) {
            const newUserInfo = { 
              userId: data.id, 
              username: data.username,
              is_superuser: data.is_superuser || false
            };
            setUserInfo(newUserInfo); // Store UUID, username, and is_superuser
          } else {
            setUserInfo({ userId: null, username: null, is_superuser: false });
          }
        } else {
          setUserInfo({ userId: null, username: null, is_superuser: false });
          localStorage.removeItem("token");
        }
      } catch (err) {
        setUserInfo({ userId: null, username: null, is_superuser: false });
        localStorage.removeItem("token");
      }
    } else {
      setUserInfo({ userId: null, username: null, is_superuser: false });
    }
  };

  useEffect(() => {
    fetchAndSetUserInfo();
  }, []);

  return (
    <UserIdContext.Provider value={userInfo}>
      <DifficultyProvider>
        <Router>
          <AuthStatus />
          <UserBar />
          <Routes>
            <Route path="/login" element={<AuthPage onAuth={fetchAndSetUserInfo} />} />
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <div className="h-screen w-screen overflow-hidden">
                    <NDFStudioLayout mainTabs={MAIN_TABS} devTabs={DEV_TABS} />
                  </div>
                </RequireAuth>
              }
            />
            <Route path="/logout" element={<Logout />} />
            <Route path="/" element={<Navigate to="/app" replace />} />
          </Routes>
          <PWAInstallPrompt />
          <UpdateNotification />
        </Router>
      </DifficultyProvider>
    </UserIdContext.Provider>
  );
}

export default App;
