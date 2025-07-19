# Android APK Packaging Guide for NodeBook Frontend

This guide covers packaging the NodeBook frontend as an Android APK for mobile phones and tablets.

## Overview

The NodeBook frontend is a React application built with Vite. To create an Android APK, we'll use **Capacitor**, which is the modern successor to Cordova and provides excellent React support.

## Prerequisites

### System Requirements
- Node.js 18+ 
- Android Studio (for Android SDK)
- Android SDK (API level 21+)
- Java Development Kit (JDK) 11+

### Install Android Development Tools

1. **Install Android Studio:**
   ```bash
   # Ubuntu/Debian
   sudo snap install android-studio --classic
   # Or download from https://developer.android.com/studio
   ```

2. **Install Android SDK:**
   - Open Android Studio
   - Go to Tools → SDK Manager
   - Install Android SDK Platform 33 (API level 33)
   - Install Android SDK Build-Tools 33.0.0

3. **Set Environment Variables:**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

## Implementation Options

### Option 1: Capacitor (Recommended)

Capacitor is the modern approach, offering:
- Native performance
- Access to device APIs
- Easy debugging
- Active development

#### Setup Steps:

1. **Install Capacitor:**
   ```bash
   cd frontend
   npm install @capacitor/core @capacitor/cli
   npm install @capacitor/android
   npx cap init
   ```

2. **Configure for Android:**
   ```bash
   npx cap add android
   ```

3. **Build and Sync:**
   ```bash
   npm run build
   npx cap sync
   npx cap open android
   ```

### Option 2: Progressive Web App (PWA)

PWA approach offers:
- No app store required
- Automatic updates
- Smaller size
- Web-based installation

#### Setup Steps:

1. **Add PWA Dependencies:**
   ```bash
   npm install vite-plugin-pwa
   ```

2. **Configure Service Worker:**
   - Add manifest.json
   - Configure offline functionality
   - Add install prompts

### Option 3: Cordova (Legacy)

Cordova is older but still functional:
- Mature ecosystem
- Extensive plugins
- Slower performance

## Recommended Implementation: Capacitor

Let's implement Capacitor as it provides the best balance of features and performance.

### Step 1: Install Dependencies

```bash
cd frontend
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npm install @capacitor/status-bar @capacitor/splash-screen
```

### Step 2: Initialize Capacitor

```bash
npx cap init NodeBook com.nodebook.app --web-dir=dist
```

### Step 3: Add Android Platform

```bash
npx cap add android
```

### Step 4: Configure Build

Update `vite.config.js` to ensure proper build output:

```javascript
export default defineConfig({
  plugins: [react(), UnoCSS()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
```

### Step 5: Build and Sync

```bash
npm run build
npx cap sync
```

### Step 6: Open in Android Studio

```bash
npx cap open android
```

## Configuration Files

### capacitor.config.ts
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nodebook.app',
  appName: 'NodeBook',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: true,
      spinnerColor: "#999999"
    },
    StatusBar: {
      style: 'dark'
    }
  }
};

export default config;
```

### Android Manifest Customization

Key configurations in `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
  <application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:supportsRtl="true"
    android:theme="@style/AppTheme">
    
    <activity
      android:name="com.nodebook.app.MainActivity"
      android:exported="true"
      android:launchMode="singleTask"
      android:theme="@style/AppTheme.NoActionBarLaunch"
      android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
      android:name="com.nodebook.app.MainActivity">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
  
  <!-- Permissions -->
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
</manifest>
```

## Build Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "android:build": "npm run build && npx cap sync",
    "android:open": "npx cap open android",
    "android:run": "npx cap run android",
    "android:build-apk": "cd android && ./gradlew assembleDebug",
    "android:build-release": "cd android && ./gradlew assembleRelease"
  }
}
```

## Testing on Device

### Using Physical Device:
1. Enable Developer Options on Android device
2. Enable USB Debugging
3. Connect device via USB
4. Run: `npx cap run android`

### Using Emulator:
1. Create AVD in Android Studio
2. Start emulator
3. Run: `npx cap run android`

## APK Generation

### Debug APK:
```bash
cd android
./gradlew assembleDebug
# APK will be in: android/app/build/outputs/apk/debug/
```

### Release APK:
```bash
cd android
./gradlew assembleRelease
# APK will be in: android/app/build/outputs/apk/release/
```

## Distribution

### Google Play Store:
1. Create developer account
2. Sign APK with release key
3. Upload to Google Play Console
4. Configure store listing

### Direct Distribution:
1. Generate signed APK
2. Share APK file directly
3. Users enable "Install from Unknown Sources"

## Troubleshooting

### Common Issues:

1. **Build Errors:**
   - Check Android SDK installation
   - Verify environment variables
   - Update Gradle version

2. **Sync Issues:**
   - Clear build cache: `npx cap sync --clean`
   - Rebuild: `npm run build && npx cap sync`

3. **Device Connection:**
   - Check USB debugging
   - Install device drivers
   - Verify ADB connection

### Debug Commands:
```bash
# Check connected devices
adb devices

# View logs
adb logcat

# Clear app data
adb shell pm clear com.nodebook.app
```

## Performance Optimization

### For Mobile Devices:
1. **Bundle Size:**
   - Enable code splitting
   - Optimize images
   - Use tree shaking

2. **Network:**
   - Implement caching
   - Use service workers
   - Optimize API calls

3. **UI/UX:**
   - Touch-friendly interfaces
   - Responsive design
   - Offline functionality

## Next Steps

1. Implement the Capacitor setup
2. Test on physical devices
3. Optimize for mobile performance
4. Configure app signing
5. Prepare for store submission

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [Google Play Console](https://play.google.com/console)
- [React Native (Alternative)](https://reactnative.dev/) 