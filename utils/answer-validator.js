/**
 * Smart Answer Validator
 * Validates answers before highlighting to ensure accuracy
 */

class AnswerValidator {
  constructor() {
    this.validationRules = {
      logical: {
        weight: 0.4,
        enabled: true
      },
      consistency: {
        weight: 0.3,
        enabled: true
      },
      format: {
        weight: 0.2,
        enabled: true
      },
      pattern: {
        weight: 0.1,
        enabled: true
      }
    };

    this.commonPatterns = {
      programming: {
        correct: [/^function\s+\w+/, /^class\s+\w+/, /^const\s+\w+/, /^let\s+\w+/],
        incorrect: [/undefined/, /syntax error/i, /missing/i]
      },
      math: {
        correct: [/^\d+$/, /^\d+\.\d+$/, /^-?\d+/, /^[a-z]\s*=\s*\d+/],
        incorrect: [/undefined/, /error/i, /invalid/i]
      }
    };

    this.flaggedAnswers = new Set();
    this.userFeedback = new Map();
  }

  /**
   * Validate an answer before highlighting
   */
  async validateAnswer(question, answer, answerText, metadata = {}) {
    const validation = {
      isValid: true,
      confidence: 1.0,
      warnings: [],
      flags: [],
      recommendation: 'highlight'
    };

    try {
      // Run validation checks
      const checks = await Promise.all([
        this.checkLogicalConsistency(question, answer, answerText),
        this.checkAnswerFormat(question, answer, answerText),
        this.checkPatternMatching(question, answer, answerText),
        this.checkUserFeedback(question, answer)
      ]);

      // Combine validation results
      validation.confidence = this.calculateOverallConfidence(checks);
      validation.warnings = checks.flatMap(check => check.warnings || []);
      validation.flags = checks.flatMap(check => check.flags || []);

      // Determine recommendation
      validation.recommendation = this.getRecommendation(validation.confidence, validation.flags);
      validation.isValid = validation.confidence > 0.6;

      // Log validation for learning
      this.logValidation(question, answer, validation);

    } catch (error) {
      console.warn('Answer validation error:', error);
      validation.confidence = 0.5;
      validation.warnings.push('Validation error occurred');
    }

    return validation;
  }

  /**
   * Enhanced logical consistency check with better pattern recognition
   */
  async checkLogicalConsistency(question, answer, answerText) {
    const result = {
      confidence: 1.0,
      warnings: [],
      flags: []
    };

    const questionText = question.questionText?.toLowerCase() || '';
    const answerLower = answerText?.toLowerCase() || '';

    // Enhanced contradiction detection
    const contradictions = [
      {
        pattern: /\b(not?|never|no|none|without)\b.*\b(yes|always|all|with)\b/i,
        message: 'Potential contradiction with negation words'
      },
      {
        pattern: /\b(false|incorrect|wrong)\b.*\b(true|correct|right)\b/i,
        message: 'True/false contradiction detected'
      },
      {
        pattern: /\b(impossible|cannot|never)\b.*\b(possible|can|always)\b/i,
        message: 'Possibility contradiction detected'
      },
      {
        pattern: /\b(zero|none|nothing)\b.*\b(some|many|several)\b/i,
        message: 'Quantity contradiction detected'
      }
    ];

    for (const contradiction of contradictions) {
      if (contradiction.pattern.test(questionText) && contradiction.pattern.test(answerLower)) {
        result.flags.push('logical_contradiction');
        result.confidence -= 0.4;
        result.warnings.push(contradiction.message);
      }
    }

    // Context-aware validation for math questions
    if (this.isMathQuestion(questionText)) {
      const mathValidation = this.validateMathAnswer(questionText, answerText);
      result.confidence *= mathValidation.confidence;
      result.warnings.push(...mathValidation.warnings);
      result.flags.push(...mathValidation.flags);
    }

    // Programming logic validation
    if (this.isProgrammingQuestion(questionText)) {
      const programmingValidation = this.validateProgrammingAnswer(questionText, answerText);
      result.confidence *= programmingValidation.confidence;
      result.warnings.push(...programmingValidation.warnings);
      result.flags.push(...programmingValidation.flags);
    }

    // Length consistency check
    const questionWords = questionText.split(/\s+/).length;
    const answerWords = answerLower.split(/\s+/).length;

    if (questionWords > 20 && answerWords < 3) {
      result.confidence -= 0.2;
      result.warnings.push('Answer seems too short for detailed question');
    }

    if (questionWords < 10 && answerWords > 20) {
      result.confidence -= 0.15;
      result.warnings.push('Answer seems too long for simple question');
    }

    return result;
  }

