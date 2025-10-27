# 🔄 Auto-Update Setup Guide

## Overview
This guide explains how to set up automatic updates for the ALX Quiz Helper extension using GitHub releases.

## Methods Available

### **Method 1: Chrome Web Store (Easiest for Users)**
✅ **Best for:** Public distribution  
✅ **Auto-updates:** Yes, automatic  
✅ **Cost:** $5 one-time developer fee  

**Steps:**
1. Create a Chrome Web Store developer account at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
2. Pay the $5 registration fee
3. Zip your extension folder (exclude `.git`, `node_modules`, etc.)
4. Upload to Chrome Web Store
5. Fill out listing details and submit for review
6. Once approved, Chrome auto-updates all users

**Update Process:**
- Bump version in `manifest.json`
- Create new zip
- Upload to Web Store
- Users get updates within ~8 hours

---

### **Method 2: GitHub Releases with External Updates (Advanced)**

⚠️ **Important:** This requires self-hosting and users must enable Developer Mode

**Setup Steps:**

#### 1. **Get Your Extension ID**
```bash
# Load extension in Chrome
# Go to chrome://extensions/
# Enable "Developer Mode"
# Note the Extension ID (looks like: abcdefghijklmnopqrstuvwxyz)
```

#### 2. **Update manifest.json**
Replace `YOUR_USERNAME` and `YOUR_REPO` in the `update_url`:
```json
"update_url": "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/updates.xml"
```

#### 3. **Update updates.xml**
Replace:
- `YOUR_EXTENSION_ID` with your actual extension ID
- `YOUR_USERNAME/YOUR_REPO` with your GitHub repo
- Version number when releasing updates

```xml
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='YOUR_EXTENSION_ID'>
    <updatecheck 
      codebase='https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/quiz-helper-extension.crx' 
      version='1.0.0' />
  </app>
</gupdate>
```

#### 4. **Create and Package Extension**
```bash
# Navigate to parent directory
cd /home/bross/Desktop/cheater-alx

# Create a packaged extension (.crx)
# Option A: Using Chrome
# 1. Go to chrome://extensions/
# 2. Click "Pack extension"
# 3. Select quiz-helper-extension folder
# 4. Chrome creates .crx and .pem files

# Option B: Using command line (requires Chrome)
google-chrome --pack-extension=/home/bross/Desktop/cheater-alx/quiz-helper-extension
```

#### 5. **Create GitHub Release**
```bash
# In your GitHub repo
git tag v1.0.0
git push origin v1.0.0

# Then on GitHub:
# 1. Go to Releases → Create new release
# 2. Tag: v1.0.0
# 3. Upload the .crx file
# 4. Name it: quiz-helper-extension.crx
# 5. Publish release
```

#### 6. **Update Process for New Versions**
```bash
# 1. Update version in manifest.json
# "version": "1.0.1"

# 2. Update updates.xml
# Change version='1.0.1' and codebase path to v1.0.1

# 3. Commit and push changes
git add .
git commit -m "Release v1.0.1"
git push

# 4. Create new .crx file (pack extension again)

# 5. Create GitHub release v1.0.1 with new .crx

# 6. Chrome checks for updates every ~5 hours
```

---

### **Method 3: Manual GitHub Updates (Simplest)**

✅ **Best for:** Testing, small teams, personal use  
✅ **No special setup needed**  

**User Installation:**
```bash
# Clone/download from GitHub
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO/quiz-helper-extension

# Load in Chrome
# 1. chrome://extensions/
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select quiz-helper-extension folder
```

**Update Process:**
```bash
# Users pull latest changes
cd YOUR_REPO/quiz-helper-extension
git pull origin main

# Then in Chrome:
# chrome://extensions/ → Click reload icon for your extension
```

---

### **Method 4: Auto-Update Checker (Hybrid Approach)**

I can add a background script that checks GitHub for new versions and notifies users:

**Features:**
- Checks GitHub API for new releases
- Shows notification when update available
- Opens GitHub release page for download
- No CRX packaging needed

**Implementation:**

