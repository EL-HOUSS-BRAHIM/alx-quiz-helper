/**
 * Popup Script - Extension UI Controller
 * Handles user interactions and status display
 */

/**
 * Global variables
 */
let elements = null;

// Initialize popup when DOM is ready
console.log('popup.js: Script loaded, document.readyState:', document.readyState);

if (document.readyState === 'loading') {
    console.log('popup.js: Waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', init);
} else {
    console.log('popup.js: DOM already ready, initializing immediately');
    init();
}

/**
 * Popup Script - Extension UI Controller
 * Handles user interactions and status display
 */

/**
 * Global variables
 */
let elements = null;

function initElements() {
    console.log('initElements: Starting element initialization...');
    
    elements = {
        dataStatusIndicator: document.getElementById('dataStatusIndicator'),
        dataStatusText: document.getElementById('dataStatusText'),
        questionCount: document.getElementById('questionCount'),
        dataAge: document.getElementById('dataAge'),
        
        // Settings elements
        showPopupAnswer: document.getElementById('showPopupAnswer'),
        showPageHighlight: document.getElementById('showPageHighlight'),
        popupDuration: document.getElementById('popupDuration'),
        durationValue: document.getElementById('durationValue'),
        saveSettings: document.getElementById('saveSettings'),
        captureBtn: document.getElementById('captureBtn'),
        assistBtn: document.getElementById('assistBtn'),
        refreshBtn: document.getElementById('refreshBtn'),
        searchBtn: document.getElementById('searchBtn'),
        exportBtn: document.getElementById('exportBtn'),
        dataManagerBtn: document.getElementById('dataManagerBtn'),
        clearBtn: document.getElementById('clearBtn'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        debugBtn: document.getElementById('debugBtn'),
        triggerBypassBtn: document.getElementById('triggerBypassBtn'),
        bypassCount: document.getElementById('bypassCount'),
        loading: document.getElementById('loading'),
        controls: document.getElementById('controls'),
        errorMessage: document.getElementById('errorMessage'),
        errorText: document.getElementById('errorText'),
        successMessage: document.getElementById('successMessage'),
        successText: document.getElementById('successText'),
        analysisCard: document.getElementById('analysisCard'),
        questionSubject: document.getElementById('questionSubject'),
        questionDifficulty: document.getElementById('questionDifficulty'),
        answerConfidence: document.getElementById('answerConfidence'),
        answerValidation: document.getElementById('answerValidation')
    };
    
    // Check which elements are missing
    const missingElements = [];
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            missingElements.push(key);
        }
    }
    
    if (missingElements.length > 0) {
        console.error('initElements: Missing elements:', missingElements);
    } else {
        console.log('initElements: All elements found successfully');
    }
    
    // Show immediate status to user
    if (elements.dataStatusText) {
        elements.dataStatusText.textContent = 'Initializing...';
    }
    }
    
/**
     * Initialize the popup
     */
async function init() {
    console.log('init: Starting popup initialization...');
    
    try {
        // Initialize DOM elements first
        initElements();
        
        // Immediately try to load data from local storage as fallback
        await loadDataDirectly();
        
        // Add a timeout for the entire initialization process
        const initTimeout = setTimeout(() => {
            console.error('init: Initialization timeout - forcing fallback');
            setDefaultStatus();
            showError('Initialization timeout - some features may not work');
            showLoading(false);
        }, 5000); // 5 second timeout
        
        // Try to update status with shorter timeout
        try {
            await Promise.race([
                updateStatus(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Status update timeout')), 3000)
                )
            ]);
        } catch (error) {
            console.error('init: Status update failed:', error);
            // Don't override the direct data load if it worked
            if (elements.dataStatusText.textContent === 'Initializing...') {
                setDefaultStatus();
                showError('Failed to load extension status');
            }
        }
        
        // Set up event listeners (should always work)
        setupEventListeners();
        
        // Check current page (may fail, but shouldn't block)
        try {
            await checkCurrentPage();
        } catch (error) {
            console.warn('init: Page check failed:', error);
        }
        
        clearTimeout(initTimeout);
        console.log('init: Initialization completed successfully');
        
        // Load and apply settings
        await loadSettings();
        
        // Update bypass count
        await updateBypassStatus();
        
    } catch (error) {
        console.error('init: Critical initialization error:', error);
        setDefaultStatus();
        showError('Extension initialization failed: ' + error.message);
        showLoading(false);
    }
    }
    
