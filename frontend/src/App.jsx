import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import NDFStudioLayout from "./NDFStudioLayout";
import AuthPage from "./AuthPage";
import { UserIdContext } from "./UserIdContext";
import { API_BASE } from "./config";

const MAIN_TABS = ['display', 'graph', 'cnl', 'kb'];
const DEV_TABS = ['json', 'yaml'];

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

function Logout() {
  localStorage.removeItem("token");
  return <Navigate to="/login" replace />;
}

function App() {
  const [userId, setUserId] = useState(null); // null by default

  // Helper to update userId from /auth/whoami
  const fetchAndSetUserId = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/auth/whoami`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          console.debug("[App.jsx] /auth/whoami response:", data); // Debug message
          if (data.username) setUserId(data.username);
          else setUserId(null);
        } else {
          setUserId(null);
          localStorage.removeItem("token");
        }
      } catch (err) {
        console.error("[App.jsx] Error fetching /auth/whoami:", err); // Debug message
        setUserId(null);
        localStorage.removeItem("token");
      }
    } else {
      setUserId(null);
    }
  };

  useEffect(() => {
    fetchAndSetUserId();
  }, []);

  useEffect(() => {
    console.debug("[App.jsx] userId context value:", userId); // Debug message
  }, [userId]);

  return (
    <UserIdContext.Provider value={userId}>
      <Router>
        <Routes>
          <Route path="/login" element={<AuthPage onAuth={fetchAndSetUserId} />} />
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
      </Router>
    </UserIdContext.Provider>
  );
}

export default App;
