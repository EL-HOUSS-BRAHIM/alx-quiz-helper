/**
 * Capture Script - Quiz Correction Data Scraper
 * Runs on: https://savanna.alxafrica.com/evaluation_quiz_corrections*
 * Captures questions, answers, and correct answer indicators
 */

(function() {
  'use strict';
  
  // Only run on correction pages
  if (!window.location.href.includes('evaluation_quiz_corrections')) {
    return;
  }
  
  console.log('ALX Quiz Capture Script: Starting...');
  
  // Configuration for capture process
  const CAPTURE_CONFIG = {
    MAX_WAIT_TIME: 30000, // 30 seconds max wait for page load
    RETRY_INTERVAL: 500,   // Check every 500ms
    MIN_QUESTIONS: 1       // Minimum questions to consider valid capture
  };
  
  // Common selectors for ALX quiz correction pages
  const SELECTORS = {
    // Try multiple possible question container selectors
    questionContainers: [
      '.question-container',
      '.quiz-question',
      '[class*="question"]',
      '.correction-item',
      '[data-question]',
      '.evaluation-question'
    ],
    
    // Answer-related selectors
    answers: [
      '.answer-option',
      '.quiz-answer',
      '[class*="answer"]',
      '.option',
      'input[type="radio"]',
      'input[type="checkbox"]'
    ],
    
    // Correct answer indicators
    correctIndicators: [
      '.eqc-result.text-primary.font-weight-bold', // ALX correct answers
      '.text-primary',                               // ALX correct styling
      '.correct',
      '.right-answer',
      '[class*="correct"]',
      'input:checked',
      '.selected',
      '.highlight'
    ]
  };
  
  /**
   * Main capture class
   */
  class QuizCapture {
    
    constructor() {
      this.capturedData = [];
      this.isCapturing = false;
      this.testName = null;
      this.courseName = null;
    }
    
    /**
     * Extract test name from the page
     */
    extractTestName() {
      try {
        // Try to find the test name in various formats
        // Pattern 1: "Evaluation Quiz: Week 13 Quiz"
        let testNameElement = document.querySelector('p strong');
        if (testNameElement && testNameElement.textContent.includes('Evaluation Quiz:')) {
          const fullText = testNameElement.parentElement.textContent.trim();
          const match = fullText.match(/Evaluation Quiz:\s*(.+)/);
          if (match) {
            console.log('Found test name (pattern 1):', match[1].trim());
            return match[1].trim();
          }
        }
        
        // Pattern 2: Look for any element containing "Evaluation Quiz:"
        const evaluationElements = Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent && el.textContent.includes('Evaluation Quiz:')
        );
        
        for (const element of evaluationElements) {
          const text = element.textContent.trim();
          const match = text.match(/Evaluation Quiz:\s*(.+?)(?:\n|$)/);
          if (match) {
            const testName = match[1].trim();
            // Remove any extra whitespace or HTML artifacts
            const cleanTestName = testName.replace(/\s+/g, ' ').trim();
            console.log('Found test name (pattern 2):', cleanTestName);
            return cleanTestName;
          }
        }
        
        // Pattern 3: Look for headings that might contain the test name
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (const heading of headings) {
          const text = heading.textContent.trim();
          if (text.includes('Week') && text.includes('Quiz')) {
            console.log('Found test name (pattern 3):', text);
            return text;
          }
        }
        
        console.log('Test name not found');
        return 'Unknown Test';
      } catch (error) {
        console.error('Error extracting test name:', error);
        return 'Unknown Test';
      }
    }
    
    /**
     * Extract course name from the active curriculum
     */
    extractCourseName() {
      try {
        // Look for the active course in the curriculum dropdown
        const curriculumContainer = document.querySelector('#student-switch-curriculum');
        if (curriculumContainer) {
          // Find the main (non-dropdown) course name - this is the active one
          const courseNameElement = curriculumContainer.querySelector('.fs-4.fw-semibold');
          if (courseNameElement) {
            const courseName = courseNameElement.textContent.trim();
            console.log('Found active course name:', courseName);
            return courseName;
          }
        }
        
        // Fallback: Look for any element with course code pattern
        const courseElements = Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent && el.textContent.match(/[A-Z]{2,3}\s+\d{3}:/)
        );
        
        if (courseElements.length > 0) {
          const courseName = courseElements[0].textContent.trim();
          console.log('Found course name (fallback):', courseName);
          return courseName;
        }
        
        console.log('Course name not found');
        return 'Unknown Course';
      } catch (error) {
        console.error('Error extracting course name:', error);
        return 'Unknown Course';
      }
    }
    
    /**
     * Wait for page to fully load with dynamic content
     */
    async waitForPageLoad() {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = CAPTURE_CONFIG.MAX_WAIT_TIME / CAPTURE_CONFIG.RETRY_INTERVAL;
        
        const checkPage = () => {
          attempts++;
          
          // Check if we have question containers
          const questions = this.findQuestionContainers();
          
          if (questions.length >= CAPTURE_CONFIG.MIN_QUESTIONS) {
            console.log(`Page loaded successfully with ${questions.length} questions`);
            resolve(questions);
            return;
          }
          
          if (attempts >= maxAttempts) {
            reject(new Error('Timeout waiting for page to load'));
            return;
          }
          
          setTimeout(checkPage, CAPTURE_CONFIG.RETRY_INTERVAL);
        };
        
        // Start checking immediately, then use MutationObserver for dynamic content
        checkPage();
        
        // Also watch for DOM changes
        const observer = new MutationObserver((mutations) => {
          const hasNewContent = mutations.some(mutation => 
            mutation.addedNodes.length > 0 && 
            Array.from(mutation.addedNodes).some(node => 
              node.nodeType === Node.ELEMENT_NODE
            )
          );
          
          if (hasNewContent) {
            checkPage();
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // Clean up observer when done
        setTimeout(() => observer.disconnect(), CAPTURE_CONFIG.MAX_WAIT_TIME);
      });
    }
    
    /**
     * Find question containers using multiple selector strategies
     */
    findQuestionContainers() {
      let questions = [];
      
      console.log('🔍 Starting question container search...');
      
      // First, try to find the main quiz container
      const quizContainer = document.querySelector('.quiz-container, .evaluation-container, .correction-container, [class*="quiz"], [class*="evaluation"]') || document.body;
      console.log('📦 Quiz container found:', quizContainer.tagName, quizContainer.className);
      
      // Debug: Log all potential elements
      console.log('🔍 All divs on page:', document.querySelectorAll('div').length);
      console.log('🔍 All sections on page:', document.querySelectorAll('section').length);
      console.log('🔍 All articles on page:', document.querySelectorAll('article').length);
      
      // For ALX quiz correction pages, look for the specific structure
      const alxQuestionContainers = document.querySelectorAll('div.clearfix.gap');
      console.log('🎯 Found ALX question containers:', alxQuestionContainers.length);
      
      if (alxQuestionContainers.length > 0) {
        console.log('✅ Using ALX-specific selectors...');
        questions = Array.from(alxQuestionContainers).filter((el, index) => {
          // Check if this container has a question header
          const questionHeader = el.querySelector('h4.evaluation_quiz_question');
          
          if (questionHeader) {
            const text = questionHeader.textContent.trim();
            const hasQuestionNumber = /^\d+\./.test(text);
            
            // Look for answer container in the main div, not just within the header
            const answerContainer = el.querySelector('.evaluation_quiz_question_answer, ul, ol, [class*="answer"]');
            const hasAnswers = answerContainer ? answerContainer.querySelectorAll('li, .answer, [class*="option"]').length > 0 : false;
            
            console.log(`📝 ALX Question ${index + 1}:`, {
              text: text.substring(0, 100) + '...',
              hasQuestionNumber,
              hasAnswers,
              textLength: text.length,
              answerContainerFound: !!answerContainer,
              answerCount: answerContainer ? answerContainer.querySelectorAll('li, .answer, [class*="option"]').length : 0
            });
            
            // Accept if it has a question number (more lenient for image-only questions)
            // Image questions might only have "18...." or "19...." as text
            if (hasQuestionNumber) {
              // Very short text might be image-only questions
              if (text.length <= 10) {
                console.log(`🖼️ Potential image-only question found: "${text}"`);
                return true; // Include image-only questions
              }
              return text.length > 10; // Normal text questions
            }
            return false;
          }
          return false;
        });
        
        if (questions.length > 0) {
          console.log(`✅ Found ${questions.length} valid ALX questions`);
          return questions;
        }
      }
      
      // Fallback to original logic
      const numberedQuestions = quizContainer.querySelectorAll('[class*="question"], .correction-item, .quiz-item');
      console.log('🔢 Found elements with question-related classes:', numberedQuestions.length);
      
      if (numberedQuestions.length > 0) {
        console.log('✅ Analyzing numbered questions...');
        // Filter to only include actual question containers
        questions = Array.from(numberedQuestions).filter((el, index) => {
          const text = el.textContent.trim();
          const hasQuestionNumber = /^\d+\./.test(text) || text.includes('Question');
          const hasReasonableLength = text.length > 30;
          const hasAnswerOptions = el.querySelectorAll('input[type="radio"], input[type="checkbox"], .answer, .option').length > 0;
          
          console.log(`📝 Question ${index + 1}:`, {
            text: text.substring(0, 100) + '...',
            hasQuestionNumber,
            hasReasonableLength,
            hasAnswerOptions,
            textLength: text.length
          });
          
          return hasQuestionNumber && hasReasonableLength && hasAnswerOptions;
        });
      }
      
      // Fallback: Look for elements with question patterns
      if (questions.length === 0) {
        console.log('🔄 Using fallback method...');
        const potentialQuestions = Array.from(quizContainer.querySelectorAll('div, section, article')).filter((el, index) => {
          const text = el.textContent.trim();
          
          // Check for question indicators
          const hasQuestionMarkers = (
            /^\d+\.\s/.test(text) || // Starts with "1. "
            text.includes('Question') ||
            text.includes('Choose') ||
            text.includes('Select') ||
            text.includes('Which') ||
            text.includes('What') ||
            text.includes('How') ||
            text.includes('Solve') ||
            text.includes('Determine') ||
            text.includes('Find') ||
            text.includes('Calculate')
          );
          
          // Must have reasonable length
          const hasReasonableLength = text.length > 20 && text.length < 2000;
          
          // Must contain answer options
          const hasAnswers = el.querySelectorAll('input[type="radio"], input[type="checkbox"], li, .option, .answer').length >= 2;
          
          // Should not be an answer option itself
          const isNotAnswer = !el.closest('label') && !el.querySelector('input[type="radio"], input[type="checkbox"]')?.closest('label');
          
          // Should not contain "I don't know" as the main content
          const isNotDontKnow = !text.trim().toLowerCase().startsWith("i don't know");
          
          if (index < 10) { // Debug first 10 elements
            console.log(`🧪 Potential question ${index + 1}:`, {
              text: text.substring(0, 100) + '...',
              textLength: text.length,
              hasQuestionMarkers,
              hasReasonableLength,
              hasAnswers,
              isNotAnswer,
              isNotDontKnow,
              passes: hasQuestionMarkers && hasReasonableLength && hasAnswers && isNotAnswer && isNotDontKnow
            });
          }
          
          return hasQuestionMarkers && hasReasonableLength && hasAnswers && isNotAnswer && isNotDontKnow;
        });
        
        console.log(`🔍 Found ${potentialQuestions.length} potential questions before deduplication`);
        
        // Remove nested questions (child questions inside parent questions)
        questions = potentialQuestions.filter(question => {
          return !potentialQuestions.some(otherQuestion => 
            otherQuestion !== question && otherQuestion.contains(question)
          );
        });
        
        console.log(`🔍 Found ${questions.length} questions after removing nested`);
      }
      
      // Final validation and deduplication
      const finalQuestions = questions.filter((question, index, arr) => {
        const text = question.textContent.trim();
        
        // Remove duplicates based on content
        const isDuplicate = arr.slice(0, index).some(prevQuestion => {
          const prevText = prevQuestion.textContent.trim();
          return text === prevText || (text.length > 50 && prevText.includes(text.substring(0, 50)));
        });
        
        // Remove if it's too short or doesn't look like a question
        // Be more lenient with image-only questions (they might have very short text)
        const hasQuestionNumber = /^\d+\./.test(text);
        const isTooShort = hasQuestionNumber ? text.length < 3 : text.length < 20; // Image questions can be very short
        const looksLikeAnswer = /^[A-E]\.\s/.test(text) || text.toLowerCase().startsWith("i don't know");
        
        const passes = !isDuplicate && !isTooShort && !looksLikeAnswer;
        
        console.log(`🎯 Final validation ${index + 1}:`, {
          text: text.substring(0, 80) + '...',
          isDuplicate,
          isTooShort,
          looksLikeAnswer,
          passes
        });
        
        return passes;
      });
      
      console.log(`✅ Final result: Found ${finalQuestions.length} valid questions`);
      
      // If still no questions found, let's see what's actually on the page
      if (finalQuestions.length === 0) {
        console.log('❌ No questions found. Debugging page structure...');
        console.log('📄 Page title:', document.title);
        console.log('🌐 Page URL:', window.location.href);
        console.log('📊 Total page text length:', document.body.textContent.length);
        
        // Log some sample content
        const allDivs = document.querySelectorAll('div');
        console.log('📝 Sample div contents (first 5):');
        for (let i = 0; i < Math.min(5, allDivs.length); i++) {
          const div = allDivs[i];
          const text = div.textContent.trim();
          if (text.length > 20) {
            console.log(`Div ${i + 1}:`, text.substring(0, 150) + '...');
          }
        }
        
        // Look for any text containing numbers
        const textWithNumbers = Array.from(allDivs).filter(div => /\d+\./.test(div.textContent));
        console.log('🔢 Elements with numbers:', textWithNumbers.length);
        if (textWithNumbers.length > 0) {
          console.log('First numbered element:', textWithNumbers[0].textContent.substring(0, 200));
        }
        
        // Emergency fallback: be much less strict but exclude dropdown items
        console.log('🚨 Trying emergency fallback...');
        const emergencyQuestions = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent.trim();
          const children = el.children.length;
          const hasNumber = /\d+\./.test(text);
          const hasText = text.length > 50 && text.length < 5000;
          const notScript = el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE';
          
          // Exclude dropdown menu items and navigation elements
          const isDropdownItem = el.closest('.dropdown-menu, .dropdown-item, .navbar, .nav-menu');
          const isNavigation = el.classList.contains('dropdown-item') || el.classList.contains('dropdown-menu');
          const containsCourseInfo = text.includes('Average:') && text.includes('%');
          
          if (hasNumber && hasText && notScript && children > 0 && !isDropdownItem && !isNavigation && !containsCourseInfo) {
            console.log('🆘 Emergency candidate:', {
              tag: el.tagName,
              class: el.className,
              text: text.substring(0, 100) + '...',
              children: children
            });
            return true;
          }
          return false;
        });
        
        console.log(`🆘 Emergency fallback found ${emergencyQuestions.length} candidates`);
        if (emergencyQuestions.length > 0) {
          return emergencyQuestions.slice(0, 25); // Limit to prevent too many
        }
      }
      
      return finalQuestions;
    }
    
    /**
     * Extract question data from a question container
     */
    async extractQuestionData(questionElement, index) {
      try {
        // Get clean question text
        const fullText = questionElement.textContent.trim();
        
        // Extract just the question part (before the answer options)
        const questionText = this.extractQuestionText(questionElement);
        
        // Skip if we couldn't extract a valid question
        if (!questionText || questionText.length < 10) {
          console.log(`Skipping question ${index + 1}: Invalid question text`);
          return null;
        }
        
        const questionHTML = questionElement.innerHTML;
        const questionHash = QuizStorage.createQuestionHash(questionElement);
        
        // Find answers within this question
        const answers = await this.findAnswersInQuestionAsync(questionElement);
        
        // Skip if no valid answers found
        if (answers.length < 2) {
          console.log(`Skipping question ${index + 1}: Not enough answers (${answers.length})`);
          return null;
        }
        
        // Determine correct answers
        const correctAnswers = this.findCorrectAnswers(questionElement, answers);
        
        // Extract correct answer images
        const correctAnswerImages = [];
        console.log(`🖼️ Checking for correct answer images. Correct answers: [${correctAnswers.join(', ')}]`);
        
        for (const correctIndex of correctAnswers) {
          if (answers[correctIndex] && answers[correctIndex].imageData) {
            console.log(`✅ Found image data for correct answer ${correctIndex + 1}`);
            correctAnswerImages.push({
              answerIndex: correctIndex,
              answerText: answers[correctIndex].text,
              imageData: answers[correctIndex].imageData
            });
          } else {
            console.log(`❌ No image data for correct answer ${correctIndex + 1}`);
          }
        }
        
        console.log(`📊 Total correct answer images: ${correctAnswerImages.length}`);
        
        // Extract additional metadata for robust matching
        const questionHeader = questionElement.querySelector('h4.evaluation_quiz_question');
        const hasQuestionImage = questionHeader ? !!questionHeader.querySelector('img') : false;
        const questionImages = questionHeader ? Array.from(questionHeader.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt || '',
          style: img.getAttribute('style') || ''
        })) : [];
        
        // Extract question number if present
        const numberMatch = questionText.match(/^(?:Question\s+)?(\d+)/i);
        const questionNumber = numberMatch ? parseInt(numberMatch[1]) : null;
        
        // Create a content-based identifier for matching (ignoring order)
        const questionContentHash = this.createContentHash(questionText, answers.map(a => a.text));
        
        const questionData = {
          index: index,
          questionText: questionText,
          questionHTML: questionHTML,
          questionHash: questionHash,
          questionContentHash: questionContentHash,
          questionNumber: questionNumber,
          hasQuestionImage: hasQuestionImage,
          questionImages: questionImages,
          answers: answers,
          correctAnswers: correctAnswers,
          correctAnswerImages: correctAnswerImages,
          timestamp: Date.now(),
          // Test and course information
          testName: this.testName,
          courseName: this.courseName,
          // Additional metadata for matching during randomized tests
          answerTexts: answers.map(a => a.text),
          correctAnswerTexts: correctAnswers.map(index => answers[index]?.text || '').filter(text => text),
          correctAnswerIndices: correctAnswers
        };
        
        console.log(`Captured question ${index + 1}:`, {
          text: questionText.substring(0, 100) + '...',
          answers: answers.length,
          correct: correctAnswers.length,
          correctAnswerIndices: correctAnswers,
          hasImage: hasQuestionImage,
          correctImages: correctAnswerImages.length,
          number: questionNumber
        });
        
        return questionData;
        
      } catch (error) {
        console.error(`Error extracting question ${index}:`, error);
        return null;
      }
    }
    
    /**
     * Extract clean question text from element
     */
    extractQuestionText(questionElement) {
      let questionText = '';
      let hasQuestionImage = false;
      let questionNumber = '';
      
      // For ALX quiz correction pages, try the specific structure first
      const questionHeader = questionElement.querySelector('h4.evaluation_quiz_question');
      if (questionHeader) {
        questionText = questionHeader.textContent.trim();
        
        // Check if the question has an image
        const questionImage = questionHeader.querySelector('img');
        hasQuestionImage = !!questionImage;
        
        // Extract question number if present
        const numberMatch = questionText.match(/^(\d+)\./);
        if (numberMatch) {
          questionNumber = numberMatch[1];
        }
        
        // If question is mostly just a number and has an image, create a descriptive text
        if (hasQuestionImage && questionText.replace(/^\d+\.\s*/, '').trim().length < 10) {
          questionText = `Question ${questionNumber}: [Image-based question]`;
        }
      } else {
        // First try to find a specific question text element
        const questionTextEl = questionElement.querySelector('.question-text, .quiz-question-text, h3, h4, .question-title');
        if (questionTextEl) {
          questionText = questionTextEl.textContent.trim();
        } else {
          // Extract text before answer options
          const fullText = questionElement.textContent.trim();
          
          // Split by common answer patterns
          const answerPatterns = [
            /\s+[A-E]\.\s+/, // A. B. C. etc.
            /\s+○\s+/,       // Radio button symbols
            /\s+✓\s+/,       // Check marks
            /\s+□\s+/,       // Checkboxes
            /I don't know/i  // Common option
          ];
          
          let cleanText = fullText;
          for (const pattern of answerPatterns) {
            const match = cleanText.search(pattern);
            if (match > 0) {
              cleanText = cleanText.substring(0, match).trim();
              break;
            }
          }
          
          questionText = cleanText;
        }
      }
      
      // Clean up the question text
      questionText = questionText
        .replace(/^\d+\.\s*/, '') // Remove leading numbers
        .replace(/^Question\s*\d*:?\s*/i, '') // Remove "Question" prefix
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      return questionText;
    }
    
    /**
     * Find answer options within a question element (async version for image extraction)
     */
    async findAnswersInQuestionAsync(questionElement) {
      const answers = [];
      
      // For ALX quiz correction pages, use specific structure
      const answerContainer = questionElement.querySelector('.evaluation_quiz_question_answer');
      if (answerContainer) {
        const answerItems = answerContainer.querySelectorAll('li');
        console.log(`🎯 Found ${answerItems.length} ALX answer items`);
        
        for (let index = 0; index < answerItems.length; index++) {
          const item = answerItems[index];
          let text = item.textContent.trim();
          const html = item.innerHTML;
          
          // Check if this item has an image instead of text
          const hasImage = item.querySelector('img');
          let imageData = null;
          
          // Extract image data if available
          if (hasImage) {
            try {
              console.log(`🖼️ Extracting image data for answer ${index + 1}...`);
              imageData = await this.extractImageData(hasImage);
              console.log(`✅ Image data extracted:`, {
                hasDataURL: !!imageData?.dataURL,
                src: imageData?.src,
                dimensions: `${imageData?.width}x${imageData?.height}`
              });
            } catch (error) {
              console.warn('Failed to extract image data:', error);
              imageData = null;
            }
            
            if (!text || text.length < 5) {
              // For image-based answers, use a descriptive placeholder
              text = `[Image Answer ${index + 1}]`;
            }
          }
          
          // Skip items that are still empty after processing
          if (!text || text.length === 0) {
            console.log(`⚠️ Skipping empty answer item ${index + 1}`);
            continue;
          }
          
          // Clean up text (remove checkbox symbols, extra whitespace)
          text = text.replace(/^[○✓□\s]*/, '').trim();
          
          if (text.length > 0) {
            answers.push({
              index: index,
              text: text,
              html: html,
              element: item,
              hasImage: !!hasImage,
              imageData: imageData
            });
            console.log(`📝 Answer ${index + 1}: ${text.substring(0, 50)}...`);
          }
        }
        
        if (answers.length > 0) {
          console.log(`✅ Successfully extracted ${answers.length} ALX answers`);
          return answers;
        }
      }

      // Method 1: Look for radio buttons or checkboxes with labels
      const inputs = questionElement.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      if (inputs.length >= 2) {
        for (let index = 0; index < inputs.length; index++) {
          const input = inputs[index];
          const label = input.closest('label') || 
                       document.querySelector(`label[for="${input.id}"]`) ||
                       input.nextElementSibling ||
                       input.parentElement;
          
          if (label) {
            const text = label.textContent.trim().replace(/^[○✓□]\s*/, ''); // Remove symbols
            if (text && text.length > 0 && !text.toLowerCase().startsWith('question')) {
              answers.push({
                index: index,
                text: text,
                html: label.innerHTML,
                element: input.closest('label') || input.parentElement,
                hasImage: false,
                imageData: null
              });
            }
          }
        }
      }
      
      // Method 2: Look for list items (common in quiz layouts)
      if (answers.length === 0) {
        const listItems = questionElement.querySelectorAll('li, .option, .answer-option, [class*="answer"]');
        if (listItems.length >= 2) {
          listItems.forEach((item, index) => {
            const text = item.textContent.trim();
            // Clean up common prefixes
            const cleanText = text.replace(/^[A-E]\.\s*/, '').replace(/^[○✓□]\s*/, '').trim();
            
            // Check for images in the answer (sync version, no data extraction)
            const imgElement = item.querySelector('img');
            
            if (cleanText.length > 0 && cleanText.length < 500) {
              answers.push({
                index: index,
                text: cleanText,
                html: item.innerHTML,
                element: item,
                hasImage: !!imgElement,
                imageData: null // Will be filled by async version if needed
              });
            }
          });
        }
      }
      
      // Method 3: Look for answer patterns in text
      if (answers.length === 0) {
        const fullText = questionElement.textContent;
        
        // Split by answer patterns like "A. answer B. answer"
        const answerRegex = /[A-E]\.\s*([^A-E]{2,}?)(?=[A-E]\.|$)/g;
        let match;
        let index = 0;
        
        while ((match = answerRegex.exec(fullText)) !== null) {
          const answerText = match[1].trim();
          if (answerText.length > 0 && answerText.length < 500) {
            answers.push({
              index: index++,
              text: answerText,
              html: answerText,
              element: null,
              hasImage: false,
              imageData: null
            });
          }
        }
        
        // Also look for bullet point answers
        if (answers.length === 0) {
          const bulletRegex = /[○●•]\s*([^○●•]{2,}?)(?=[○●•]|$)/g;
          index = 0;
          
          while ((match = bulletRegex.exec(fullText)) !== null) {
            const answerText = match[1].trim();
            if (answerText.length > 0 && answerText.length < 500) {
              answers.push({
                index: index++,
                text: answerText,
                html: answerText,
                element: null,
                hasImage: false,
                imageData: null
              });
            }
          }
        }
      }
      
      // Filter out invalid answers
      const validAnswers = answers.filter(answer => {
        const text = answer.text.toLowerCase();
        return (
          answer.text.length > 0 &&
          answer.text.length < 500 &&
          !text.startsWith('question') &&
          !text.startsWith('which') &&
          !text.startsWith('what') &&
          !text.startsWith('solve') &&
          !text.startsWith('determine')
        );
      });
      
      console.log(`Found ${validAnswers.length} valid answers for question`);
      return validAnswers;
    }

    /**
     * Find answer options within a question element
     */
    findAnswersInQuestion(questionElement) {
      const answers = [];
      
      // For ALX quiz correction pages, use specific structure
      const answerContainer = questionElement.querySelector('.evaluation_quiz_question_answer');
      if (answerContainer) {
        const answerItems = answerContainer.querySelectorAll('li');
        console.log(`🎯 Found ${answerItems.length} ALX answer items`);
        
        answerItems.forEach((item, index) => {
          let text = item.textContent.trim();
          const html = item.innerHTML;
          
          // Check if this item has an image instead of text
          const hasImage = item.querySelector('img');
          
          if (hasImage && (!text || text.length < 5)) {
            // For image-based answers, use a descriptive placeholder
            text = `[Image Answer ${index + 1}]`;
          }
          
          // Skip items that are still empty after processing
          if (!text || text.length === 0) {
            console.log(`⚠️ Skipping empty answer item ${index + 1}`);
            return;
          }
          
          // Clean up text (remove checkbox symbols, extra whitespace)
          text = text.replace(/^[○✓□\s]*/, '').trim();
          
          if (text.length > 0) {
            answers.push({
              index: index,
              text: text,
              html: html,
              element: item,
              hasImage: !!hasImage,
              imageData: null // Will be filled by async version if needed
            });
            console.log(`📝 Answer ${index + 1}: ${text.substring(0, 50)}...`);
          }
        });
        
        if (answers.length > 0) {
          console.log(`✅ Successfully extracted ${answers.length} ALX answers`);
          return answers;
        }
      }
      
      // Method 1: Look for radio buttons or checkboxes with labels
      const inputs = questionElement.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      if (inputs.length >= 2) {
        inputs.forEach((input, index) => {
          const label = input.closest('label') || 
                       document.querySelector(`label[for="${input.id}"]`) ||
                       input.nextElementSibling ||
                       input.parentElement;
          
          if (label) {
            const text = label.textContent.trim().replace(/^[○✓□]\s*/, ''); // Remove symbols
            if (text && text.length > 0 && !text.toLowerCase().startsWith('question')) {
              answers.push({
                index: index,
                text: text,
                html: label.innerHTML,
                element: input.closest('label') || input.parentElement,
                hasImage: false,
                imageData: null
              });
            }
          }
        });
      }
      
      // Method 2: Look for list items (common in quiz layouts)
      if (answers.length === 0) {
        const listItems = questionElement.querySelectorAll('li, .option, .answer-option, [class*="answer"]');
        if (listItems.length >= 2) {
          for (let i = 0; i < listItems.length; i++) {
            const item = listItems[i];
            const text = item.textContent.trim();
            // Clean up common prefixes
            const cleanText = text.replace(/^[A-E]\.\s*/, '').replace(/^[○✓□]\s*/, '').trim();
            
            // Check for images in the answer
            const imgElement = item.querySelector('img');
            
            if (cleanText.length > 0 && cleanText.length < 500) {
              answers.push({
                index: i,
                text: cleanText,
                html: item.innerHTML,
                element: item,
                hasImage: !!imgElement,
                imageData: null // Will be filled by async version if needed
              });
            }
          }
        }
      }
      
      // Method 3: Look for answer patterns in text
      if (answers.length === 0) {
        const fullText = questionElement.textContent;
        
        // Split by answer patterns like "A. answer B. answer"
        const answerRegex = /[A-E]\.\s*([^A-E]{2,}?)(?=[A-E]\.|$)/g;
        let match;
        let index = 0;
        
        while ((match = answerRegex.exec(fullText)) !== null) {
          const answerText = match[1].trim();
          if (answerText.length > 0 && answerText.length < 500) {
            answers.push({
              index: index++,
              text: answerText,
              html: answerText,
              element: null
            });
          }
        }
        
        // Also look for bullet point answers
        if (answers.length === 0) {
          const bulletRegex = /[○●•]\s*([^○●•]{2,}?)(?=[○●•]|$)/g;
          index = 0;
          
          while ((match = bulletRegex.exec(fullText)) !== null) {
            const answerText = match[1].trim();
            if (answerText.length > 0 && answerText.length < 500) {
              answers.push({
                index: index++,
                text: answerText,
                html: answerText,
                element: null
              });
            }
          }
        }
      }
      
      // Filter out invalid answers
      const validAnswers = answers.filter(answer => {
        const text = answer.text.toLowerCase();
        return (
          answer.text.length > 0 &&
          answer.text.length < 500 &&
          !text.startsWith('question') &&
          !text.startsWith('which') &&
          !text.startsWith('what') &&
          !text.startsWith('solve') &&
          !text.startsWith('determine')
        );
      });
      
      console.log(`Found ${validAnswers.length} valid answers for question`);
      return validAnswers;
    }
    
    /**
     * Extract image data from an img element
     */
    async extractImageData(imgElement) {
      try {
        console.log(`🎨 Starting image extraction for:`, imgElement.src);
        
        // Create a canvas to capture the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create a new image element to ensure it's fully loaded
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise((resolve) => {
          img.onload = function() {
            console.log(`📐 Image loaded: ${img.naturalWidth}x${img.naturalHeight}`);
            
            // Set canvas size to match image
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            // Draw the image to canvas
            ctx.drawImage(img, 0, 0);
            
            try {
              // Convert to base64 data URL
              const dataURL = canvas.toDataURL('image/png');
              console.log(`💾 Image converted to dataURL (${dataURL.length} chars)`);
              
              resolve({
                src: imgElement.src,
                alt: imgElement.alt || '',
                width: img.naturalWidth,
                height: img.naturalHeight,
                dataURL: dataURL,
                style: imgElement.getAttribute('style') || ''
              });
            } catch (error) {
              console.warn('Could not extract image data (CORS?):', error);
              // Fallback to basic image info without base64
              resolve({
                src: imgElement.src,
                alt: imgElement.alt || '',
                width: imgElement.width,
                height: imgElement.height,
                dataURL: null,
                style: imgElement.getAttribute('style') || ''
              });
            }
          };
          
          img.onerror = function() {
            console.warn('Failed to load image for extraction:', imgElement.src);
            resolve({
              src: imgElement.src,
              alt: imgElement.alt || '',
              width: imgElement.width,
              height: imgElement.height,
              dataURL: null,
              style: imgElement.getAttribute('style') || ''
            });
          };
          
          // Start loading the image
          img.src = imgElement.src;
        });
        
      } catch (error) {
        console.error('Error extracting image data:', error);
        return {
          src: imgElement.src,
          alt: imgElement.alt || '',
          width: imgElement.width,
          height: imgElement.height,
          dataURL: null,
          style: imgElement.getAttribute('style') || ''
        };
      }
    }

    /**
     * Extract data from an answer element
     */
    extractAnswerData(answerElement, index) {
      try {
        const text = answerElement.textContent.trim();
        const html = answerElement.innerHTML;
        
        // Skip empty answers
        if (!text) return null;
        
        return {
          index: index,
          text: text,
          html: html,
          element: answerElement
        };
      } catch (error) {
        console.error('Error extracting answer data:', error);
        return null;
      }
    }
    
    /**
     * Find correct answers using various indicators
     */
    findCorrectAnswers(questionElement, answers) {
      const correctAnswers = [];
      console.log(`🔍 Finding correct answers for question with ${answers.length} answers`);
      
      // For ALX quiz correction pages, look for specific correct answer indicators
      const alxCorrectAnswers = questionElement.querySelectorAll('li.hstack.eqc-result.text-primary.font-weight-bold');
      if (alxCorrectAnswers.length > 0) {
        console.log(`🎯 Found ${alxCorrectAnswers.length} ALX correct answer indicators`);
        
        alxCorrectAnswers.forEach(correctElement => {
          const answerIndex = this.findAnswerIndexForElement(correctElement, answers);
          if (answerIndex !== -1 && !correctAnswers.includes(answerIndex)) {
            correctAnswers.push(answerIndex);
            console.log(`✅ Marked answer ${answerIndex + 1} as correct`);
          }
        });
        
        if (correctAnswers.length > 0) {
          console.log(`✅ Returning ${correctAnswers.length} correct answers:`, correctAnswers);
          return correctAnswers.sort((a, b) => a - b);
        }
      }
      
      // Check if we're on ALX quiz corrections and there are wrong answers marked
      const alxWrongAnswers = questionElement.querySelectorAll('li.hstack.eqc-result.text-danger.font-weight-bold');
      if (alxWrongAnswers.length > 0) {
        console.log(`⚠️ Found ${alxWrongAnswers.length} ALX wrong answer indicators - no correct answers for this question`);
        // If there are wrong answer indicators but no correct ones, return empty array
        return [];
      }
      
      // Method 1: Look for checked inputs (but only if they're not marked as wrong)
      const checkedInputs = questionElement.querySelectorAll('input:checked');
      checkedInputs.forEach(input => {
        // Check if the input's parent element has wrong answer styling
        const parentElement = input.closest('li');
        const isWrongAnswer = parentElement && parentElement.classList.contains('text-danger');
        
        if (!isWrongAnswer) {
          const answerIndex = this.findAnswerIndexForElement(input, answers);
          if (answerIndex !== -1) {
            correctAnswers.push(answerIndex);
          }
        }
      });
      
      // Method 2: Look for elements with correct-indicating classes
      for (const selector of SELECTORS.correctIndicators) {
        const correctElements = questionElement.querySelectorAll(selector);
        correctElements.forEach(el => {
          const answerIndex = this.findAnswerIndexForElement(el, answers);
          if (answerIndex !== -1 && !correctAnswers.includes(answerIndex)) {
            correctAnswers.push(answerIndex);
          }
        });
      }
      
      // Method 3: Look for color-based indicators (green background, etc.)
      answers.forEach((answer, index) => {
        if (this.hasCorrectStyling(answer.element)) {
          if (!correctAnswers.includes(index)) {
            correctAnswers.push(index);
          }
        }
      });
      
      console.log(`📊 Final correct answers found: ${correctAnswers.length} answers:`, correctAnswers);
      return correctAnswers.sort((a, b) => a - b); // Sort indices
    }
    
    /**
     * Find which answer corresponds to a given element
     */
    findAnswerIndexForElement(element, answers) {
      // Direct match
      for (let i = 0; i < answers.length; i++) {
        if (answers[i].element === element || answers[i].element.contains(element)) {
          return i;
        }
      }
      
      // For ALX structure, check if element is the same li.hstack
      for (let i = 0; i < answers.length; i++) {
        if (answers[i].element && element && answers[i].element.isSameNode && answers[i].element.isSameNode(element)) {
          return i;
        }
      }
      
      // Parent match
      const parent = element.closest('li, div, p, label');
      if (parent) {
        for (let i = 0; i < answers.length; i++) {
          if (answers[i].element === parent || answers[i].element.contains(parent) || 
              (answers[i].element && answers[i].element.isSameNode && answers[i].element.isSameNode(parent))) {
            return i;
          }
        }
      }
      
      return -1;
    }
    
    /**
     * Check if element has styling that indicates it's a correct answer
     */
    hasCorrectStyling(element) {
      if (!element) return false;
      
      // For ALX quiz correction pages, check for specific classes
      // Correct answers have: eqc-result text-primary font-weight-bold
      // Wrong answers have: eqc-result text-danger font-weight-bold
      if (element.classList && element.classList.contains('eqc-result')) {
        if (element.classList.contains('text-primary') && 
            element.classList.contains('font-weight-bold')) {
          return true;
        }
        // Explicitly return false for wrong answers (text-danger)
        if (element.classList.contains('text-danger')) {
          return false;
        }
      }
      
      // Legacy check for other platforms or fallback
      const style = window.getComputedStyle(element);
      const bgColor = style.backgroundColor.toLowerCase();
      const color = style.color.toLowerCase();
      const borderColor = style.borderColor.toLowerCase();
      
      // Look for green colors or other indicators
      const correctColors = ['green', 'rgb(0, 255, 0)', 'rgba(0, 255, 0', '#00ff00', '#008000'];
      
      return correctColors.some(correctColor => 
        bgColor.includes(correctColor) || 
        color.includes(correctColor) || 
        borderColor.includes(correctColor)
      );
    }
    
    /**
     * Create a content-based hash for question matching regardless of order
     */
    createContentHash(questionText, answerTexts) {
      // Normalize text for comparison
      const normalizeText = (text) => {
        return text.toLowerCase()
          .replace(/[^\w\s]/g, '') // Remove punctuation
          .replace(/\s+/g, ' ')    // Normalize whitespace
          .trim();
      };
      
      const normalizedQuestion = normalizeText(questionText);
      const normalizedAnswers = answerTexts.map(normalizeText).sort(); // Sort for order independence
      
      const content = normalizedQuestion + '|' + normalizedAnswers.join('|');
      return this.simpleHash(content);
    }
    
    /**
     * Simple hash function for content comparison
     */
    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(36);
    }

    /**
     * Validate if a question data object is valid
     */
    isValidQuestion(questionData) {
      console.log('🔍 Validating question:', {
        text: questionData.questionText?.substring(0, 100) + '...',
        textLength: questionData.questionText?.length,
        answersCount: questionData.answers?.length,
        hasImage: questionData.hasQuestionImage
      });
      
      // Must have question text (more lenient for image-based questions)
      const minTextLength = questionData.hasQuestionImage ? 3 : 5;
      if (!questionData.questionText || questionData.questionText.length < minTextLength) {
        console.log('❌ Rejected: No question text or too short');
        return false;
      }
      
      // Must have at least 1 answer (relaxed from 2)
      if (!questionData.answers || questionData.answers.length < 1) {
        console.log('❌ Rejected: No answers');
        return false;
      }
      
      // For image-based questions, be more lenient with validation
      if (questionData.hasQuestionImage) {
        console.log('✅ Question validated successfully (image-based)');
        return true;
      }
      
      // Question text should not be just answer options
      const text = questionData.questionText.toLowerCase();
      const isJustAnswers = (
        text.startsWith("i don't know") ||
        /^[a-e]\.\s/.test(text) ||
        text.startsWith('○') ||
        text.startsWith('✓') ||
        text.length < 10
      );
      
      if (isJustAnswers) {
        console.log('❌ Rejected: Looks like just an answer option');
        return false;
      }
      
      // Should have some question-like characteristics (more relaxed for ALX)
      const hasQuestionCharacteristics = (
        text.includes('?') ||
        text.includes('solve') ||
        text.includes('find') ||
        text.includes('determine') ||
        text.includes('calculate') ||
        text.includes('which') ||
        text.includes('what') ||
        text.includes('how') ||
        text.includes('choose') ||
        text.includes('select') ||
        text.includes('simplify') ||
        text.includes('factor') ||
        text.includes('evaluate') ||
        text.includes('graph') ||
        text.includes('translate') ||
        text.includes('divide') ||
        text.includes('add') ||
        text.includes('subtract') ||
        text.includes('multiply') ||
        text.includes('is:') || // For questions like "Neuroplasticity is:"
        text.includes('____') || // For fill-in-the-blank questions
        text.includes('example of') ||
        text.includes('definition of') ||
        text.includes('best') ||
        text.includes('most') ||
        text.includes('least') ||
        text.includes('not') ||
        text.includes('correct') ||
        text.includes('true') ||
        text.includes('false') ||
        text.endsWith(':') || // For questions ending with colon
        /\d+\./.test(text) || // Has a number prefix
        text.length > 15 || // If it's moderately long, it's probably a question (lowered from 25)
        (questionData.answers && questionData.answers.length > 2) // If it has multiple choice answers, it's likely a question
      );
      
      if (!hasQuestionCharacteristics) {
        console.log('❌ Rejected: Doesnt look like a question');
        return false;
      }
      
      console.log('✅ Question validated successfully');
      return true;
    }
    
    /**
     * Start the capture process
     */
    async startCapture() {
      if (this.isCapturing) {
        console.log('Capture already in progress');
        return;
      }
      
      this.isCapturing = true;
      console.log('Starting quiz correction capture...');
      
      try {
        // Extract test and course information first
        this.testName = this.extractTestName();
        this.courseName = this.extractCourseName();
        
        console.log('Test Information:', {
          testName: this.testName,
          courseName: this.courseName
        });
        
        // Wait for page to load
        const questionElements = await this.waitForPageLoad();
        
        // Extract data from each question
        const validQuestions = [];
        for (let i = 0; i < questionElements.length; i++) {
          const questionData = await this.extractQuestionData(questionElements[i], validQuestions.length);
          if (questionData && this.isValidQuestion(questionData)) {
            validQuestions.push(questionData);
          }
        }
        
        this.capturedData = validQuestions;
        
        if (this.capturedData.length > 0) {
          // Save to storage
          const success = await QuizStorage.saveQuizData(this.capturedData);
          
          if (success) {
            // Show success notification
            this.showSuccessNotification();
            console.log(`Successfully captured ${this.capturedData.length} questions`);
          } else {
            throw new Error('Failed to save captured data');
          }
        } else {
          throw new Error('No valid questions found to capture');
        }
        
      } catch (error) {
        console.error('Capture failed:', error);
        this.showErrorNotification(error.message);
      } finally {
        this.isCapturing = false;
      }
    }
    
    /**
     * Show success notification
     */
    showSuccessNotification() {
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'Quiz Capture Complete ✅',
          message: `Captured ${this.capturedData.length} questions successfully`
        });
      } else {
        // Fallback: show in-page notification
        this.showInPageNotification('Quiz Capture Complete ✅', `Captured ${this.capturedData.length} questions successfully`, 'success');
      }
    }
    
    /**
     * Show error notification
     */
    showErrorNotification(message) {
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'Quiz Capture Failed ❌',
          message: message
        });
      } else {
        // Fallback: show in-page notification
        this.showInPageNotification('Quiz Capture Failed ❌', message, 'error');
      }
    }
    
    /**
     * Show in-page notification as fallback
     */
    showInPageNotification(title, message, type) {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      notification.innerHTML = `<strong>${title}</strong><br>${message}`;
      
      document.body.appendChild(notification);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 5000);
    }
  }
  
  // Auto-start capture when page loads
  const capture = new QuizCapture();
  
  // Start capture after a short delay to ensure page is ready
  setTimeout(() => {
    capture.startCapture();
  }, 2000);
  
  // Listen for manual trigger from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startCapture') {
      capture.startCapture().then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep message channel open for async response
    }
  });
  
  // Let popup know this script is ready
  console.log('Capture script ready for messages');
  
})();