/**
 * Confidence-Based Answer System
 * Provides intelligent answer matching with confidence scoring
 */

class ConfidenceAnswerSystem {
  constructor() {
    this.confidenceThresholds = {
      HIGH: 0.8,    // Very confident - auto highlight
      MEDIUM: 0.6,  // Somewhat confident - highlight with warning
      LOW: 0.4,     // Low confidence - show as suggestion
      NONE: 0.2     // Very low confidence - don't highlight
    };
    
    this.matchingStrategies = [
      { name: 'exact', weight: 1.0, fn: this.exactMatch.bind(this) },
      { name: 'normalized', weight: 0.9, fn: this.normalizedMatch.bind(this) },
      { name: 'keyword', weight: 0.7, fn: this.keywordMatch.bind(this) },
      { name: 'semantic', weight: 0.8, fn: this.semanticMatch.bind(this) },
      { name: 'pattern', weight: 0.6, fn: this.patternMatch.bind(this) },
      { name: 'fuzzy', weight: 0.5, fn: this.fuzzyMatch.bind(this) }
    ];
    
    this.learningData = new Map(); // Store user feedback for learning
    this.setupLearningSystem();
  }

  /**
   * Find matching question with confidence scoring
   */
  async findMatchWithConfidence(currentQuestion, storedQuestions) {
    const results = [];
    
    for (const stored of storedQuestions) {
      const confidence = await this.calculateOverallConfidence(currentQuestion, stored);
      
      if (confidence.score > this.confidenceThresholds.NONE) {
        results.push({
          question: stored,
          confidence: confidence.score,
          breakdown: confidence.breakdown,
          reasons: confidence.reasons
        });
      }
    }
    
    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    const bestMatch = results[0];
    
    return {
      match: bestMatch || null,
      allCandidates: results.slice(0, 5),
      confidenceLevel: this.getConfidenceLevel(bestMatch?.confidence || 0),
      shouldHighlight: bestMatch?.confidence >= this.confidenceThresholds.LOW,
      needsVerification: bestMatch?.confidence < this.confidenceThresholds.HIGH && bestMatch?.confidence >= this.confidenceThresholds.MEDIUM
    };
  }

  /**
   * Calculate overall confidence using multiple strategies
   */
  async calculateOverallConfidence(current, stored) {
    const scores = [];
    const breakdown = {};
    const reasons = [];
    
    // Apply each matching strategy
    for (const strategy of this.matchingStrategies) {
      try {
        const result = await strategy.fn(current, stored);
        const weightedScore = result.score * strategy.weight;
        
        scores.push(weightedScore);
        breakdown[strategy.name] = {
          raw: result.score,
          weighted: weightedScore,
          details: result.details
        };
        
        if (result.score > 0.5) {
          reasons.push(`${strategy.name}: ${Math.round(result.score * 100)}%`);
        }
      } catch (error) {
        console.warn(`Strategy ${strategy.name} failed:`, error);
        breakdown[strategy.name] = { error: error.message };
      }
    }
    
    // Calculate weighted average
    const totalWeight = this.matchingStrategies.reduce((sum, s) => sum + s.weight, 0);
    const weightedSum = scores.reduce((sum, score) => sum + score, 0);
    const baseScore = weightedSum / totalWeight;
    
    // Apply learning adjustments
    const learningBonus = this.getLearningBonus(current, stored);
    const finalScore = Math.min(1.0, baseScore + learningBonus);
    
    return {
      score: finalScore,
      breakdown,
      reasons,
      learningBonus
    };
  }

  /**
   * Exact text match
   */
  async exactMatch(current, stored) {
    const currentText = this.normalizeText(current.questionText || current);
    const storedText = this.normalizeText(stored.questionText);
    
    const isExact = currentText === storedText;
    
    return {
      score: isExact ? 1.0 : 0.0,
      details: { exact: isExact }
    };
  }

  /**
   * Enhanced normalized text match with better preprocessing
   */
  async normalizedMatch(current, stored) {
    const currentNorm = this.deepNormalize(current.questionText || current);
    const storedNorm = this.deepNormalize(stored.questionText);

    if (currentNorm === storedNorm) {
      return { score: 1.0, details: { normalized: true, exact: true } };
    }

    // Enhanced character-level similarity with position weighting
    const charSimilarity = this.calculateEnhancedCharacterSimilarity(currentNorm, storedNorm);

    // Word-level similarity
    const wordSimilarity = this.calculateWordLevelSimilarity(currentNorm, storedNorm);

    // Combine scores with weights
    const combinedScore = (charSimilarity * 0.6) + (wordSimilarity * 0.4);

    return {
      score: combinedScore,
      details: {
        normalized: false,
        charSimilarity,
        wordSimilarity,
        combinedScore,
        currentLength: currentNorm.length,
        storedLength: storedNorm.length
      }
    };
  }

