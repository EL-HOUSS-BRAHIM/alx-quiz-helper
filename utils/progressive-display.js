/**
 * Progressive Answer Display System
 * Provides immediate feedback and progressive loading of answer results
 * with enhanced user experience and confidence indicators
 */

class ProgressiveAnswerDisplay {
  constructor() {
    this.currentDisplay = null;
    this.displayQueue = [];
    this.isProcessing = false;
    this.config = {
      quickMatchTimeout: 1000,
      deepAnalysisTimeout: 5000,
      animationDuration: 300,
      autoHideDelay: 30000
    };
    
    this.displayStates = {
      INITIALIZING: 'initializing',
      QUICK_SEARCH: 'quick_search',
      DEEP_ANALYSIS: 'deep_analysis',
      COMPLETE: 'complete',
      ERROR: 'error'
    };
    
    this.setupStyles();
  }

  /**
   * Display answer with progressive loading
   */
  async displayAnswer(question, storedQuestions, options = {}) {
    try {
      this.clearCurrentDisplay();
      
      const displayOptions = {
        showProgress: true,
        enableQuickMatch: true,
        enableDeepAnalysis: true,
        position: 'top-right',
        autoHideDuration: this.config.autoHideDelay, // Default to config value
        ...options
      };
      
      // Update config if autoHideDuration is provided
      if (options.autoHideDuration) {
        this.config.autoHideDelay = options.autoHideDuration;
      }

      // Show initial processing state
      this.showProcessingState(this.displayStates.INITIALIZING, "Analyzing question...");

      // Quick match attempt
      if (displayOptions.enableQuickMatch) {
        const quickResult = await this.attemptQuickMatch(question, storedQuestions);
        if (quickResult) {
          this.showAnswerResult(quickResult, 'quick');
          return quickResult;
        }
      }

      // Deep analysis
      if (displayOptions.enableDeepAnalysis) {
        this.updateProcessingState(this.displayStates.DEEP_ANALYSIS, "Performing deep analysis...");
        
        const deepResult = await this.performDeepAnalysis(question, storedQuestions);
        if (deepResult) {
          this.showAnswerResult(deepResult, 'analyzed');
          return deepResult;
        }
      }

      // No match found - only show if we actually tried to search
      // Don't show if this is being called after a match was already found
      if (displayOptions.enableQuickMatch || displayOptions.enableDeepAnalysis) {
        this.showNoMatchState();
      }
      return null;

    } catch (error) {
      console.error('Progressive display error:', error);
      this.showErrorState(error.message);
      return null;
    }
  }

  /**
   * Attempt quick match using cached and indexed data
   */
  async attemptQuickMatch(question, storedQuestions) {
    this.updateProcessingState(this.displayStates.QUICK_SEARCH, "Searching for quick match...");
    
    try {
      // Validate question data
      if (!question.questionText || typeof question.questionText !== 'string') {
        console.warn('Invalid question data in attemptQuickMatch');
        return null;
      }
      
      // Validate storedQuestions is an array
      if (!Array.isArray(storedQuestions) || storedQuestions.length === 0) {
        console.error('storedQuestions must be a non-empty array, got:', typeof storedQuestions);
        return null;
      }
      
      // Use simple but fast matching
      const questionHash = this.generateQuickHash(question.questionText);
      
      // Check for exact matches first
      const exactMatch = storedQuestions.find(q => 
        q.questionText && this.generateQuickHash(q.questionText) === questionHash
      );
      
      if (exactMatch) {
        return {
          match: exactMatch,
          confidence: 1.0,
          strategy: 'exact_match',
          processingTime: Date.now(),
          isQuick: true
        };
      }

      // Quick keyword-based search
      const keywords = this.extractQuickKeywords(question.questionText);
      if (keywords.length > 0) {
        const keywordMatches = storedQuestions.filter(q => {
          const qKeywords = this.extractQuickKeywords(q.questionText);
          return keywords.some(kw => qKeywords.includes(kw));
        });

        if (keywordMatches.length > 0) {
          const bestMatch = keywordMatches[0]; // Take first match for speed
          return {
            match: bestMatch,
            confidence: 0.8,
            strategy: 'quick_keyword',
            processingTime: Date.now(),
            isQuick: true
          };
        }
      }

      return null;
    } catch (error) {
      console.warn('Quick match failed:', error);
      return null;
    }
  }

