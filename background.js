/**
 * Background Service Worker - Manifest V3
 * Handles notifications, TTL cleanup, and extension coordination
 */

console.log('ALX Quiz Helper: Background service worker starting...');

// Configuration
const BACKGROUND_CONFIG = {
  CLEANUP_INTERVAL: 30 * 60 * 1000, // Clean up every 30 minutes
  NOTIFICATION_DURATION: 5000,       // Auto-clear notifications after 5 seconds
  UPDATE_CHECK_INTERVAL: 24 * 60 * 60 * 1000, // Check for updates every 24 hours
  GITHUB_REPO: 'YOUR_USERNAME/YOUR_REPO' // Update with your GitHub repo
};

// Track notification cleanup timers
const notificationTimers = new Map();

/**
 * Extension startup and installation
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup - initializing...');
  initializeExtension();
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // First time installation
    console.log('First time installation - setting up...');
    setupFirstTimeInstall();
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('Extension updated from version:', details.previousVersion);
    handleExtensionUpdate(details.previousVersion);
  }
  
  initializeExtension();
});

/**
 * Initialize extension functionality
 */
function initializeExtension() {
  // Start periodic cleanup
  startPeriodicCleanup();
  
  // Set up notification management
  setupNotificationManagement();
  
  // Start update checker
  startUpdateChecker();
  
  console.log('Extension initialized successfully');
}

/**
 * Handle first time installation
 */
function setupFirstTimeInstall() {
  // Could show welcome notification or open setup page
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'ALX Quiz Helper Installed! 🎉',
    message: 'Visit a quiz correction page to start capturing answers.'
  });
}

/**
 * Handle extension updates
 */
function handleExtensionUpdate(previousVersion) {
  // Could handle data migration or show update notes
  console.log(`Updated from version ${previousVersion}`);
  
  const currentVersion = chrome.runtime.getManifest().version;
  
  // Show update notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: `Updated to v${currentVersion}! 🎉`,
    message: `Successfully updated from v${previousVersion}. Check out the new features!`,
    priority: 2
  });
  
  // Clean up any old data format if needed
  cleanupOldData();
}

/**
 * Start update checker
 */
function startUpdateChecker() {
  // Check immediately on startup
  checkForUpdates();
  
  // Check periodically
  setInterval(checkForUpdates, BACKGROUND_CONFIG.UPDATE_CHECK_INTERVAL);
  
  console.log('Update checker started');
}

/**
 * Check for updates from GitHub
 */
async function checkForUpdates() {
  try {
    if (BACKGROUND_CONFIG.GITHUB_REPO === 'YOUR_USERNAME/YOUR_REPO') {
      console.log('⚠️ Update check skipped: GitHub repo not configured');
      return;
    }
    
    const apiUrl = `https://api.github.com/repos/${BACKGROUND_CONFIG.GITHUB_REPO}/releases/latest`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.log('Update check failed:', response.status);
      return;
    }
    
    const data = await response.json();
    const latestVersion = data.tag_name.replace('v', '');
    const currentVersion = chrome.runtime.getManifest().version;
    
    console.log(`Current version: ${currentVersion}, Latest version: ${latestVersion}`);
    
    if (compareVersions(latestVersion, currentVersion) > 0) {
      // New version available
      showUpdateNotification(latestVersion, data.html_url);
    } else {
      console.log('✅ Extension is up to date');
    }
    
  } catch (error) {
    console.log('Update check error:', error.message);
  }
}

/**
 * Compare version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

/**
 * Show update available notification
 */
function showUpdateNotification(version, releaseUrl) {
  chrome.notifications.create('update_available', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '🚀 Update Available!',
    message: `Version ${version} is now available. Click to download.`,
    buttons: [
      { title: 'Update Now' },
      { title: 'Remind Me Later' }
    ],
    requireInteraction: true,
    priority: 2
  });
  
  // Store release URL for later
  chrome.storage.local.set({ 
    updateAvailable: true,
    updateVersion: version,
    updateUrl: releaseUrl 
  });
  
  // Handle button clicks
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId === 'update_available') {
      if (buttonIndex === 0) {
        // Open release page
        chrome.tabs.create({ url: releaseUrl });
      }
      chrome.notifications.clear(notificationId);
    }
  });
  
  // Handle notification click
  chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === 'update_available') {
      chrome.tabs.create({ url: releaseUrl });
      chrome.notifications.clear(notificationId);
    }
  });
}

/**
 * Handle extension updates
 */
function handleExtensionUpdate(previousVersion) {
  // Could handle data migration or show update notes
  console.log(`Updated from version ${previousVersion}`);
  
  // Clean up any old data format if needed
  cleanupOldData();
}

/**
 * Start periodic cleanup of expired data
 */
function startPeriodicCleanup() {
  // Run cleanup immediately
  performCleanup();
  
  // Set up periodic cleanup
  setInterval(performCleanup, BACKGROUND_CONFIG.CLEANUP_INTERVAL);
  
  console.log('Periodic cleanup started');
}

/**
 * Perform cleanup of expired data
 */