/**
     * Load settings from storage
     */
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get(['quizHelperSettings']);
        const settings = result.quizHelperSettings || {
            showPopupAnswer: true,
            showPageHighlight: true,
            popupDuration: 45
        };
        
        // Apply to UI
        if (elements.showPopupAnswer) {
            elements.showPopupAnswer.checked = settings.showPopupAnswer;
        }
        if (elements.showPageHighlight) {
            elements.showPageHighlight.checked = settings.showPageHighlight;
        }
        if (elements.popupDuration) {
            elements.popupDuration.value = settings.popupDuration;
            updateDurationDisplay(settings.popupDuration);
        }
        
        console.log('Settings loaded:', settings);
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
    }
    
/**
     * Save settings to storage
     */
async function saveSettings() {
    try {
        const settings = {
            showPopupAnswer: elements.showPopupAnswer?.checked ?? true,
            showPageHighlight: elements.showPageHighlight?.checked ?? true,
            popupDuration: parseInt(elements.popupDuration?.value ?? 45)
        };
        
        await chrome.storage.local.set({ quizHelperSettings: settings });
        
        // Send message to content script to update settings
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, {
                action: 'updateSettings',
                settings: settings
            }).catch(err => console.log('Content script not ready:', err));
        }
        
        showSuccess('Settings saved successfully!');
        console.log('Settings saved:', settings);
    } catch (error) {
        console.error('Failed to save settings:', error);
        showError('Failed to save settings: ' + error.message);
    }
    }
    
/**
     * Update duration display text
     */
function updateDurationDisplay(value) {
    if (elements.durationValue) {
        elements.durationValue.textContent = value + 's';
    }
    }
    
/**
     * Load data directly from Chrome storage as fallback
     */
async function loadDataDirectly() {
    try {
        console.log('loadDataDirectly: Attempting direct storage access...');
        
        const result = await chrome.storage.local.get(['quiz_corrections_data', 'quiz_corrections_timestamp']);
        const data = result.quiz_corrections_data;
        const timestamp = result.quiz_corrections_timestamp;
        
        console.log('loadDataDirectly: Retrieved data:', { 
            dataCount: data?.length || 0, 
            timestamp: timestamp ? new Date(timestamp) : null 
        });
        
        if (data && data.length > 0) {
            const currentTime = Date.now();
            const threeHoursInMs = 3 * 60 * 60 * 1000;
            const isExpired = timestamp ? (currentTime - timestamp) > threeHoursInMs : true;
            
            // Update UI directly
            if (elements.dataStatusText) {
                elements.dataStatusText.textContent = isExpired ? 'Expired' : 'Ready';
            }
            if (elements.dataStatusIndicator) {
                elements.dataStatusIndicator.className = isExpired ? 
                    'status-indicator status-warning' : 
                    'status-indicator status-good';
            }
            if (elements.questionCount) {
                elements.questionCount.textContent = data.length;
            }
            if (elements.dataAge && timestamp) {
                const ageHours = (currentTime - timestamp) / (1000 * 60 * 60);
                const hours = Math.floor(ageHours);
                const minutes = Math.floor((ageHours - hours) * 60);
                
                if (elements.dataAge) {
                    elements.dataAge.textContent = hours > 0 ? 
                        `${hours}h ${minutes}m ago` : 
                        `${minutes}m ago`;
                }
            }
            
            // Enable/disable buttons
            if (elements.assistBtn) elements.assistBtn.disabled = isExpired;
            if (elements.dataManagerBtn) elements.dataManagerBtn.disabled = false;
            if (elements.clearBtn) elements.clearBtn.disabled = false;
            
            console.log('loadDataDirectly: UI updated with direct data');
            showLoading(false);
            
        } else {
            console.log('loadDataDirectly: No data found');
            if (elements.dataStatusText) {
                elements.dataStatusText.textContent = 'No Data';
            }
            if (elements.questionCount) {
                elements.questionCount.textContent = '0';
            }
            showLoading(false);
        }
        
    } catch (error) {
        console.error('loadDataDirectly: Failed to load data directly:', error);
        // Don't show error here, let the main updateStatus handle it
    }
    }
    
