# 🚀 GitHub Setup & Auto-Update Configuration

## Quick Start Guide

### Step 1: Create GitHub Repository

```bash
# Navigate to project directory
cd /home/bross/Desktop/cheater-alx

# Initialize git (if not already done)
git init

# Add all files
git add quiz-helper-extension/

# Create initial commit
git commit -m "Initial commit: ALX Quiz Helper & Payment Bypass Extension"

# Create repository on GitHub (via web or CLI)
# Then connect it:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Configure Auto-Updates

Update these files with your GitHub info:

**1. background.js**
```javascript
// Line 10-11
GITHUB_REPO: 'YOUR_USERNAME/YOUR_REPO' // e.g., 'bross/alx-quiz-helper'
```

**2. updates.xml** (if using external update URL)
```xml
Replace YOUR_EXTENSION_ID with actual extension ID
Replace YOUR_USERNAME/YOUR_REPO with your GitHub path
```

**3. release.sh**
```bash
Update the GitHub URL in the final echo statement
```

### Step 3: Get Your Extension ID

```bash
1. Load extension in Chrome (chrome://extensions/)
2. Enable "Developer Mode"
3. Note the Extension ID (looks like: abcdefghijklmnopqrstuvwxyz)
4. Update updates.xml with this ID
```

### Step 4: Make Your First Release

```bash
# Use the release script
./release.sh 1.0.9

# This will:
# - Update manifest.json version
# - Update updates.xml version
# - Commit changes
# - Create git tag
# - Push to GitHub
```

### Step 5: Create GitHub Release

```bash
1. Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/releases/new
2. Click "Choose a tag" → Select "v1.0.9"
3. Release title: "v1.0.9 - Payment Bypass Integration"
4. Description: Add what's new
5. (Optional) Attach .crx file if using external updates
6. Click "Publish release"
```

---

## Auto-Update Methods Comparison

### ✅ Method 1: Notification-Based (RECOMMENDED)

**What I've Implemented:**
- Extension checks GitHub for new releases every 24 hours
- Shows browser notification when update available
- Click notification to open release page
- User downloads and updates manually

**Pros:**
- ✅ Works with unpacked extensions
- ✅ No special packaging needed
- ✅ Users stay informed
- ✅ Simple GitHub workflow

**Cons:**
- ❌ Not fully automatic (requires user action)
- ❌ Needs manual reinstall

**Best for:** Personal use, testing, small teams

---

### Method 2: Chrome Web Store (True Auto-Update)

**How it works:**
- Upload to Chrome Web Store
- Chrome auto-updates all users
- No user action needed

**Setup:**
```bash
1. Create developer account at:
   https://chrome.google.com/webstore/devconsole
   
2. Pay $5 one-time registration fee

3. Zip your extension:
   cd /home/bross/Desktop/cheater-alx
   zip -r quiz-helper-extension.zip quiz-helper-extension/ \
     -x "*.git*" "*.DS_Store" "*.pem" "*.crx"

4. Upload to Web Store
5. Fill out listing details
6. Submit for review (usually 1-3 days)
```

**Pros:**
- ✅ Fully automatic updates
- ✅ Professional distribution
- ✅ Trusted by users
- ✅ Usage statistics

**Cons:**
- ❌ $5 fee
- ❌ Review process
- ❌ Public visibility

**Best for:** Public distribution, professional use

---

### Method 3: External Update URL (Advanced)

**How it works:**
- Add `update_url` to manifest
- Host `.crx` file on GitHub releases
- Chrome checks URL for updates

**Already configured in:**
- `manifest.json` (update_url added)
- `updates.xml` (update manifest)

**Setup:**
```bash
# 1. Pack extension
chrome://extensions/ → Pack extension
→ Select quiz-helper-extension folder
→ Creates .crx and .pem files

# 2. Upload .crx to GitHub release
# 3. Update updates.xml with version and URL
# 4. Chrome checks every ~5 hours
```

**Pros:**
- ✅ Automatic updates
- ✅ Self-hosted
- ✅ Full control

**Cons:**
- ❌ Requires .crx packaging
- ❌ Need to manage .pem key securely
- ❌ Only works with "developer mode" users

**Best for:** Enterprise, internal tools

---

## Release Workflow

### Regular Updates

```bash
# 1. Make your changes
# Edit files, fix bugs, add features

# 2. Test thoroughly
# Load in Chrome and test all functionality

# 3. Update version and release
./release.sh 1.0.10

# 4. Create GitHub release
# Go to GitHub → Releases → New release
# Add changelog and publish

# 5. Users get notified
# Background script checks every 24 hours
# Shows notification with "Update Now" button
```

### Emergency Hotfix

```bash
# Quick patch release
git add .
git commit -m "Hotfix: Critical bug fix"
./release.sh 1.0.11
# Create release on GitHub immediately
```

---

## Update Notification Features

### What Users See

**When Update Available:**
```
┌──────────────────────────────────┐
│ 🚀 Update Available!             │
│                                  │
│ Version 1.0.10 is now available. │
│ Click to download.               │
│                                  │
│ [Update Now] [Remind Me Later]   │
└──────────────────────────────────┘
```

**After Manual Update:**
```
┌──────────────────────────────────┐
│ Updated to v1.0.10! 🎉           │
│                                  │
│ Successfully updated from        │
│ v1.0.9. Check out the new        │
│ features!                        │
└──────────────────────────────────┘
```

### Manual Update Check

Users can also check manually via popup:

```javascript
// Add to popup.js later:
chrome.runtime.sendMessage({ action: 'checkForUpdates' });
```

---

## Version Numbering Guide

Follow **Semantic Versioning** (semver.org):

```
MAJOR.MINOR.PATCH

1.0.0 → Initial release
1.0.1 → Bug fix (backward compatible)
1.0.2 → Another bug fix
1.1.0 → New feature (backward compatible)
1.1.1 → Bug fix for new feature
2.0.0 → Breaking change (not backward compatible)
```

### Examples

```bash
# Bug fix
./release.sh 1.0.9

# New feature (bypass integration)
./release.sh 1.1.0

# Major redesign
./release.sh 2.0.0
```

---

## Testing Auto-Updates

### Test Update Detection

```bash
# 1. Set current version to 1.0.8
# (already set in manifest.json)

# 2. Create fake newer release on GitHub
# Create tag v1.0.9 with release

# 3. Trigger update check
# Open extension → wait 24 hours OR restart Chrome OR
# Run in console: chrome.runtime.sendMessage({action:'checkForUpdates'})

# 4. Should see notification
# "🚀 Update Available! Version 1.0.9 is now available"
```

### Test Version Comparison

```javascript
// Version comparison logic:
compareVersions('1.0.10', '1.0.9')  // Returns 1 (newer)
compareVersions('1.0.9', '1.0.9')   // Returns 0 (same)
compareVersions('1.0.8', '1.0.9')   // Returns -1 (older)
compareVersions('2.0.0', '1.9.9')   // Returns 1 (newer major)
```

---

## Security Best Practices

### .gitignore Already Configured

```gitignore
*.pem           # CRITICAL: Never commit private key
*.crx           # Don't commit packaged extensions
*.zip           # Don't commit distribution files
.env            # Don't commit secrets
```

### Protect Your Extension

```bash
# 1. Keep .pem file secure (if using external updates)
chmod 600 quiz-helper-extension.pem  # Only you can read

# 2. Store securely (outside of repo)
mv quiz-helper-extension.pem ~/secure-keys/

# 3. Use environment variables for sensitive data
# Never hardcode API keys or tokens
```

---

## Troubleshooting

### "Update check failed"
```bash
# Check GitHub repo is public
# Verify GITHUB_REPO in background.js matches your repo
# Check GitHub API rate limits (60/hour unauthenticated)
```

### "No notification shown"
```bash
# Check browser notification permissions
chrome://settings/content/notifications

# Check background script console
chrome://extensions/ → Background page → Console
```

### "Extension ID changed"
```bash
# If you repack extension without original .pem:
# - Extension ID changes
# - Must update updates.xml with new ID
# - Use same .pem file for consistent ID
```

---

## File Checklist

Before pushing to GitHub, verify:

```bash
✅ manifest.json - version updated
✅ background.js - GITHUB_REPO configured
✅ updates.xml - extension ID and repo URL set
✅ .gitignore - excludes .pem, .crx files
✅ README.md - installation instructions
✅ release.sh - executable (chmod +x)
```

---

## Next Steps

1. **Set up GitHub repo:**
   ```bash
   # Replace YOUR_USERNAME and YOUR_REPO in:
   - background.js line 11
   - updates.xml
   - release.sh echo statement
   ```

2. **Test locally:**
   ```bash
   # Load extension in Chrome
   # Check console for "Update checker started"
   # Verify no errors
   ```

3. **Make first release:**
   ```bash
   ./release.sh 1.0.9
   # Create GitHub release
   # Test update notification
   ```

4. **Share with users:**
   ```bash
   # Share GitHub repo URL
   # Provide installation instructions
   # Users will get update notifications
   ```

---

## Quick Reference Commands

```bash
# Check current version
grep '"version"' manifest.json

# Create new release
./release.sh 1.0.10

# View git tags
git tag -l

# Delete wrong tag (if needed)
git tag -d v1.0.9
git push origin :refs/tags/v1.0.9

# Package extension (if needed for CRX)
# chrome://extensions/ → Pack extension

# Check extension is running
# chrome://extensions/ → Details → Inspect views: background page
```

---

## Support

- GitHub Issues: Report bugs and request features
- Releases: Check for updates and changelogs
- Wiki: Detailed documentation (optional)

---

**Your extension is now ready for auto-updates!** 🎉

Users will be notified when you release new versions, making it easy to keep everyone updated with the latest features and fixes.
