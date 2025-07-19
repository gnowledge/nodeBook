# iOS Packaging Guide for NodeBook Contributors

This guide is for contributors who want to add iOS support to NodeBook using Capacitor. Since iOS development requires macOS, this guide is specifically for users with access to Mac computers.

## Prerequisites

### System Requirements
- **macOS** (required for iOS development)
- **Xcode** 14.0 or later
- **Node.js** 18+ (already installed)
- **Apple Developer Account** (optional for testing, required for App Store)

### Install Xcode
1. **Download Xcode** from Mac App Store
2. **Install Command Line Tools:**
   ```bash
   xcode-select --install
   ```
3. **Verify Installation:**
   ```bash
   xcode-select --print-path
   # Should show: /Applications/Xcode.app/Contents/Developer
   ```

## Setup Process

### Step 1: Add iOS Platform to Capacitor

```bash
cd frontend
npx cap add ios
```

This will:
- Create `ios/` directory with Xcode project
- Configure iOS-specific settings
- Add iOS plugins

### Step 2: Install iOS Dependencies

```bash
# Install iOS-specific Capacitor plugins
npm install @capacitor/ios
npm install @capacitor/status-bar @capacitor/splash-screen
```

### Step 3: Build and Sync

```bash
# Build the web app
npm run build

# Sync with iOS project
npx cap sync ios
```

### Step 4: Open in Xcode

```bash
npx cap open ios
```

This opens the project in Xcode where you can:
- Configure app settings
- Set up signing certificates
- Build and run on simulator/device

## iOS Configuration

### Update capacitor.config.json

The iOS configuration is already added to your `capacitor.config.json`:

```json
{
  "ios": {
    "contentInset": "always",
    "backgroundColor": "#ffffff",
    "buildOptions": {
      "scheme": "NodeBook"
    }
  }
}
```

### Add iOS Scripts to package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "ios:build": "npm run build && npx cap sync ios",
    "ios:open": "npx cap open ios",
    "ios:run": "npx cap run ios",
    "ios:sync": "npx cap sync ios",
    "ios:build-ipa": "cd ios && xcodebuild -workspace NodeBook.xcworkspace -scheme NodeBook -configuration Release -archivePath NodeBook.xcarchive archive && xcodebuild -exportArchive -archivePath NodeBook.xcarchive -exportOptionsPlist exportOptions.plist -exportPath ./build"
  }
}
```

## Xcode Project Configuration

### App Settings

1. **Open Xcode** with `npx cap open ios`
2. **Select NodeBook project** in the navigator
3. **Configure Bundle Identifier:**
   - Set to: `com.nodebook.app`
   - Or your own: `com.yourname.nodebook`

### Signing & Capabilities

1. **Select NodeBook target**
2. **Go to Signing & Capabilities tab**
3. **Configure Team:**
   - Personal Team (for testing)
   - Apple Developer Team (for distribution)

### App Icons

1. **Replace app icons** in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
2. **Required sizes:**
   - 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024

### Splash Screen

1. **Configure splash screen** in `ios/App/App/Assets.xcassets/SplashScreen.imageset/`
2. **Update colors** in `ios/App/App/Info.plist`

## Testing

### Simulator Testing

```bash
# Run on iOS Simulator
npx cap run ios
```

### Device Testing

1. **Connect iPhone/iPad** via USB
2. **Trust computer** on device
3. **Run on device:**
   ```bash
   npx cap run ios --target="Your Device Name"
   ```

### TestFlight (Beta Testing)

1. **Archive app** in Xcode
2. **Upload to App Store Connect**
3. **Configure TestFlight** for beta testing

## Distribution

### App Store Distribution

1. **Create App Store Connect record**
2. **Configure app metadata**
3. **Upload build** through Xcode
4. **Submit for review**

### Ad Hoc Distribution

1. **Register device UDIDs**
2. **Create Ad Hoc provisioning profile**
3. **Build and distribute IPA file**

### Enterprise Distribution

1. **Enterprise Developer Account** required
2. **Internal distribution** only
3. **No App Store review** required

## iOS-Specific Features

### Capacitor Plugins for iOS

```bash
# Install useful iOS plugins
npm install @capacitor/device
npm install @capacitor/network
npm install @capacitor/storage
npm install @capacitor/camera
npm install @capacitor/filesystem
```

### iOS Permissions

Add required permissions to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>NodeBook needs camera access to capture images</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>NodeBook needs photo library access to select images</string>
<key>NSMicrophoneUsageDescription</key>
<string>NodeBook needs microphone access for voice input</string>
```