/**
     * Set up event listeners
     */
function setupEventListeners() {
    if (!elements) {
        console.warn('Elements not initialized for setupEventListeners');
        return;
    }
    
    console.log('setupEventListeners: Setting up button listeners...');
    
    if (elements.captureBtn) {
        elements.captureBtn.addEventListener('click', handleCaptureClick);
        console.log('setupEventListeners: Capture button listener added');
    }
    if (elements.assistBtn) {
        elements.assistBtn.addEventListener('click', handleAssistClick);
        console.log('setupEventListeners: Assist button listener added');
    }
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', handleRefreshClick);
        console.log('setupEventListeners: Refresh button listener added');
    }
    if (elements.searchBtn) {
        elements.searchBtn.addEventListener('click', handleSearchClick);
        console.log('setupEventListeners: Search button listener added');
    }
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', handleExportClick);
        console.log('setupEventListeners: Export button listener added');
    }
    if (elements.dataManagerBtn) {
        elements.dataManagerBtn.addEventListener('click', handleDataManagerClick);
        console.log('setupEventListeners: Data manager button listener added');
    }
    if (elements.clearBtn) {
        elements.clearBtn.addEventListener('click', handleClearClick);
        console.log('setupEventListeners: Clear highlights button listener added');
    }
    if (elements.clearAllBtn) {
        elements.clearAllBtn.addEventListener('click', handleClearAllClick);
        console.log('setupEventListeners: Clear all data button listener added');
    }
    if (elements.triggerBypassBtn) {
        elements.triggerBypassBtn.addEventListener('click', handleBypassClick);
        console.log('setupEventListeners: Bypass button listener added');
    }
    if (elements.debugBtn) {
        elements.debugBtn.addEventListener('click', handleDebugClick);
        console.log('setupEventListeners: Debug button listener added');
    }
    
    // Settings event listeners
    if (elements.saveSettings) {
        elements.saveSettings.addEventListener('click', saveSettings);
        console.log('setupEventListeners: Save settings button listener added');
    }
    if (elements.popupDuration) {
        elements.popupDuration.addEventListener('input', (e) => {
            updateDurationDisplay(e.target.value);
        });
        console.log('setupEventListeners: Duration slider listener added');
    }
    
    console.log('setupEventListeners: All listeners set up');
    }
    
/**
     * Check what page the user is currently on
     */
async function checkCurrentPage() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab.url) {
            console.log('Current page:', tab.url);
            
            if (tab.url.includes('evaluation_quiz_corrections')) {
                // On correction page - emphasize capture
                elements.captureBtn.style.background = '#10b981';
                elements.captureBtn.innerHTML = '<span class="button-icon">📝</span>Capture Now (Correction Page)';
            } else if (tab.url.includes('evaluation_quizzes')) {
                // On quiz page - emphasize assistance
                elements.assistBtn.style.background = '#10b981';
                elements.assistBtn.innerHTML = '<span class="button-icon">🎯</span>Assist Now (Quiz Page)';
            } else if (!tab.url.includes('savanna.alxafrica.com')) {
                // Not on ALX page
                showError('Please navigate to an ALX Savanna page to use this extension.');
                elements.captureBtn.disabled = true;
                elements.assistBtn.disabled = true;
            }
            
            // Test content script communication
            await testContentScript(tab.id);
        }
    } catch (error) {
        console.error('Error checking current page:', error);
    }
    }
    
/**
     * Test if content scripts can communicate
     */
async function testContentScript(tabId) {
    try {
        // Try to inject test script first
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content-scripts/test.js']
        });
        
        // Wait a moment then test communication
        setTimeout(async () => {
            try {
                const response = await chrome.tabs.sendMessage(tabId, { action: 'test' });
                console.log('Content script test:', response);
            } catch (error) {
                console.log('Content script communication test failed:', error);
            }
        }, 500);
    } catch (error) {
        console.log('Could not inject test script:', error);
    }
    }
    