async function performCleanup() {
  try {
    // Get storage info
    const result = await chrome.storage.local.get(['quiz_corrections_data', 'quiz_corrections_timestamp']);
    const timestamp = result.quiz_corrections_timestamp;
    
    if (timestamp) {
      const currentTime = Date.now();
      const threeHoursInMs = 3 * 60 * 60 * 1000;
      const isExpired = (currentTime - timestamp) > threeHoursInMs;
      
      if (isExpired) {
        await chrome.storage.local.remove(['quiz_corrections_data', 'quiz_corrections_timestamp']);
        console.log('Expired quiz data cleaned up');
      }
    }
    
    // Clean up other potential old data
    await cleanupOldNotifications();
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

/**
 * Clean up old notifications and timers
 */
async function cleanupOldNotifications() {
  // Clear any old notification timers
  notificationTimers.forEach((timer, notificationId) => {
    clearTimeout(timer);
  });
  notificationTimers.clear();
}

/**
 * Clean up data from previous versions
 */
async function cleanupOldData() {
  try {
    // Remove any old storage keys that might exist from previous versions
    const oldKeys = ['old_quiz_data', 'quiz_cache', 'temp_data'];
    await chrome.storage.local.remove(oldKeys);
    console.log('Old data cleaned up');
  } catch (error) {
    console.error('Error cleaning up old data:', error);
  }
}

/**
 * Set up notification management
 */
function setupNotificationManagement() {
  // Listen for notification creation to set up auto-cleanup
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    handleNotificationAction(notificationId, buttonIndex);
  });
  
  chrome.notifications.onClicked.addListener((notificationId) => {
    handleNotificationClick(notificationId);
  });
  
  chrome.notifications.onClosed.addListener((notificationId, byUser) => {
    handleNotificationClosed(notificationId, byUser);
  });
}

/**
 * Handle notification button clicks
 */
function handleNotificationAction(notificationId, buttonIndex) {
  console.log(`Notification ${notificationId} button ${buttonIndex} clicked`);
  
  // Could handle different notification actions here
  chrome.notifications.clear(notificationId);
}

/**
 * Handle notification clicks
 */
function handleNotificationClick(notificationId) {
  console.log(`Notification ${notificationId} clicked`);
  
  // Clear the notification when clicked
  chrome.notifications.clear(notificationId);
  
  // Could open extension popup or relevant page
}

/**
 * Handle notification closed
 */
function handleNotificationClosed(notificationId, byUser) {
  // Clean up any associated timers
  if (notificationTimers.has(notificationId)) {
    clearTimeout(notificationTimers.get(notificationId));
    notificationTimers.delete(notificationId);
  }
}

/**
 * Message handling from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.action) {
    case 'getStorageInfo':
      handleGetStorageInfo(sendResponse);
      return true; // Keep message channel open
      
    case 'clearAllData':
      handleClearAllData(sendResponse);
      return true;
      
    case 'performCleanup':
      performCleanup().then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'showNotification':
      showCustomNotification(request.notification);
      sendResponse({ success: true });
      break;
      
    case 'checkForUpdates':
      checkForUpdates().then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'bypassActivity':
      // Handle bypass activity notification
      console.log('Payment bypass activity:', request.count);
      sendResponse({ success: true });
      break;
      
    default:
      console.log('Unknown action:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

/**
 * Handle storage info request
 */
async function handleGetStorageInfo(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['quiz_corrections_data', 'quiz_corrections_timestamp']);
    const data = result.quiz_corrections_data;
    const timestamp = result.quiz_corrections_timestamp;
    
    const currentTime = Date.now();
    const threeHoursInMs = 3 * 60 * 60 * 1000;
    const isExpired = timestamp ? (currentTime - timestamp) > threeHoursInMs : true;
    
    const info = {
      hasData: !!data && !isExpired,
      questionCount: data ? data.length : 0,
      timestamp: timestamp,
      isExpired: isExpired,
      ageInHours: timestamp ? (currentTime - timestamp) / (1000 * 60 * 60) : 0
    };
    
    sendResponse({ success: true, info: info });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle clear all data request
 */
async function handleClearAllData(sendResponse) {
  try {
    await chrome.storage.local.clear();
    console.log('All data cleared');
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error clearing data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Show custom notification with auto-cleanup
 */
function showCustomNotification(notificationData) {
  const notificationId = 'quiz_helper_' + Date.now();
  
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: notificationData.title || 'ALX Quiz Helper',
    message: notificationData.message || '',
    ...notificationData
  });
  
  // Set up auto-cleanup timer
  const timer = setTimeout(() => {
    chrome.notifications.clear(notificationId);
    notificationTimers.delete(notificationId);
  }, BACKGROUND_CONFIG.NOTIFICATION_DURATION);
  
  notificationTimers.set(notificationId, timer);
}

/**
 * Handle extension context menu (if needed in future)
 */
chrome.runtime.onInstalled.addListener(() => {
  // Could create context menu items here
  // chrome.contextMenus.create({...});
});

/**
 * Handle tab updates to detect relevant pages
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if we're on a relevant ALX page
    if (tab.url.includes('savanna.alxafrica.com')) {
      console.log('ALX page detected:', tab.url);
      
      // Could inject scripts or show page action here
      if (tab.url.includes('evaluation_quiz_corrections')) {
        console.log('Quiz correction page detected - ready for capture');
      } else if (tab.url.includes('evaluation_quiz')) {
        console.log('Quiz page detected - ready for smart assistance');
        // Ensure smart answer script is ready
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            if (window.smartAssistant) {
              console.log('Smart Assistant already active');
            } else {
              console.log('Smart Assistant initializing...');
            }
          }
        }).catch(err => console.log('Script injection not needed:', err.message));
      }
    }
  }
});

/**
 * Error handling
 */
self.addEventListener('error', (event) => {
  console.error('Background script error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Background script unhandled rejection:', event.reason);
});

console.log('Background service worker setup complete');