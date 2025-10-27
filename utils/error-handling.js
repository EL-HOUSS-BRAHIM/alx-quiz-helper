/**
 * Advanced Error Handling & Recovery System
 * Provides robust error handling and automatic recovery mechanisms
 */

class ErrorHandlingSystem {
  constructor() {
    this.errorLog = [];
    this.recoveryStrategies = new Map();
    this.performanceMetrics = {
      startTime: Date.now(),
      errors: 0,
      recoveries: 0,
      operations: 0
    };
    
    this.setupGlobalErrorHandling();
    this.setupRecoveryStrategies();
    this.startHealthMonitoring();
  }

  /**
   * Setup global error handling
   */
  setupGlobalErrorHandling() {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.handleError('GLOBAL_ERROR', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('UNHANDLED_PROMISE', event.reason, {
        promise: event.promise
      });
    });

    // Capture extension-specific errors
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'reportError') {
          this.handleError('EXTENSION_ERROR', request.error, request.context);
        }
      });
    }
  }

  /**
   * Setup recovery strategies for different error types
   */
  setupRecoveryStrategies() {
    // DOM-related errors
    this.recoveryStrategies.set('DOM_ELEMENT_NOT_FOUND', {
      maxRetries: 3,
      retryDelay: 1000,
      strategy: this.retryDOMOperation.bind(this)
    });

    // Network-related errors
    this.recoveryStrategies.set('NETWORK_ERROR', {
      maxRetries: 5,
      retryDelay: 2000,
      strategy: this.retryNetworkOperation.bind(this)
    });

    // Storage-related errors
    this.recoveryStrategies.set('STORAGE_ERROR', {
      maxRetries: 3,
      retryDelay: 500,
      strategy: this.retryStorageOperation.bind(this)
    });

    // Question matching errors
    this.recoveryStrategies.set('QUESTION_MATCH_ERROR', {
      maxRetries: 2,
      retryDelay: 1000,
      strategy: this.fallbackQuestionMatching.bind(this)
    });

    // ALX layout change errors
    this.recoveryStrategies.set('LAYOUT_CHANGE_ERROR', {
      maxRetries: 1,
      retryDelay: 2000,
      strategy: this.adaptToLayoutChanges.bind(this)
    });
  }

  /**
   * Handle error with automatic recovery
   */
  async handleError(type, error, context = {}) {
    const errorEntry = {
      id: this.generateErrorId(),
      type,
      error: this.serializeError(error),
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      recovered: false,
      attempts: 0
    };

    this.errorLog.push(errorEntry);
    this.performanceMetrics.errors++;

    console.error(`[QuizHelper] ${type}:`, error, context);

    // Try to recover from the error
    await this.attemptRecovery(errorEntry);

    // Report to analytics if configured
    this.reportToAnalytics(errorEntry);

    return errorEntry;
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(errorEntry) {
    const strategy = this.recoveryStrategies.get(errorEntry.type);
    if (!strategy) {
      console.log(`No recovery strategy for ${errorEntry.type}`);
      return false;
    }

    errorEntry.attempts++;

    if (errorEntry.attempts > strategy.maxRetries) {
      console.log(`Max retries exceeded for ${errorEntry.type}`);
      this.showUserErrorMessage(errorEntry);
      return false;
    }

    try {
      console.log(`Attempting recovery for ${errorEntry.type} (attempt ${errorEntry.attempts})`);
      
      // Wait before retry
      await this.sleep(strategy.retryDelay * errorEntry.attempts);
      
      // Execute recovery strategy
      const recovered = await strategy.strategy(errorEntry);
      
      if (recovered) {
        errorEntry.recovered = true;
        this.performanceMetrics.recoveries++;
        console.log(`Successfully recovered from ${errorEntry.type}`);
        return true;
      } else {
        // Retry if not recovered
        return await this.attemptRecovery(errorEntry);
      }
    } catch (recoveryError) {
      console.error(`Recovery failed for ${errorEntry.type}:`, recoveryError);
      return await this.attemptRecovery(errorEntry);
    }
  }

  /**
   * Retry DOM operations with enhanced selectors
   */
  async retryDOMOperation(errorEntry) {
    const { operation, selector, element } = errorEntry.context;
    
    if (!selector && !element) return false;

    // Try enhanced selector strategies
    const enhancedSelectors = this.generateEnhancedSelectors(selector);
    
    for (const enhancedSelector of enhancedSelectors) {
      try {
        const elements = document.querySelectorAll(enhancedSelector);
        if (elements.length > 0) {
          console.log(`Found elements with enhanced selector: ${enhancedSelector}`);
          
          // Update the operation context with new selector
          errorEntry.context.recoveredSelector = enhancedSelector;
          errorEntry.context.recoveredElements = Array.from(elements);
          
          return true;
        }
      } catch (selectorError) {
        console.log(`Enhanced selector failed: ${enhancedSelector}`);
      }
    }

    // Try waiting for dynamic content
    if (errorEntry.attempts === 1) {
      return await this.waitForDynamicContent(selector);
    }

    return false;
  }

  /**
   * Generate enhanced selectors for better element detection
   */
  generateEnhancedSelectors(originalSelector) {
    if (!originalSelector) return [];

    const enhanced = [];
    
    // ALX-specific fallbacks
    if (originalSelector.includes('evaluation_quiz_question')) {
      enhanced.push(
        'h4[class*="evaluation"]',
        '[class*="quiz"][class*="question"]',
        '.question-container h4',
        '[data-question]'
      );
    }
    
    if (originalSelector.includes('evaluation_quiz_question_answer')) {
      enhanced.push(
        '[class*="quiz"][class*="answer"] li',
        '.answer-container li',
        '[class*="option"] li',
        'input[type="radio"] + span',
        'label[for*="answer"]'
      );
    }

    // Generic fallbacks
    const parts = originalSelector.split(' ');
    if (parts.length > 1) {
      // Try each part individually
      parts.forEach(part => {
        if (part.startsWith('.')) {
          enhanced.push(`[class*="${part.slice(1)}"]`);
        }
      });
    }

    // Try similar class names
    if (originalSelector.startsWith('.')) {
      const className = originalSelector.slice(1);
      enhanced.push(
        `[class^="${className}"]`,
        `[class$="${className}"]`,
        `[class*="${className.split('_')[0]}"]`
      );
    }

    return enhanced;
  }

  /**
   * Wait for dynamic content to load
   */
  async waitForDynamicContent(selector, timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const observer = new MutationObserver((mutations) => {
        // Check if target element now exists
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(true);
          return;
        }
        
        // Timeout check
        if (Date.now() - startTime > timeout) {
          observer.disconnect();
          resolve(false);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Also check immediately
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(true);
      }
    });
  }

  /**
   * Retry network operations with exponential backoff
   */
  async retryNetworkOperation(errorEntry) {
    const { url, options, operation } = errorEntry.context;
    
    if (!url) return false;

    try {
      // Try with different fetch options
      const enhancedOptions = {
        ...options,
        headers: {
          ...options?.headers,
          'Cache-Control': 'no-cache'
        }
      };

      const response = await fetch(url, enhancedOptions);
      
      if (response.ok) {
        errorEntry.context.recoveredResponse = response;
        return true;
      }
    } catch (networkError) {
      console.log(`Network retry failed: ${networkError.message}`);
    }

    return false;
  }

  /**
   * Retry storage operations with fallbacks
   */
  async retryStorageOperation(errorEntry) {
    const { operation, key, data } = errorEntry.context;
    
    try {
      // Try different storage methods
      if (operation === 'get') {
        // Try localStorage as fallback
        const fallbackData = localStorage.getItem(key);
        if (fallbackData) {
          errorEntry.context.recoveredData = JSON.parse(fallbackData);
          return true;
        }
      }
      
      if (operation === 'set') {
        // Try localStorage as fallback
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      }
    } catch (storageError) {
      console.log(`Storage retry failed: ${storageError.message}`);
    }

    return false;
  }

  /**
   * Fallback question matching strategies
   */
  async fallbackQuestionMatching(errorEntry) {
    const { questionText, storedQuestions } = errorEntry.context;
    
    if (!questionText || !storedQuestions) return false;

    try {
      // Try simplified text matching
      const simplifiedQuestion = this.simplifyText(questionText);
      
      for (const stored of storedQuestions) {
        const simplifiedStored = this.simplifyText(stored.questionText);
        
        if (this.calculateSimpleMatch(simplifiedQuestion, simplifiedStored) > 0.7) {
          errorEntry.context.recoveredMatch = stored;
          return true;
        }
      }

      // Try keyword-based matching
      const keywords = this.extractKeywords(questionText);
      
      for (const stored of storedQuestions) {
        const storedKeywords = this.extractKeywords(stored.questionText);
        const commonKeywords = keywords.filter(k => storedKeywords.includes(k));
        
        if (commonKeywords.length >= Math.min(2, keywords.length * 0.5)) {
          errorEntry.context.recoveredMatch = stored;
          return true;
        }
      }
    } catch (matchError) {
      console.log(`Fallback matching failed: ${matchError.message}`);
    }

    return false;
  }

  /**
   * Adapt to ALX layout changes
   */
  async adaptToLayoutChanges(errorEntry) {
    try {
      // Scan page for new patterns
      const newSelectors = this.scanForNewQuestionPatterns();
      
      if (newSelectors.length > 0) {
        errorEntry.context.discoveredSelectors = newSelectors;
        
        // Update extension configuration
        if (typeof chrome !== 'undefined' && chrome.storage) {
          await chrome.storage.local.set({
            'adaptive_selectors': newSelectors,
            'last_adaptation': Date.now()
          });
        }
        
        return true;
      }
    } catch (adaptError) {
      console.log(`Layout adaptation failed: ${adaptError.message}`);
    }

    return false;
  }

  /**
   * Scan page for new question patterns
   */
  scanForNewQuestionPatterns() {
    const patterns = [];
    
    // Look for elements with question-like content
    const possibleQuestions = document.querySelectorAll('h1, h2, h3, h4, h5, h6, .question, [class*="question"], [data-question]');
    
    possibleQuestions.forEach(el => {
      const text = el.textContent.trim();
      
      // Check if it looks like a question
      if (this.looksLikeQuestion(text)) {
        const selector = this.generateSelector(el);
        if (selector && !patterns.includes(selector)) {
          patterns.push(selector);
        }
      }
    });

    return patterns;
  }

  /**
   * Check if text looks like a question
   */
  looksLikeQuestion(text) {
    const questionWords = ['what', 'which', 'how', 'when', 'where', 'who', 'why', 'solve', 'calculate', 'determine'];
    const lowerText = text.toLowerCase();
    
    return questionWords.some(word => lowerText.includes(word)) ||
           text.includes('?') ||
           text.match(/^\d+\./) ||
           (text.length > 10 && text.length < 500);
  }

  /**
   * Generate CSS selector for element
   */
  generateSelector(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      if (current.className) {
        const classes = current.className.trim().split(/\s+/);
        if (classes.length > 0) {
          selector += `.${classes[0]}`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
      
      // Limit path length
      if (path.length > 5) break;
    }
    
    return path.join(' > ');
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform health check
   */
  performHealthCheck() {
    const now = Date.now();
    const uptime = now - this.performanceMetrics.startTime;
    
    // Check error rate
    const errorRate = this.performanceMetrics.errors / Math.max(this.performanceMetrics.operations, 1);
    
    // Check memory usage
    if (performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
      
      if (memoryUsage > 0.8) {
        console.warn('High memory usage detected:', memoryUsage);
        this.cleanupMemory();
      }
    }
    
    // Log health status
    console.log('Health Check:', {
      uptime: Math.round(uptime / 1000),
      errors: this.performanceMetrics.errors,
      recoveries: this.performanceMetrics.recoveries,
      errorRate: Math.round(errorRate * 100) + '%'
    });
  }

  /**
   * Cleanup memory
   */
  cleanupMemory() {
    // Remove old error logs
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-50);
    }
    
    // Clear any large cached objects
    if (window.questionMatchingCache) {
      window.questionMatchingCache.clear();
    }
  }

  /**
   * Show user-friendly error message
   */
  showUserErrorMessage(errorEntry) {
    const message = this.getLocalizedErrorMessage(errorEntry.type);
    
    if (window.VisualFeedbackSystem) {
      const feedback = new VisualFeedbackSystem();
      feedback.showNotification('Something went wrong', message, 'error', 8000);
    } else {
      console.error('User Error:', message);
    }
  }

  /**
   * Get localized error message
   */
  getLocalizedErrorMessage(errorType) {
    const messages = {
      'DOM_ELEMENT_NOT_FOUND': 'Unable to find quiz elements. The page layout may have changed.',
      'NETWORK_ERROR': 'Network connection issue. Please check your internet connection.',
      'STORAGE_ERROR': 'Unable to save data. Please try refreshing the page.',
      'QUESTION_MATCH_ERROR': 'Unable to match this question. It may not be in the captured data.',
      'LAYOUT_CHANGE_ERROR': 'The page layout has changed. Please refresh and try again.',
      'GLOBAL_ERROR': 'An unexpected error occurred. Please refresh the page.',
      'UNHANDLED_PROMISE': 'A background operation failed. The extension may not work correctly.'
    };
    
    return messages[errorType] || 'An unknown error occurred. Please try refreshing the page.';
  }

  /**
   * Helper methods
   */
  generateErrorId() {
    return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  serializeError(error) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    return { message: String(error) };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  simplifyText(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractKeywords(text) {
    const words = this.simplifyText(text).split(' ');
    return words.filter(word => word.length > 3);
  }

  calculateSimpleMatch(text1, text2) {
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    
    let matches = 0;
    for (const word1 of words1) {
      if (words2.includes(word1)) {
        matches++;
      }
    }
    
    return matches / Math.max(words1.length, words2.length);
  }

  reportToAnalytics(errorEntry) {
    // Implement analytics reporting if needed
    // This could send anonymous error reports to help improve the extension
  }

  /**
   * Public API methods
   */
  getErrorStats() {
    return {
      totalErrors: this.performanceMetrics.errors,
      totalRecoveries: this.performanceMetrics.recoveries,
      uptime: Date.now() - this.performanceMetrics.startTime,
      recentErrors: this.errorLog.slice(-10)
    };
  }

  clearErrorLog() {
    this.errorLog = [];
    this.performanceMetrics.errors = 0;
    this.performanceMetrics.recoveries = 0;
  }

  enableDebugMode() {
    this.debugMode = true;
    console.log('Error handling debug mode enabled');
  }

  disableDebugMode() {
    this.debugMode = false;
  }
}

// Global error handling wrapper
function withErrorHandling(fn, context = {}) {
  return async function(...args) {
    try {
      const result = await fn.apply(this, args);
      if (window.errorHandler) {
        window.errorHandler.performanceMetrics.operations++;
      }
      return result;
    } catch (error) {
      if (window.errorHandler) {
        await window.errorHandler.handleError('OPERATION_ERROR', error, {
          ...context,
          function: fn.name,
          arguments: args
        });
      } else {
        console.error('Error in wrapped function:', error);
      }
      throw error;
    }
  };
}

// Initialize global error handler
window.errorHandler = new ErrorHandlingSystem();

// Export for use in other scripts
window.ErrorHandlingSystem = ErrorHandlingSystem;
window.withErrorHandling = withErrorHandling;