/**
     * Update the status display
     */
async function updateStatus() {
    console.log('updateStatus: Starting...');
    try {
        showLoading(true);
        
        console.log('updateStatus: Sending getStorageInfo message...');
        const response = await sendMessageToBackground({ action: 'getStorageInfo' });
        console.log('updateStatus: Received response:', response);
        
        if (response && response.success) {
            const info = response.info;
            console.log('updateStatus: Storage info:', info);
            updateStatusDisplay(info);
        } else {
            const errorMsg = response ? response.error : 'No response received';
            console.error('updateStatus: Failed to get storage info:', errorMsg);
            throw new Error(errorMsg || 'Failed to get storage info');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showError('Failed to load status: ' + error.message);
        setDefaultStatus();
    } finally {
        showLoading(false);
    }
    }
    
/**
     * Update status display with storage info
     */
function updateStatusDisplay(info) {
    if (!elements) {
        console.warn('Elements not initialized for updateStatusDisplay');
        return;
    }
    
    console.log('updateStatusDisplay: Updating with info:', info);
    
    // Update data status
    if (info.hasData) {
        if (elements.dataStatusIndicator) elements.dataStatusIndicator.className = 'status-indicator status-good';
        if (elements.dataStatusText) elements.dataStatusText.textContent = 'Ready';
    } else if (info.isExpired) {
        if (elements.dataStatusIndicator) elements.dataStatusIndicator.className = 'status-indicator status-warning';
        if (elements.dataStatusText) elements.dataStatusText.textContent = 'Expired';
    } else {
        if (elements.dataStatusIndicator) elements.dataStatusIndicator.className = 'status-indicator status-error';
        if (elements.dataStatusText) elements.dataStatusText.textContent = 'No Data';
    }
    
    // Update question count
    if (elements.questionCount) elements.questionCount.textContent = info.questionCount || 0;
    
    // Update data age
    if (info.timestamp) {
        const ageHours = Math.floor(info.ageInHours);
        const ageMinutes = Math.floor((info.ageInHours - ageHours) * 60);
        
        if (ageHours > 0) {
            if (elements.dataAge) elements.dataAge.textContent = `${ageHours}h ${ageMinutes}m ago`;
        } else {
            if (elements.dataAge) elements.dataAge.textContent = `${ageMinutes}m ago`;
        }
    } else {
        if (elements.dataAge) elements.dataAge.textContent = 'Never';
    }
    
    // Update button states
    updateButtonStates(info);
    }
    
/**
     * Update button enabled/disabled states
     */
function updateButtonStates(info) {
    if (!elements) {
        console.warn('Elements not initialized for updateButtonStates');
        return;
    }
    
    // Capture button is always enabled on ALX pages
    // Assist button is enabled if we have data
    if (elements.assistBtn) elements.assistBtn.disabled = !info.hasData;
    
    // Data manager and clear buttons are enabled if we have any data
    if (elements.dataManagerBtn) elements.dataManagerBtn.disabled = !info.questionCount;
    if (elements.clearBtn) elements.clearBtn.disabled = !info.questionCount;
    }
    
/**
     * Set default status when there's an error
     */
function setDefaultStatus() {
    if (!elements) {
        console.warn('Elements not initialized for setDefaultStatus');
        return;
    }
    
    try {
        if (elements.dataStatusIndicator) elements.dataStatusIndicator.className = 'status-indicator status-error';
        if (elements.dataStatusText) elements.dataStatusText.textContent = 'Error';
        if (elements.questionCount) elements.questionCount.textContent = '0';
        if (elements.dataAge) elements.dataAge.textContent = 'Unknown';
        
        if (elements.assistBtn) elements.assistBtn.disabled = true;
        if (elements.dataManagerBtn) elements.dataManagerBtn.disabled = true;
        if (elements.clearBtn) elements.clearBtn.disabled = true;
    } catch (error) {
        console.error('Error in setDefaultStatus:', error);
    }
    }
    
/**
     * Handle capture button click
     */
async function handleCaptureClick() {
    try {
        showLoading(true);
        hideMessages();
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes('evaluation_quiz_corrections')) {
            throw new Error('Please navigate to a quiz correction page first.');
        }
        
        // Try to send message to existing content script
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });
            
            if (response && response.success) {
                showSuccess('Capture started! Check the page for progress.');
                setTimeout(updateStatus, 2000);
            } else {
                throw new Error(response?.error || 'Failed to start capture');
            }
        } catch (connectionError) {
            // If content script not available, inject it programmatically
            console.log('Content script not available, injecting...');
            
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['storage.js', 'content-scripts/capture.js']
                });
                
                // Wait a moment for script to initialize
                setTimeout(async () => {
                    try {
                        const response = await chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });
                        if (response && response.success) {
                            showSuccess('Capture started! Check the page for progress.');
                            setTimeout(updateStatus, 2000);
                        } else {
                            throw new Error('Failed to start capture after injection');
                        }
                    } catch (error) {
                        showError('Failed to communicate with injected script: ' + error.message);
                    }
                }, 1000);
            } catch (injectionError) {
                throw new Error('Failed to inject script: ' + injectionError.message);
            }
        }
    } catch (error) {
        console.error('Capture error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
    }
    
/**
     * Handle assist button click
     */
async function handleAssistClick() {
    try {
        showLoading(true);
        hideMessages();
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes('evaluation_quiz')) {
            throw new Error('Please navigate to a quiz page first.');
        }
        
        // Try to send message to existing smart assistant
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
            
            if (response && response.isActive) {
                showSuccess(`Smart assistance active! Found ${response.questionCount} questions for ${response.currentCourse || 'current course'}.`);
            } else if (response && response.hasData) {
                // Try to start assistance
                const startResponse = await chrome.tabs.sendMessage(tab.id, { action: 'reprocessQuestion' });
                if (startResponse && startResponse.success) {
                    showSuccess('Smart assistance restarted! Look for highlighted answers.');
                } else {
                    showWarning('Assistant found but may need page refresh.');
                }
            } else {
                throw new Error('No quiz data available. Please capture corrections first.');
            }
        } catch (connectionError) {
            // If content script not available, inject it programmatically
            console.log('Smart assistant not available, injecting...');
            
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['storage.js', 'content-scripts/smart-answer.js']
                });
                
                // Wait a moment for script to initialize
                setTimeout(async () => {
                    try {
                        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
                        if (response && response.hasData) {
                            showSuccess(`Smart assistance started! Ready to help with ${response.questionCount} questions.`);
                        } else {
                            showWarning('Smart assistant loaded but no quiz data found. Please capture corrections first.');
                        }
                    } catch (error) {
                        showError('Failed to communicate with smart assistant: ' + error.message);
                    }
                }, 1500);
            } catch (injectionError) {
                throw new Error('Failed to inject smart assistant: ' + injectionError.message);
            }
        }
    } catch (error) {
        console.error('Assist error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
    }
    
/**
     * Handle refresh button click
     */
async function handleRefreshClick() {
    console.log('handleRefreshClick: Refreshing status...');
    hideMessages();
    
    try {
        await updateStatus();
        showSuccess('Status refreshed!');
    } catch (error) {
        console.error('handleRefreshClick: Refresh failed:', error);
        showError('Refresh failed: ' + error.message);
        setDefaultStatus();
    }
    }
    
/**
     * Handle data manager button click
     */
async function handleDataManagerClick() {
    try {
        // Open data manager in new tab
        const dataManagerUrl = chrome.runtime.getURL('data-manager/data-manager.html');
        await chrome.tabs.create({ url: dataManagerUrl });
    } catch (error) {
        console.error('Error opening data manager:', error);
        showError('Failed to open data manager: ' + error.message);
    }
    }
    
/**
     * Handle clear button click
     */
async function handleClearClick() {
    try {
        showLoading(true);
        hideMessages();
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes('evaluation_quiz')) {
            showWarning('Please navigate to a quiz page first.');
            return;
        }
        
        // Try to clear highlights via smart assistant
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' });
            
            if (response && response.success) {
                showSuccess('Highlights cleared successfully!');
            } else {
                showWarning('No active highlights found to clear.');
            }
        } catch (connectionError) {
            showWarning('Smart assistant not active. No highlights to clear.');
        }
    } catch (error) {
        console.error('Clear error:', error);
        showError('Failed to clear highlights: ' + error.message);
    } finally {
/**
     * Update bypass status from content script
     */
async function updateBypassStatus() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab?.id || !tab.url.includes('alxafrica.com')) {
            return;
        }
        
        const response = await chrome.tabs.sendMessage(tab.id, { 
            action: 'getBypassStatus' 
        }).catch(() => ({ success: false }));
        
        if (response && response.success && elements.bypassCount) {
            elements.bypassCount.textContent = response.bypassCount || 0;
        }
    } catch (error) {
        console.log('Bypass status update skipped:', error.message);
    }
    }
    
