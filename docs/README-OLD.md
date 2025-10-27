# ALX Quiz Helper - Browser Extension

A powerful Chrome/Edge browser extension that captures quiz correction data from ALX Savanna platform and provides intelligent assistance during quizzes by highlighting correct answers.

## 🚀 Features

- **📝 Automated Capture**: Scrapes quiz corrections from ALX correction pages
- **🎯 Smart Assistance**: Highlights correct answers during quizzes with orange highlighting
- **📊 Data Management**: View, edit, search, and manage captured quiz data in a table interface
- **⏰ TTL Storage**: Data expires after 3 hours to ensure freshness
- **🔄 Dynamic Detection**: Uses MutationObserver to handle dynamic content
- **🔔 Smart Notifications**: Success/error notifications for user feedback
- **🎨 Modern UI**: Clean, intuitive popup interface with data manager
- **🔒 Minimal Permissions**: Only requests necessary permissions for ALX domain
- **📤 Export/Import**: Backup and restore quiz data with JSON files

## 📁 Project Structure

```
quiz-helper-extension/
├── manifest.json                 # Extension manifest (v3)
├── background.js                 # Service worker for TTL cleanup
├── storage.js                    # Storage utilities with TTL
├── content-scripts/
│   ├── capture.js               # Quiz correction data scraper
│   ├── answer.js                # Quiz assistance system
│   └── test.js                  # Debug helper script
├── data-manager/
│   ├── data-manager.html        # Data management interface
│   └── data-manager.js          # Data management functionality
├── popup/
│   ├── popup.html               # Extension popup UI
│   └── popup.js                 # Popup functionality
├── icons/
│   ├── icon16.png               # 16x16 icon
│   ├── icon48.png               # 48x48 icon
│   ├── icon128.png              # 128x128 icon
│   └── icon.svg                 # Source SVG icon
└── README.md                    # This file
```

## 🔧 Installation

### Method 1: Load Unpacked (Development)

1. **Download/Clone** this repository
2. **Open Chrome/Edge** and navigate to `chrome://extensions/` or `edge://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load Unpacked"** and select the `quiz-helper-extension` folder
5. **Pin the extension** to your toolbar for easy access

### Method 2: Manual Installation

1. **Download** the extension folder
2. **Compress** the entire folder into a ZIP file
3. **Rename** the ZIP extension to `.crx`
4. **Drag and drop** the `.crx` file into Chrome/Edge extensions page

## 📖 Usage Guide

### Step 1: Capture Quiz Corrections

1. **Navigate** to an ALX quiz correction page:
   - URL pattern: `https://savanna.alxafrica.com/evaluation_quiz_corrections*`

2. **The extension automatically starts capturing** when the page loads, or:
   - Click the extension icon in the toolbar
   - Click "Start Capture" in the popup

3. **Wait for completion** - you'll see a notification when done:
   - ✅ "Capture Complete - X questions captured"

### Step 2: Get Quiz Assistance

1. **Navigate** to an ALX quiz page:
   - URL pattern: `https://savanna.alxafrica.com/evaluation_quizzes*`

2. **The extension automatically starts assistance**, or:
   - Click the extension icon
   - Click "Start Quiz Assistance"

3. **See highlighted answers**:
   - Correct answers are highlighted with orange background
   - Orange border and checkmark (✓) indicator
   - Floating notification shows "X of Y answers highlighted"

4. **Click highlighted answers** to select them (extension does NOT auto-submit)

### Step 3: Monitor Status

Click the extension icon to see:
- **Data Status**: Ready/Expired/No Data
- **Questions Stored**: Number of captured questions
- **Data Age**: How old the captured data is
- **Manage Data**: Click "📊 Manage Data" to open the data manager
- **Refresh/Clear options**

### Step 4: Manage Your Data (New!)

1. **Click "📊 Manage Data"** in the popup
2. **View all questions** in a searchable table
3. **Edit questions**: Click "✏️ Edit" to modify text or answers
4. **Delete questions**: Click "🗑️ Delete" to remove individual questions
5. **Search data**: Use the search box to find specific questions
6. **Export/Import**: Backup your data or import from files

## ⚙️ Technical Details

### Storage Management

- **Storage Type**: `chrome.storage.local`
- **TTL**: 3 hours (automatic expiration)
- **Cleanup**: Background service worker removes expired data
- **Keys Used**:
  - `quiz_corrections_data`: Array of question objects
  - `quiz_corrections_timestamp`: Capture timestamp

