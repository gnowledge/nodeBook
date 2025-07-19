# Progressive Web App (PWA) Setup for NodeBook

## Overview

Progressive Web Apps (PWAs) offer a lightweight alternative to native APK packaging. They can be installed on Android devices directly from the browser and provide a native-like experience.

## Advantages of PWA

- ✅ No app store required
- ✅ Automatic updates
- ✅ Smaller size
- ✅ Works offline
- ✅ Easy distribution
- ✅ No development environment setup needed

## Disadvantages

- ❌ Limited access to device APIs
- ❌ Not available on Google Play Store
- ❌ Requires HTTPS in production
- ❌ Some features may not work offline

## Implementation

### Step 1: Install PWA Dependencies

```bash
cd frontend
npm install vite-plugin-pwa
```

### Step 2: Configure Vite for PWA

Update `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(), 
    UnoCSS(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      },
      manifest: {
        name: 'NodeBook',
        short_name: 'NodeBook',
        description: 'Knowledge construction platform using CNL',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  // ... rest of config
})
```

### Step 3: Create Web App Manifest

Create `public/manifest.json`:

```json
{
  "name": "NodeBook",
  "short_name": "NodeBook",
  "description": "Knowledge construction platform using Controlled Natural Language",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/logo.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/logo.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Step 4: Update HTML

Update `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NodeBook</title>
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#000000" />
    <link rel="apple-touch-icon" href="/logo.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.jsx"></script>
  </body>
</html>
```

### Step 5: Add Install Prompt

Create `src/components/PWAInstallPrompt.jsx`:

```jsx
import { useState, useEffect } from 'react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold">Install NodeBook</h3>
          <p className="text-sm">Add to home screen for quick access</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInstallPrompt(false)}
            className="px-3 py-1 text-sm bg-blue-600 rounded"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="px-3 py-1 text-sm bg-white text-blue-500 rounded"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 6: Add to App Component

Update `src/App.jsx`:

```jsx
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

function App() {
  return (
    <div>
      {/* Your existing app content */}
      <PWAInstallPrompt />
    </div>
  );
}
```

## Testing PWA

### Local Development:
```bash
npm run dev
# Open http://localhost:5173
# Check browser dev tools → Application → Manifest
```

### Production Build:
```bash
npm run build
npm run preview
```

### Testing on Android:
1. Deploy to HTTPS server
2. Open in Chrome on Android
3. Look for "Add to Home Screen" prompt
4. Or use Chrome menu → "Install App"

## PWA Features

### Offline Support
The service worker will cache resources and provide offline functionality.

### App-like Experience
- Full-screen mode
- Custom splash screen
- Native-like navigation

### Automatic Updates
The PWA will automatically update when new versions are deployed.

## Distribution

### Web Hosting
Deploy to any web hosting service that supports HTTPS:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

### Installation Instructions
Users can install the PWA by:
1. Opening the website in Chrome
2. Tapping the menu (⋮)
3. Selecting "Install App" or "Add to Home Screen"

## Comparison: PWA vs APK

| Feature | PWA | APK |
|---------|-----|-----|
| Installation | Browser | App Store/Direct |
| Updates | Automatic | Manual |
| Size | Small | Larger |
| Device APIs | Limited | Full |
| Distribution | Easy | Complex |
| Offline | Yes | Yes |
| Performance | Good | Better |

## Recommendation

For NodeBook, I recommend starting with **PWA** because:
1. Faster to implement
2. No development environment setup
3. Easy to test and deploy
4. Good user experience
5. Can be upgraded to APK later if needed

If you need full device API access or want to be on Google Play Store, then go with the **Capacitor APK** approach. 