/**
     * Handle bypass button click
     */
async function handleBypassClick() {
    try {
        showLoading(true);
        hideMessages();
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes('alxafrica.com')) {
            showError('Please navigate to an ALX page first.');
            return;
        }
        
        const response = await chrome.tabs.sendMessage(tab.id, { 
            action: 'triggerBypass' 
        });
        
        if (response && response.success) {
            if (response.removed > 0) {
                showSuccess(`Bypass activated! Removed ${response.removed} payment elements.`);
            } else {
                showSuccess('No payment walls detected. Page is clear!');
            }
            
            if (elements.bypassCount) {
                elements.bypassCount.textContent = response.totalBypass || 0;
            }
        } else {
            showError('Failed to activate bypass. Try refreshing the page.');
        }
        
    } catch (error) {
        console.error('Bypass error:', error);
        showError('Bypass not available. Make sure you\'re on an ALX page.');
    } finally {
        showLoading(false);
    }
    }
    
/**
     * Handle clear all data button click
     */
async function handleClearAllClick() {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL quiz data!\n\nAre you sure you want to continue?')) {
        return;
    }
    
    try {
        showLoading(true);
        hideMessages();
        
        // Clear all storage
        await chrome.storage.local.clear();
        
        showSuccess('All data cleared successfully!');
        
        // Refresh status
        setTimeout(updateStatus, 1000);
        
    } catch (error) {
        console.error('Clear all error:', error);
        showError('Failed to clear data: ' + error.message);
    } finally {
        showLoading(false);
    }
    }
    