  /**
   * Enhanced format validation with type-specific checks
   */
  async checkAnswerFormat(question, answer, answerText) {
    const result = {
      confidence: 1.0,
      warnings: [],
      flags: []
    };

    if (!answerText || answerText.trim().length === 0) {
      result.confidence = 0.1;
      result.flags.push('empty_answer');
      result.warnings.push('Answer appears to be empty');
      return result;
    }

    const questionText = question.questionText?.toLowerCase() || '';

    // Type-specific format validation
    if (this.isMathQuestion(questionText)) {
      const mathFormat = this.validateMathFormat(answerText);
      result.confidence *= mathFormat.confidence;
      result.warnings.push(...mathFormat.warnings);
      result.flags.push(...mathFormat.flags);
    }

    if (this.isProgrammingQuestion(questionText)) {
      const codeFormat = this.validateCodeFormat(answerText);
      result.confidence *= codeFormat.confidence;
      result.warnings.push(...codeFormat.warnings);
      result.flags.push(...codeFormat.flags);
    }

    // General format checks
    const formatIssues = this.checkGeneralFormat(answerText);
    result.confidence *= formatIssues.confidence;
    result.warnings.push(...formatIssues.warnings);
    result.flags.push(...formatIssues.flags);

    return result;
  }

  /**
   * Math-specific answer validation
   */
  validateMathAnswer(questionText, answerText) {
    const result = {
      confidence: 1.0,
      warnings: [],
      flags: []
    };

    // Check for expected mathematical content
    const hasNumbers = /\d/.test(answerText);
    const hasOperators = /[+\-*/=]/.test(answerText);
    const hasVariables = /[a-zA-Z]/.test(answerText) && !/^[a-zA-Z\s]+$/.test(answerText);

    if (!hasNumbers && !hasOperators && !hasVariables) {
      result.confidence -= 0.3;
      result.warnings.push('Math question but answer lacks mathematical content');
    }

    // Check for common math errors
    if (answerText.includes('undefined') && !questionText.includes('undefined')) {
      result.confidence -= 0.4;
      result.flags.push('math_error');
      result.warnings.push('Mathematical undefined detected');
    }

    if (answerText.includes('infinity') && !questionText.includes('infinity')) {
      result.confidence -= 0.2;
      result.warnings.push('Unexpected infinity in answer');
    }

    return result;
  }

  /**
   * Programming-specific answer validation
   */
  validateProgrammingAnswer(questionText, answerText) {
    const result = {
      confidence: 1.0,
      warnings: [],
      flags: []
    };

    // Check for programming-specific issues
    if (answerText.includes('undefined') && !questionText.includes('undefined')) {
      result.confidence -= 0.3;
      result.warnings.push('Programming: unexpected undefined');
    }

    if (answerText.includes('null') && !questionText.includes('null')) {
      result.confidence -= 0.2;
      result.warnings.push('Programming: unexpected null reference');
    }

    if (answerText.includes('error') && !questionText.includes('error')) {
      result.confidence -= 0.25;
      result.warnings.push('Programming: unexpected error in answer');
    }

    // Check for proper code structure
    const hasCodeElements = /function|class|var|let|const|if|for|while/.test(answerText);
    if (hasCodeElements) {
      result.confidence += 0.1; // Slight boost for code-like answers
    }

    return result;
  }

