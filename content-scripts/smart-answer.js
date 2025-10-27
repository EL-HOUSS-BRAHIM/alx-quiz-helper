/**
 * Smart Answer Script - Fixed Version
 * Handles both image and text-based questions with proper course context
 * Runs on: https://savanna.alxafrica.com/evaluation_quizzes*
 */

(function() {
  'use strict';
  
  // Only run on quiz pages
  if (!window.location.href.includes('evaluation_quiz')) {
    return;
  }
  
  console.log('🚀 ALX Smart Quiz Answer Script: Starting...');
  
  // Enhanced configuration for smart answer detection
  const SMART_CONFIG = {
    MATCH_THRESHOLD: 0.08,  // Very flexible for same course/week
    MIN_QUESTION_LENGTH: 10,
    MAX_STORED_QUESTIONS: 1000,
    CHECK_INTERVAL: 2000,   // Check every 2 seconds (reduced from 1s to minimize spam)
    IMAGE_POPUP_TIME: 45000, // 45 seconds (long enough to read)
    DEBUG_MODE: true,
    ANSWER_OVERLAP_MIN: 0.3, // Require at least 30% overlap in answer texts when data available
    FLEX_MIN_COMBINED_SCORE: 0.32, // Minimum combined similarity/overlap needed for flexible matches
    FLEX_MIN_SIMILARITY: 0.28,     // Minimum raw similarity needed when answers overlap
    FLEX_MIN_SINGLE_OPTION_SIMILARITY: 0.6 // Higher requirement when we cannot compare answer options
  };

  /**
   * Smart Answer Assistant Class
   * Handles course context extraction and intelligent answer detection
   * Enhanced with optimized matching and progressive display
   */
  class SmartAnswerAssistant {
    
    constructor() {
      this.storedData = null;
      this.currentCourse = null;
      this.currentWeek = null;
      this.currentQuiz = null;
      this.currentQuestion = null;
      this.processedQuestions = new Set();
      this.isActive = false;
      this.navigationButtons = null;
      this.lastQuestionHash = null;
      this.lastPageMarker = null; // Track page changes to avoid unnecessary DOM queries
      
      // Enhanced components
      this.questionAnalyzer = null;
      this.advancedMatcher = null;
      this.progressiveDisplay = null;
      this.domCache = null;
      
      // Display settings (loaded from storage)
      this.settings = {
        showPopupAnswer: true,
        showPageHighlight: true,
        popupDuration: 45
      };
      
      this.performanceMetrics = {
        questionsProcessed: 0,
        matchesFound: 0,
        averageProcessingTime: 0,
        cacheHits: 0
      };
      
      this.initializeComponents();
      this.loadSettings();
    }
    
    /**
     * Initialize enhanced components
     */
    initializeComponents() {
      try {
        // Initialize DOM Cache Manager first
        if (window.DOMCacheManager) {
          this.domCache = new window.DOMCacheManager({
            maxCacheSize: 100,
            defaultTTL: 30000,
            autoInvalidate: true,
            debugMode: SMART_CONFIG.DEBUG_MODE
          });
          console.log('✅ DOM Cache Manager initialized');
        }
        
        // Initialize question analyzer with caching
        if (window.QuestionAnalyzer) {
          this.questionAnalyzer = new window.QuestionAnalyzer();
          console.log('✅ Question Analyzer initialized');
        }
        
        // Initialize advanced matcher
        if (window.AdvancedQuestionMatcher) {
          this.advancedMatcher = new window.AdvancedQuestionMatcher();
          console.log('✅ Advanced Matcher initialized');
        }
        
        // Initialize progressive display
        if (window.ProgressiveAnswerDisplay) {
          this.progressiveDisplay = new window.ProgressiveAnswerDisplay();
          console.log('✅ Progressive Display initialized');
        }
        
        console.log('🚀 Enhanced components initialized successfully');
      } catch (error) {
        console.warn('Some enhanced components failed to initialize:', error);
        // Fallback to basic functionality
      }
    }
    
    /**
     * Load display settings from storage
     */
    async loadSettings() {
      try {
        const result = await chrome.storage.local.get(['quizHelperSettings']);
        if (result.quizHelperSettings) {
          this.settings = { ...this.settings, ...result.quizHelperSettings };
          console.log('📋 Settings loaded:', this.settings);
        }
      } catch (error) {
        console.warn('Failed to load settings, using defaults:', error);
      }
    }
    
    /**
     * Update settings (called from message listener)
     */
    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
      console.log('⚙️ Settings updated:', this.settings);
    }
    
    /**
     * Initialize the assistant
     */
    async init() {
      console.log('🔧 Initializing Smart Answer Assistant...');
      
      const startTime = Date.now();
      
      // Extract course context
      this.extractCourseContext();
      
      // Load stored quiz data
      await this.loadStoredData();
      
      // Set up navigation tracking (better than DOM mutations)
      this.setupNavigationTracking();
      
      // Start monitoring
      this.startQuestionMonitoring();
      
      this.isActive = true;
      
      const initTime = Date.now() - startTime;
      console.log(`🚀 Smart Answer Assistant initialized in ${initTime}ms and ready!`);
    }
    
    /**
     * Extract course context from page elements
     */
    extractCourseContext() {
      // Course detection from dropdown
      const courseDropdown = document.querySelector('select[name="course"] option[selected], .curriculum-dropdown .selected, .course-selector .active');
      if (courseDropdown) {
        this.currentCourse = courseDropdown.textContent.trim();
        console.log(`📚 Course detected: ${this.currentCourse}`);
      } else {
        // Fallback: extract from page title or URL
        const titleMatch = document.title.match(/([A-Z]{3}\s*\d+)/);
        this.currentCourse = titleMatch ? titleMatch[1] : 'QNT 101: Introduction to College Algebra';
        console.log(`📚 Course fallback: ${this.currentCourse}`);
      }
      
      // Week detection from quiz header
      const weekElement = document.querySelector('.quiz-title, .quiz-header, h1, h2');
      if (weekElement) {
        const weekMatch = weekElement.textContent.match(/week\s*(\d+)/i);
        if (weekMatch) {
          this.currentWeek = weekMatch[1];
          console.log(`📅 Week detected: ${this.currentWeek}`);
        }
      }
      
      if (!this.currentWeek) {
        // Fallback: extract from URL
        const urlMatch = window.location.href.match(/week[_-]?(\d+)/i);
        this.currentWeek = urlMatch ? urlMatch[1] : '13';
        console.log(`📅 Week fallback: ${this.currentWeek}`);
      }
      
      // Quiz name detection
      const quizElement = document.querySelector('.quiz-title, .quiz-name, h1');
      this.currentQuiz = quizElement ? quizElement.textContent.trim() : `Week ${this.currentWeek} Quiz`;
      console.log(`📝 Quiz detected: ${this.currentQuiz}`);
    }
    
    /**
     * Load stored quiz data using the correct storage method
     */
    async loadStoredData() {
      try {
        console.log('🔍 Attempting to load data from storage...');
        
        // Use the same storage key as the capture system
        const data = await chrome.storage.local.get('quiz_corrections_data');
        console.log('🔍 Storage response:', data);
        
        this.storedData = data.quiz_corrections_data || [];
        
        console.log(`📥 Raw data loaded: ${this.storedData.length} questions`);
        
        // Let's also check other possible storage keys
        const altData = await chrome.storage.local.get(['quizData', 'quiz_data', 'corrections_data']);
        console.log('🔍 Alternative storage keys:', altData);
        
        // If still no data, check ALL storage
        if (this.storedData.length === 0) {
          console.log('🔍 No data found, checking ALL Chrome storage...');
          const allStorage = await chrome.storage.local.get();
          console.log('📦 All storage contents:', allStorage);
          
          // Look for any arrays that might contain quiz data
          for (const [key, value] of Object.entries(allStorage)) {
            if (Array.isArray(value) && value.length > 0) {
              console.log(`🔍 Found array in storage key "${key}" with ${value.length} items`);
              console.log(`📋 Sample item from ${key}:`, value[0]);
              
              // Check if this looks like question data
              if (value[0] && (value[0].questionText || value[0]['Question Text'] || value[0].question)) {
                console.log(`✅ This looks like question data! Using ${key}`);
                this.storedData = value;
                break;
              }
            }
          }
        }
        
        // Filter for current course if available
        if (this.currentCourse && this.storedData.length > 0) {
          const courseFiltered = this.storedData.filter(q => 
            !q.course || q.course.includes(this.currentCourse.split(':')[0]) ||
            this.currentCourse.includes('QNT') // Flexible matching for QNT courses
          );
          
          if (courseFiltered.length > 0) {
            this.storedData = courseFiltered;
            console.log(`🔍 Filtered to ${courseFiltered.length} questions for current course`);
          }
        }
        
        console.log(`✅ Loaded ${this.storedData.length} questions for course: ${this.currentCourse}`);
        
        // If still no data found, let's create some test data based on the CSV
        if (this.storedData.length === 0) {
          console.log('⚠️ No data in storage, creating test data from known questions...');
          this.storedData = this.createTestDataFromCSV();
          console.log(`🧪 Created ${this.storedData.length} test questions`);
        }
        
        // Debug: Show sample of stored questions
        if (this.storedData.length > 0) {
          console.log(`📋 Sample stored questions:`, this.storedData.slice(0, 3).map(q => ({
            text: q.questionText?.substring(0, 50) + '...',
            course: q.course || 'No course',
            hasCorrectAnswers: !!(q.correctAnswerIndices || q.correctAnswers)
          })));
        } else {
          console.log('❌ No data found in storage! Make sure you captured corrections first.');
        }
        
      } catch (error) {
        console.error('❌ Error loading stored data:', error);
        this.storedData = [];
      }
    }
    
    /**
     * Create test data based on the CSV export data
     */
    createTestDataFromCSV() {
      console.log('🧪 Creating test data from CSV knowledge...');
      
      const testData = [
        {
          questionText: "use cramer's rule to solve the following system of linear equations: what is the solution for (x, y, z)?",
          hasImages: true,
          correctAnswerIndices: [0], // First answer (index 0) was correct in CSV
          correctAnswerTexts: ["Correct solution for Cramer's rule"],
          answerOptions: ["Solution 1", "Solution 2", "Solution 3", "Solution 4", "Solution 5"],
          course: "QNT 101",
          courseName: "QNT 101: Introduction to College Algebra",
          testName: "Week 13 Quiz",
          correctAnswerImages: [
            {
              answerIndex: 0,
              imageData: {
                dataURL: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNENBRjUwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5DcmFtZXIncyBSdWxlIFNvbHV0aW9uPC90ZXh0Pjwvc3ZnPg=="
              }
            }
          ]
        },
        {
          questionText: "emily and her business partner, jack, are launching a small cafe. they need to allocate their monthly budget to rent, utilities, and employee salaries.",
          hasImages: false,
          correctAnswerIndices: [1], // Second answer was correct in CSV
          correctAnswerTexts: ["Rent: $2,571.43, Utilities: $1,285.71, Salaries: $5,142.86"],
          answerOptions: ["Option A", "Rent: $2,571.43, Utilities: $1,285.71, Salaries: $5,142.86", "Option C", "Option D", "Option E"],
          course: "QNT 101",
          courseName: "QNT 101: Introduction to College Algebra",
          testName: "Week 13 Quiz"
        },
        {
          questionText: "write the augmented matrix from the following set of linear equations:",
          hasImages: true,
          correctAnswerIndices: [1], // Second answer was correct in CSV
          correctAnswerTexts: ["Correct augmented matrix"],
          answerOptions: ["Matrix A", "Correct augmented matrix", "Matrix C", "Matrix D", "Matrix E"],
          course: "QNT 101",
          courseName: "QNT 101: Introduction to College Algebra",
          testName: "Week 13 Quiz",
          correctAnswerImages: [
            {
              answerIndex: 1,
              imageData: {
                dataURL: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjE5NkYzIi8+PHRleHQgeD0iNTAlIiB5PSIzMCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkF1Z21lbnRlZCBNYXRyaXg8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPltBfGJdPC90ZXh0Pjwvc3ZnPg=="
              }
            }
          ]
        },
        {
          questionText: "solve the following system of linear equations using gaussian elimination:",
          hasImages: true,
          correctAnswerIndices: [0], // First answer was correct in CSV
          correctAnswerTexts: ["Correct Gaussian elimination solution"],
          answerOptions: ["Correct Gaussian elimination solution", "Solution B", "Solution C", "Solution D", "Solution E"],
          course: "QNT 101",
          courseName: "QNT 101: Introduction to College Algebra",
          testName: "Week 13 Quiz",
          correctAnswerImages: [
            {
              answerIndex: 0,
              imageData: {
                dataURL: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRkY5ODAwIi8+PHRleHQgeD0iNTAlIiB5PSIzMCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkdhdXNzaWFuIEVsaW1pbmF0aW9uPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TeXN0ZW0gU29sdXRpb248L3RleHQ+PC9zdmc+"
              }
            }
          ]
        },
        {
          questionText: "find the determinant of the following matrix:",
          hasImages: true,
          correctAnswerIndices: [3], // Fourth answer was correct in CSV (index 3)
          correctAnswerTexts: ["Correct determinant value"],
          answerOptions: ["Det A", "Det B", "Det C", "Correct determinant value", "Det E"],
          course: "QNT 101",
          courseName: "QNT 101: Introduction to College Algebra",
          testName: "Week 13 Quiz",
          correctAnswerImages: [
            {
              answerIndex: 3,
              imageData: {
                dataURL: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjOUMyN0IwIi8+PHRleHQgeD0iNTAlIiB5PSIzNSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkRldGVybWluYW50PC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjUlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5kZXQoQSkgPSAxNzU8L3RleHQ+PC9zdmc+"
              }
            }
          ]
        },
        {
          questionText: "select the correct linear equations from the augmented matrix:",
          hasImages: true,
          correctAnswerIndices: [4], // Fifth answer was correct in CSV
          correctAnswerTexts: ["Correct linear equations"],
          answerOptions: ["Equations A", "Equations B", "Equations C", "Equations D", "Correct linear equations"],
          course: "QNT 101",
          courseName: "QNT 101: Introduction to College Algebra",
          testName: "Week 13 Quiz",
          correctAnswerImages: [
            {
              answerIndex: 4,
              imageData: {
                dataURL: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDA3OTZCIi8+PHRleHQgeD0iNTAlIiB5PSIyNSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkxpbmVhciBFcXVhdGlvbnM8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPnggKyAyeSA9IDU8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI3NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPjN4IC0geSA9IDc8L3RleHQ+PC9zdmc+"
              }
            }
          ]
        },
        {
          questionText: "write the augmented matrix from the following system of linear equations:",
          hasImages: true,
          correctAnswerIndices: [1], // Second answer was correct in CSV
          correctAnswerTexts: ["Correct system matrix"],
          answerOptions: ["Matrix A", "Correct system matrix", "Matrix C", "Matrix D", "Matrix E"],
          course: "QNT 101",
          courseName: "QNT 101: Introduction to College Algebra",
          testName: "Week 13 Quiz",
          correctAnswerImages: [
            {
              answerIndex: 1,
              imageData: {
                dataURL: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjE0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRTkxRTYzIi8+PHRleHQgeD0iNTAlIiB5PSIzMCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlN5c3RlbSBNYXRyaXg8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPltBfGJdIGZvcm08L3RleHQ+PC9zdmc+"
              }
            }
          ]
        },
        {
          questionText: "for the following equation, find the solutions by computing the inverse of the matrix.",
          hasImages: true,
          correctAnswerIndices: [0], // First answer was correct in CSV
          correctAnswerTexts: ["Correct inverse solution"],
          answerOptions: ["Correct inverse solution", "Solution B", "Solution C", "Solution D", "Solution E"],
          course: "QNT 101",
          courseName: "QNT 101: Introduction to College Algebra",
          testName: "Week 13 Quiz",
          correctAnswerImages: [
            {
              answerIndex: 0,
              imageData: {
                dataURL: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNjA3RDhCIi8+PHRleHQgeD0iNTAlIiB5PSIzMCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk1hdHJpeCBJbnZlcnNlPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Bw60xICogYiA9IHg8L3RleHQ+PC9zdmc+"
              }
            }
          ]
        }
      ];
      
      console.log('✅ Test data created:', testData.length, 'questions');
      console.log('📊 Sample question with images:', testData.find(q => q.correctAnswerImages));
      return testData;
    }

    /**
     * Set up navigation button tracking for better question detection
     */
    /**
     * Set up navigation button tracking for better question detection
     */
    setupNavigationTracking() {
      // Find navigation buttons using cached method
      this.navigationButtons = this.getNavigationButtons();
      
      // Add click listeners to navigation buttons
      Object.values(this.navigationButtons).forEach(button => {
        if (button) {
          button.addEventListener('click', () => {
            console.log('🔄 Navigation clicked - checking for new question in 1s...');
            setTimeout(() => this.checkForCurrentQuestion(), 1000);
          });
        }
      });
      
      console.log('🎮 Navigation tracking set up');
    }
    
    /**
     * Get answer buttons using DOM cache
     */
    getAnswerButtons() {
      if (this.domCache) {
        return this.domCache.getByType('answerButtons');
      }
      
      // Fallback to original logic - UPDATED for React-based quiz interfaces
      const possibleSelectors = [
        // Try clickable answer containers first (React apps)
        '.answer-option',
        'button.answer-option',
        'div.answer-option',
        '[class*="answer-option"]',
        '[class*="answer"][role="button"]',
        // Then try traditional inputs
        'input[type="radio"]',
        'input[type="checkbox"]', 
        '.answer-option input',
        '.quiz-option input',
        '.question-option input',
        'input[name*="answer"]',
        'input[name*="choice"]',
        '[role="radio"]',
        '[role="checkbox"]'
      ];
      
      for (const selector of possibleSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          console.log(`✅ Found ${elements.length} answer elements using selector: "${selector}"`);
          return elements;
        }
      }
      
      console.log('❌ No answer elements found with any selector');
      return [];
    }
    
    /**
     * Get question container using DOM cache
     */
    getQuestionContainer() {
      if (this.domCache) {
        const containers = this.domCache.getByType('questionContainer');
        const validContainer = containers.find(container => 
          container.textContent && 
          container.textContent.trim().length > 20 &&
          this.isValidQuestionContainer(container)
        );
        if (validContainer) return validContainer;
      }
      
      // Fallback to original logic with improved filtering
      const questionSelectors = [
        '.question-text',
        '.quiz-question',
        '.question-content', 
        '.question',
        '[class*="question"][role]',
        '[class*="question"] p',
        '.card-body p',
        '.question-wrapper',
        'main p',
        'article p',
        '[role="main"] p'
      ];
      
      // Try specific selectors first
      for (const selector of questionSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent.trim();
          if (text.length > 20 && this.isValidQuestionContainer(element)) {
            return element;
          }
        }
      }
      
      // Last resort: find text that looks like a question near answer buttons
      // First, try to find answer buttons to locate the question nearby
      const answerButtons = document.querySelectorAll('.answer-option, [class*="option"], button[role]');
      if (answerButtons.length > 0) {
        // Look for text elements above the first answer button
        const firstAnswer = answerButtons[0];
        const parent = firstAnswer.closest('form, main, article, [role="main"], body');
        
        if (parent) {
          // Get all text-containing elements before the answers
          const allTextElements = Array.from(parent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div'));
          const beforeAnswers = allTextElements.filter(el => {
            const elPosition = el.compareDocumentPosition(firstAnswer);
            return elPosition & Node.DOCUMENT_POSITION_FOLLOWING; // Element comes before answer
          });
          
          // Find the last valid question before answers
          for (let i = beforeAnswers.length - 1; i >= 0; i--) {
            const element = beforeAnswers[i];
            const text = element.textContent.trim();
            if (text.length > 20 && this.isValidQuestionContainer(element)) {
              return element;
            }
          }
        }
      }
      
      // Final fallback: find any paragraph/heading that looks like a question
      const allParagraphs = Array.from(document.querySelectorAll('p, h3, h4, h5'));
      const validQuestions = allParagraphs
        .filter(p => {
          const text = p.textContent.trim();
          return text.length > 30 && this.isValidQuestionContainer(p);
        })
        .sort((a, b) => b.textContent.length - a.textContent.length);
      
      return validQuestions[0] || null;
    }
    
    /**
     * Check if an element is a valid question container (not navigation/header)
     */
    isValidQuestionContainer(element) {
      if (!element) return false;
      
      const text = element.textContent.toLowerCase().trim();
      const fullText = element.textContent.trim(); // Keep original case for scoring
      
      // Exclude common navigation/header patterns
      const excludePatterns = [
        /^welcome to/i,
        /^week \d+$/i,
        /^week \d+:/i,  // "Week 7:"
        /^chapter \d+/i,  // Exclude "Chapter 6 The Normal Distribution"
        /^introduction to/i,
        /^\d+\/\d+$/,  // Page numbers like "1/15"
        /^question \d+$/i,
        /^submit$/i,
        /^next$/i,
        /^previous$/i,
        /^menu$/i,
        /^navigation$/i,
        /^copyright/i,
        /^\d+ points?$/i,
        /^average:/i,
        /complete!$/i,
        /^the normal distribution$/i,  // Exclude section titles
        /^the standard normal distribution$/i,
        /^using the normal distribution$/i,
        /review$/i,  // Chapter reviews
        /exercise$/i  // Practice exercises
      ];
      
      // If text matches any exclude pattern, reject it
      if (excludePatterns.some(pattern => pattern.test(text))) {
        return false;
      }
      
      // Exclude if text is too short
      if (text.length < 20) return false;
      
      // Exclude navigation links and elements
      if (element.tagName === 'A' || element.closest('nav, [role="navigation"]')) return false;
      
      // Exclude if parent is navigation
      const parent = element.parentElement;
      if (parent && (parent.tagName === 'NAV' || parent.classList.contains('nav'))) {
        return false;
      }
      
      // Prefer elements that end with "?" or contain question words
      const hasQuestionMark = fullText.includes('?');
      const questionWords = /\b(what|which|when|where|who|why|how|does|do|did|is|are|was|were|can|could|would|should|will)\b/i;
      const hasQuestionWords = questionWords.test(text);
      
      // If it looks like a question, accept it
      if (hasQuestionMark || hasQuestionWords) {
        return true;
      }
      
      // Otherwise, require multiple words
      const wordCount = text.split(/\s+/).length;
      return wordCount >= 5;
    }
    
    /**
     * Get navigation buttons using DOM cache
     */
    getNavigationButtons() {
      if (this.domCache) {
        return {
          previous: this.domCache.get('button[title="Previous"], button[title="Back"]', { single: true })[0] || null,
          next: this.domCache.get('button[title="Next"], button[title="Forward"]', { single: true })[0] || null,
          beginning: this.domCache.get('button[title="Beginning"], button[title="First"]', { single: true })[0] || null,
          last: this.domCache.get('button[title="Last answered"], button[title="Last"]', { single: true })[0] || null,
          submit: this.domCache.get('button[type="submit"], .submit-btn', { single: true })[0] || null
        };
      }
      
      // Fallback to original logic
      return {
        previous: document.querySelector('button[title="Previous"], button[title="Back"]'),
        next: document.querySelector('button[title="Next"], button[title="Forward"]'),
        beginning: document.querySelector('button[title="Beginning"], button[title="First"]'),
        last: document.querySelector('button[title="Last answered"], button[title="Last"]'),
        submit: document.querySelector('button[type="submit"], .submit-btn')
      };
    }
    
    /**
     * Get form elements using DOM cache
     */
    getFormElements() {
      if (this.domCache) {
        return this.domCache.getByType('formElements');
      }
      
      return Array.from(document.querySelectorAll('form, .quiz-form, .question-form, [data-testid*="form"]'));
    }
    
    /**
     * Start monitoring for questions
     */
    startQuestionMonitoring() {
      // Initial check
      this.checkForCurrentQuestion();
      
      // Periodic checking
      setInterval(() => {
        this.checkForCurrentQuestion();
      }, SMART_CONFIG.CHECK_INTERVAL);
      
      console.log('👀 Question monitoring started');
    }
    
    /**
     * Check for current question and process if new
     */
    async checkForCurrentQuestion() {
      try {
        // Quick check: has the page changed at all?
        // Use a lightweight DOM marker to detect page changes
        const pageMarker = this.getPageMarker();
        
        // Skip expensive extraction if page hasn't changed
        if (this.lastPageMarker === pageMarker) {
          return;
        }
        
        this.lastPageMarker = pageMarker;
        
        // Only now do the expensive DOM extraction
        const questionDetails = this.extractQuestionDetails();
        
        if (!questionDetails || !questionDetails.questionText) {
          return;
        }
        
        // Skip if question text is too short (likely a loading/intro screen)
        if (questionDetails.questionText.length < 10) {
          console.log('⏭️ Skipping - question text too short:', questionDetails.questionText);
          return;
        }
        
        // Create a hash to detect if this is a new question
        const questionHash = this.createQuestionHash(questionDetails);
        
        // Skip if we've already processed this question
        if (this.lastQuestionHash === questionHash) {
          return;
        }
        
        this.lastQuestionHash = questionHash;
        console.log('🔍 Processing new question...');
        console.log('📝 Question details:', questionDetails);
        
        // Find matching question in stored data (may be async)
        const matchingQuestion = await this.findMatchingQuestion(questionDetails);

        if (matchingQuestion) {
          console.log('✅ Match found! Processing answer...');
          this.processMatchingQuestion(matchingQuestion, questionDetails);
        } else {
          console.log('❌ No matching question found');
        }
        
      } catch (error) {
        console.error('❌ Error in question processing:', error);
      }
    }
    
    /**
     * Get a lightweight page marker to detect DOM changes
     * This is much faster than extracting full question details
     */
    getPageMarker() {
      // Try to get question text more directly
      const questionSelectors = [
        '.question-text',
        '.quiz-question', 
        '[class*="question"]',
        'form p',
        'form div[class*="text"]'
      ];
      
      let questionText = '';
      for (const selector of questionSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 10) {
          questionText = element.textContent.trim().substring(0, 100);
          break;
        }
      }
      
      // Fallback to heading if no question found
      if (!questionText) {
        const heading = document.querySelector('h1, h2, h3, h4, h5, h6');
        questionText = heading ? heading.textContent.substring(0, 100) : '';
      }
      
      // Get answer count as another marker
      const answerElements = document.querySelectorAll('.answer-option, input[type="radio"], input[type="checkbox"]');
      const answerCount = answerElements.length;
      
      // Include URL hash/query as marker for navigation
      const urlMarker = window.location.href.substring(window.location.href.lastIndexOf('/'));
      
      return `${questionText}_${answerCount}_${urlMarker}`;
    }
    
    /**
     * Create a hash for the current question to detect changes
     */
    createQuestionHash(questionDetails) {
      const text = this.cleanQuestionText(questionDetails.questionText);
      const imageCount = questionDetails.hasImages ? 1 : 0;
      const answerCount = questionDetails.answerOptions ? questionDetails.answerOptions.length : 0;
      
      return `${text.substring(0, 50)}_${imageCount}_${answerCount}`;
    }
    
    /**
     * Inspect page structure to understand the DOM
     */
    inspectPageStructure() {
      console.log('🔬 PAGE STRUCTURE INSPECTION:');
      console.log('📊 All form elements:', document.querySelectorAll('form').length);
      console.log('📊 All inputs:', document.querySelectorAll('input').length);
      console.log('📊 All buttons:', document.querySelectorAll('button').length);
      console.log('📊 All labels:', document.querySelectorAll('label').length);
      console.log('📊 Elements with "answer":', document.querySelectorAll('[class*="answer"], [id*="answer"]').length);
      console.log('📊 Elements with "option":', document.querySelectorAll('[class*="option"], [id*="option"]').length);
      console.log('📊 Elements with "choice":', document.querySelectorAll('[class*="choice"], [id*="choice"]').length);
      console.log('📊 Elements with "question":', document.querySelectorAll('[class*="question"], [id*="question"]').length);
      
      // Log some sample elements
      const sampleInputs = Array.from(document.querySelectorAll('input')).slice(0, 3);
      console.log('📋 Sample inputs:', sampleInputs.map(el => ({
        type: el.type,
        name: el.name,
        id: el.id,
        className: el.className,
        value: el.value
      })));
      
      const sampleButtons = Array.from(document.querySelectorAll('button')).slice(0, 3);
      console.log('📋 Sample buttons:', sampleButtons.map(el => ({
        text: el.textContent?.substring(0, 30),
        className: el.className,
        id: el.id
      })));
    }

    /**
     * Extract question details from current page with cached DOM access
     */
    extractQuestionDetails() {
      console.log('🔍 Extracting question details with enhanced caching...');
      
      // Let's inspect the page structure first
      this.inspectPageStructure();
      
      // Find question text using cached method
      const questionElement = this.getQuestionContainer();
      
      if (!questionElement) {
        console.log('❌ No question container found');
        return null;
      }
      
      const questionText = this.cleanQuestionText(questionElement.textContent);
      const questionTitle = questionText.length > 100 ? questionText.substring(0, 100) + '...' : questionText;
      
      console.log('📝 Detected question text:', questionText.substring(0, 150) + '...');
      
      // Check for images in question (use cache for common patterns)
      const hasImages = this.domCache ? 
        this.domCache.get('.question img, .question-content img, .quiz-question img').length > 0 :
        document.querySelectorAll('.question img, .question-content img, .quiz-question img').length > 0;
      
      // Find answer options with cached access
      console.log('🔍 Looking for answer elements...');
      const answerElements = this.getAnswerButtons();
      
      console.log(`✅ Final answer elements found: ${answerElements.length}`);
      
      // If no answer elements found, try alternative selectors for React-based quizzes
      if (answerElements.length === 0) {
        console.log('⚠️ No answer elements found with standard selectors, trying alternatives...');
        
        // Try finding by common React quiz patterns
        const alternativeSelectors = [
          '[role="radiogroup"] > div',
          '[role="radiogroup"] > button',
          'div[class*="option"]',
          'button[class*="option"]',
          '.quiz-container button',
          '[class*="answer"] button',
          '[class*="choice"]'
        ];
        
        for (const selector of alternativeSelectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          if (elements.length > 0) {
            console.log(`✅ Found ${elements.length} elements with alternative selector: "${selector}"`);
            // Re-assign for processing below
            answerElements.length = 0;
            answerElements.push(...elements);
            break;
          }
        }
      }
      
      // Extract answer text more carefully 
      const answerOptions = answerElements.map(el => {
        let labelText = '';
        
        // For React-based clickable divs/buttons (common in modern quiz apps)
        if (el.classList.contains('answer-option') || el.hasAttribute('role')) {
          labelText = el.textContent.trim();
        }
        
        // Method 1: Find label by 'for' attribute (for traditional inputs)
        if (!labelText && el.id) {
          const label = this.domCache ? 
            this.domCache.get(`label[for="${el.id}"]`, { single: true })[0] :
            document.querySelector(`label[for="${el.id}"]`);
          if (label) labelText = label.textContent.trim();
        }
        
        // Method 2: Find parent label
        if (!labelText) {
          const parentLabel = el.closest('label');
          if (parentLabel) labelText = parentLabel.textContent.trim();
        }
        
        // Method 3: Find next sibling text
        if (!labelText) {
          let sibling = el.nextSibling;
          while (sibling && !labelText) {
            if (sibling.nodeType === Node.TEXT_NODE && sibling.textContent.trim()) {
              labelText = sibling.textContent.trim();
            } else if (sibling.nodeType === Node.ELEMENT_NODE && sibling.textContent.trim()) {
              labelText = sibling.textContent.trim();
            }
            sibling = sibling.nextSibling;
          }
        }
        
        // Clean up the label text
        labelText = labelText.replace(/^[A-D]\.\s*/, ''); // Remove "A. ", "B. " etc.
        labelText = labelText.replace(/\s*\([A-D]\)\s*$/, ''); // Remove trailing "(A)"
        
        return labelText;
      }).filter(text => text.length > 0);
      
      console.log(`🔍 Found ${answerElements.length} answer elements, extracted ${answerOptions.length} answer texts`);
      if (answerOptions.length > 0) {
        console.log(`📝 Answer options:`, answerOptions.slice(0, 2)); // Show first 2 for debugging
      }
      
      // Detect current course and test context from page
      const currentContext = this.detectCurrentContext();
      
      return {
        questionText,
        questionTitle,
        hasImages,
        answerOptions,
        answerElements,
        currentCourse: currentContext.courseName,
        currentTest: currentContext.testName
      };
    }
    
    /**
     * Detect current course and test context from page
     */
    detectCurrentContext() {
      let courseName = null;
      let testName = null;
      
      try {
        // Try to find course name from breadcrumb or header
        const breadcrumbs = document.querySelectorAll('.breadcrumb-item, .breadcrumb a');
        for (const crumb of breadcrumbs) {
          const text = crumb.textContent.trim();
          if (text.length > 5 && !text.toLowerCase().includes('home') && !text.toLowerCase().includes('dashboard')) {
            courseName = text;
            break;
          }
        }
        
        // Fallback: Check page title or main heading
        if (!courseName) {
          const h1 = document.querySelector('h1, h2');
          if (h1) {
            const text = h1.textContent.trim();
            // Look for course pattern like "BUS 200: Business Finance"
            const courseMatch = text.match(/^[A-Z]{2,4}\s*\d{3}/);
            if (courseMatch || text.length > 10) {
              courseName = text.split(/[-–—]/)[0].trim();
            }
          }
        }
        
        // Try to find test/quiz name from page
        const pageTitle = document.title;
        if (pageTitle.toLowerCase().includes('week')) {
          testName = pageTitle.match(/(Week\s*\d+[^|]*)/i)?.[1]?.trim();
        }
        
        // Check for test name in headings
        if (!testName) {
          const headings = document.querySelectorAll('h1, h2, h3, h4');
          for (const h of headings) {
            const text = h.textContent.trim();
            if (text.toLowerCase().includes('week') || text.toLowerCase().includes('test') || text.toLowerCase().includes('quiz')) {
              testName = text;
              break;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to detect context:', error);
      }
      
      console.log('🎯 Detected context:', { courseName, testName });
      return { courseName, testName };
    }
    
    /**
     * Enhanced text cleaning for better matching accuracy
     */
    cleanQuestionText(text) {
      if (!text) return '';

      // Remove HTML tags and decode entities
      let cleaned = text.replace(/<[^>]*>/g, ' ')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'");

      // Normalize whitespace and remove extra spaces
      cleaned = cleaned.replace(/\s+/g, ' ').trim();

      // Remove question numbers and prefixes more comprehensively
      cleaned = cleaned.replace(/^(?:question\s+)?(\d+)[\.)]\s*/i, '');

      return cleaned;
    }

    /**
     * Extract stored answer options from various data formats
     */
    getStoredAnswerOptions(storedQuestion) {
      if (!storedQuestion) return [];

      const options = new Map();

      const addOption = (value) => {
        if (!value) return;
        let text = value;
        if (typeof value === 'object') {
          text = value.text || value.label || value.value || value.answerText || '';
        }
        if (typeof text !== 'string') {
          text = String(text);
        }
        const trimmed = text.trim();
        if (!trimmed) return;
        const normalized = this.cleanAnswerText(trimmed);
        if (normalized) {
          if (!options.has(normalized)) {
            options.set(normalized, trimmed);
          }
        }
      };

      const candidateArrays = [
        storedQuestion.answerTexts,
        storedQuestion.answerOptions,
        storedQuestion.allAnswers,
        storedQuestion.answers,
        storedQuestion.options,
        storedQuestion.choices
      ];

      candidateArrays.forEach(collection => {
        if (Array.isArray(collection)) {
          collection.forEach(addOption);
        }
      });

      // Some datasets store answers in an object with numeric keys
      if (storedQuestion.answerMap && typeof storedQuestion.answerMap === 'object') {
        Object.values(storedQuestion.answerMap).forEach(addOption);
      }

      // If we still have no options but have correct answers, include them as last resort
      if (options.size === 0 && Array.isArray(storedQuestion.correctAnswers)) {
        storedQuestion.correctAnswers.forEach(addOption);
      }

      return Array.from(options.values());
    }

    /**
     * Calculate answer overlap between current question and stored question
     */
    calculateAnswerOverlap(questionDetails, storedQuestion) {
      const currentOptions = Array.isArray(questionDetails.answerOptions) ?
        questionDetails.answerOptions.filter(opt => typeof opt === 'string' && opt.trim().length > 0) : [];
      const storedOptions = this.getStoredAnswerOptions(storedQuestion);

      // Filter out "I don't know" options for comparison
      const filterIDK = (options) => options.filter(opt => {
        // Handle both string and object formats
        let textToCheck = opt;
        if (typeof opt === 'object' && opt !== null) {
          textToCheck = opt.text || opt.label || opt.value || opt.answerText || '';
        }
        const cleaned = this.cleanAnswerText(textToCheck).toLowerCase();
        const isIDK = cleaned.includes("idon'tknow") || 
                      cleaned.includes("idontknow") || 
                      cleaned === "idk";
        
        if (SMART_CONFIG.DEBUG_MODE && isIDK) {
          console.log(`   ❌ Filtering out IDK option: "${textToCheck}"`);
        }
        
        return !isIDK;
      });

      const currentFiltered = filterIDK(currentOptions);
      const storedFiltered = filterIDK(storedOptions);

      // Debug logging for answer comparison
      if (SMART_CONFIG.DEBUG_MODE && (currentFiltered.length > 0 || storedFiltered.length > 0)) {
        console.log(`   🔍 Comparing answers (after IDK filter):`);
        console.log(`      Current (${currentOptions.length}→${currentFiltered.length}):`, currentFiltered);
        console.log(`      Stored (${storedOptions.length}→${storedFiltered.length}):`, storedFiltered);
      }

      if (currentFiltered.length < 2 || storedFiltered.length < 2) {
        // Log for debugging
        if (SMART_CONFIG.DEBUG_MODE) {
          console.log(`   🔍 Answer filtering: current ${currentOptions.length}→${currentFiltered.length}, stored ${storedOptions.length}→${storedFiltered.length}`);
        }
        return {
          overlap: null,
          matchedPairs: [],
          currentCount: currentFiltered.length,
          storedCount: storedFiltered.length,
          originalCurrentCount: currentOptions.length,
          originalStoredCount: storedOptions.length
        };
      }

      const matchedPairs = [];
      const matchedStored = new Set();
      const matchedNormalized = new Set();

      currentFiltered.forEach((currentOption, currentIndex) => {
        for (let storedIndex = 0; storedIndex < storedFiltered.length; storedIndex++) {
          if (matchedStored.has(storedIndex)) continue;
          const storedOption = storedFiltered[storedIndex];
          if (this.isAnswerMatch(currentOption, storedOption)) {
            matchedStored.add(storedIndex);
            matchedPairs.push({
              currentIndex,
              storedIndex,
              currentText: currentOption,
              storedText: storedOption
            });
            const normalized = this.cleanAnswerText(currentOption);
            if (normalized) {
              matchedNormalized.add(normalized);
            }
            break;
          }
        }
      });

      const normalizedCurrent = new Set(
        currentFiltered
          .map(opt => this.cleanAnswerText(opt))
          .filter(Boolean)
      );
      const normalizedStored = new Set(
        storedFiltered
          .map(opt => this.cleanAnswerText(opt))
          .filter(Boolean)
      );

      const uniqueMatched = matchedNormalized.size;
      const denominator = Math.min(normalizedCurrent.size, normalizedStored.size) || 0;
      const overlap = denominator === 0 ? null : uniqueMatched / denominator;

      // Debug logging
      if (SMART_CONFIG.DEBUG_MODE && matchedPairs.length > 0) {
        console.log(`   ✅ Matched ${matchedPairs.length} answers: ${matchedPairs.map(p => p.currentText.substring(0, 30)).join(', ')}`);
      }

      return {
        overlap,
        matchedPairs,
        currentCount: currentFiltered.length,
        storedCount: storedFiltered.length,
        originalCurrentCount: currentOptions.length,
        originalStoredCount: storedOptions.length
      };
    }

    /**
     * Determine if answer overlap is acceptable using dynamic thresholds
     */
    evaluateAnswerOverlap(overlapInfo) {
      if (!overlapInfo) {
        return {
          isSufficient: true,
          required: 0,
          actual: null,
          coverage: 0,
          reason: 'no-data'
        };
      }

      const requiresComparison = overlapInfo.currentCount >= 2 || overlapInfo.storedCount >= 2;

      if (overlapInfo.overlap === null) {
        const allowWithoutOverlap = !requiresComparison;
        return {
          isSufficient: allowWithoutOverlap,
          required: allowWithoutOverlap ? 0 : SMART_CONFIG.ANSWER_OVERLAP_MIN,
          actual: null,
          coverage: 0,
          reason: allowWithoutOverlap ? 'insufficient-options' : 'missing-answer-data'
        };
      }

      const minChoiceCount = Math.max(2, Math.min(overlapInfo.currentCount, overlapInfo.storedCount));
      const coverageDenominator = Math.min(overlapInfo.currentCount, overlapInfo.storedCount) || 0;
      const coverage = coverageDenominator === 0 ? 0 : overlapInfo.matchedPairs.length / coverageDenominator;

      if (overlapInfo.matchedPairs.length === 0) {
        return {
          isSufficient: false,
          required: SMART_CONFIG.ANSWER_OVERLAP_MIN,
          actual: overlapInfo.overlap,
          coverage,
          reason: 'no-matched-answers'
        };
      }

      const dynamicThreshold = Math.min(
        SMART_CONFIG.ANSWER_OVERLAP_MIN,
        Math.max(0.2, 1 / minChoiceCount)
      );

      return {
        isSufficient: overlapInfo.overlap >= dynamicThreshold,
        required: dynamicThreshold,
        actual: overlapInfo.overlap,
        coverage,
        reason: 'acceptable'
      };
    }

    /**
     * Determine whether mismatched answer counts can still be accepted
     */
    isAnswerCountCompatible(currentCount, storedCount, overlapEvaluation) {
      if (!currentCount || !storedCount || currentCount === storedCount) {
        return true;
      }

      const difference = Math.abs(currentCount - storedCount);
      
      // Allow difference of 1 (common with "I don't know" option)
      if (difference === 1) {
        return overlapEvaluation.coverage >= 0.75;
      }
      
      // Allow difference of 2 with high coverage
      if (difference === 2) {
        return overlapEvaluation.coverage >= 0.85;
      }
      
      // Reject larger differences
      if (difference > 2) {
        return false;
      }

      if (overlapEvaluation.actual === null) {
        return false;
      }

      return overlapEvaluation.coverage >= 0.8;
    }

    /**
     * Check if two answers match
     */
    isAnswerMatch(answer1, answer2) {
      if (!answer1 || !answer2) return false;
      const cleaned1 = this.cleanAnswerText(answer1);
      const cleaned2 = this.cleanAnswerText(answer2);
      return cleaned1 === cleaned2;
    }
    
    /**
     * Find matching question with enhanced algorithms
     */
    async findMatchingQuestion(questionDetails) {
      if (!questionDetails.questionText || questionDetails.questionText.length < 5) {
        return null;
      }
      
      const startTime = Date.now();
      this.performanceMetrics.questionsProcessed++;
      
      console.log(`🔍 Enhanced search started for: "${questionDetails.questionText.substring(0, 100)}..."`);
      const currentCourse = questionDetails.currentCourse;
      const currentTest = questionDetails.currentTest;
      console.log(`📚 Current context: ${currentCourse || 'Unknown'} - ${currentTest || 'Unknown'}`);
      
      try {
        // CONTEXT-AWARE SEARCH: Prioritize matches from same course/test
        try {
          const normalized = this.cleanQuestionText(questionDetails.questionText);
          const currentAnswerCount = questionDetails.answerOptions?.length || 0;
          
          if (normalized && Array.isArray(this.storedData) && this.storedData.length > 0) {
            
            // STEP 1: Try exact match in SAME COURSE + SAME TEST (highest priority)
            if (currentCourse && currentTest) {
              for (const stored of this.storedData) {
                if (!stored || !stored.questionText) continue;
                const sNorm = this.cleanQuestionText(stored.questionText);
                const storedAnswerCount = stored.answers?.length || stored.answerTexts?.length || 0;
                
                if (sNorm === normalized && 
                    stored.courseName === currentCourse && 
                    stored.testName === currentTest &&
                    (currentAnswerCount === 0 || storedAnswerCount === currentAnswerCount)) {
                  console.log('🎯 Perfect match: Same course + test + question + answer count');
                  return stored;
                }
              }
            }
            
            // STEP 2: Try exact match in SAME COURSE (any test)
            if (currentCourse) {
              for (const stored of this.storedData) {
                if (!stored || !stored.questionText) continue;
                const sNorm = this.cleanQuestionText(stored.questionText);
                const storedAnswerCount = stored.answers?.length || stored.answerTexts?.length || 0;
                
                if (sNorm === normalized && 
                    stored.courseName === currentCourse &&
                    (currentAnswerCount === 0 || storedAnswerCount === currentAnswerCount)) {
                  console.log('✅ Good match: Same course + question + answer count');
                  return stored;
                }
              }
            }
            
            // STEP 3: Fallback to ANY exact match (different course)
            for (const stored of this.storedData) {
              if (!stored || !stored.questionText) continue;
              const sNorm = this.cleanQuestionText(stored.questionText);
              const storedAnswerCount = stored.answers?.length || stored.answerTexts?.length || 0;
              
              if (sNorm === normalized &&
                  (currentAnswerCount === 0 || storedAnswerCount === currentAnswerCount)) {
                console.log('⚠️ Cross-course match found (use with caution)');
                return stored;
              }
            }
          }
        } catch (e) {
          // keep going to other strategies if anything fails here
          console.warn('Direct lookup failed, continuing to advanced matching', e);
        }

        // Progressive display DISABLED - causes conflicts with legacy display
        // if (this.progressiveDisplay) {
        //   const result = await this.progressiveDisplay.displayAnswer(
        //     questionDetails, 
        //     this.storedData,
        //     { showProgress: true }
        //   );
        //   
        //   if (result) {
        //     this.updatePerformanceMetrics(startTime, true);
        //     return result.match;
        //   }
        // }
        
        // Fallback to advanced matcher if available
        if (this.advancedMatcher) {
          const result = await this.advancedMatcher.findBestMatch(
            questionDetails,
            this.storedData,
            { maxStrategies: 3, minConfidence: 0.7 } // Increased from 0.3 to prevent wrong matches
          );
          
          if (result && result.match) {
            // Extract the actual question object (advanced matcher returns {question, confidence, method})
            const matchedQuestion = result.match.question || result.match;
            
            // Validate answer count compatibility with overlap coverage
            const currentAnswerCount = questionDetails.answerOptions?.length || 0;
            const matchedAnswerCount = matchedQuestion.answers?.length || matchedQuestion.answerTexts?.length || 0;

            const overlapInfo = this.calculateAnswerOverlap(questionDetails, matchedQuestion);
            const overlapEvaluation = this.evaluateAnswerOverlap(overlapInfo);
            if (overlapInfo.overlap !== null) {
              console.log(`📊 Answer overlap check (advanced): ${(overlapInfo.overlap * 100).toFixed(1)}% (current=${overlapInfo.currentCount}, stored=${overlapInfo.storedCount})`);
            } else {
              console.log(`📊 Answer overlap check (advanced): N/A (current=${overlapInfo.currentCount}, stored=${overlapInfo.storedCount}, matched=${overlapInfo.matchedPairs.length})`);
              if (SMART_CONFIG.DEBUG_MODE) {
                console.log(`   📝 Current answers (${questionDetails.answerOptions?.length}): ${JSON.stringify(questionDetails.answerOptions?.slice(0, 2))}`);
                console.log(`   📝 Stored answers (${matchedQuestion.answers?.length}): ${JSON.stringify(matchedQuestion.answers?.slice(0, 2))}`);
              }
            }

            if (!overlapEvaluation.isSufficient) {
              const requiredPercent = (overlapEvaluation.required * 100).toFixed(1);
              const actualPercent = overlapEvaluation.actual !== null ? (overlapEvaluation.actual * 100).toFixed(1) : 'N/A';
              console.warn(`⚠️ Rejecting advanced match due to low answer overlap (${actualPercent}%, required ≥ ${requiredPercent}%)`);
            } else {
              const countsCompatible = this.isAnswerCountCompatible(currentAnswerCount, matchedAnswerCount, overlapEvaluation);
              if (!countsCompatible) {
                const coveragePercent = (overlapEvaluation.coverage * 100).toFixed(1);
                console.warn(`⚠️ Rejecting advanced match due to inconsistent answer counts (current=${currentAnswerCount}, matched=${matchedAnswerCount}, coverage=${coveragePercent}%)`);
              } else {
                this.updatePerformanceMetrics(startTime, true);
                console.log(`✅ Advanced match found: ${result.strategy} (${Math.round(result.confidence * 100)}%)`);
                console.log(`📝 Matched question: ${matchedQuestion.questionText?.substring(0, 100)}...`);
                console.log(`📊 Answer counts: current=${currentAnswerCount}, matched=${matchedAnswerCount}`);
                return matchedQuestion;
              }
            }
          }
        }
        
        // Original fallback logic
        const legacyMatch = this.findMatchingQuestionLegacy(questionDetails);
        this.updatePerformanceMetrics(startTime, legacyMatch !== null);
        
        return legacyMatch;
        
      } catch (error) {
        console.error('Enhanced matching failed:', error);
        this.updatePerformanceMetrics(startTime, false);
        
        // Fallback to original logic
        return this.findMatchingQuestionLegacy(questionDetails);
      }
    }
    
    /**
     * Original matching logic as fallback
     */
    findMatchingQuestionLegacy(questionDetails) {
      console.log(`🔄 Using legacy matching for ${this.storedData.length} stored questions...`);
      
      const currentCleaned = questionDetails.questionText;
      const currentAnswerCount = questionDetails.answerOptions?.length || 0;
      
      console.log(`📊 Current question has ${currentAnswerCount} answer options`);
      
      // Strategy 1: Try exact keyword matching first (most reliable)
      const keywordMatch = this.findByKeywords(questionDetails, currentAnswerCount);
      if (keywordMatch) {
        console.log(`✅ Legacy keyword match found!`);
        return keywordMatch;
      }
      
      // Strategy 2: Try similarity matching with very low threshold
      let bestMatch = null;
      let bestSimilarity = 0;
      let bestOverlap = null;
      let bestCombinedScore = 0;
      
      for (const storedQuestion of this.storedData) {
        if (!storedQuestion.questionText) continue;
        
        // Use overlap evaluation instead of strict count matching
        const overlapInfo = this.calculateAnswerOverlap(questionDetails, storedQuestion);
        const overlapEvaluation = this.evaluateAnswerOverlap(overlapInfo);
        
        // Skip if answer overlap is insufficient
        if (!overlapEvaluation.isSufficient) {
          if (SMART_CONFIG.DEBUG_MODE) {
            const actualPercent = overlapInfo.overlap !== null ? (overlapInfo.overlap * 100).toFixed(1) : 'N/A';
            const requiredPercent = (overlapEvaluation.required * 100).toFixed(1);
            console.log(`   ⚠️ Skipping "${storedQuestion.questionText.substring(0, 50)}..." - answer overlap too low (${actualPercent}%, required ≥ ${requiredPercent}%)`);
          }
          continue;
        }
        
        const cleanStoredText = this.cleanQuestionText(storedQuestion.questionText);
        const answerOverlap = overlapInfo.overlap;
        
        const similarity = this.calculateQuestionSimilarity(
          currentCleaned,
          cleanStoredText
        );
        
        // When answer overlap is perfect (100%), prioritize question similarity more heavily
        // This helps distinguish between questions that share the same answer options
        let combinedScore;
        if (answerOverlap !== null) {
          if (answerOverlap >= 0.99) {
            // Perfect answer overlap: 85% question similarity, 15% answer overlap
            combinedScore = (similarity * 0.85) + (answerOverlap * 0.15);
          } else {
            // Partial overlap: 65% question similarity, 35% answer overlap
            combinedScore = (similarity * 0.65) + (answerOverlap * 0.35);
          }
        } else {
          combinedScore = similarity;
        }
        
        if (SMART_CONFIG.DEBUG_MODE) {
          const storedAnswerCount = storedQuestion.answers?.length || 0;
          const overlapDisplay = answerOverlap !== null
            ? `, overlap: ${(answerOverlap * 100).toFixed(1)}% (required ≥ ${(overlapEvaluation.required * 100).toFixed(1)}%)`
            : '';
          console.log(`   📊 "${cleanStoredText.substring(0, 50)}..." - similarity: ${(similarity * 100).toFixed(1)}%${overlapDisplay} (combined: ${(combinedScore * 100).toFixed(1)}%) (answers: ${storedAnswerCount})`);
        }
        
        // Check for high similarity matches with perfect answer overlap
        // Prioritize these over lower similarity matches
        if (similarity > 0.5 && answerOverlap !== null && answerOverlap >= 0.99) {
          if (!overlapEvaluation.isSufficient) {
            const actualPercent = (answerOverlap * 100).toFixed(1);
            const requiredPercent = (overlapEvaluation.required * 100).toFixed(1);
            console.log(`⚠️ High similarity + perfect overlap candidate rejected due to low answer evaluation (${actualPercent}%, required ≥ ${requiredPercent}%)`);
          } else {
            console.log(`✅ Perfect match found: ${(similarity * 100).toFixed(1)}% similarity + ${(answerOverlap * 100).toFixed(1)}% answer overlap`);
            return storedQuestion;
          }
        }
        
        // Check for high similarity matches
        if (similarity > 0.7) {
          if (!overlapEvaluation.isSufficient) {
            const actualPercent = answerOverlap !== null ? (answerOverlap * 100).toFixed(1) : 'N/A';
            const requiredPercent = (overlapEvaluation.required * 100).toFixed(1);
            console.log(`⚠️ High similarity candidate rejected due to low answer overlap (${actualPercent}%, required ≥ ${requiredPercent}%)`);
          } else {
            console.log(`✅ High similarity match found (${(similarity * 100).toFixed(1)}%)`);
            return storedQuestion;
          }
        }
        
        if (combinedScore > bestCombinedScore) {
          bestSimilarity = similarity;
          bestOverlap = answerOverlap;
          bestCombinedScore = combinedScore;
          bestMatch = storedQuestion;
        }
      }
      
      if (bestMatch) {
        const matchedAnswerCount = bestMatch.answers?.length || bestMatch.answerTexts?.length || 0;
        const requiresAnswerOverlap = (currentAnswerCount >= 2) || (matchedAnswerCount >= 2);

        if (bestOverlap === null && requiresAnswerOverlap) {
          if (SMART_CONFIG.DEBUG_MODE) {
            console.log(`   ⚠️ Rejecting best match "${bestMatch.questionText?.substring(0, 60)}..." - missing answer data for comparison (current=${currentAnswerCount}, stored=${matchedAnswerCount})`);
          }
          return null;
        }

        // Skip answer count validation if we have high overlap (>80%)
        // This allows matching when one version has "I don't know" and the other doesn't
        if (currentAnswerCount > 0 && matchedAnswerCount > 0 && currentAnswerCount !== matchedAnswerCount) {
          const overlapPercent = bestOverlap !== null ? (bestOverlap * 100).toFixed(1) : 'N/A';
          
          // Allow mismatch if overlap is very high (indicates IDK was filtered)
          if (bestOverlap !== null && bestOverlap >= 0.8) {
            console.log(`✅ Accepting match despite count mismatch (current=${currentAnswerCount}, stored=${matchedAnswerCount}) due to high overlap (${overlapPercent}%)`);
          } else {
            console.log(`⚠️ Best match rejected due to answer count mismatch (current=${currentAnswerCount}, matched=${matchedAnswerCount}, overlap=${overlapPercent}%)`);
            return null;
          }
        }

        const combinedThreshold = bestOverlap !== null ? SMART_CONFIG.FLEX_MIN_COMBINED_SCORE : SMART_CONFIG.FLEX_MIN_SINGLE_OPTION_SIMILARITY;
        const similarityThreshold = bestOverlap !== null ? SMART_CONFIG.FLEX_MIN_SIMILARITY : SMART_CONFIG.FLEX_MIN_SINGLE_OPTION_SIMILARITY;

        if (bestOverlap !== null && bestCombinedScore < combinedThreshold) {
          if (SMART_CONFIG.DEBUG_MODE) {
            console.log(`   ⚠️ Rejecting best match - combined score ${(bestCombinedScore * 100).toFixed(1)}% below ${(combinedThreshold * 100).toFixed(1)}% minimum`);
          }
          return null;
        }

        if (bestSimilarity < similarityThreshold) {
          if (SMART_CONFIG.DEBUG_MODE) {
            console.log(`   ⚠️ Rejecting best match - similarity ${(bestSimilarity * 100).toFixed(1)}% below ${(similarityThreshold * 100).toFixed(1)}% minimum`);
          }
          return null;
        }

        if (bestOverlap !== null && bestOverlap < SMART_CONFIG.ANSWER_OVERLAP_MIN) {
          if (SMART_CONFIG.DEBUG_MODE) {
            console.log(`   ⚠️ Rejecting best match - answer overlap ${(bestOverlap * 100).toFixed(1)}% below ${(SMART_CONFIG.ANSWER_OVERLAP_MIN * 100).toFixed(1)}% minimum`);
          }
          return null;
        }

        if (bestOverlap !== null) {
          console.log(`✅ Flexible match locked with ${(bestSimilarity * 100).toFixed(1)}% similarity and ${(bestOverlap * 100).toFixed(1)}% answer overlap`);
        } else {
          console.log(`✅ Flexible match locked with ${(bestSimilarity * 100).toFixed(1)}% similarity (single-option question)`);
        }
        return bestMatch;
      }
      
      // Strategy 4: Last resort - try partial word matching
      const partialMatch = this.findByPartialWords(questionDetails, currentAnswerCount);
      if (partialMatch) {
        console.log(`✅ Partial word match found!`);
        return partialMatch;
      }
      
      console.log(`❌ No match found (best: ${(bestSimilarity * 100).toFixed(1)}%)`);
      return null;
    }
    
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(startTime, foundMatch) {
      const processingTime = Date.now() - startTime;
      
      if (foundMatch) {
        this.performanceMetrics.matchesFound++;
      }
      
      this.performanceMetrics.averageProcessingTime = 
        (this.performanceMetrics.averageProcessingTime + processingTime) / 2;
    }
    
    /**
     * Get performance statistics
     */
    getPerformanceStats() {
      const accuracy = this.performanceMetrics.questionsProcessed > 0 ? 
        (this.performanceMetrics.matchesFound / this.performanceMetrics.questionsProcessed) * 100 : 0;
      
      return {
        questionsProcessed: this.performanceMetrics.questionsProcessed,
        matchesFound: this.performanceMetrics.matchesFound,
        accuracy: Math.round(accuracy),
        averageProcessingTime: Math.round(this.performanceMetrics.averageProcessingTime),
        cacheHits: this.performanceMetrics.cacheHits,
        componentsInitialized: {
          questionAnalyzer: !!this.questionAnalyzer,
          advancedMatcher: !!this.advancedMatcher,
          progressiveDisplay: !!this.progressiveDisplay
        }
      };
    }

    /**
     * Extract concise answer information from stored question object
     */
    getConciseAnswerFromStored(stored) {
      if (!stored) return null;

      // Priority: explicit selectedAnswer, then correctAnswers array, then correctAnswerIndices
      if (stored.selectedAnswer) {
        return { text: stored.selectedAnswer, source: 'selectedAnswer' };
      }

      if (Array.isArray(stored.correctAnswers) && stored.correctAnswers.length > 0) {
        const first = stored.correctAnswers[0];
        if (typeof first === 'string') return { text: first, source: 'correctAnswers' };
        if (first && first.text) return { text: first.text, source: 'correctAnswers' };
      }

      if (Array.isArray(stored.correctAnswerIndices) && stored.correctAnswerIndices.length > 0 && Array.isArray(stored.allAnswers)) {
        const idx = stored.correctAnswerIndices[0];
        if (typeof idx === 'number' && stored.allAnswers[idx]) {
          return { text: stored.allAnswers[idx], source: 'correctAnswerIndices' };
        }
      }

      // If stored has answers flagged as isCorrect
      if (Array.isArray(stored.allAnswers)) {
        for (const ans of stored.allAnswers) {
          if (ans && (ans.isCorrect || ans.correct)) {
            return { text: ans.text || ans, source: 'allAnswersFlagged' };
          }
        }
      }

      return null;
    }

    /**
     * Highlight the correct answer on the page (like browser find/select)
     */
    showConciseAnswerPopup(answerObj, matchingQuestion, questionDetails) {
      try {
        this.clearAnswerDisplay();

        console.log('🎯 Highlighting answer on page:', answerObj.text);

        // Get answer elements from the page
        const answerElements = questionDetails.answerElements || this.getAnswerButtons();
        
        if (!answerElements || answerElements.length === 0) {
          console.warn('No answer elements found on page');
          return;
        }

        const targetAnswer = this.cleanAnswerText(answerObj.text);
        let highlightedCount = 0;

        // Find and highlight matching answer(s)
        for (const element of answerElements) {
          // Get the label or parent container
          const container = element.closest('label') || 
                          element.parentElement?.closest('label') || 
                          element.parentElement;
          
          if (!container) continue;

          // Get answer text from container
          const answerText = this.cleanAnswerText(container.textContent || '');
          
          // Check if this is the correct answer
          if (this.isAnswerMatch(answerText, targetAnswer)) {
            // Apply highlight styling (like browser find)
            this.highlightAnswerElement(container);
            highlightedCount++;
            
            // Scroll into view smoothly
            setTimeout(() => {
              container.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
              });
            }, 100);
          }
        }

        if (highlightedCount > 0) {
          console.log(`✅ Highlighted ${highlightedCount} matching answer(s)`);
          
          // Show brief toast notification
          this.showToastNotification(`✓ Answer highlighted (${highlightedCount} match${highlightedCount > 1 ? 'es' : ''})`);
        } else {
          console.warn('No matching answer found on page');
          this.showToastNotification('⚠️ Answer found in data but not on page', 'warning');
        }

      } catch (e) {
        console.error('Failed to highlight answer on page', e);
      }
    }

    /**
     * Highlight an answer element with find/select-like styling
     */
    highlightAnswerElement(element) {
      // Apply bright text color highlighting instead of background
      element.style.cssText += `
        color: #FF8C00 !important;
        border: 3px solid #FF8C00 !important;
        border-radius: 8px !important;
        padding: 12px !important;
        margin: 8px 0 !important;
        box-shadow: 0 0 12px rgba(255, 140, 0, 0.4) !important;
        transition: all 0.3s ease !important;
        font-weight: 700 !important;
        position: relative !important;
        z-index: 100 !important;
      `;
      
      // Also apply color to all text-containing children for visibility
      const textElements = element.querySelectorAll('*');
      textElements.forEach(el => {
        el.style.color = '#FF8C00';
        el.style.fontWeight = '700';
      });

      // Animation is no longer needed since we're not using background
      // Remove the animation style injection code
    }

    /**
     * Show a brief toast notification at the top of the page
     */
    showToastNotification(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = 'alx-toast-notification';
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10B981' : '#F59E0B'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 500;
        animation: slideDown 0.3s ease-out;
      `;
      toast.textContent = message;

      // Add animation
      if (!document.getElementById('alx-toast-animation')) {
        const style = document.createElement('style');
        style.id = 'alx-toast-animation';
        style.textContent = `
          @keyframes slideDown {
            from { transform: translate(-50%, -100%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translate(-50%, 0); opacity: 1; }
            to { transform: translate(-50%, -100%); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(toast);

      // Auto remove after 3 seconds
      setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    /**
     * Clean answer text for comparison
     */
    cleanAnswerText(text) {
      if (!text) return '';
      
      let cleaned = text.trim();
      
      // Remove answer prefixes (A., B., C., D., etc.)
      cleaned = cleaned.replace(/^[A-Z]\.\s*/i, '');
      cleaned = cleaned.replace(/^\([A-Z]\)\s*/i, '');
      
      // Remove trailing markers
      cleaned = cleaned.replace(/\s*\([A-Z]\)\s*$/i, '');
      
      // Normalize whitespace
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      
      return cleaned.toLowerCase();
    }

    /**
     * Check if two answer texts match
     */
    isAnswerMatch(answer1, answer2) {
      if (!answer1 || !answer2) return false;
      
      const a1 = this.cleanAnswerText(answer1);
      const a2 = this.cleanAnswerText(answer2);
      
      // Exact match
      if (a1 === a2) return true;
      
      // Contains match (for partial answers)
      if (a1.includes(a2) || a2.includes(a1)) return true;
      
      // Word overlap match (70% threshold)
      const words1 = a1.split(' ').filter(w => w.length > 2);
      const words2 = a2.split(' ').filter(w => w.length > 2);
      
      if (words1.length === 0 || words2.length === 0) return false;
      
      const commonWords = words1.filter(w => words2.includes(w)).length;
      const maxWords = Math.max(words1.length, words2.length);
      const similarity = commonWords / maxWords;
      
      return similarity >= 0.7;
    }
    
    /**
     * Enhanced keyword-based matching with better scoring
     */
    findByKeywords(questionDetails, currentAnswerCount = 0) {
      const currentText = typeof questionDetails === 'string'
        ? questionDetails
        : (questionDetails.questionText || '');
      const currentLower = currentText.toLowerCase();
      const currentAnswerOptions = (typeof questionDetails === 'object' && Array.isArray(questionDetails.answerOptions))
        ? questionDetails.answerOptions
        : [];

      // Enhanced signatures with weighted keywords
      const signatures = [
        {
          name: 'augmented_matrix',
          keywords: [
            { term: 'augmented', weight: 3 },
            { term: 'matrix', weight: 3 },
            { term: 'system', weight: 2 },
            { term: 'linear', weight: 2 },
            { term: 'equations', weight: 2 }
          ],
          minScore: 6
        },
        {
          name: 'gaussian_elimination',
          keywords: [
            { term: 'gaussian', weight: 3 },
            { term: 'elimination', weight: 3 },
            { term: 'solve', weight: 2 },
            { term: 'system', weight: 2 },
            { term: 'row', weight: 1 }
          ],
          minScore: 5
        },
        {
          name: 'determinant',
          keywords: [
            { term: 'determinant', weight: 4 },
            { term: 'matrix', weight: 2 },
            { term: 'calculate', weight: 1 },
            { term: 'find', weight: 1 }
          ],
          minScore: 4
        },
        {
          name: 'cramer_rule',
          keywords: [
            { term: 'cramer', weight: 4 },
            { term: 'rule', weight: 2 },
            { term: 'solve', weight: 2 },
            { term: 'system', weight: 1 }
          ],
          minScore: 4
        },
        {
          name: 'matrix_operations',
          keywords: [
            { term: 'matrix', weight: 2 },
            { term: 'inverse', weight: 3 },
            { term: 'multiply', weight: 2 },
            { term: 'transpose', weight: 2 }
          ],
          minScore: 4
        },
        {
          name: 'linear_equations',
          keywords: [
            { term: 'linear', weight: 2 },
            { term: 'equations', weight: 2 },
            { term: 'solve', weight: 2 },
            { term: 'system', weight: 2 }
          ],
          minScore: 5
        }
      ];

      let bestMatch = null;
      let bestScore = 0;
      let bestSignature = null;

      for (const storedQuestion of this.storedData) {
        if (!storedQuestion.questionText) continue;

        // Validate answer count first
        const storedAnswerCount = storedQuestion.answers?.length || 0;
        if (currentAnswerCount > 0 && storedAnswerCount > 0 && currentAnswerCount !== storedAnswerCount) {
          continue; // Skip questions with different answer counts
        }

        const overlapInfo = this.calculateAnswerOverlap({ answerOptions: currentAnswerOptions }, storedQuestion);
        const overlapEvaluation = this.evaluateAnswerOverlap(overlapInfo);
        if (!overlapEvaluation.isSufficient) {
          continue;
        }

        const storedLower = storedQuestion.questionText.toLowerCase();

        for (const signature of signatures) {
          let currentScore = 0;
          let storedScore = 0;

          // Calculate scores for current question
          for (const keyword of signature.keywords) {
            if (currentLower.includes(keyword.term)) {
              currentScore += keyword.weight;
            }
          }

          // Calculate scores for stored question
          for (const keyword of signature.keywords) {
            if (storedLower.includes(keyword.term)) {
              storedScore += keyword.weight;
            }
          }

          // Both questions must meet minimum threshold
          if (currentScore >= signature.minScore && storedScore >= signature.minScore) {
            // Combined score with bonus for exact matches
            const combinedScore = (currentScore + storedScore) / 2;
            const exactBonus = (currentScore === storedScore) ? 2 : 0;

            const finalScore = combinedScore + exactBonus;

            if (finalScore > bestScore) {
              bestScore = finalScore;
              bestMatch = storedQuestion;
              bestSignature = signature.name;
            }
          }
        }
      }

      if (bestMatch) {
        console.log(`🎯 Enhanced keyword match found: ${bestSignature} (score: ${bestScore.toFixed(1)})`);
      }

      return bestMatch;
    }
    
    /**
     * Find matches by partial word overlap
     */
    findByPartialWords(questionDetails, currentAnswerCount = 0) {
      const currentText = typeof questionDetails === 'string'
        ? questionDetails
        : (questionDetails.questionText || '');
      const currentWords = currentText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const currentAnswerOptions = (typeof questionDetails === 'object' && Array.isArray(questionDetails.answerOptions))
        ? questionDetails.answerOptions
        : [];
      
      for (const storedQuestion of this.storedData) {
        if (!storedQuestion.questionText) continue;
        
        // Validate answer count first
        const storedAnswerCount = storedQuestion.answers?.length || 0;
        if (currentAnswerCount > 0 && storedAnswerCount > 0 && currentAnswerCount !== storedAnswerCount) {
          continue; // Skip questions with different answer counts
        }
        
        const storedWords = storedQuestion.questionText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const overlapInfo = this.calculateAnswerOverlap({ answerOptions: currentAnswerOptions }, storedQuestion);
        const overlapEvaluation = this.evaluateAnswerOverlap(overlapInfo);
        if (!overlapEvaluation.isSufficient) {
          continue;
        }
        const commonWords = currentWords.filter(word => storedWords.includes(word));
        
        if (commonWords.length >= 2) {
          console.log(`🔗 Partial word match: [${commonWords.join(', ')}]`);
          return storedQuestion;
        }
      }
      
      return null;
    }
    
    /**
     * Enhanced similarity calculation with weighted scoring
     */
    calculateQuestionSimilarity(question1, question2) {
      if (!question1 || !question2) return 0;
      if (question1 === question2) return 1.0;

      // Multiple similarity measures for better accuracy
      const similarities = {
        wordOverlap: this.calculateWordOverlapSimilarity(question1, question2),
        keywordMatch: this.calculateKeywordSimilarity(question1, question2),
        semanticMatch: this.calculateSemanticSimilarity(question1, question2),
        structuralMatch: this.calculateStructuralSimilarity(question1, question2)
      };

      // Weighted combination (adjust weights based on question type)
      const weights = {
        wordOverlap: 0.3,
        keywordMatch: 0.4,
        semanticMatch: 0.2,
        structuralMatch: 0.1
      };

      let totalSimilarity = 0;
      let totalWeight = 0;

      for (const [key, similarity] of Object.entries(similarities)) {
        const weight = weights[key];
        totalSimilarity += similarity * weight;
        totalWeight += weight;
      }

      return totalWeight > 0 ? Math.min(1.0, totalSimilarity / totalWeight) : 0;
    }

    /**
     * Calculate word overlap similarity
     */
    calculateWordOverlapSimilarity(text1, text2) {
      const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
      const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

      if (words1.size === 0 && words2.size === 0) return 1.0;
      if (words1.size === 0 || words2.size === 0) return 0.0;

      const intersection = new Set([...words1].filter(w => words2.has(w)));
      const union = new Set([...words1, ...words2]);

      return intersection.size / union.size;
    }

    /**
     * Calculate keyword-based similarity
     */
    calculateKeywordSimilarity(text1, text2) {
      // Use the initialized analyzer instance, or simple fallback
      let keywords1, keywords2;
      
      if (this.analyzer && typeof this.analyzer.extractKeywords === 'function') {
        keywords1 = new Set(this.analyzer.extractKeywords(text1));
        keywords2 = new Set(this.analyzer.extractKeywords(text2));
      } else {
        // Simple fallback: use first 10 words as keywords
        keywords1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 10));
        keywords2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 10));
      }

      if (keywords1.size === 0 && keywords2.size === 0) return 1.0;
      if (keywords1.size === 0 || keywords2.size === 0) return 0.0;

      const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
      const union = new Set([...keywords1, ...keywords2]);

      return intersection.size / union.size;
    }

    /**
     * Calculate semantic similarity based on math/programming concepts
     */
    calculateSemanticSimilarity(text1, text2) {
      const mathTerms = [
        'matrix', 'determinant', 'cramer', 'gaussian', 'elimination', 'system',
        'equations', 'linear', 'solve', 'calculate', 'function', 'variable',
        'equation', 'expression', 'derivative', 'integral', 'graph', 'plot'
      ];

      const text1Lower = text1.toLowerCase();
      const text2Lower = text2.toLowerCase();

      let commonTerms = 0;
      let totalTerms = 0;

      for (const term of mathTerms) {
        const inText1 = text1Lower.includes(term);
        const inText2 = text2Lower.includes(term);

        if (inText1 || inText2) {
          totalTerms++;
          if (inText1 && inText2) {
            commonTerms++;
          }
        }
      }

      return totalTerms > 0 ? commonTerms / totalTerms : 0.5;
    }

    /**
     * Calculate structural similarity (length, format, etc.)
     */
    calculateStructuralSimilarity(text1, text2) {
      let similarity = 0;
      let factors = 0;

      // Length similarity
      const len1 = text1.length;
      const len2 = text2.length;
      const lengthRatio = Math.min(len1, len2) / Math.max(len1, len2);
      similarity += lengthRatio;
      factors++;

      // Word count similarity
      const words1 = text1.split(/\s+/).length;
      const words2 = text2.split(/\s+/).length;
      const wordRatio = Math.min(words1, words2) / Math.max(words1, words2);
      similarity += wordRatio;
      factors++;

      // Question mark presence
      const hasQuestion1 = text1.includes('?');
      const hasQuestion2 = text2.includes('?');
      if (hasQuestion1 === hasQuestion2) {
        similarity += 1;
      }
      factors++;

      // Mathematical symbols presence
      const mathSymbols1 = (text1.match(/[+\-*/=]/g) || []).length;
      const mathSymbols2 = (text2.match(/[+\-*/=]/g) || []).length;
      const symbolRatio = Math.min(mathSymbols1, mathSymbols2) / Math.max(mathSymbols1, mathSymbols2, 1);
      similarity += symbolRatio;
      factors++;

      return factors > 0 ? similarity / factors : 0;
    }

    /**
     * Find matches based on math keywords
     */
    findKeywordBasedMatch(questionDetails) {
      const currentKeywords = this.extractMathTerms(questionDetails.questionText);

      if (currentKeywords.length === 0) return null;

      for (const storedQuestion of this.storedData) {
        if (!storedQuestion.questionText) continue;

        const storedKeywords = this.extractMathTerms(storedQuestion.questionText);
        const commonKeywords = currentKeywords.filter(keyword =>
          storedKeywords.some(stored => stored.includes(keyword) || keyword.includes(stored))
        );

        const overlapInfo = this.calculateAnswerOverlap(questionDetails, storedQuestion);
        const overlapEvaluation = this.evaluateAnswerOverlap(overlapInfo);
        if (!overlapEvaluation.isSufficient) {
          continue;
        }

        if (commonKeywords.length >= 1) {
          console.log(`🎯 Keyword match with terms: [${commonKeywords.join(', ')}]`);
          return storedQuestion;
        }
      }

      return null;
    }

    /**
     * Extract mathematical terms from question text
     */
    extractMathTerms(text) {
      if (!text) return [];

      const mathTerms = [
        'matrix', 'matrices', 'augmented', 'gaussian', 'elimination', 'determinant',
        'system', 'equations', 'linear', 'solve', 'row', 'column',
        'sequence', 'arithmetic', 'geometric', 'series', 'term', 'sum'
      ];

      const found = [];
      const normalizedText = text.toLowerCase();

      for (const term of mathTerms) {
        if (normalizedText.includes(term)) {
          found.push(term);
        }
      }

      return found;
    }

    /**
     * Extract question text safely from various data structures
     */
    extractQuestionText(question) {
      if (!question) return 'N/A';
      
      // If it's already a string, return it
      if (typeof question === 'string') return question;
      
      // If it's an object, try to extract text
      if (typeof question === 'object') {
        // Try common property names
        if (typeof question.text === 'string') return question.text;
        if (typeof question.questionText === 'string') return question.questionText;
        if (typeof question.content === 'string') return question.content;
        if (typeof question.title === 'string') return question.title;
        
        // If it has a toString method that's not the default
        if (question.toString && question.toString !== Object.prototype.toString) {
          const str = question.toString();
          if (str !== '[object Object]') return str;
        }
      }
      
      // Last resort
      return String(question);
    }

    /**
     * Report incorrect answer to error handling system
     */
    reportIncorrect(questionText, matchingQuestion) {
      try {
        console.warn('📝 User reported incorrect answer:', {
          question: questionText.substring(0, 100),
          providedAnswer: matchingQuestion.correctAnswers
        });
        
        // Show user feedback
        alert('Thank you for reporting this issue. This will help improve answer accuracy.');
        
        // Log to error handling system if available
        if (window.ErrorHandler) {
          window.ErrorHandler.logError(new Error('User reported incorrect answer'), {
            context: 'Answer Feedback',
            question: questionText,
            answer: matchingQuestion.correctAnswers
          });
        }
      } catch (error) {
        console.error('Failed to report incorrect answer:', error);
      }
    }

    /**
     * Show detailed information about the match
     */
    showDetails(matchingQuestion) {
      try {
        const details = {
          'Question': matchingQuestion.questionText?.substring(0, 200) || 'N/A',
          'Course': matchingQuestion.courseName || 'Unknown',
          'Test': matchingQuestion.testName || 'Unknown',
          'Strategy': matchingQuestion.strategy || 'N/A',
          'Confidence': matchingQuestion.confidence ? `${(matchingQuestion.confidence * 100).toFixed(0)}%` : 'N/A',
          'Correct Answers': matchingQuestion.correctAnswers?.length || 0,
          'Has Images': matchingQuestion.correctAnswerImages?.length > 0 ? 'Yes' : 'No'
        };
        
        const detailsText = Object.entries(details)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        
        console.log('📊 Match Details:', details);
        alert(`Match Details:\n\n${detailsText}`);
      } catch (error) {
        console.error('Failed to show details:', error);
        alert('Unable to show details at this time.');
      }
    }

    /**
     * Process matching question with enhanced display
     */
    processMatchingQuestion(matchingQuestion, questionDetails) {
      const questionText = this.extractQuestionText(matchingQuestion.questionText || matchingQuestion.question);
      
      console.log('🎯 Processing enhanced matching question:', {
        questionText: questionText.substring(0, 100) + '...',
        courseName: matchingQuestion.courseName,
        testName: matchingQuestion.testName,
        correctAnswerImages: matchingQuestion.correctAnswerImages?.length || 0,
        correctAnswers: matchingQuestion.correctAnswers?.length || 0,
        correctAnswerIndices: matchingQuestion.correctAnswerIndices?.length || 0
      });
      
      // Validate that we have actual answer data
      const hasValidAnswerData = (
        (matchingQuestion.correctAnswerIndices && matchingQuestion.correctAnswerIndices.length > 0) ||
        (matchingQuestion.correctAnswers && matchingQuestion.correctAnswers.length > 0) ||
        (matchingQuestion.answers && matchingQuestion.answers.some(a => a.isCorrect || a.correct))
      );
      
      if (!hasValidAnswerData) {
        console.error('❌ Matched question has no valid answer data! Skipping display.');
        console.error('Match data:', matchingQuestion);
        return;
      }

      try {
        // Validate question data before using progressive display
        const hasValidQuestionData = matchingQuestion.questionText && 
                                      questionDetails.questionText && 
                                      questionDetails.questionText.length > 5;

        // Progressive display disabled - using legacy display which works perfectly
        // (Progressive display was causing duplicate popups)
        if (!this.settings.showPopupAnswer) {
          console.log('⏭️ Popup answer disabled by settings');
        }
        
        // Skip progressive display if data is invalid
        if (!hasValidQuestionData) {
          console.warn('⚠️ Invalid question data, skipping progressive display');
        }
        
        // Fallback to original display logic (includes page highlighting)
        this.processMatchingQuestionLegacy(matchingQuestion, questionDetails);
        
      } catch (error) {
        console.error('Enhanced answer display failed:', error);
        // Fallback to original display
        this.processMatchingQuestionLegacy(matchingQuestion, questionDetails);
      }
    }
    
    /**
     * Original matching question processing logic as fallback
     */
    processMatchingQuestionLegacy(matchingQuestion, questionDetails) {
      // Clear any existing progressive display popups first
      this.clearProgressiveDisplayPopups();
      
      // Check if the stored answer has images
      const correctAnswers = this.getCorrectAnswerInfo(matchingQuestion);
      console.log('📋 Extracted correct answers:', correctAnswers);
      
      const hasAnswerImages = correctAnswers.some(answer => answer.imageUrl || answer.hasImage);
      console.log('🖼️ Has answer images:', hasAnswerImages);
      
      // Show popup if enabled
      if (this.settings.showPopupAnswer) {
        console.log('📺 Showing comprehensive answer display');
        this.showImageAnswerDisplay(matchingQuestion, questionDetails);
        
        // Highlight answers on the page if ALSO enabled (with delay after popup)
        if (this.settings.showPageHighlight && !hasAnswerImages && !questionDetails.hasImages) {
          console.log('✨ Also highlighting answers on page (with popup)');
          setTimeout(() => {
            this.showTextAnswerHighlight(matchingQuestion, questionDetails, false); // Don't show notification
          }, 500); // Small delay to show popup first
        }
      } else if (this.settings.showPageHighlight && !hasAnswerImages && !questionDetails.hasImages) {
        // Popup disabled but highlighting enabled - show ONLY highlighting
        console.log('✨ Highlighting answers on page (no popup)');
        this.showTextAnswerHighlight(matchingQuestion, questionDetails, false);
      } else {
        console.log('⏭️ Both popup and highlighting disabled');
      }
    }

    /**
     * Show image answer display with improved controls
     */
    showImageAnswerDisplay(matchingQuestion, questionDetails) {
      console.log('🚀 showImageAnswerDisplay called - ENHANCED VERSION');
      
      const questionText = this.extractQuestionText(matchingQuestion.questionText || matchingQuestion.question);
      
      console.log('📊 Matching question data:', {
        questionText: questionText.substring(0, 50),
        courseName: matchingQuestion.courseName || 'N/A',
        correctAnswerImages: matchingQuestion.correctAnswerImages?.length || 0
      });
      
      // Remove any existing display
      this.clearAnswerDisplay();

      const correctAnswers = this.getCorrectAnswerInfo(matchingQuestion);
      console.log('🖼️ showImageAnswerDisplay - correctAnswers:', correctAnswers);

      if (!correctAnswers || correctAnswers.length === 0) {
        console.log('❌ No correct answers found, creating fallback answer');
        correctAnswers.push({
          letter: 'A',
          text: 'Correct Answer Found',
          index: 0,
          isCorrect: true
        });
      }

      const imageDisplay = document.createElement('div');
      imageDisplay.id = 'alx-smart-image-display';
      imageDisplay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        max-height: 600px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.4);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        z-index: 10000;
        overflow-y: auto;
        backdrop-filter: blur(15px);
        border: 1px solid rgba(255,255,255,0.2);
        animation: slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      `;

      // Extract correct answer info

      imageDisplay.innerHTML = `
        <style>
          @keyframes slideInRight {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
          }
          .answer-preview {
            background: rgba(255,255,255,0.1);
            margin: 8px 0;
            padding: 12px;
            border-radius: 10px;
            border-left: 4px solid #4CAF50;
            transition: all 0.3s ease;
          }
          .answer-preview:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-2px);
          }
          .popup-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 15px;
            cursor: pointer;
            font-size: 12px;
            margin: 5px;
            transition: all 0.3s ease;
          }
          .popup-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: scale(1.05);
          }
          .popup-btn.pinned {
            background: #4CAF50;
          }
        </style>

        <div style="padding: 20px;">
          <div style="text-align: right; margin-bottom: 10px;">
            <button class="popup-btn" id="pinButton" title="Pin to prevent auto-close">📌 Pin</button>
            <button class="popup-btn" id="closeButton" title="Close popup">× Close</button>
          </div>

          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <div style="background: #4CAF50; width: 24px; height: 24px; border-radius: 50%; margin-right: 12px; display: flex; align-items: center; justify-content: center;">
              ✓
            </div>
            <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Answer Found!</h3>
          </div>

          <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 10px; margin-bottom: 16px;">
            <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">📚 ${matchingQuestion.courseName || this.currentCourse || 'Unknown Course'} - ${matchingQuestion.testName || 'Week ' + (this.currentWeek || 'N/A')}</div>
            <div style="font-size: 13px; font-style: italic;">"${questionText.substring(0, 80)}..."</div>
          </div>

          ${correctAnswers.map((answer, index) => {
            console.log(`🔍 Rendering answer ${index}:`, answer);
            return `
              <div class="answer-preview">
                <div style="font-weight: 600; margin-bottom: 8px; color: #4CAF50;">✅ Answer ${answer.letter || String.fromCharCode(65 + index)}:</div>
                ${answer.text ? `<div style="margin-bottom: 8px; font-size: 14px; line-height: 1.4;">${answer.text}</div>` : ''}
                ${answer.imageUrl ? `
                  <div style="margin-top: 8px;">
                    <img src="${answer.imageUrl}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" alt="Correct Answer" onload="console.log('✅ Image loaded successfully:', String(this.src).substring(0, 50))" onerror="console.error('❌ Image failed to load:', this.src)">
                  </div>
                ` : ''}
                ${(!answer.text && !answer.imageUrl) ? `<div style="font-style: italic; opacity: 0.7;">Answer option ${answer.letter || String.fromCharCode(65 + index)}</div>` : ''}
              </div>
            `;
          }).join('')}

          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2);">
            <div style="display: flex; gap: 10px;">
              <button class="popup-btn" id="alx-report-btn" style="flex: 1;">📝 Report Incorrect</button>
              <button class="popup-btn" id="alx-details-btn" style="flex: 1;">ℹ️ View Details</button>
            </div>
          </div>

          <div style="margin-top: 12px; font-size: 11px; opacity: 0.7; text-align: center;">
            <div id="timerDisplay">Auto-close in <span id="countdown">${this.settings.popupDuration}</span>s</div>
          </div>
        </div>
      `;

      document.body.appendChild(imageDisplay);

      // Enhanced controls
      this.setupPopupControls(imageDisplay);

      // Add event listeners for Report and Details buttons
      const reportBtn = imageDisplay.querySelector('#alx-report-btn');
      const detailsBtn = imageDisplay.querySelector('#alx-details-btn');
      
      if (reportBtn) {
        reportBtn.addEventListener('click', () => this.reportIncorrect(questionText, matchingQuestion));
      }
      
      if (detailsBtn) {
        detailsBtn.addEventListener('click', () => this.showDetails(matchingQuestion));
      }

      console.log('🖼️ Image answer display shown with enhanced controls');
    }

    /**
     * Setup popup controls (pin, close, timer)
     */
    setupPopupControls(imageDisplay) {
      let isPinned = false;
      let timeLeft = this.settings.popupDuration; // Use setting
      let countdownInterval = null;

      const pinButton = imageDisplay.querySelector('#pinButton');
      const closeButton = imageDisplay.querySelector('#closeButton');
      const countdown = imageDisplay.querySelector('#countdown');
      const timerDisplay = imageDisplay.querySelector('#timerDisplay');

      // Pin functionality
      pinButton.addEventListener('click', () => {
        isPinned = !isPinned;
        pinButton.textContent = isPinned ? '📍 Pinned' : '📌 Pin';
        pinButton.classList.toggle('pinned', isPinned);

        if (isPinned) {
          clearInterval(countdownInterval);
          timerDisplay.textContent = 'Pinned - will not auto-close';
        } else {
          timeLeft = this.settings.popupDuration; // Use setting
          startTimer();
        }
      });

      // Close functionality
      closeButton.addEventListener('click', () => {
        clearInterval(countdownInterval);
        imageDisplay.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
          if (imageDisplay && imageDisplay.parentElement) {
            imageDisplay.remove();
          }
        }, 300);
      });

      // Timer functionality
      function startTimer() {
        countdownInterval = setInterval(() => {
          timeLeft--;
          if (countdown) {
            countdown.textContent = timeLeft;
          }

          if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            if (!isPinned && imageDisplay && imageDisplay.parentElement) {
              imageDisplay.style.animation = 'slideOutRight 0.3s ease-in';
              setTimeout(() => imageDisplay.remove(), 300);
            }
          }
        }, 1000);
      }

      // Start timer initially
      startTimer();
    }

    /**
     * Show text answer highlighting
     */
    showTextAnswerHighlight(matchingQuestion, questionDetails, showNotification = true) {
      // Check if page highlighting is enabled
      if (!this.settings.showPageHighlight) {
        console.log('⏭️ Page highlighting disabled in settings - skipping');
        return;
      }
      
      console.log('🎯 showTextAnswerHighlight called');
      console.log('📊 Question details:', {
        answerElements: questionDetails.answerElements?.length || 0,
        answerOptions: questionDetails.answerOptions?.length || 0
      });
      
      if (showNotification) {
        this.clearAnswerDisplay();
      }

      const correctAnswers = this.getCorrectAnswerInfo(matchingQuestion);
      const answerElements = questionDetails.answerElements;

      if (!answerElements || answerElements.length === 0) {
        console.log('❌ No answer elements to highlight - cannot perform highlighting');
        return;
      }

      let highlightedCount = 0;

      // Highlight correct answers
      correctAnswers.forEach(correctAnswer => {
        answerElements.forEach((element, index) => {
          const answerText = questionDetails.answerOptions[index];

          if (this.isAnswerMatch(answerText, correctAnswer.text)) {
            this.highlightElement(element);
            highlightedCount++;
          }
        });
      });

      // Show notification only if requested (when used as primary display method)
      if (showNotification) {
        this.showNotification(`✅ Highlighted ${highlightedCount} correct answer(s)`);
      }

      console.log(`✅ Highlighted ${highlightedCount} correct answers`);
    }

    /**
     * Check if answer texts match
     */
    isAnswerMatch(answerText, correctText) {
      if (!answerText || !correctText) return false;

      const clean1 = answerText.toLowerCase().trim();
      const clean2 = correctText.toLowerCase().trim();

      return clean1.includes(clean2) || clean2.includes(clean1) || clean1 === clean2;
    }

    /**
     * Highlight an answer element
     */
    highlightElement(element) {
      // For React-based quiz: element itself might be the clickable container
      const target = element.classList && element.classList.contains('answer-option') 
        ? element 
        : (element.closest('label') || element.closest('.answer-option') || element.parentElement);
        
      if (target) {
        // Apply bright green text color instead of background
        target.style.cssText += `
          color: #2ed573 !important;
          font-weight: 600 !important;
          border: 2px solid #2ed573 !important;
          border-radius: 8px !important;
          padding: 8px !important;
          margin: 4px 0 !important;
          transition: all 0.3s ease !important;
        `;
        
        // Also apply color to all text-containing children
        const textElements = target.querySelectorAll('*');
        textElements.forEach(el => {
          el.style.color = '#2ed573';
          el.style.fontWeight = '600';
        });
        
        console.log('✅ Highlighted element:', target.textContent.substring(0, 50));
      }
    }

    /**
     * Get correct answer information
     */
    getCorrectAnswerInfo(matchingQuestion) {
      console.log('🔍 getCorrectAnswerInfo called with:', {
        correctAnswerIndices: matchingQuestion.correctAnswerIndices,
        correctAnswers: matchingQuestion.correctAnswers,
        correctAnswerImages: matchingQuestion.correctAnswerImages?.length || 0,
        correctAnswerTexts: matchingQuestion.correctAnswerTexts,
        answers: matchingQuestion.answers // Check for this field too
      });

      const answers = [];

      // Try correctAnswerIndices first (preferred format)
      if (matchingQuestion.correctAnswerIndices && matchingQuestion.correctAnswerIndices.length > 0) {
        matchingQuestion.correctAnswerIndices.forEach((index, i) => {
          const answer = {
            index: index,
            letter: String.fromCharCode(65 + index),
            text: matchingQuestion.correctAnswerTexts?.[i] || `Answer ${index + 1}`,
            isCorrect: true
          };

          // Check for image data from correctAnswerImages
          if (matchingQuestion.correctAnswerImages) {
            console.log(`🖼️ Looking for image for answer index ${index}`);
            const imageInfo = matchingQuestion.correctAnswerImages.find(img => img.answerIndex === index);
            console.log('🔍 Found image info:', imageInfo);
            
            if (imageInfo && imageInfo.imageData) {
              answer.imageUrl = imageInfo.imageData.dataURL || imageInfo.imageData.src;
              answer.hasImage = true;
              console.log('✅ Image URL set:', String(answer.imageUrl || '').substring(0, 50) + '...');
            } else {
              console.log('❌ No image data found for index', index);
            }
          }

          answers.push(answer);
        });
      } 
      // Try correctAnswers array
      else if (Array.isArray(matchingQuestion.correctAnswers) && matchingQuestion.correctAnswers.length > 0) {
        matchingQuestion.correctAnswers.forEach((answer, index) => {
          const answerInfo = {
            index: index,
            letter: String.fromCharCode(65 + index),
            text: answer.text || answer || `Answer ${index + 1}`,
            imageUrl: answer.imageUrl,
            isCorrect: true
          };

          // Check for image data from correctAnswerImages
          if (matchingQuestion.correctAnswerImages) {
            console.log(`🖼️ Looking for image for answer index ${index}`);
            const imageInfo = matchingQuestion.correctAnswerImages.find(img => img.answerIndex === index);
            console.log('🔍 Found image info:', imageInfo);
            
            if (imageInfo && imageInfo.imageData) {
              answerInfo.imageUrl = imageInfo.imageData.dataURL || imageInfo.imageData.src;
              answerInfo.hasImage = true;
              console.log('✅ Image URL set:', String(answerInfo.imageUrl || '').substring(0, 50) + '...');
            } else {
              console.log('❌ No image data found for index', index);
            }
          }

          answers.push(answerInfo);
        });
      }
      // Try answers array (alternative format)
      else if (Array.isArray(matchingQuestion.answers)) {
        matchingQuestion.answers.forEach((answer, index) => {
          // Check if answer is marked as correct
          if (answer.isCorrect || answer.correct) {
            const answerInfo = {
              index: index,
              letter: String.fromCharCode(65 + index),
              text: answer.text || `Answer ${index + 1}`,
              imageUrl: answer.imageUrl || answer.imageSrc,
              isCorrect: true
            };
            answers.push(answerInfo);
          }
        });
      }
      // Try correctAnswer (singular) - some formats use this
      else if (matchingQuestion.correctAnswer) {
        answers.push({
          index: 0,
          letter: 'A',
          text: matchingQuestion.correctAnswer.text || matchingQuestion.correctAnswer,
          imageUrl: matchingQuestion.correctAnswer.imageUrl,
          isCorrect: true
        });
      }

      console.log('📋 Final answers array:', answers);
      return answers;
    }

    /**
     * Show notification
     */
    showNotification(message) {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4);
        z-index: 10001;
        animation: slideInDown 0.5s ease;
      `;

      notification.innerHTML = `
        <style>
          @keyframes slideInDown {
            from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
        </style>
        ${message}
      `;

      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.animation = 'slideInDown 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }

    /**
     * Clear progressive display popups (No Match Found, Processing, etc.)
     */
    clearProgressiveDisplayPopups() {
      // Remove progressive display popups by class patterns
      const selectors = [
        '.progressive-answer-display',
        '.progressive-display-container',
        '[class*="progressive-display"]',
        '[id*="progressive-display"]'
      ];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          try {
            el.remove();
            console.log('🧹 Removed progressive display popup');
          } catch (error) {
            console.warn('Error removing progressive display:', error);
          }
        });
      });
    }

    /**
     * Clear all answer displays
     */
    clearAnswerDisplay() {
      // Clear progressive display popups first
      this.clearProgressiveDisplayPopups();
      
      // Remove image displays
      const existingDisplay = document.getElementById('alx-smart-image-display');
      if (existingDisplay) {
        existingDisplay.remove();
      }

      // Remove concise popups
      const concisePopup = document.getElementById('alx-smart-concise-popup');
      if (concisePopup) {
        concisePopup.remove();
      }

      // Remove toast notifications
      document.querySelectorAll('.alx-toast-notification').forEach(el => el.remove());

      // Remove highlights (both old green and new gold styles)
      document.querySelectorAll('[style*="4CAF50"], [style*="FFD700"], [style*="FFA500"]').forEach(el => {
        // Reset inline styles
        el.style.background = '';
        el.style.color = '';
        el.style.border = '';
        el.style.borderRadius = '';
        el.style.padding = '';
        el.style.margin = '';
        el.style.boxShadow = '';
        el.style.transform = '';
        el.style.transition = '';
        el.style.animation = '';
        el.style.fontWeight = '';
        el.style.position = '';
        el.style.zIndex = '';
        
        // If element has no other inline styles, remove the style attribute
        if (!el.style.cssText.trim()) {
          el.removeAttribute('style');
        }
      });
    }
  }
  
  // Initialize when page loads
  const assistant = new SmartAnswerAssistant();
  
  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => assistant.init());
  } else {
    assistant.init();
  }
  
  // Global access for popup
  window.smartAssistant = assistant;
  
  // Listen for popup messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'clearHighlights') {
      assistant.clearAnswerDisplay();
      sendResponse({status: 'success'});
    }
    
    if (request.action === 'smartAssist') {
      assistant.checkForCurrentQuestion();
      sendResponse({status: 'success'});
    }
    
    if (request.action === 'updateSettings') {
      assistant.updateSettings(request.settings);
      sendResponse({status: 'success'});
    }
  });
  
})();