### iOS-Specific Code

Create `src/utils/iosUtils.js` for iOS-specific functionality:

```javascript
import { Capacitor } from '@capacitor/core';

export const isIOS = () => {
  return Capacitor.getPlatform() === 'ios';
};

export const getIOSVersion = () => {
  if (isIOS()) {
    return Capacitor.getPlatform() === 'ios' ? 
      parseInt(Capacitor.getPlatform() === 'ios' ? '13' : '0') : 0;
  }
  return 0;
};

export const handleIOSKeyboard = () => {
  if (isIOS()) {
    // iOS-specific keyboard handling
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';
  }
};
```

## Development Workflow

### Daily Development

```bash
# 1. Make changes to React app
# 2. Build web app
npm run build

# 3. Sync with iOS
npx cap sync ios

# 4. Open in Xcode
npx cap open ios

# 5. Test on simulator/device
```

### Debugging

1. **Xcode Console** - View logs and errors
2. **Safari Web Inspector** - Debug web content
3. **Capacitor Dev Tools** - Plugin debugging

## Common Issues & Solutions

### Build Issues

1. **"No provisioning profile found"**
   - Configure signing in Xcode
   - Add device to developer account

2. **"Code signing is required"**
   - Set up Apple Developer account
   - Configure certificates and profiles

3. **"Build failed"**
   - Clean build folder: `Product → Clean Build Folder`
   - Reset iOS Simulator: `Device → Erase All Content and Settings`

### Runtime Issues

1. **App crashes on launch**
   - Check Xcode console for errors
   - Verify all plugins are compatible

2. **Web content not loading**
   - Check network permissions
   - Verify server configuration

3. **Plugin not working**
   - Ensure plugin is installed: `npm install @capacitor/plugin-name`
   - Sync project: `npx cap sync ios`

## Performance Optimization

### iOS-Specific Optimizations

1. **Bundle Size:**
   - Enable code splitting
   - Use tree shaking
   - Optimize images

2. **Memory Management:**
   - Dispose of event listeners
   - Clean up resources properly

3. **Battery Life:**
   - Minimize background processing
   - Optimize network requests

## Testing Checklist

### Before Release

- [ ] Test on multiple iOS versions (13+)
- [ ] Test on different device sizes (iPhone, iPad)
- [ ] Test offline functionality
- [ ] Test with different network conditions
- [ ] Verify all Capacitor plugins work
- [ ] Check app performance and memory usage
- [ ] Test accessibility features
- [ ] Verify App Store guidelines compliance

## Contributing Guidelines

### Code Standards

1. **Follow existing patterns** in the codebase
2. **Add iOS-specific code** in dedicated files
3. **Test thoroughly** before submitting PR
4. **Document iOS-specific features**

### Pull Request Process

1. **Create feature branch:** `feature/ios-support`
2. **Implement iOS functionality**
3. **Test on simulator and device**
4. **Update documentation**
5. **Submit PR with detailed description**

### Required Files for iOS PR

- [ ] `ios/` directory with Xcode project
- [ ] Updated `capacitor.config.json`
- [ ] iOS-specific scripts in `package.json`
- [ ] iOS utilities and helpers
- [ ] Updated documentation
- [ ] Screenshots/videos of iOS app

## Resources

### Official Documentation
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [Xcode User Guide](https://developer.apple.com/xcode/)

### Community Resources
- [Capacitor Community](https://github.com/ionic-team/capacitor/discussions)
- [iOS Development Reddit](https://www.reddit.com/r/iOSProgramming/)
- [Stack Overflow iOS](https://stackoverflow.com/questions/tagged/ios)

### Tools
- [App Icon Generator](https://appicon.co/)
- [iOS Simulator](https://developer.apple.com/simulator/)
- [TestFlight](https://developer.apple.com/testflight/)

---

## Quick Start Commands

```bash
# Add iOS platform
npx cap add ios

# Build and sync
npm run build && npx cap sync ios

# Open in Xcode
npx cap open ios

# Run on simulator
npx cap run ios
```

**Happy iOS development! 🍎📱** 