/**
     * Handle debug button click
     */
    
/**
     * Handle debug button click
     */
function handleDebugClick() {
    console.log('handleDebugClick: Debug button clicked!');
    
    // Test basic functionality
    let testResults = [];
    
    // Test 1: Elements check
    const elementCount = Object.values(elements).filter(el => el !== null).length;
    testResults.push(`Elements: ${elementCount}/${Object.keys(elements).length} found`);
    
    // Test 2: Storage access
    chrome.storage.local.get(['quiz_corrections_data'], (result) => {
        const dataCount = result.quiz_corrections_data?.length || 0;
        testResults.push(`Storage: ${dataCount} questions`);
        
        // Show results
        const message = testResults.join(', ');
        console.log('Debug results:', message);
        
        if (elements.dataStatusText) {
            elements.dataStatusText.textContent = 'Debug: ' + message;
        }
        
        showSuccess('Debug test completed! Check console for details.');
    });
    
    // Test 3: Background communication
    sendMessageToBackground({ action: 'getStorageInfo' }).then(response => {
        console.log('Debug: Background response:', response);
    });
    }
    
/**
     * Send message to background script
     */
function sendMessageToBackground(message) {
    console.log('sendMessageToBackground: Sending message:', message);
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                console.error('sendMessageToBackground: Runtime error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log('sendMessageToBackground: Received response:', response);
                resolve(response || { success: false, error: 'No response' });
            }
        });
    });
    }
    
/**
     * Show/hide loading state
     */