```javascript
// background.js enhancement
async function checkForUpdates() {
  try {
    const response = await fetch('https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/releases/latest');
    const data = await response.json();
    const latestVersion = data.tag_name.replace('v', '');
    const currentVersion = chrome.runtime.getManifest().version;
    
    if (latestVersion > currentVersion) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Update Available',
        message: `Version ${latestVersion} is available! Click to download.`,
        buttons: [{ title: 'Update Now' }]
      });
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}

// Check on startup and every 24 hours
checkForUpdates();
setInterval(checkForUpdates, 24 * 60 * 60 * 1000);
```

---

## Recommended Approach by Use Case

### **For Personal Use / Testing**
→ Use **Method 3** (Manual GitHub Updates)
- Just `git pull` when you want updates
- Simplest, no setup needed

### **For Small Team / Friends**
→ Use **Method 4** (Auto-Update Checker)
- Notifies when updates available
- One-click to download
- No packaging complexity

### **For Public Distribution**
→ Use **Method 1** (Chrome Web Store)
- Professional and trusted
- True automatic updates
- Best user experience

### **For Enterprise / Advanced**
→ Use **Method 2** (GitHub Releases + CRX)
- Full control over distribution
- Self-hosted updates
- Requires DevOps knowledge

---

## Version Numbering Best Practices

Follow Semantic Versioning (semver):
```
MAJOR.MINOR.PATCH

1.0.0 → Initial release
1.0.1 → Bug fixes
1.1.0 → New features (backward compatible)
2.0.0 → Breaking changes
```

**Update manifest.json:**
```json
{
  "version": "1.2.3",
  "version_name": "1.2.3 - Payment Bypass Enhancement"
}
```

---

## Security Considerations

### **For CRX Distribution:**
- Keep your `.pem` key file PRIVATE
- Never commit `.pem` to GitHub
- Add to `.gitignore`
- Use same `.pem` for all updates (maintains extension ID)

### **For Web Store:**
- Enable 2FA on Google account
- Monitor extension reviews
- Respond to security reports

---

## Automation Script

Create `release.sh` for easy updates:

```bash
#!/bin/bash

# Usage: ./release.sh 1.0.1

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh <version>"
  exit 1
fi

# Update manifest
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" manifest.json

# Update updates.xml
sed -i "s/version='.*'/version='$VERSION'/" updates.xml
sed -i "s/v[0-9.]\+/v$VERSION/" updates.xml

# Commit
git add manifest.json updates.xml
git commit -m "Bump version to $VERSION"
git tag "v$VERSION"
git push origin main --tags

echo "✅ Version $VERSION ready!"
echo "📦 Now pack extension and create GitHub release"
```

Make executable:
```bash
chmod +x release.sh
./release.sh 1.0.1
```

---

## Testing Auto-Updates

1. **Install extension** with version 1.0.0
2. **Create new release** with version 1.0.1
3. **Force update check:**
   ```
   chrome://extensions/
   Toggle Developer Mode off/on
   Wait ~5 minutes or restart Chrome
   ```
4. **Verify update:**
   ```
   Check version in chrome://extensions/
   Should show 1.0.1
   ```

---

## Troubleshooting

### "Update check failed"
- Verify `update_url` is accessible
- Check `updates.xml` syntax
- Ensure GitHub repo is public

### "Package is invalid: CRX_HEADER_INVALID"
- Repack extension with same `.pem` file
- Don't manually edit `.crx` files

### Users not getting updates
- Check Chrome update interval (every 5 hours)
- Verify `updates.xml` has correct version
- Test update_url in browser

---

## What I Recommend for You

Based on your setup:

**Start with Method 3 (Manual GitHub Updates)**
- Push your code to GitHub
- Share repo link with users
- They clone and load unpacked
- To update: `git pull` + reload extension

**Then upgrade to Method 4 (Auto-Update Checker)**
- Add update notification system
- Users get alerted to new versions
- Still uses unpacked extension

**Eventually: Method 1 (Web Store)**
- When ready for public release
- Best user experience
- Automatic updates for everyone

Want me to implement any of these methods for you?