  /**
   * Perform deep analysis using advanced matcher
   */
  async performDeepAnalysis(question, storedQuestions) {
    try {
      // Validate storedQuestions is an array
      if (!Array.isArray(storedQuestions) || storedQuestions.length === 0) {
        console.error('storedQuestions must be a non-empty array in performDeepAnalysis, got:', typeof storedQuestions);
        return null;
      }
      
      const matcher = window.AdvancedQuestionMatcher ? 
        new window.AdvancedQuestionMatcher() : null;
      
      if (!matcher) {
        // Fallback to basic matching
        return this.basicDeepMatch(question, storedQuestions);
      }

      const result = await matcher.findBestMatch(question, storedQuestions, {
        maxStrategies: 3,
        minConfidence: 0.4
      });

      return result;
    } catch (error) {
      console.warn('Deep analysis failed:', error);
      return this.basicDeepMatch(question, storedQuestions);
    }
  }

  /**
   * Basic deep matching as fallback
   */
  async basicDeepMatch(question, storedQuestions) {
    // Validate question data
    if (!question.questionText || typeof question.questionText !== 'string') {
      console.warn('Invalid question data in basicDeepMatch');
      return null;
    }
    
    const currentText = question.questionText.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const stored of storedQuestions) {
      // Skip if stored question has no valid text
      if (!stored.questionText || typeof stored.questionText !== 'string') {
        continue;
      }
      
      const storedText = stored.questionText.toLowerCase();
      const similarity = this.calculateBasicSimilarity(currentText, storedText);
      
      if (similarity > bestScore && similarity > 0.4) {
        bestScore = similarity;
        bestMatch = stored;
      }
    }