### Question Matching Algorithm

1. **HTML Hash**: Creates normalized hash of question HTML
2. **Text Similarity**: Fallback using Levenshtein distance (80% threshold)
3. **Image Support**: Preserves `<img>` tags in question content
4. **Flexible Selectors**: Multiple CSS selectors for compatibility

### Content Detection

**Capture Script Selectors:**
```javascript
questionContainers: [
  '.question-container', '.quiz-question', '[class*="question"]',
  '.correction-item', '[data-question]', '.evaluation-question'
]

correctIndicators: [
  '.eqc-result.text-primary.font-weight-bold', // ALX correct answers  
  '.text-primary',                               // ALX correct styling
  '.correct', '.right-answer', '[class*="correct"]',
  'input:checked', '.selected', '.highlight'
]
```

**Answer Script Selectors:**
```javascript
questionContainers: [
  '.question-container', '.quiz-question', '[class*="question"]',
  '.current-question', '[data-question]', '.quiz-item'
]

answerOptions: [
  '.answer-option', '.quiz-answer', '[class*="answer"]',
  '.option', 'input[type="radio"]', 'label[for*="answer"]'
]
```

## 🔒 Permissions

The extension requests minimal permissions:

- **`storage`**: Store captured quiz data locally
- **`notifications`**: Show capture/assistance status
- **`scripting`**: Inject content scripts
- **`host_permissions`**: Only for `https://savanna.alxafrica.com/*`

## 🛠️ Development

### Prerequisites

- Chrome/Edge browser
- Basic understanding of browser extensions
- Text editor or IDE

### Building from Source

1. **Clone repository**:
   ```bash
   git clone <repository-url>
   cd quiz-helper-extension
   ```

2. **Load in browser**:
   - Open `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load Unpacked"
   - Select the project folder

3. **Test functionality**:
   - Visit ALX correction page
   - Check capture functionality
   - Visit quiz page
   - Verify answer highlighting

### Customization

**Change highlight color** in `content-scripts/answer.js`:
```javascript
const ANSWER_CONFIG = {
  HIGHLIGHT_COLOR: 'rgba(255, 165, 0, 0.3)', // Orange
  HIGHLIGHT_BORDER: '2px solid #ff6600'
};
```

**Modify TTL** in `storage.js`:
```javascript
const STORAGE_CONFIG = {
  TTL_HOURS: 3, // Change to desired hours
};
```

**Add new selectors** for compatibility:
```javascript
// In capture.js or answer.js
questionContainers: [
  '.your-new-selector',
  // ... existing selectors
]
```

## 🐛 Troubleshooting

### Common Issues

**❌ "No questions found"**
- Check if you're on the correct ALX page
- Wait for page to fully load
- Try refreshing the page

**❌ "No matching questions"**
- Ensure capture was successful first
- Check if data has expired (>3 hours)
- Try capturing again from correction page

**❌ "Extension not working"**
- Check if extension is enabled
- Verify you're on `savanna.alxafrica.com`
- Check browser console for errors

**❌ "Answers not highlighted"**
- Ensure quiz assistance is started
- Check if stored data is available
- Try refreshing the quiz page

### Debug Mode

1. **Open Developer Tools** (F12)
2. **Check Console** for debug messages:
   - Capture script: "Quiz correction capture started"
   - Answer script: "Quiz assistance ready"
   - Storage: "Quiz data loaded successfully"

3. **Check Extension Console**:
   - Go to `chrome://extensions/`
   - Click "Service Worker" under ALX Quiz Helper
   - View background script logs

### Manual Reset

If extension gets stuck:
1. **Click extension icon**
2. **Click "Clear All Data"**
3. **Refresh both correction and quiz pages**
4. **Start capture process again**

## 📝 Changelog

### v1.0.0 (Initial Release)
- ✅ Basic capture and assistance functionality
- ✅ TTL-based storage system
- ✅ Modern popup UI
- ✅ Notification system
- ✅ Dynamic content detection
- ✅ Multi-selector compatibility

## 🤝 Contributing

1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feature-name`
3. **Commit changes**: `git commit -am 'Add feature'`
4. **Push to branch**: `git push origin feature-name`
5. **Submit Pull Request**

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This extension is for educational purposes. Use responsibly and in accordance with your institution's academic integrity policies.

## 🆘 Support

For issues, questions, or suggestions:
1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Check browser console for error messages

---

**Made with ❤️ for ALX Students**