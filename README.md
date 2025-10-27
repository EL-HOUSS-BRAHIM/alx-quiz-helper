# 🎓 ALX Quiz Helper & Payment Bypass Extension

A powerful Chrome extension that provides quiz assistance and removes payment walls on the ALX platform.

[![Version](https://img.shields.io/badge/version-1.0.8-blue.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ Features

### 📚 Quiz Helper
- 📸 **Capture Quiz Corrections**: Automatically captures questions and answers from quiz correction pages
- 🤖 **Smart Answer Assistant**: Suggests answers while taking quizzes using captured data
- 💾 **Data Management**: Store and manage quiz corrections with 3-hour TTL
- 📊 **Advanced Matching**: Intelligent question matching with confidence scoring
- 🔍 **Progressive Display**: Shows answers as you need them

### 🔓 Payment Bypass
- 🚀 **Auto Bypass**: Automatically removes payment walls on ALX pages
- 🎯 **Manual Trigger**: On-demand bypass activation from popup
- 📈 **Activity Tracking**: Monitors bypass count and status
- 🔔 **Smart Detection**: Detects and removes various payment wall types

### 🔄 Auto-Updates
- 📦 **Update Notifications**: Get notified when new versions are available
- ⚡ **Easy Updates**: One-click access to latest releases
- ⏰ **Daily Checks**: Automatically checks for updates every 24 hours

## 🚀 Quick Start

### Installation

1. **Clone or download this repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO/quiz-helper-extension
   ```

2. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `quiz-helper-extension` folder

3. **Pin to toolbar** (optional):
   - Click the puzzle icon in Chrome toolbar
   - Find "ALX Quiz Helper & Payment Bypass"
   - Click the pin icon

## 📖 How to Use

### 1. Capturing Quiz Corrections

```
Take Quiz → View Corrections → Extension Auto-Captures → Data Saved
```

1. Complete a quiz on ALX Savanna platform
2. Navigate to the quiz correction page
3. Extension automatically captures Q&A
4. See notification: "✅ Quiz data captured!"

### 2. Using Smart Assistant

```
Start Quiz → Extension Activates → See Suggestions → Select Answer
```

1. Start a new quiz
2. Extension shows answer suggestions below questions
3. Confidence levels displayed (Low/Medium/High)
4. Click "Show Answer" to reveal

### 3. Payment Bypass

```
Visit ALX Page → Bypass Auto-Runs → Payment Wall Removed
```

**Automatic:**
- Just navigate to any ALX page with payment wall
- Bypass runs automatically in background

**Manual:**
- Click extension icon
- Go to "Payment Bypass" card
- Click "Trigger Bypass" button

## 🎯 Features in Detail

### Quiz Capture System

The extension intelligently captures quiz data from correction pages:

- **Multiple question formats**: MCQ, checkboxes, text inputs
- **Answer extraction**: Automatically identifies correct answers
- **Data validation**: Ensures captured data is complete and accurate
- **Storage optimization**: Stores efficiently with TTL for auto-cleanup

### Smart Answer Matching

Advanced algorithms match questions during quizzes:

- **Exact matching**: Direct text comparison
- **Fuzzy matching**: Handles typos and variations
- **Semantic matching**: Understands question meaning
- **Code snippet matching**: Specialized for code questions
- **Confidence scoring**: Rates match quality (0-100%)

### Payment Wall Bypass

Removes various payment restrictions:

- **Dialog overlays**: Modal payment popups
- **Page blocking**: Full-page payment walls
- **Blur effects**: Content obscuring filters
- **Pointer blocks**: Disabled interactivity
- **Scroll locks**: Restricted page scrolling

## 🔧 Configuration

### Settings (via Popup)

Click extension icon → Settings:

- **Auto-show answers**: Toggle automatic display
- **Confidence threshold**: Minimum confidence level
- **Data TTL**: Auto-cleanup after 3 hours

### Advanced Configuration

Edit configuration files for advanced settings:

**background.js** - Update check frequency:
```javascript
UPDATE_CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
GITHUB_REPO: 'YOUR_USERNAME/YOUR_REPO'
```

**manifest.json** - Extension permissions:
```json
"host_permissions": [
  "https://savanna.alxafrica.com/*",
  "*://*.alxafrica.com/*"
]
```

## 🔄 Updates

### Automatic Update Notifications

The extension checks GitHub for updates daily:

**When update available:**
1. Browser notification appears: "🚀 Update Available!"
2. Click "Update Now" to open release page
3. Download latest version
4. Reload extension

### Manual Update

```bash
# Pull latest changes
cd quiz-helper-extension
git pull origin main

# Reload in Chrome
# chrome://extensions/ → Click reload icon
```

### Check for Updates Now

Open extension popup → Background script auto-checks every 24 hours

Or manually trigger:
```javascript
chrome.runtime.sendMessage({ action: 'checkForUpdates' });
```

## 📁 Project Structure

```
quiz-helper-extension/
│
├── manifest.json                 # Extension config (Manifest V3)
├── background.js                 # Service worker (updates, cleanup)
├── storage.js                    # Storage utilities
│
├── popup/
│   ├── popup.html               # Main UI
│   └── popup.js                 # Popup logic
│
├── content-scripts/
│   ├── capture.js               # Quiz correction capture
│   ├── smart-answer.js          # Quiz assistance
│   └── payment-bypass.js        # Payment wall removal
│
├── utils/
│   ├── advanced-matcher.js      # Question matching
│   ├── confidence-system.js     # Confidence scoring
│   ├── question-analyzer.js     # Question analysis
│   └── ...                      # Other utilities
│
├── data-manager/
│   ├── data-manager.html        # Data management UI
│   └── data-manager.js          # Data operations
│
├── icons/                       # Extension icons
├── workers/                     # Web workers
│
├── README.md                    # This file
├── GITHUB-SETUP.md             # GitHub & auto-update setup
├── INTEGRATION-COMPLETE.md     # Integration documentation
└── AUTO-UPDATE-GUIDE.md        # Detailed update guide
```

## 🛠️ Development

### Prerequisites

- Chrome browser (or Chromium-based)
- Git
- Text editor (VS Code recommended)

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO/quiz-helper-extension

# Load in Chrome (Developer Mode)
# chrome://extensions/ → Load unpacked

# Make changes and test

# Reload extension after changes
# chrome://extensions/ → Reload icon
```

### Making Changes

1. **Edit files** as needed
2. **Test in Chrome** (reload extension)
3. **Check console** for errors:
   - Right-click extension icon → Inspect popup
   - Background script: Extensions page → Inspect views

### Creating Releases

```bash
# Update version and create release
./release.sh 1.0.9

# Create GitHub release
# https://github.com/YOUR_USERNAME/YOUR_REPO/releases/new
# Add changelog and publish
```

See [GITHUB-SETUP.md](GITHUB-SETUP.md) for detailed release workflow.

## 🐛 Troubleshooting

### Extension Not Working

**Check permissions:**
- `chrome://extensions/` → Details
- Verify access to `alxafrica.com`

**Check for errors:**
- Right-click extension icon → Inspect popup
- Look for errors in Console

**Reload extension:**
- `chrome://extensions/` → Reload icon

### No Quiz Data Captured

1. Verify you're on a quiz **correction page**
2. Check popup shows "X questions captured"
3. Open Data Manager to verify data

### Payment Bypass Not Working

1. **Refresh the page** (F5)
2. Try **manual bypass**: Popup → Trigger Bypass
3. Verify you're on an **ALX domain**
4. Check console for bypass logs

### Update Notifications Not Showing

1. **Check notification permissions:**
   - `chrome://settings/content/notifications`
   - Allow for extensions

2. **Verify GitHub repo configured:**
   - Check `background.js` has correct repo

3. **Check background console:**
   - `chrome://extensions/` → Inspect background page
   - Look for update check logs

### Common Issues

| Issue | Solution |
|-------|----------|
| "Extension not found" | Reload extension in chrome://extensions/ |
| "Storage quota exceeded" | Clear old data via popup |
| "Script injection failed" | Refresh the ALX page |
| "No answers shown" | Capture corrections first |

## 📊 Performance

- **Memory usage**: ~5-10 MB
- **Storage**: ~1-5 MB (depends on quiz data)
- **CPU**: Minimal impact
- **Network**: Only GitHub API for updates (~1 KB/day)

## 🔒 Privacy & Security

### What We Collect

**Nothing.** All data stays in your browser.

### Where Data Is Stored

- **Locally**: Chrome's `chrome.storage.local`
- **Never sent**: No external servers (except GitHub API for updates)
- **Auto-cleanup**: Data expires after 3 hours

### Permissions Explained

- `storage`: Store quiz data locally
- `notifications`: Show capture/update notifications
- `scripting`: Inject quiz helper scripts
- `activeTab`: Access current tab content
- `tabs`: Detect quiz pages
- `host_permissions`: Only ALX domains

## ⚠️ Disclaimer

This extension is for **educational purposes only**. 

- Use responsibly
- Follow ALX's terms of service
- Don't rely solely on suggestions
- Verify answers independently

## 📝 Changelog

### v1.0.8 (Current)
- ✅ Payment bypass integration
- ✅ Modern card-based UI redesign
- ✅ Auto-update notification system
- ✅ Enhanced question matching algorithms
- ✅ Improved error handling
- ✅ Background service worker optimization

### v1.0.7
- 🔧 Bug fixes and performance improvements
- 📊 Better confidence scoring
- 🎨 UI/UX enhancements

See [Releases](https://github.com/YOUR_USERNAME/YOUR_REPO/releases) for full changelog.

## 🚀 Roadmap

### Planned Features

- [ ] Multiple quiz session support
- [ ] Enhanced statistics and analytics
- [ ] Custom keyboard shortcuts
- [ ] Dark mode support
- [ ] Improved bypass detection
- [ ] Export to CSV/Excel
- [ ] Question database search
- [ ] Collaborative features

### Future Improvements

- Better mobile browser support
- Firefox extension version
- Cloud sync option (optional)
- Advanced machine learning matching

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Contribution Guidelines

- Follow existing code style
- Test thoroughly before submitting
- Update documentation as needed
- Add comments for complex logic

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the ALX software engineering community
- Inspired by the need for better learning tools
- Thanks to all contributors and users

## 📧 Support

- **Bug Reports**: [GitHub Issues](https://github.com/YOUR_USERNAME/YOUR_REPO/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/YOUR_USERNAME/YOUR_REPO/discussions)
- **Updates**: [GitHub Releases](https://github.com/YOUR_USERNAME/YOUR_REPO/releases)

## 🔗 Links

- **Repository**: https://github.com/YOUR_USERNAME/YOUR_REPO
- **Issues**: https://github.com/YOUR_USERNAME/YOUR_REPO/issues
- **Releases**: https://github.com/YOUR_USERNAME/YOUR_REPO/releases
- **Discussions**: https://github.com/YOUR_USERNAME/YOUR_REPO/discussions

## ⭐ Show Your Support

If this extension helped you, please:
- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest features
- 🤝 Contribute code
- 📢 Share with others

---

**Made with ❤️ for ALX students**

*Remember: This tool is meant to enhance learning, not replace it. Use wisely!*
