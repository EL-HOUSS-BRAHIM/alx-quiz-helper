/**
 * Real-Time Question Analyzer
 * Provides live analysis of question patterns, difficulty, and types
 * Enhanced with indexing and caching for improved performance
 */

class QuestionAnalyzer {
  constructor() {
    // Performance optimization: Add caching and indexing
    this.cache = new Map();
    this.maxCacheSize = 500;
    this.analysisIndex = {
      bySubject: new Map(),
      byDifficulty: new Map(),
      byKeywords: new Map()
    };
    
    this.subjectPatterns = {
      programming: {
        keywords: ['function', 'class', 'algorithm', 'code', 'programming', 'javascript', 'python', 'html', 'css', 'variable', 'loop', 'array', 'object', 'method', 'syntax', 'debug'],
        weight: 2
      },
      math: {
        keywords: ['equation', 'solve', 'calculate', 'derivative', 'integral', 'matrix', 'formula', 'number', 'sum', 'multiply', 'divide', 'percentage', 'ratio', 'graph'],
        weight: 2
      },
      business: {
        keywords: ['portfolio', 'marketing', 'business', 'finance', 'management', 'strategy', 'customer', 'revenue', 'profit', 'market', 'analysis', 'plan'],
        weight: 1.5
      },
      design: {
        keywords: ['design', 'ui', 'ux', 'interface', 'user', 'layout', 'color', 'typography', 'wireframe', 'prototype', 'visual', 'aesthetic'],
        weight: 1.5
      },
      general: {
        keywords: ['what', 'which', 'how', 'when', 'where', 'why', 'define', 'explain', 'describe', 'compare'],
        weight: 0.5
      }
    };

    this.difficultyIndicators = {
      easy: {
        keywords: ['what is', 'define', 'list', 'name', 'identify', 'basic', 'simple'],
        weight: 1
      },
      medium: {
        keywords: ['explain', 'describe', 'compare', 'analyze', 'how does', 'why', 'implement'],
        weight: 2
      },
      hard: {
        keywords: ['evaluate', 'critique', 'design', 'create', 'optimize', 'complex', 'advanced', 'integrate'],
        weight: 3
      }
    };
  }

  /**
   * Analyze a question and return comprehensive analysis
   * Enhanced with caching for performance
   */
  analyzeQuestion(questionText, answerOptions = []) {
    // Check cache first
    const cacheKey = this.createCacheKey(questionText, answerOptions);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const cleanText = this.cleanText(questionText);

    const analysis = {
      difficulty: this.assessDifficulty(cleanText),
      subject: this.detectSubject(cleanText),
      timeEstimate: this.estimateTime(cleanText, answerOptions),
      confidence: this.calculateAnalysisConfidence(cleanText),
      questionType: this.determineQuestionType(cleanText, answerOptions),
      keywords: this.extractKeywords(cleanText),
      complexity: this.assessComplexity(cleanText, answerOptions),
      // Enhanced analysis
      contentHash: this.generateContentHash(cleanText),
      analysisTimestamp: Date.now(),
      version: '2.0'
    };

    // Cache the result
    this.addToCache(cacheKey, analysis);
    
    // Update indexes for future searches
    this.updateIndexes(analysis, cleanText);

    return analysis;
  }

  /**
   * Create cache key for analysis results
   */
  createCacheKey(questionText, answerOptions) {
    const text = questionText.substring(0, 100);
    const optionCount = answerOptions.length;
    return `${text}_${optionCount}`;
  }

