/**
 * Advanced Question Matcher
 * Implements multi-layered matching strategies with confidence scoring
 * and performance optimizations
 */

class AdvancedQuestionMatcher {
  constructor() {
    this.strategies = [
      { name: 'exact_hash', weight: 1.0, threshold: 0.95, timeout: 1000 },
      { name: 'content_similarity', weight: 0.9, threshold: 0.8, timeout: 2000 },
      { name: 'semantic_analysis', weight: 0.8, threshold: 0.7, timeout: 3000 },
      { name: 'keyword_overlap', weight: 0.7, threshold: 0.6, timeout: 1500 },
      { name: 'fuzzy_matching', weight: 0.5, threshold: 0.4, timeout: 2500 }
    ];

    this.cache = new Map();
    this.maxCacheSize = 200;
    this.performanceMetrics = {
      totalMatches: 0,
      strategyStats: new Map(),
      averageTime: 0
    };

    // Initialize strategy stats
    this.strategies.forEach(strategy => {
      this.performanceMetrics.strategyStats.set(strategy.name, {
        used: 0,
        successful: 0,
        averageTime: 0,
        averageConfidence: 0
      });
    });
  }

  /**
   * Find best match using cascading strategy approach
   */
  async findBestMatch(currentQuestion, storedQuestions, options = {}) {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.createCacheKey(currentQuestion);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const config = {
      enableFallbacks: true,
      maxStrategies: 3,
      minConfidence: 0.3,
      ...options
    };

    let bestMatch = null;
    let strategiesUsed = 0;

    // Apply strategies in order of reliability
    for (const strategy of this.strategies) {
      if (strategiesUsed >= config.maxStrategies) {
        break;
      }

      try {
        const strategyStart = Date.now();
        const matches = await this.applyStrategyWithTimeout(
          strategy, 
          currentQuestion, 
          storedQuestions
        );

        const strategyTime = Date.now() - strategyStart;
        this.updateStrategyStats(strategy.name, strategyTime, matches);

        const bestStrategyMatch = matches.find(m => m.confidence >= strategy.threshold);
        
        if (bestStrategyMatch) {
          bestMatch = {
            match: bestStrategyMatch,
            strategy: strategy.name,
            confidence: bestStrategyMatch.confidence,
            processingTime: Date.now() - startTime
          };

          // Cache successful match
          this.addToCache(cacheKey, bestMatch);
          
          console.log(`✅ Match found using ${strategy.name}: ${Math.round(bestStrategyMatch.confidence * 100)}%`);
          break;
        }

        strategiesUsed++;
      } catch (error) {
        console.warn(`Strategy ${strategy.name} failed:`, error);
        continue;
      }
    }

    // Fallback: return best match even if below threshold
    if (!bestMatch && config.enableFallbacks) {
      bestMatch = await this.getFallbackMatch(currentQuestion, storedQuestions);
    }

    this.updateGlobalStats(Date.now() - startTime, bestMatch !== null);
    return bestMatch;
  }