    return bestMatch ? {
      match: bestMatch,
      confidence: bestScore,
      strategy: 'basic_similarity',
      processingTime: Date.now(),
      isQuick: false
    } : null;
  }

  /**
   * Show processing state with animated indicators
   */
  showProcessingState(state, message) {
    const display = this.createDisplayContainer();
    
    display.innerHTML = `
      <div class="processing-header">
        <div class="processing-spinner"></div>
        <span class="processing-text">${message}</span>
      </div>
      <div class="processing-progress">
        <div class="progress-bar ${state}"></div>
      </div>
    `;

    this.attachToDOM(display);
    this.currentDisplay = display;
  }

  /**
   * Update existing processing state
   */
  updateProcessingState(state, message) {
    if (!this.currentDisplay) return;

    const textElement = this.currentDisplay.querySelector('.processing-text');
    const progressBar = this.currentDisplay.querySelector('.progress-bar');
    
    if (textElement) textElement.textContent = message;
    if (progressBar) {
      progressBar.className = `progress-bar ${state}`;
    }
  }

  /**
   * Show answer result with confidence and actions
   */
  showAnswerResult(result, type) {
    const display = this.createDisplayContainer();
    const confidence = Math.round(result.confidence * 100);
    const confidenceClass = this.getConfidenceClass(result.confidence);
    
    display.innerHTML = `
      <div class="answer-header">
        <div class="answer-type-badge ${type}">${type === 'quick' ? 'Quick Match' : 'Analyzed Match'}</div>
        <div class="confidence-indicator ${confidenceClass}">
          <span class="confidence-value">${confidence}%</span>
          <span class="confidence-label">Confidence</span>
        </div>
        <button class="close-btn" onclick="this.closest('.progressive-answer-display').remove()">×</button>
      </div>
      
      <div class="answer-content">
        ${this.formatAnswerContent(result)}
      </div>
      
      <div class="answer-actions">
        <button class="action-btn primary" onclick="this.selectAnswer(${JSON.stringify(result).replace(/"/g, '&quot;')})">
          Select Answer
        </button>
        <button class="action-btn secondary" onclick="this.reportIncorrect(${JSON.stringify(result).replace(/"/g, '&quot;')})">
          Report Incorrect
        </button>
        <button class="action-btn info" onclick="this.showDetails(${JSON.stringify(result).replace(/"/g, '&quot;')})">
          View Details
        </button>
      </div>
      
      <div class="answer-metadata">
        <div class="metadata-item">
          <span class="metadata-label">Strategy:</span>
          <span class="metadata-value">${result.strategy}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Course:</span>
          <span class="metadata-value">${result.match.courseName || 'Unknown'}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Test:</span>
          <span class="metadata-value">${result.match.testName || 'Unknown'}</span>
        </div>
      </div>
    `;

    this.replaceCurrentDisplay(display);
    this.scheduleAutoHide(display);
  }

  /**
   * Format answer content based on type
   */
  formatAnswerContent(result) {
    const correctAnswers = this.getCorrectAnswers(result.match);
    
    let content = '<div class="correct-answers">';
    
    correctAnswers.forEach((answer, index) => {
      content += `
        <div class="correct-answer-item">
          <div class="answer-indicator">✅ Answer ${answer.letter || String.fromCharCode(65 + index)}</div>
          <div class="answer-text">${answer.text || 'Answer option'}</div>
          ${answer.imageUrl ? `
            <div class="answer-image">
              <img src="${answer.imageUrl}" alt="Answer ${index + 1}" loading="lazy">
            </div>
          ` : ''}
        </div>
      `;
    });
    
    content += '</div>';
    
    if (result.match.questionText) {
      content += `
        <div class="question-preview">
          <div class="preview-label">Matched Question:</div>
          <div class="preview-text">${result.match.questionText.substring(0, 200)}...</div>
        </div>
      `;
    }
    
    return content;
  }

  /**
   * Get correct answers from match data
   */
  getCorrectAnswers(match) {
    const answers = [];
    
    if (match.correctAnswerIndices && match.correctAnswerIndices.length > 0) {
      match.correctAnswerIndices.forEach((index, i) => {
        answers.push({
          index: index,
          letter: String.fromCharCode(65 + index),
          text: match.correctAnswerTexts?.[i] || match.answerTexts?.[index] || '',
          imageUrl: match.correctAnswerImages?.find(img => img.answerIndex === index)?.imageData?.dataURL
        });
      });
    }
    
    return answers.length > 0 ? answers : [{
      index: 0,
      letter: 'A',
      text: 'Correct answer found',
      imageUrl: null
    }];
  }

  /**
   * Show no match found state
   */
  showNoMatchState() {
    const display = this.createDisplayContainer();
    
    display.innerHTML = `
      <div class="no-match-header">
        <div class="no-match-icon">🔍</div>
        <div class="no-match-title">No Match Found</div>
      </div>
      
      <div class="no-match-content">
        <p>Unable to find a matching question in the database.</p>
        <p>This might be a new question or the question text has changed significantly.</p>
      </div>
      
      <div class="no-match-actions">
        <button class="action-btn primary" onclick="this.suggestCapture()">
          Suggest Data Capture
        </button>
        <button class="action-btn secondary" onclick="this.closest('.progressive-answer-display').remove()">
          Close
        </button>
      </div>
    `;

    this.replaceCurrentDisplay(display);
    this.scheduleAutoHide(display);
  }

  /**
   * Show error state
   */
  showErrorState(errorMessage) {
    const display = this.createDisplayContainer();
    
    display.innerHTML = `
      <div class="error-header">
        <div class="error-icon">⚠️</div>
        <div class="error-title">Processing Error</div>
      </div>
      
      <div class="error-content">
        <p>An error occurred while processing the question:</p>
        <p class="error-message">${errorMessage}</p>
      </div>
      
      <div class="error-actions">
        <button class="action-btn primary" onclick="this.retryProcessing()">
          Retry
        </button>
        <button class="action-btn secondary" onclick="this.closest('.progressive-answer-display').remove()">
          Close
        </button>
      </div>
    `;

    this.replaceCurrentDisplay(display);
  }

  /**
   * Create base display container
   */
  createDisplayContainer() {
    const container = document.createElement('div');
    container.className = 'progressive-answer-display';
    container.id = 'progressive-answer-display';
    
    return container;
  }

  /**
   * Attach display to DOM
   */
  attachToDOM(display) {
    document.body.appendChild(display);
    
    // Trigger animation
    requestAnimationFrame(() => {
      display.classList.add('show');
    });
  }

  /**
   * Replace current display
   */
  replaceCurrentDisplay(newDisplay) {
    if (this.currentDisplay) {
      this.currentDisplay.classList.add('fade-out');
      setTimeout(() => {
        if (this.currentDisplay && this.currentDisplay.parentNode) {
          this.currentDisplay.remove();
        }
        this.attachToDOM(newDisplay);
        this.currentDisplay = newDisplay;
      }, this.config.animationDuration);
    } else {
      this.attachToDOM(newDisplay);
      this.currentDisplay = newDisplay;
    }
  }

  /**
   * Clear current display
   */
  clearCurrentDisplay() {
    if (this.currentDisplay) {
      this.currentDisplay.classList.add('fade-out');
      setTimeout(() => {
        if (this.currentDisplay && this.currentDisplay.parentNode) {
          this.currentDisplay.remove();
        }
        this.currentDisplay = null;
      }, this.config.animationDuration);
    }
  }

  /**
   * Schedule auto-hide for display
   */
  scheduleAutoHide(display) {
    setTimeout(() => {
      if (display && display.parentNode && !display.classList.contains('pinned')) {
        display.classList.add('fade-out');
        setTimeout(() => {
          if (display.parentNode) {
            display.remove();
          }
        }, this.config.animationDuration);
      }
    }, this.config.autoHideDelay);
  }

  /**
   * Utility methods
   */
  generateQuickHash(text) {
    if (!text || typeof text !== 'string') {
      return 'invalid_question';
    }
    const normalized = text.toLowerCase().replace(/[^\w]/g, '');
    return normalized.substring(0, 50);
  }

  extractQuickKeywords(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4)
      .slice(0, 5);
  }

  calculateBasicSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  getConfidenceClass(confidence) {
    if (confidence >= 0.8) return 'high-confidence';
    if (confidence >= 0.6) return 'medium-confidence';
    return 'low-confidence';
  }

  /**
   * Setup CSS styles for the display
   */
  setupStyles() {
    if (document.getElementById('progressive-answer-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'progressive-answer-styles';
    styles.textContent = `
      .progressive-answer-display {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        max-height: 80vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.4);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        z-index: 10000;
        overflow-y: auto;
        backdrop-filter: blur(15px);
        border: 1px solid rgba(255,255,255,0.2);
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .progressive-answer-display.show {
        opacity: 1;
        transform: translateX(0);
      }

      .progressive-answer-display.fade-out {
        opacity: 0;
        transform: translateX(100px);
      }

      .processing-header {
        display: flex;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .processing-spinner {
        width: 24px;
        height: 24px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 12px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .processing-text {
        font-size: 16px;
        font-weight: 500;
      }

      .processing-progress {
        padding: 0 20px 20px;
      }

      .progress-bar {
        height: 4px;
        background: rgba(255,255,255,0.3);
        border-radius: 2px;
        overflow: hidden;
        position: relative;
      }

      .progress-bar::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #45a049);
        border-radius: 2px;
        animation: progress 2s ease-in-out infinite;
      }

      .progress-bar.initializing::after { width: 20%; }
      .progress-bar.quick_search::after { width: 40%; }
      .progress-bar.deep_analysis::after { width: 70%; }
      .progress-bar.complete::after { width: 100%; }

      @keyframes progress {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      .answer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .answer-type-badge {
        background: rgba(255,255,255,0.2);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
      }

      .answer-type-badge.quick {
        background: linear-gradient(135deg, #4CAF50, #45a049);
      }

      .answer-type-badge.analyzed {
        background: linear-gradient(135deg, #2196F3, #1976D2);
      }

      .confidence-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .confidence-value {
        font-size: 18px;
        font-weight: bold;
      }

      .confidence-label {
        font-size: 10px;
        opacity: 0.8;
      }

      .high-confidence { color: #4CAF50; }
      .medium-confidence { color: #FF9800; }
      .low-confidence { color: #F44336; }

      .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .close-btn:hover {
        background: rgba(255,255,255,0.1);
      }

      .answer-content {
        padding: 20px;
      }

      .correct-answer-item {
        background: rgba(255,255,255,0.1);
        margin: 8px 0;
        padding: 12px;
        border-radius: 10px;
        border-left: 4px solid #4CAF50;
      }

      .answer-indicator {
        font-weight: 600;
        margin-bottom: 8px;
        color: #4CAF50;
      }

      .answer-text {
        font-size: 14px;
        line-height: 1.4;
        margin-bottom: 8px;
      }

      .answer-image img {
        max-width: 100%;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }

      .question-preview {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }

      .preview-label {
        font-size: 12px;
        opacity: 0.8;
        margin-bottom: 4px;
      }

      .preview-text {
        font-size: 13px;
        font-style: italic;
        opacity: 0.9;
      }

      .answer-actions {
        display: flex;
        gap: 8px;
        padding: 0 20px 20px;
        flex-wrap: wrap;
      }

      .action-btn {
        flex: 1;
        min-width: 100px;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .action-btn.primary {
        background: #4CAF50;
        color: white;
      }

      .action-btn.secondary {
        background: rgba(255,255,255,0.2);
        color: white;
      }

      .action-btn.info {
        background: #2196F3;
        color: white;
      }

      .action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      }

      .answer-metadata {
        padding: 0 20px 20px;
        border-top: 1px solid rgba(255,255,255,0.1);
        margin-top: 16px;
      }

      .metadata-item {
        display: flex;
        justify-content: space-between;
        margin: 4px 0;
        font-size: 12px;
      }

      .metadata-label {
        opacity: 0.8;
      }

      .metadata-value {
        font-weight: 500;
      }

      .no-match-header,
      .error-header {
        text-align: center;
        padding: 20px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .no-match-icon,
      .error-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }

      .no-match-title,
      .error-title {
        font-size: 18px;
        font-weight: 600;
      }

      .no-match-content,
      .error-content {
        padding: 20px;
        text-align: center;
        line-height: 1.5;
      }

      .error-message {
        font-family: monospace;
        background: rgba(0,0,0,0.2);
        padding: 8px;
        border-radius: 4px;
        margin-top: 8px;
      }

      .no-match-actions,
      .error-actions {
        display: flex;
        gap: 12px;
        padding: 0 20px 20px;
      }
    `;

    document.head.appendChild(styles);
  }
}

// Make available globally
window.ProgressiveAnswerDisplay = ProgressiveAnswerDisplay;