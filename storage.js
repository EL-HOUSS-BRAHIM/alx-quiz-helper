/**
 * Storage Helper Module
 * Handles data storage with TTL (Time To Live) functionality
 * Data expires after 3 hours to ensure fresh quiz corrections
 */

// Prevent duplicate declarations if script is loaded multiple times
if (typeof window.STORAGE_CONFIG === 'undefined') {
  // Storage configuration
  const STORAGE_CONFIG = {
    TTL_HOURS: 3,
    QUIZ_DATA_KEY: 'quiz_corrections_data',
    TIMESTAMP_KEY: 'quiz_corrections_timestamp',
    TESTS_DATA_KEY: 'quiz_tests_data', // New key for test-organized data
    TESTS_TIMESTAMP_KEY: 'quiz_tests_timestamp'
  };
  
  // Make it globally accessible to prevent re-declaration
  window.STORAGE_CONFIG = STORAGE_CONFIG;
} else {
  // Use existing config
  var STORAGE_CONFIG = window.STORAGE_CONFIG;
}

// Prevent duplicate class declarations
if (typeof window.QuizStorage === 'undefined') {
  /**
   * Storage utility class for managing quiz data with TTL
   */
  class QuizStorage {
  
  /**
   * Get the current timestamp in milliseconds
   */
  static getCurrentTimestamp() {
    return Date.now();
  }
  
  /**
   * Check if stored data has expired (older than 3 hours)
   */
  static isDataExpired(timestamp) {
    if (!timestamp) return true;
    
    const currentTime = this.getCurrentTimestamp();
    const threeHoursInMs = STORAGE_CONFIG.TTL_HOURS * 60 * 60 * 1000;
    
    return (currentTime - timestamp) > threeHoursInMs;
  }
  
  /**
   * Save quiz correction data with timestamp
   * Also organizes data by test name for the new interface
   */
  static async saveQuizData(data) {
    try {
      const timestamp = this.getCurrentTimestamp();
      
      // Save original format for backward compatibility
      await chrome.storage.local.set({
        [STORAGE_CONFIG.QUIZ_DATA_KEY]: data,
        [STORAGE_CONFIG.TIMESTAMP_KEY]: timestamp
      });
      
      // Organize data by test name for new interface
      await this.saveTestOrganizedData(data, timestamp);
      
      console.log('Quiz data saved successfully:', data.length, 'questions');
      return true;
    } catch (error) {
      console.error('Error saving quiz data:', error);
      return false;
    }
  }
  
  /**
   * Save data organized by test names
   */
  static async saveTestOrganizedData(data, timestamp) {
    try {
      // Load existing test data
      const existingTestData = await this.loadTestOrganizedData() || {};
      
      // Group new data by test name
      const groupedData = {};
      data.forEach(question => {
        const testKey = this.createTestKey(question.testName, question.courseName);
        
        if (!groupedData[testKey]) {
          groupedData[testKey] = {
            testName: question.testName || 'Unknown Test',
            courseName: question.courseName || 'Unknown Course',
            questions: [],
            timestamp: timestamp,
            lastUpdated: new Date().toISOString()
          };
        }
        
        groupedData[testKey].questions.push(question);
      });
      
      // Merge with existing data (update tests that already exist)
      Object.keys(groupedData).forEach(testKey => {
        existingTestData[testKey] = groupedData[testKey];
      });
      
      // Save updated test data
      await chrome.storage.local.set({
        [STORAGE_CONFIG.TESTS_DATA_KEY]: existingTestData,
        [STORAGE_CONFIG.TESTS_TIMESTAMP_KEY]: timestamp
      });
      
      console.log('Test-organized data saved successfully:', Object.keys(existingTestData).length, 'tests');
      return true;
    } catch (error) {
      console.error('Error saving test-organized data:', error);
      return false;
    }
  }
  
  /**
   * Create a unique key for test identification
   */
  static createTestKey(testName, courseName) {
    const cleanTestName = (testName || 'Unknown Test').replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const cleanCourseName = (courseName || 'Unknown Course').replace(/[^a-zA-Z0-9\s]/g, '').trim();
    return `${cleanCourseName} - ${cleanTestName}`.toLowerCase().replace(/\s+/g, '_');
  }
  
  /**
   * Load test-organized data
   */
  static async loadTestOrganizedData() {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_CONFIG.TESTS_DATA_KEY,
        STORAGE_CONFIG.TESTS_TIMESTAMP_KEY
      ]);
      
      const data = result[STORAGE_CONFIG.TESTS_DATA_KEY];
      const timestamp = result[STORAGE_CONFIG.TESTS_TIMESTAMP_KEY];
      
      // Check if data exists and is not expired
      if (!data || this.isDataExpired(timestamp)) {
        console.log('Test-organized data not found or expired');
        return null;
      }
      
      console.log('Test-organized data loaded successfully:', Object.keys(data).length, 'tests');
      return data;
    } catch (error) {
      console.error('Error loading test-organized data:', error);
      return null;
    }
  }
  
  /**
   * Get list of all available tests
   */
  static async getAvailableTests() {
    try {
      const testData = await this.loadTestOrganizedData();
      if (!testData) return [];
      
      return Object.keys(testData).map(testKey => ({
        key: testKey,
        testName: testData[testKey].testName,
        courseName: testData[testKey].courseName,
        questionCount: testData[testKey].questions.length,
        lastUpdated: testData[testKey].lastUpdated,
        timestamp: testData[testKey].timestamp
      }));
    } catch (error) {
      console.error('Error getting available tests:', error);
      return [];
    }
  }
  
  /**
   * Get questions for a specific test
   */
  static async getTestQuestions(testKey) {
    try {
      const testData = await this.loadTestOrganizedData();
      if (!testData || !testData[testKey]) {
        console.log('Test not found:', testKey);
        return null;
      }
      
      return testData[testKey];
    } catch (error) {
      console.error('Error getting test questions:', error);
      return null;
    }
  }
  
  /**
   * Load quiz correction data if not expired
   */
  static async loadQuizData() {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_CONFIG.QUIZ_DATA_KEY,
        STORAGE_CONFIG.TIMESTAMP_KEY
      ]);
      
      const data = result[STORAGE_CONFIG.QUIZ_DATA_KEY];
      const timestamp = result[STORAGE_CONFIG.TIMESTAMP_KEY];
      
      // Check if data exists and is not expired
      if (!data || this.isDataExpired(timestamp)) {
        console.log('Quiz data not found or expired');
        await this.clearQuizData(); // Clean up expired data
        return null;
      }
      
      console.log('Quiz data loaded successfully:', data.length, 'questions');
      return data;
    } catch (error) {
      console.error('Error loading quiz data:', error);
      return null;
    }
  }
  
  /**
   * Clear stored quiz data
   */
  static async clearQuizData() {
    try {
      await chrome.storage.local.remove([
        STORAGE_CONFIG.QUIZ_DATA_KEY,
        STORAGE_CONFIG.TIMESTAMP_KEY,
        STORAGE_CONFIG.TESTS_DATA_KEY,
        STORAGE_CONFIG.TESTS_TIMESTAMP_KEY
      ]);
      
      console.log('All quiz data cleared');
      return true;
    } catch (error) {
      console.error('Error clearing quiz data:', error);
      return false;
    }
  }
  
  /**
   * Get storage statistics
   */
  static async getStorageInfo() {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_CONFIG.QUIZ_DATA_KEY,
        STORAGE_CONFIG.TIMESTAMP_KEY
      ]);
      
      const data = result[STORAGE_CONFIG.QUIZ_DATA_KEY];
      const timestamp = result[STORAGE_CONFIG.TIMESTAMP_KEY];
      
      return {
        hasData: !!data,
        questionCount: data ? data.length : 0,
        timestamp: timestamp,
        isExpired: this.isDataExpired(timestamp),
        ageInHours: timestamp ? (this.getCurrentTimestamp() - timestamp) / (1000 * 60 * 60) : 0
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }
  
  /**
   * Create a normalized hash for question matching
   * Handles text, HTML, and images for reliable comparison
   */
  static createQuestionHash(questionElement) {
    try {
      // Get the complete HTML content of the question
      const questionHTML = questionElement.innerHTML;
      
      // Create a normalized version for hashing
      let normalized = questionHTML
        .toLowerCase()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/<!--.*?-->/g, '') // Remove comments
        .replace(/\s*(style|class)="[^"]*"/g, '') // Remove styling attributes
        .trim();
      
      // Simple hash function (djb2 algorithm)
      let hash = 5381;
      for (let i = 0; i < normalized.length; i++) {
        hash = ((hash << 5) + hash) + normalized.charCodeAt(i);
      }
      
      return Math.abs(hash).toString(36);
    } catch (error) {
      console.error('Error creating question hash:', error);
      return Math.random().toString(36).substr(2, 9); // Fallback random hash
    }
  }
  
  /**
   * Find matching question in stored data
   */
  static findMatchingQuestion(currentQuestionElement, storedData) {
    if (!storedData || !currentQuestionElement) return null;
    
    const currentHash = this.createQuestionHash(currentQuestionElement);
    const currentText = currentQuestionElement.textContent.toLowerCase().trim();
    
    // Extract current question answers for content-based matching
    const currentAnswers = this.extractCurrentAnswers(currentQuestionElement);
    const currentContentHash = this.createContentBasedHash(currentText, currentAnswers);
    
    console.log('🔍 Matching question:', {
      currentText: currentText.substring(0, 100) + '...',
      currentAnswers: currentAnswers.length,
      currentContentHash: currentContentHash
    });
    
    // Try exact hash match first
    let bestMatch = storedData.find(item => item.questionHash === currentHash);
    if (bestMatch) {
      console.log('✅ Found exact hash match');
      return bestMatch;
    }
    
    // Try content-based hash match (handles randomized order)
    bestMatch = storedData.find(item => item.questionContentHash === currentContentHash);
    if (bestMatch) {
      console.log('✅ Found content-based hash match');
      return bestMatch;
    }
    
    // Try fuzzy text matching with current answers consideration
    if (currentText.length > 10) {
      let bestSimilarity = 0;
      for (const item of storedData) {
        const textSimilarity = this.calculateTextSimilarity(currentText, item.questionText.toLowerCase());
        const answerSimilarity = this.calculateAnswerSimilarity(currentAnswers, item.answerTexts || []);
        
        // Combined similarity score (70% text, 30% answers)
        const combinedSimilarity = (textSimilarity * 0.7) + (answerSimilarity * 0.3);
        
        if (combinedSimilarity > bestSimilarity && combinedSimilarity > 0.75) {
          bestSimilarity = combinedSimilarity;
          bestMatch = item;
        }
      }
      
      if (bestMatch) {
        console.log(`✅ Found fuzzy match with ${(bestSimilarity * 100).toFixed(1)}% similarity`);
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Extract current question answers from the live page
   */
  static extractCurrentAnswers(questionElement) {
    const answers = [];
    const answerSelectors = [
      'label',
      '.answer-option',
      '.quiz-answer',
      '[class*="answer"]',
      '.option',
      '.choice'
    ];
    
    for (const selector of answerSelectors) {
      const answerElements = questionElement.querySelectorAll(selector);
      if (answerElements.length > 0) {
        answerElements.forEach(el => {
          const text = el.textContent.trim();
          if (text && text.length > 1 && !text.toLowerCase().includes('question')) {
            answers.push(text);
          }
        });
        break;
      }
    }
    
    return answers;
  }
  
  /**
   * Create content-based hash for question matching regardless of order
   */
  static createContentBasedHash(questionText, answerTexts) {
    const normalizeText = (text) => {
      return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const normalizedQuestion = normalizeText(questionText);
    const normalizedAnswers = answerTexts.map(normalizeText).sort();
    
    const content = normalizedQuestion + '|' + normalizedAnswers.join('|');
    return this.simpleHash(content);
  }
  
  /**
   * Simple hash function
   */
  static simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Calculate similarity between two answer arrays
   */
  static calculateAnswerSimilarity(answers1, answers2) {
    if (answers1.length === 0 && answers2.length === 0) return 1.0;
    if (answers1.length === 0 || answers2.length === 0) return 0.0;
    
    const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const set1 = new Set(answers1.map(normalize));
    const set2 = new Set(answers2.map(normalize));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }
  
  /**
   * Calculate text similarity between two strings
   */
  static calculateTextSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  static levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

  // Make QuizStorage available globally
  window.QuizStorage = QuizStorage;
} else {
  // Use existing QuizStorage class
  var QuizStorage = window.QuizStorage;
}

// Export for use in content scripts (legacy support)