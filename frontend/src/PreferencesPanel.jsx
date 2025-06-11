import React, { useState, useEffect } from "react";
import { API_BASE } from "./config";

// Initial preferences (used as fallback)
const DEFAULT_PREFERENCES = {
  graphLayout: "dagre",
  language: "en",
  educationLevel: "undergraduate",
  landingTab: "help",
  difficulty: "easy",
  subjectOrder: "SVO",
  theme: "system",
  fontSize: "medium",
  showTooltips: true,
  autosave: false,
  showScorecardOnSave: true,
  showAdvanced: false,
  accessibility: false,
};

const DISABLED_PREFS = [
  "language", "theme", "fontSize", "autosave", "showAdvanced", "accessibility"
];

export default function PreferencesPanel({ userId = "user0", onPrefsChange }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch preferences from backend on mount
  useEffect(() => {
    async function fetchPrefs() {
      setLoading(true);
      setError(null);
      try {
        // Fetch preferences from backend API, sending user_id as query param
        const res = await fetch(`api/preferences?user_id=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("Failed to load preferences");
        const data = await res.json();
        setPrefs(data);
        if (onPrefsChange) onPrefsChange(data);
      } catch (e) {
        setError("Could not load preferences. Using defaults.");
        setPrefs(DEFAULT_PREFERENCES);
        if (onPrefsChange) onPrefsChange(DEFAULT_PREFERENCES);
      } finally {
        setLoading(false);
      }
    }
    fetchPrefs();
  }, [userId]);

  // Save preferences to backend
  async function savePrefs(newPrefs) {
    try {
      await fetch(`/api/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify(newPrefs),
      });
    } catch (e) {
      // Optionally show error
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    const updated = {
      ...prefs,
      [name]: type === "checkbox" ? checked : value,
    };
    setPrefs(updated);
    savePrefs(updated);
    if (onPrefsChange) onPrefsChange(updated);
  }

  if (loading) return <div className="p-4 text-gray-500">Loading preferences...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <form className="max-w-xl mx-auto space-y-5">
      <div>
        <label className="block font-medium mb-1">Difficulty Level</label>
        <select name="difficulty" value={prefs.difficulty} onChange={handleChange} className="border rounded px-2 py-1">
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>
        <span className="text-xs text-gray-400 ml-2">(Affects UI and AI prompts in future)</span>
      </div>
      <div>
        <label className="block font-medium mb-1">Graph Layout</label>
        <select name="graphLayout" value={prefs.graphLayout} onChange={handleChange} className="border rounded px-2 py-1">
          <option value="dagre">Dagre (default)</option>
          <option value="breadthfirst" disabled> Breadthfirst (coming soon)</option>
          <option value="grid" disabled>Grid (coming soon)</option>
          <option value="circle" disabled>Circle (coming soon)</option>
        </select>
      </div>
      <div>
        <label className="block font-medium mb-1 text-gray-500">Language</label>
        <select name="language" value={prefs.language} onChange={handleChange} className="border rounded px-2 py-1" disabled>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
        <span className="text-xs text-gray-400 ml-2">(i18n coming soon)</span>
      </div>
      <div>
        <label className="block font-medium mb-1">Education Level</label>
        <select name="educationLevel" value={prefs.educationLevel} onChange={handleChange} className="border rounded px-2 py-1">
          <option value="school">School</option>
          <option value="undergraduate">Undergraduate</option>
          <option value="graduate">Graduate</option>
          <option value="research">Research</option>
        </select>
      </div>
      <div>
        <label className="block font-medium mb-1">Default Landing Tab</label>
        <select name="landingTab" value={prefs.landingTab} onChange={handleChange} className="border rounded px-2 py-1">
          <option value="help">Help</option>
          <option value="graphs">Knowledge Base</option>
          <option value="workspace-stats">Score Card</option>
        </select>
      </div>
      <div>
        <label className="block font-medium mb-1">Subject/Predicate/Object Order</label>
        <select name="subjectOrder" value={prefs.subjectOrder} onChange={handleChange} className="border rounded px-2 py-1">
          <option value="SVO">Subject-Verb-Object (default)</option>
          <option value="SOV">Subject-Object-Verb</option>
          <option value="OSV">Object-Subject-Verb</option>
        </select>
      </div>
      <div>
        <label className="block font-medium mb-1 text-gray-500">Theme</label>
        <select name="theme" value={prefs.theme} onChange={handleChange} className="border rounded px-2 py-1" disabled>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <span className="text-xs text-gray-400 ml-2">(coming soon)</span>
      </div>
      <div>
        <label className="block font-medium mb-1 text-gray-500">Font Size</label>
        <select name="fontSize" value={prefs.fontSize} onChange={handleChange} className="border rounded px-2 py-1" disabled>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
        <span className="text-xs text-gray-400 ml-2">(coming soon)</span>
      </div>
      <div>
        <label className="block font-medium mb-1">Show Tooltips</label>
        <input type="checkbox" name="showTooltips" checked={prefs.showTooltips} onChange={handleChange} className="ml-2" />
      </div>
      <div>
        <label className="block font-medium mb-1 text-gray-500">Autosave</label>
        <input type="checkbox" name="autosave" checked={prefs.autosave} onChange={handleChange} disabled className="ml-2" />
        <span className="text-xs text-gray-400 ml-2">(coming soon)</span>
      </div>
      <div>
        <label className="block font-medium mb-1">Show Scorecard on Save</label>
        <input type="checkbox" name="showScorecardOnSave" checked={prefs.showScorecardOnSave} onChange={handleChange} className="ml-2" />
      </div>
      <div>
        <label className="block font-medium mb-1 text-gray-500">Show Advanced Features</label>
        <input type="checkbox" name="showAdvanced" checked={prefs.showAdvanced} onChange={handleChange} disabled className="ml-2" />
        <span className="text-xs text-gray-400 ml-2">(coming soon)</span>
      </div>
      <div>
        <label className="block font-medium mb-1 text-gray-500">Accessibility Mode</label>
        <input type="checkbox" name="accessibility" checked={prefs.accessibility} onChange={handleChange} disabled className="ml-2" />
        <span className="text-xs text-gray-400 ml-2">(coming soon)</span>
      </div>
    </form>
  );
}
