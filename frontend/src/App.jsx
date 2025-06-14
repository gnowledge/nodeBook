import React from "react";
import NDFStudioLayout from "./NDFStudioLayout";

// Update tab order for main app view
const MAIN_TABS = ['display', 'graph', 'cnl', 'kb'];

// Update tab order for DevPanel
const DEV_TABS = ['json', 'yaml'];

function App() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <NDFStudioLayout userId="user0" mainTabs={MAIN_TABS} devTabs={DEV_TABS} />
    </div>
  );
}

export default App;