  /**
   * Math format validation
   */
  validateMathFormat(answerText) {
    const result = {
      confidence: 1.0,
      warnings: [],
      flags: []
    };

    // Check for proper mathematical notation
    if (answerText.includes('^') && !answerText.includes('**')) {
      result.confidence -= 0.1;
      result.warnings.push('Use ** for exponentiation, not ^');
    }

    // Check for mixed number formats
    if (/\d+\s+\d+\/\d+/.test(answerText)) {
      result.confidence -= 0.1;
      result.warnings.push('Mixed number format may be confusing');
    }

    return result;
  }

  /**
   * Code format validation
   */
  validateCodeFormat(answerText) {
    const result = {
      confidence: 1.0,
      warnings: [],
      flags: []
    };

    // Check for syntax issues
    const openBraces = (answerText.match(/\{/g) || []).length;
    const closeBraces = (answerText.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      result.confidence -= 0.2;
      result.warnings.push('Unmatched braces detected');
    }

    const openParens = (answerText.match(/\(/g) || []).length;
    const closeParens = (answerText.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      result.confidence -= 0.2;
      result.warnings.push('Unmatched parentheses detected');
    }

    return result;
  }

  /**
   * General format checks
   */
  checkGeneralFormat(answerText) {
    const result = {
      confidence: 1.0,
      warnings: [],
      flags: []
    };

    // Check for excessive repetition
    const words = answerText.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    const uniqueWords = new Set(words).size;

    if (wordCount > 10 && uniqueWords / wordCount < 0.6) {
      result.confidence -= 0.15;
      result.warnings.push('Excessive word repetition detected');
    }

    // Check for gibberish patterns
    if (/(.)\1{4,}/.test(answerText.replace(/\s/g, ''))) {
      result.confidence -= 0.3;
      result.flags.push('gibberish');
      result.warnings.push('Possible gibberish or spam content');
    }

    return result;
  }

  /**
   * Check answer against known patterns
   */
  async checkPatternMatching(question, answer, answerText) {
    const result = {
      confidence: 1.0,
      warnings: [],
      flags: []
    };

    const questionText = question.questionText?.toLowerCase() || '';
    const subject = this.detectQuestionSubject(questionText);

    if (this.commonPatterns[subject]) {
      const patterns = this.commonPatterns[subject];
      
      // Check correct patterns
      const hasCorrectPattern = patterns.correct.some(pattern => pattern.test(answerText));
      const hasIncorrectPattern = patterns.incorrect.some(pattern => pattern.test(answerText));

      if (hasIncorrectPattern) {
        result.confidence -= 0.4;
        result.flags.push('incorrect_pattern');
        result.warnings.push(`Answer matches known incorrect pattern for ${subject}`);
      }

      if (!hasCorrectPattern && subject === 'programming') {
        result.confidence -= 0.1;
        result.warnings.push('Answer doesn\'t match expected programming patterns');
      }
    }

    return result;
  }

  /**
   * Check user feedback history for this answer
   */
  async checkUserFeedback(question, answer) {
    const result = {
      confidence: 1.0,
      warnings: [],
      flags: []
    };

    const questionHash = this.createQuestionHash(question);
    const feedback = this.userFeedback.get(questionHash);

    if (feedback) {
      if (feedback.incorrectCount > feedback.correctCount) {
        result.confidence -= 0.3;
        result.flags.push('negative_feedback');
        result.warnings.push('Users have marked this answer as incorrect before');
      } else if (feedback.correctCount > 2) {
        result.confidence += 0.1;
      }
    }

    return result;
  }

  /**
   * Calculate overall confidence from individual checks
   */
  calculateOverallConfidence(checks) {
    let totalWeight = 0;
    let weightedScore = 0;

    Object.values(this.validationRules).forEach((rule, index) => {
      if (rule.enabled && checks[index]) {
        totalWeight += rule.weight;
        weightedScore += checks[index].confidence * rule.weight;
      }
    });

    return totalWeight > 0 ? weightedScore / totalWeight : 0.5;
  }

  /**
   * Get recommendation based on validation results
   */
  getRecommendation(confidence, flags) {
    if (confidence >= 0.8 && flags.length === 0) {
      return 'highlight'; // Safe to highlight
    } else if (confidence >= 0.6) {
      return 'highlight_with_warning'; // Highlight but show warning
    } else if (confidence >= 0.4) {
      return 'prompt_user'; // Ask user to verify
    } else {
      return 'no_highlight'; // Don't highlight
    }
  }

  /**
   * Record user feedback for learning
   */
  recordUserFeedback(question, answer, wasCorrect) {
    const questionHash = this.createQuestionHash(question);
    
    if (!this.userFeedback.has(questionHash)) {
      this.userFeedback.set(questionHash, {
        correctCount: 0,
        incorrectCount: 0,
        lastFeedback: Date.now()
      });
    }

    const feedback = this.userFeedback.get(questionHash);
    if (wasCorrect) {
      feedback.correctCount++;
    } else {
      feedback.incorrectCount++;
    }
    feedback.lastFeedback = Date.now();

    // Store in browser storage for persistence
    this.saveFeedbackToStorage();
  }

  /**
   * Helper methods for validation
   */
  isProgrammingQuestion(questionText) {
    return /function|class|code|javascript|python|html|css|programming|algorithm/.test(questionText);
  }

  isMathQuestion(questionText) {
    return /calculate|equation|solve|math|number|sum|multiply|percentage/.test(questionText);
  }

  isSimpleQuestion(questionText) {
    return /what is|define|name|list/.test(questionText);
  }

  isComplexQuestion(questionText) {
    return /explain|analyze|compare|evaluate|implement|design/.test(questionText);
  }

  hasNumericContent(text) {
    return /\d/.test(text);
  }

  detectQuestionSubject(questionText) {
    if (this.isProgrammingQuestion(questionText)) return 'programming';
    if (this.isMathQuestion(questionText)) return 'math';
    return 'general';
  }

  validateProgrammingLogic(questionText, answerText) {
    const result = {
      confidence: 1.0,
      warnings: []
    };

    // Check for common programming errors
    if (answerText.includes('undefined') && !questionText.includes('undefined')) {
      result.confidence -= 0.3;
      result.warnings.push('Answer contains "undefined" - may be incorrect');
    }

    if (answerText.includes('error') && !questionText.includes('error')) {
      result.confidence -= 0.2;
      result.warnings.push('Answer contains "error" - verify correctness');
    }

    return result;
  }

  createQuestionHash(question) {
    const text = question.questionText || '';
    return text.slice(0, 50) + '_' + text.length;
  }

  logValidation(question, answer, validation) {
    // Log for analytics and improvement
    console.log('Answer validation:', {
      confidence: validation.confidence,
      warnings: validation.warnings.length,
      flags: validation.flags.length,
      recommendation: validation.recommendation
    });
  }

  async saveFeedbackToStorage() {
    try {
      const feedbackData = Object.fromEntries(this.userFeedback);
      await chrome.storage.local.set({
        'answer_validator_feedback': feedbackData
      });
    } catch (error) {
      console.warn('Failed to save feedback to storage:', error);
    }
  }

  async loadFeedbackFromStorage() {
    try {
      const result = await chrome.storage.local.get(['answer_validator_feedback']);
      if (result.answer_validator_feedback) {
        this.userFeedback = new Map(Object.entries(result.answer_validator_feedback));
      }
    } catch (error) {
      console.warn('Failed to load feedback from storage:', error);
    }
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return {
      totalFeedback: this.userFeedback.size,
      flaggedAnswers: this.flaggedAnswers.size,
      validationRules: this.validationRules
    };
  }
}

// Make available globally
window.AnswerValidator = AnswerValidator;