  /**
   * Apply strategy with timeout protection
   */
  async applyStrategyWithTimeout(strategy, currentQuestion, storedQuestions) {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${strategy.name} timeout`)), strategy.timeout)
    );

    const strategyPromise = this.applyStrategy(strategy, currentQuestion, storedQuestions);

    return Promise.race([strategyPromise, timeoutPromise]);
  }

  /**
   * Apply specific matching strategy
   */
  async applyStrategy(strategy, current, stored) {
    switch (strategy.name) {
      case 'exact_hash':
        return this.exactHashMatching(current, stored);
      case 'content_similarity':
        return this.contentSimilarityMatching(current, stored);
      case 'semantic_analysis':
        return this.semanticAnalysisMatching(current, stored);
      case 'keyword_overlap':
        return this.keywordOverlapMatching(current, stored);
      case 'fuzzy_matching':
        return this.fuzzyMatching(current, stored);
      default:
        throw new Error(`Unknown strategy: ${strategy.name}`);
    }
  }

  /**
   * Hash-based exact matching
   */
  async exactHashMatching(current, stored) {
    // Validate stored is an array
    if (!Array.isArray(stored)) {
      console.error('stored must be an array in exactHashMatching, got:', typeof stored);
      return [];
    }
    
    const currentHash = this.generateQuestionHash(current.questionText);
    
    const matches = stored
      .filter(q => this.generateQuestionHash(q.questionText) === currentHash)
      .map(q => ({
        question: q,
        confidence: 1.0,
        method: 'exact_hash'
      }));

    return matches;
  }

  /**
   * Content similarity using advanced text comparison
   */
  async contentSimilarityMatching(current, stored) {
    // Validate stored is an array
    if (!Array.isArray(stored)) {
      console.error('stored must be an array in contentSimilarityMatching, got:', typeof stored);
      return [];
    }
    
    const currentText = this.normalizeText(current.questionText);
    
    const matches = await Promise.all(
      stored.map(async (q) => {
        const storedText = this.normalizeText(q.questionText);
        const similarity = await this.calculateAdvancedSimilarity(currentText, storedText);
        
        return {
          question: q,
          confidence: similarity,
          method: 'content_similarity'
        };
      })
    );

    return matches.filter(m => m.confidence > 0.5).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Semantic analysis using context and meaning
   */
  async semanticAnalysisMatching(current, stored) {
    // Validate stored is an array
    if (!Array.isArray(stored)) {
      console.error('stored must be an array in semanticAnalysisMatching, got:', typeof stored);
      return [];
    }
    
    const currentContext = this.extractSemanticContext(current.questionText);
    
    const matches = stored.map(q => {
      const storedContext = this.extractSemanticContext(q.questionText);
      const semanticScore = this.calculateSemanticSimilarity(currentContext, storedContext);
      
      return {
        question: q,
        confidence: semanticScore,
        method: 'semantic_analysis'
      };
    });

    return matches.filter(m => m.confidence > 0.4).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Keyword overlap matching
   */
  async keywordOverlapMatching(current, stored) {
    // Validate stored is an array
    if (!Array.isArray(stored)) {
      console.error('stored must be an array in keywordOverlapMatching, got:', typeof stored);
      return [];
    }
    
    const currentKeywords = this.extractKeywords(current.questionText);
    
    const matches = stored.map(q => {
      const storedKeywords = this.extractKeywords(q.questionText);
      const overlap = this.calculateKeywordOverlap(currentKeywords, storedKeywords);
      
      return {
        question: q,
        confidence: overlap,
        method: 'keyword_overlap'
      };
    });

    return matches.filter(m => m.confidence > 0.3).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Fuzzy string matching with edit distance
   */
  async fuzzyMatching(current, stored) {
    // Validate stored is an array
    if (!Array.isArray(stored)) {
      console.error('stored must be an array in fuzzyMatching, got:', typeof stored);
      return [];
    }
    
    const currentText = this.normalizeText(current.questionText);
    
    const matches = stored.map(q => {
      const storedText = this.normalizeText(q.questionText);
      const similarity = this.calculateFuzzySimilarity(currentText, storedText);
      
      return {
        question: q,
        confidence: similarity,
        method: 'fuzzy_matching'
      };
    });

    return matches.filter(m => m.confidence > 0.2).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate question hash for exact matching
   */
  generateQuestionHash(text) {
    const normalized = this.normalizeText(text).replace(/\s+/g, '');
    let hash = 0;
    
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Normalize text for comparison
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate advanced similarity with position weighting
   */
  async calculateAdvancedSimilarity(text1, text2) {
    if (text1 === text2) return 1.0;

    // Character-level similarity
    const charSim = this.calculateCharacterSimilarity(text1, text2);
    
    // Word-level similarity
    const wordSim = this.calculateWordSimilarity(text1, text2);
    
    // Position-based similarity (beginning words matter more)
    const posSim = this.calculatePositionalSimilarity(text1, text2);

    // Weighted combination
    return (charSim * 0.4) + (wordSim * 0.4) + (posSim * 0.2);
  }

  /**
   * Calculate character-level similarity using Levenshtein distance
   */
  calculateCharacterSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }

    const distance = matrix[len2][len1];
    const maxLength = Math.max(len1, len2);
    
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate word-level similarity
   */
  calculateWordSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate positional similarity (early words weighted more)
   */
  calculatePositionalSimilarity(text1, text2) {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    
    let score = 0;
    let totalWeight = 0;
    
    const maxLength = Math.max(words1.length, words2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const weight = 1 / (1 + i * 0.1); // Decreasing weight
      totalWeight += weight;
      
      if (i < words1.length && i < words2.length && words1[i] === words2[i]) {
        score += weight;
      }
    }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Extract semantic context
   */
  extractSemanticContext(text) {
    const mathTerms = (text.match(/\b(equation|solve|calculate|matrix|function|derivative|integral)\b/gi) || []).length;
    const codeTerms = (text.match(/\b(function|class|method|variable|algorithm|code)\b/gi) || []).length;
    const questionWords = (text.match(/\b(what|how|when|where|why|which)\b/gi) || []).length;
    
    return {
      mathContext: mathTerms / text.split(' ').length,
      codeContext: codeTerms / text.split(' ').length,
      questionContext: questionWords / text.split(' ').length,
      length: text.length,
      complexity: this.calculateTextComplexity(text)
    };
  }

  /**
   * Calculate semantic similarity between contexts
   */
  calculateSemanticSimilarity(context1, context2) {
    const mathSim = 1 - Math.abs(context1.mathContext - context2.mathContext);
    const codeSim = 1 - Math.abs(context1.codeContext - context2.codeContext);
    const questionSim = 1 - Math.abs(context1.questionContext - context2.questionContext);
    const lengthSim = Math.min(context1.length, context2.length) / Math.max(context1.length, context2.length);
    const complexitySim = 1 - Math.abs(context1.complexity - context2.complexity) / 10;
    
    return (mathSim * 0.3) + (codeSim * 0.3) + (questionSim * 0.2) + (lengthSim * 0.1) + (complexitySim * 0.1);
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const stopWords = new Set(['what', 'which', 'how', 'when', 'where', 'why', 'that', 'this', 'with', 'from']);
    
    return words.filter(word => !stopWords.has(word));
  }

  /**
   * Calculate keyword overlap
   */
  calculateKeywordOverlap(keywords1, keywords2) {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate fuzzy similarity
   */
  calculateFuzzySimilarity(text1, text2) {
    return this.calculateCharacterSimilarity(text1, text2);
  }

  /**
   * Calculate text complexity
   */
  calculateTextComplexity(text) {
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;
    const longWords = text.split(/\s+/).filter(word => word.length > 6).length;
    
    return Math.min(10, (avgWordsPerSentence / 10) + (longWords / words * 5) + (sentences / 5));
  }

  /**
   * Get fallback match when no strategy succeeds
   */
  async getFallbackMatch(currentQuestion, storedQuestions) {
    // Return best match regardless of threshold
    const allMatches = [];
    
    for (const strategy of this.strategies) {
      try {
        const matches = await this.applyStrategy(strategy, currentQuestion, storedQuestions);
        allMatches.push(...matches);
      } catch (error) {
        continue;
      }
    }

    if (allMatches.length === 0) return null;

    const bestMatch = allMatches.sort((a, b) => b.confidence - a.confidence)[0];
    
    return {
      match: bestMatch,
      strategy: 'fallback',
      confidence: bestMatch.confidence,
      isFallback: true
    };
  }

  /**
   * Cache management
   */
  createCacheKey(question) {
    return this.generateQuestionHash(question.questionText);
  }

  addToCache(key, result) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, result);
  }

  /**
   * Update strategy performance statistics
   */
  updateStrategyStats(strategyName, time, matches) {
    const stats = this.performanceMetrics.strategyStats.get(strategyName);
    stats.used++;
    
    if (matches.length > 0) {
      stats.successful++;
      const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
      stats.averageConfidence = (stats.averageConfidence + avgConfidence) / 2;
    }
    
    stats.averageTime = (stats.averageTime + time) / 2;
  }

  /**
   * Update global performance metrics
   */
  updateGlobalStats(time, successful) {
    this.performanceMetrics.totalMatches++;
    this.performanceMetrics.averageTime = 
      (this.performanceMetrics.averageTime + time) / 2;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.cache.size,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  /**
   * Calculate cache hit rate
   */
  calculateCacheHitRate() {
    // This would be tracked in real implementation
    return 0.85; // Placeholder
  }

  /**
   * Clear all caches and reset stats
   */
  reset() {
    this.cache.clear();
    this.performanceMetrics.totalMatches = 0;
    this.performanceMetrics.averageTime = 0;
    
    this.strategies.forEach(strategy => {
      this.performanceMetrics.strategyStats.set(strategy.name, {
        used: 0,
        successful: 0,
        averageTime: 0,
        averageConfidence: 0
      });
    });
  }
}

// Make available globally
window.AdvancedQuestionMatcher = AdvancedQuestionMatcher;