  /**
   * Enhanced character similarity with position awareness
   */
  calculateEnhancedCharacterSimilarity(str1, str2) {
    if (str1 === str2) return 1;

    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0 || len2 === 0) return 0;

    // Use dynamic programming for better alignment
    const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    // Fill the matrix
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,      // deletion
          matrix[j][i - 1] + 1,      // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len2][len1];
    const maxLength = Math.max(len1, len2);

    // Apply position weighting - matches at the beginning are more important
    let positionWeightedSimilarity = 0;
    let totalWeight = 0;

    for (let i = 0; i < Math.min(len1, len2); i++) {
      const weight = 1 / (1 + i * 0.1); // Decreasing weight for later positions
      if (str1[i] === str2[i]) {
        positionWeightedSimilarity += weight;
      }
      totalWeight += weight;
    }

    const positionScore = totalWeight > 0 ? positionWeightedSimilarity / totalWeight : 0;
    const levenshteinScore = 1 - (distance / maxLength);

    // Combine with weights
    return (levenshteinScore * 0.7) + (positionScore * 0.3);
  }

  /**
   * Word-level similarity calculation
   */
  calculateWordLevelSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (words1.length === 0 && words2.length === 0) return 1;
    if (words1.length === 0 || words2.length === 0) return 0;

    // Calculate word overlap with position consideration
    const wordMatches = [];
    const usedIndices = new Set();

    for (let i = 0; i < words1.length; i++) {
      for (let j = 0; j < words2.length; j++) {
        if (!usedIndices.has(j) && words1[i] === words2[j]) {
          wordMatches.push({
            word: words1[i],
            position1: i,
            position2: j,
            positionDiff: Math.abs(i - j)
          });
          usedIndices.add(j);
          break;
        }
      }
    }

    const overlapScore = wordMatches.length / Math.max(words1.length, words2.length);

    // Position consistency bonus
    const avgPositionDiff = wordMatches.reduce((sum, match) => sum + match.positionDiff, 0) / Math.max(wordMatches.length, 1);
    const positionConsistency = Math.max(0, 1 - (avgPositionDiff / Math.max(words1.length, words2.length)));

    return (overlapScore * 0.8) + (positionConsistency * 0.2);
  }

  /**
   * Keyword-based matching
   */
  async keywordMatch(current, stored) {
    const currentKeywords = this.extractKeywords(current.questionText || current);
    const storedKeywords = this.extractKeywords(stored.questionText);
    
    if (currentKeywords.length === 0 || storedKeywords.length === 0) {
      return { score: 0, details: { noKeywords: true } };
    }
    
    const commonKeywords = currentKeywords.filter(k => storedKeywords.includes(k));
    const jaccardIndex = commonKeywords.length / (currentKeywords.length + storedKeywords.length - commonKeywords.length);
    
    return {
      score: jaccardIndex,
      details: {
        currentKeywords: currentKeywords.length,
        storedKeywords: storedKeywords.length,
        commonKeywords: commonKeywords.length,
        commonWords: commonKeywords
      }
    };
  }

  /**
   * Semantic matching (context-aware)
   */
  async semanticMatch(current, stored) {
    const currentContext = this.extractSemanticContext(current.questionText || current);
    const storedContext = this.extractSemanticContext(stored.questionText);
    
    let score = 0;
    const details = {};
    
    // Mathematical expressions
    if (currentContext.hasMath && storedContext.hasMath) {
      const mathSimilarity = this.compareMathExpressions(currentContext.mathTerms, storedContext.mathTerms);
      score += mathSimilarity * 0.4;
      details.mathSimilarity = mathSimilarity;
    }
    
    // Programming elements
    if (currentContext.hasCode && storedContext.hasCode) {
      const codeSimilarity = this.compareCodeElements(currentContext.codeTerms, storedContext.codeTerms);
      score += codeSimilarity * 0.3;
      details.codeSimilarity = codeSimilarity;
    }
    
    // Domain-specific terms
    const domainSimilarity = this.compareDomainTerms(currentContext.domainTerms, storedContext.domainTerms);
    score += domainSimilarity * 0.3;
    details.domainSimilarity = domainSimilarity;
    
    return { score: Math.min(1.0, score), details };
  }

  /**
   * Pattern-based matching (structure and format)
   */
  async patternMatch(current, stored) {
    const currentPattern = this.extractPattern(current.questionText || current);
    const storedPattern = this.extractPattern(stored.questionText);
    
    let score = 0;
    const details = {};
    
    // Question type similarity
    if (currentPattern.type === storedPattern.type) {
      score += 0.3;
      details.sameType = true;
    }
    
    // Structure similarity
    const structureSimilarity = this.compareStructure(currentPattern, storedPattern);
    score += structureSimilarity * 0.4;
    details.structureSimilarity = structureSimilarity;
    
    // Length similarity
    const lengthRatio = Math.min(currentPattern.length, storedPattern.length) / Math.max(currentPattern.length, storedPattern.length);
    score += lengthRatio * 0.3;
    details.lengthRatio = lengthRatio;
    
    return { score: Math.min(1.0, score), details };
  }

  /**
   * Fuzzy string matching
   */
  async fuzzyMatch(current, stored) {
    const currentText = this.normalizeText(current.questionText || current);
    const storedText = this.normalizeText(stored.questionText);
    
    const distance = this.levenshteinDistance(currentText, storedText);
    const maxLength = Math.max(currentText.length, storedText.length);
    
    if (maxLength === 0) return { score: 1.0, details: { bothEmpty: true } };
    
    const similarity = 1 - (distance / maxLength);
    
    return {
      score: similarity,
      details: {
        distance,
        maxLength,
        similarity
      }
    };
  }

  /**
   * Helper methods for text processing
   */
  normalizeText(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  deepNormalize(text) {
    return text.toLowerCase()
      .replace(/question\s*\d*[:.]\s*/gi, '')
      .replace(/^\d+[.)]\s*/, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractKeywords(text) {
    const normalized = this.normalizeText(text);
    const words = normalized.split(' ');
    
    // Filter out stop words and short words
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'what', 'which', 'how', 'when', 'where', 'why', 'who']);
    
    return words.filter(word => 
      word.length > 3 && 
      !stopWords.has(word) &&
      !/^\d+$/.test(word)
    );
  }

  extractSemanticContext(text) {
    const mathTerms = text.match(/\b(equation|solve|calculate|derivative|integral|matrix|determinant|function|graph|plot|linear|quadratic|polynomial|logarithm|exponential|trigonometric|sin|cos|tan)\b/gi) || [];
    const codeTerms = text.match(/\b(function|class|method|variable|array|object|string|integer|boolean|loop|condition|algorithm|data|structure)\b/gi) || [];
    const domainTerms = text.match(/\b(business|marketing|finance|portfolio|neuroplasticity|psychology|biology|chemistry|physics|history|literature|philosophy)\b/gi) || [];
    
    return {
      hasMath: mathTerms.length > 0,
      hasCode: codeTerms.length > 0,
      mathTerms: mathTerms.map(t => t.toLowerCase()),
      codeTerms: codeTerms.map(t => t.toLowerCase()),
      domainTerms: domainTerms.map(t => t.toLowerCase())
    };
  }

  extractPattern(text) {
    const patterns = {
      multipleChoice: /[a-e]\)/gi,
      fillInBlank: /____+/g,
      calculation: /calculate|solve|find|determine/gi,
      definition: /what\s+is|define|definition/gi,
      comparison: /compare|contrast|difference|similar/gi,
      listing: /list|enumerate|identify/gi
    };
    
    let type = 'general';
    let maxMatches = 0;
    
    for (const [patternType, regex] of Object.entries(patterns)) {
      const matches = text.match(regex);
      if (matches && matches.length > maxMatches) {
        maxMatches = matches.length;
        type = patternType;
      }
    }
    
    return {
      type,
      length: text.length,
      hasNumbers: /\d/.test(text),
      hasSymbols: /[+\-*/=<>]/.test(text),
      questionMarks: (text.match(/\?/g) || []).length,
      sentences: text.split(/[.!?]+/).length
    };
  }

  compareMathExpressions(terms1, terms2) {
    if (terms1.length === 0 && terms2.length === 0) return 0;
    const commonTerms = terms1.filter(t => terms2.includes(t));
    return commonTerms.length / Math.max(terms1.length, terms2.length);
  }

  compareCodeElements(terms1, terms2) {
    if (terms1.length === 0 && terms2.length === 0) return 0;
    const commonTerms = terms1.filter(t => terms2.includes(t));
    return commonTerms.length / Math.max(terms1.length, terms2.length);
  }

  compareDomainTerms(terms1, terms2) {
    if (terms1.length === 0 && terms2.length === 0) return 0;
    const commonTerms = terms1.filter(t => terms2.includes(t));
    return commonTerms.length / Math.max(terms1.length, terms2.length);
  }

  compareStructure(pattern1, pattern2) {
    let similarity = 0;
    let comparisons = 0;
    
    const compareField = (field) => {
      if (typeof pattern1[field] === 'boolean' && typeof pattern2[field] === 'boolean') {
        similarity += pattern1[field] === pattern2[field] ? 1 : 0;
      } else if (typeof pattern1[field] === 'number' && typeof pattern2[field] === 'number') {
        const ratio = Math.min(pattern1[field], pattern2[field]) / Math.max(pattern1[field], pattern2[field], 1);
        similarity += ratio;
      }
      comparisons++;
    };
    
    compareField('hasNumbers');
    compareField('hasSymbols');
    compareField('questionMarks');
    compareField('sentences');
    
    return comparisons > 0 ? similarity / comparisons : 0;
  }

  calculateCharacterSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0 || len2 === 0) return 0;
    
    let matches = 0;
    const shorter = len1 < len2 ? str1 : str2;
    const longer = len1 < len2 ? str2 : str1;
    
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }
    
    return matches / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Learning system methods
   */
  setupLearningSystem() {
    // Load existing learning data
    this.loadLearningData();
    
    // Save learning data periodically
    setInterval(() => {
      this.saveLearningData();
    }, 30000);
  }

  async loadLearningData() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get('confidence_learning_data');
        if (result.confidence_learning_data) {
          this.learningData = new Map(Object.entries(result.confidence_learning_data));
        }
      }
    } catch (error) {
      console.warn('Failed to load learning data:', error);
    }
  }

  async saveLearningData() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const dataObject = Object.fromEntries(this.learningData);
        await chrome.storage.local.set({ confidence_learning_data: dataObject });
      }
    } catch (error) {
      console.warn('Failed to save learning data:', error);
    }
  }

  getLearningBonus(current, stored) {
    const key = this.generateLearningKey(current, stored);
    const learningEntry = this.learningData.get(key);
    
    if (!learningEntry) return 0;
    
    // Boost confidence based on positive feedback
    const successRate = learningEntry.correct / (learningEntry.correct + learningEntry.incorrect);
    const bonus = (successRate - 0.5) * 0.2; // Up to ±0.2 bonus
    
    return Math.max(-0.2, Math.min(0.2, bonus));
  }

  recordFeedback(current, stored, wasCorrect) {
    const key = this.generateLearningKey(current, stored);
    const existing = this.learningData.get(key) || { correct: 0, incorrect: 0, total: 0 };
    
    if (wasCorrect) {
      existing.correct++;
    } else {
      existing.incorrect++;
    }
    existing.total++;
    
    this.learningData.set(key, existing);
  }

  generateLearningKey(current, stored) {
    const currentHash = this.hashText(current.questionText || current);
    const storedHash = this.hashText(stored.questionText);
    return `${currentHash}_${storedHash}`;
  }

  hashText(text) {
    let hash = 0;
    const normalized = this.normalizeText(text);
    
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  getConfidenceLevel(score) {
    if (score >= this.confidenceThresholds.HIGH) return 'HIGH';
    if (score >= this.confidenceThresholds.MEDIUM) return 'MEDIUM';
    if (score >= this.confidenceThresholds.LOW) return 'LOW';
    return 'NONE';
  }

  /**
   * Public API methods
   */
  updateThresholds(newThresholds) {
    Object.assign(this.confidenceThresholds, newThresholds);
  }

  getStats() {
    return {
      learningEntries: this.learningData.size,
      thresholds: this.confidenceThresholds,
      strategies: this.matchingStrategies.map(s => ({ name: s.name, weight: s.weight }))
    };
  }

  clearLearningData() {
    this.learningData.clear();
    this.saveLearningData();
  }
}

// Export for use in other scripts
window.ConfidenceAnswerSystem = ConfidenceAnswerSystem;