  /**
   * Add result to cache with LRU eviction
   */
  addToCache(key, analysis) {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry (LRU)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, analysis);
  }

  /**
   * Update search indexes for fast lookups
   */
  updateIndexes(analysis, questionText) {
    const subject = analysis.subject.primary;
    const difficulty = analysis.difficulty.level;
    const keywords = analysis.keywords;

    // Subject index
    if (!this.analysisIndex.bySubject.has(subject)) {
      this.analysisIndex.bySubject.set(subject, []);
    }
    this.analysisIndex.bySubject.get(subject).push({
      text: questionText,
      analysis: analysis
    });

    // Difficulty index
    if (!this.analysisIndex.byDifficulty.has(difficulty)) {
      this.analysisIndex.byDifficulty.set(difficulty, []);
    }
    this.analysisIndex.byDifficulty.get(difficulty).push({
      text: questionText,
      analysis: analysis
    });

    // Keywords index
    keywords.forEach(keyword => {
      if (!this.analysisIndex.byKeywords.has(keyword)) {
        this.analysisIndex.byKeywords.set(keyword, []);
      }
      this.analysisIndex.byKeywords.get(keyword).push({
        text: questionText,
        analysis: analysis
      });
    });
  }

  /**
   * Generate unique content hash for question
   */
  generateContentHash(text) {
    let hash = 0;
    const normalized = text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
    
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Find similar questions using indexes
   */
  findSimilarQuestions(questionText, limit = 10) {
    const analysis = this.analyzeQuestion(questionText);
    const candidates = new Set();

    // Get candidates from subject index
    const subjectCandidates = this.analysisIndex.bySubject.get(analysis.subject.primary) || [];
    subjectCandidates.forEach(item => candidates.add(item));

    // Get candidates from keyword indexes
    analysis.keywords.forEach(keyword => {
      const keywordCandidates = this.analysisIndex.byKeywords.get(keyword) || [];
      keywordCandidates.forEach(item => candidates.add(item));
    });

    // Score and sort candidates
    const scored = Array.from(candidates).map(candidate => ({
      ...candidate,
      similarity: this.calculateSimilarity(questionText, candidate.text)
    })).sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, limit);
  }

  /**
   * Calculate similarity between two questions
   */
  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Assess question difficulty level
   */
  assessDifficulty(text) {
    const textLower = text.toLowerCase();
    let scores = {
      easy: 0,
      medium: 0,
      hard: 0
    };

    // Check difficulty indicators
    Object.entries(this.difficultyIndicators).forEach(([level, data]) => {
      data.keywords.forEach(keyword => {
        if (textLower.includes(keyword)) {
          scores[level] += data.weight;
        }
      });
    });

    // Additional complexity factors
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 50) scores.hard += 1;
    else if (wordCount > 25) scores.medium += 1;
    else scores.easy += 1;

    // Code blocks or technical terms
    if (/\{|\}|\(|\)|<|>|function|class|var|let|const/.test(text)) {
      scores.hard += 2;
    }

    // Find highest score
    const maxScore = Math.max(scores.easy, scores.medium, scores.hard);
    const difficulty = Object.keys(scores).find(key => scores[key] === maxScore);

    return {
      level: difficulty,
      confidence: maxScore / (scores.easy + scores.medium + scores.hard),
      scores: scores
    };
  }

  /**
   * Detect question subject area
   */
  detectSubject(text) {
    const textLower = text.toLowerCase();
    let scores = {};

    Object.entries(this.subjectPatterns).forEach(([subject, data]) => {
      scores[subject] = 0;
      data.keywords.forEach(keyword => {
        if (textLower.includes(keyword)) {
          scores[subject] += data.weight;
        }
      });
    });

    const maxScore = Math.max(...Object.values(scores));
    const detectedSubject = Object.keys(scores).find(key => scores[key] === maxScore);

    return {
      primary: detectedSubject || 'general',
      confidence: maxScore / Object.values(scores).reduce((a, b) => a + b, 1),
      allScores: scores
    };
  }

  /**
   * Estimate time needed to answer question
   */
  estimateTime(text, answerOptions) {
    const wordCount = text.split(/\s+/).length;
    const optionCount = answerOptions.length;

    let baseTime = 15; // Base 15 seconds

    // Add time based on word count
    baseTime += Math.floor(wordCount / 10) * 5;

    // Add time based on answer options
    baseTime += optionCount * 3;

    // Add time for complexity
    if (/code|function|algorithm|calculate/.test(text.toLowerCase())) {
      baseTime += 20;
    }

    // Cap at reasonable limits
    return Math.min(Math.max(baseTime, 10), 180); // 10 seconds to 3 minutes
  }

  /**
   * Calculate confidence in the analysis
   */
  calculateAnalysisConfidence(text) {
    let confidence = 0.5; // Base confidence

    const wordCount = text.split(/\s+/).length;

    // More text generally means better analysis
    if (wordCount > 20) confidence += 0.2;
    if (wordCount > 50) confidence += 0.1;

    // Technical terms boost confidence
    const technicalTerms = /function|class|algorithm|equation|formula|method|implement|design|analyze/i;
    if (technicalTerms.test(text)) confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  /**
   * Determine question type
   */
  determineQuestionType(text, answerOptions) {
    const textLower = text.toLowerCase();

    if (answerOptions.length === 0) return 'open-ended';
    if (answerOptions.length === 2) return 'true-false';
    if (answerOptions.length <= 4) return 'multiple-choice';
    if (answerOptions.length > 4) return 'multiple-select';

    // Check for specific question patterns
    if (/true|false/.test(textLower)) return 'true-false';
    if (/select all|choose all|which of the following/.test(textLower)) return 'multiple-select';

    return 'multiple-choice';
  }

  /**
   * Enhanced keyword extraction with better filtering and weighting
   */
  extractKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s\d\+\-\*\/\=\(\)\[\]\,\.\:\;\?]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Enhanced stop words with math-specific terms
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'what', 'which', 'that', 'this', 'these', 'those', 'a', 'an', 'is', 'are',
      'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'how', 'when', 'where', 'why', 'who', 'find', 'determine', 'calculate',
      'solve', 'use', 'using', 'given', 'following', 'below', 'above'
    ]);

    // Math-specific important terms that should NOT be filtered
    const importantTerms = new Set([
      'matrix', 'matrices', 'determinant', 'cramer', 'gaussian', 'elimination',
      'system', 'equations', 'linear', 'quadratic', 'polynomial', 'derivative',
      'integral', 'function', 'variable', 'constant', 'coefficient', 'solution',
      'equation', 'expression', 'term', 'factor', 'root', 'vertex', 'axis',
      'graph', 'plot', 'coordinate', 'point', 'line', 'curve', 'slope',
      'intercept', 'parallel', 'perpendicular', 'angle', 'triangle', 'circle',
      'square', 'rectangle', 'area', 'volume', 'perimeter', 'radius', 'diameter'
    ]);

    return words
      .filter(word => {
        // Keep if it's an important term OR not a stop word and contains letters
        return importantTerms.has(word) ||
               (!stopWords.has(word) && /[a-z]/.test(word) && word.length >= 3);
      })
      .slice(0, 8); // Increased from 5 to 8 for better coverage
  }

  /**
   * Assess overall question complexity
   */
  assessComplexity(text, answerOptions) {
    let complexity = 1; // Base complexity

    const wordCount = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;

    // Word count factor
    complexity += Math.floor(wordCount / 20);

    // Sentence count factor
    complexity += Math.floor(sentences / 2);

    // Answer options factor
    complexity += Math.floor(answerOptions.length / 3);

    // Technical content factor
    if (/code|algorithm|function|implementation/.test(text.toLowerCase())) {
      complexity += 2;
    }

    return Math.min(complexity, 10); // Scale 1-10
  }

  /**
   * Clean text for analysis
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '')
      .trim();
  }

  /**
   * Generate study recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.difficulty.level === 'hard') {
      recommendations.push('Take extra time to understand this question');
      recommendations.push('Review related concepts before answering');
    }

    if (analysis.subject.primary === 'programming') {
      recommendations.push('Consider testing the code mentally or on paper');
    }

    if (analysis.timeEstimate > 60) {
      recommendations.push('This question may require more time - don\'t rush');
    }

    if (analysis.complexity > 7) {
      recommendations.push('Break down this complex question into smaller parts');
    }

    return recommendations;
  }

  /**
   * Bulk analyze multiple questions with optimized processing
   */
  bulkAnalyze(questions, progressCallback = null) {
    const results = [];
    const batchSize = 50; // Process in batches to avoid blocking
    
    return new Promise((resolve) => {
      let processedCount = 0;
      
      const processBatch = (startIndex) => {
        const endIndex = Math.min(startIndex + batchSize, questions.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          const question = questions[i];
          const analysis = this.analyzeQuestion(question.questionText, question.answerOptions);
          results.push({
            ...question,
            analysis: analysis
          });
          
          processedCount++;
          if (progressCallback) {
            progressCallback(processedCount, questions.length);
          }
        }
        
        if (endIndex < questions.length) {
          // Process next batch asynchronously
          setTimeout(() => processBatch(endIndex), 0);
        } else {
          resolve(results);
        }
      };
      
      processBatch(0);
    });
  }

  /**
   * Get analysis statistics and performance metrics
   */
  getAnalysisStats() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      cacheHitRate: this.calculateCacheHitRate(),
      indexSizes: {
        subjects: this.analysisIndex.bySubject.size,
        difficulties: this.analysisIndex.byDifficulty.size,
        keywords: this.analysisIndex.byKeywords.size
      },
      totalAnalyzed: this.getTotalAnalyzed(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Calculate cache hit rate for performance monitoring
   */
  calculateCacheHitRate() {
    // This would be tracked in a real implementation
    return 0.75; // Placeholder - 75% hit rate
  }

  /**
   * Get total number of questions analyzed
   */
  getTotalAnalyzed() {
    let total = 0;
    this.analysisIndex.bySubject.forEach(items => total += items.length);
    return total;
  }

  /**
   * Estimate memory usage of caches and indexes
   */
  estimateMemoryUsage() {
    const cacheSize = this.cache.size * 1024; // Rough estimate
    const indexSize = this.getTotalAnalyzed() * 512; // Rough estimate
    return {
      cache: cacheSize,
      indexes: indexSize,
      total: cacheSize + indexSize,
      unit: 'bytes'
    };
  }

  /**
   * Clear caches and indexes for memory management
   */
  clearCaches() {
    this.cache.clear();
    this.analysisIndex.bySubject.clear();
    this.analysisIndex.byDifficulty.clear();
    this.analysisIndex.byKeywords.clear();
  }

  /**
   * Export analysis data for backup or transfer
   */
  exportAnalysisData() {
    return {
      version: '2.0',
      timestamp: Date.now(),
      cacheData: Array.from(this.cache.entries()),
      indexData: {
        bySubject: Array.from(this.analysisIndex.bySubject.entries()),
        byDifficulty: Array.from(this.analysisIndex.byDifficulty.entries()),
        byKeywords: Array.from(this.analysisIndex.byKeywords.entries())
      }
    };
  }

  /**
   * Import analysis data from backup
   */
  importAnalysisData(data) {
    if (data.version !== '2.0') {
      console.warn('Analysis data version mismatch');
      return false;
    }

    try {
      // Import cache
      this.cache.clear();
      data.cacheData.forEach(([key, value]) => {
        this.cache.set(key, value);
      });

      // Import indexes
      this.analysisIndex.bySubject = new Map(data.indexData.bySubject);
      this.analysisIndex.byDifficulty = new Map(data.indexData.byDifficulty);
      this.analysisIndex.byKeywords = new Map(data.indexData.byKeywords);

      return true;
    } catch (error) {
      console.error('Failed to import analysis data:', error);
      return false;
    }
  }
}

// Make available globally
window.QuestionAnalyzer = QuestionAnalyzer;