function showLoading(show) {
    if (!elements || !elements.loading || !elements.controls) {
        console.warn('Loading elements not found');
        return;
    }
    
    if (show) {
        elements.loading.classList.add('show');
        elements.controls.style.display = 'none';
    } else {
        elements.loading.classList.remove('show');
        elements.controls.style.display = 'block';
    }
    }
    
/**
     * Show error message
     */
function showError(message) {
    if (!elements || !elements.errorText || !elements.errorMessage) {
        console.error('Error elements not found:', message);
        return;
    }
    
    elements.errorText.textContent = message;
    elements.errorMessage.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (elements && elements.errorMessage) {
            elements.errorMessage.classList.remove('show');
        }
    }, 5000);
    }
    
/**
     * Show success message
     */
function showSuccess(message) {
    if (!elements || !elements.successText || !elements.successMessage) {
        console.log('Success elements not found:', message);
        return;
    }
    
    elements.successText.textContent = message;
    elements.successMessage.classList.add('show');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (elements && elements.successMessage) {
            elements.successMessage.classList.remove('show');
        }
    }, 3000);
    }
    
/**
     * Hide all messages
     */
function hideMessages() {
    if (elements && elements.errorMessage) {
        elements.errorMessage.classList.remove('show');
    }
    if (elements && elements.successMessage) {
        elements.successMessage.classList.remove('show');
    }
    }
    
/**
     * Handle search button click
     */
async function handleSearchClick() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Open search interface in content script
        await chrome.tabs.sendMessage(tab.id, { 
            action: 'openAdvancedSearch'
        });
        
        showSuccess('Advanced search interface opened!');
    } catch (error) {
        console.error('Search error:', error);
        showError('Failed to open search interface. Make sure you\'re on an ALX page.');
    }
    }
    
/**
     * Handle export button click
     */
async function handleExportClick() {
    try {
        showLoading(true);
        hideMessages();
        
        const data = await QuizStorage.getAllData();
        
        if (!data || Object.keys(data).length === 0) {
            throw new Error('No data available to export');
        }
        
        // Send message to content script to handle export
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        try {
            await chrome.tabs.sendMessage(tab.id, { 
                action: 'exportData',
                data: data
            });
            
            showSuccess('Export dialog opened! Choose your format.');
        } catch (contentError) {
            // Fallback: download as JSON
            const exportData = {
                exportDate: new Date().toISOString(),
                quizData: data,
                version: '1.0.0'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], 
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `alx-quiz-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            showSuccess('Data exported as JSON file!');
        }
    } catch (error) {
        console.error('Export error:', error);
        showError(error.message || 'Failed to export data');
    } finally {
        showLoading(false);
    }
    }
    
/**
     * Update analysis display
     */
async function updateAnalysisDisplay() {
    try {
        // Check if elements are initialized and analysisCard exists
        if (!elements || !elements.analysisCard) {
            return;
        }
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes('evaluation_quizzes')) {
            elements.analysisCard.style.display = 'none';
            return;
        }
        
        // Request current question analysis from content script
        const response = await chrome.tabs.sendMessage(tab.id, { 
            action: 'getCurrentAnalysis'
        });
        
        if (response && response.analysis) {
            const analysis = response.analysis;
            
            if (elements.questionSubject) {
                elements.questionSubject.textContent = analysis.subject || '-';
            }
            if (elements.questionDifficulty) {
                elements.questionDifficulty.textContent = analysis.difficulty || '-';
            }
            if (elements.answerConfidence) {
                elements.answerConfidence.textContent = 
                    analysis.confidence ? `${Math.round(analysis.confidence * 100)}%` : '-';
            }
            if (elements.answerValidation) {
                elements.answerValidation.textContent = 
                    analysis.validation ? (analysis.validation.isValid ? '✅ Valid' : '⚠️ Check') : '-';
            }
            
            elements.analysisCard.style.display = 'block';
        } else {
            elements.analysisCard.style.display = 'none';
        }
    } catch (error) {
        console.log('Analysis update failed:', error);
        if (elements && elements.analysisCard) {
            elements.analysisCard.style.display = 'none';
        }
    }
    }
    
    // Update analysis every 3 seconds when on quiz page
    setInterval(updateAnalysisDisplay, 3000);
}
}