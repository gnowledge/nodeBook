import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MathJaxContext } from 'better-react-mathjax'
import './index.css'
import App from './App.tsx'

const config = {
  loader: { load: ["input/tex", "[tex]/mhchem"] },
  tex: {
    packages: {"[+]": ["mhchem"]},
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"]
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"]
    ]
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MathJaxContext config={config}>
      <App />
    </MathJaxContext>
  </StrictMode>,
)
