/**
 * Question Matching Worker
 * Handles heavy computation for question matching in the background
 */

class QuestionMatchingWorker {
  constructor() {
    this.questionDatabase = [];
    this.searchIndex = new Map();
  }

  /**
   * Initialize worker with question database
   */
  initialize(questionsData) {
    this.questionDatabase = questionsData;
    this.buildSearchIndex();
    return { success: true, count: questionsData.length };
  }

  /**
   * Build search index for fast lookups
   */
  buildSearchIndex() {
    this.searchIndex.clear();
    
    this.questionDatabase.forEach((question, index) => {
      // Extract keywords from question text
      const keywords = this.extractKeywords(question.questionText);
      
      keywords.forEach(keyword => {
        if (!this.searchIndex.has(keyword)) {
          this.searchIndex.set(keyword, []);
        }
        this.searchIndex.get(keyword).push(index);
      });
    });
  }

  /**
   * Extract relevant keywords from question text
   */
  extractKeywords(text) {
    const keywords = [];
    const cleanText = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = cleanText.split(' ');
    
    // Extract meaningful words (length > 3, not common words)
    const stopWords = new Set(['what', 'which', 'how', 'when', 'where', 'why', 'the', 'and', 'or', 'but', 'for', 'with', 'from', 'this', 'that']);
    
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        keywords.push(word);
        
        // Add partial matches for longer words
        if (word.length > 6) {
          keywords.push(word.substring(0, 5));
        }
      }
    });
    
    return keywords;
  }

  /**
   * Find matching question with enhanced algorithm
   */
  findMatch(currentQuestionText) {
    if (!currentQuestionText || this.questionDatabase.length === 0) {
      return { match: null, confidence: 0, candidates: [] };
    }

    const candidates = this.findCandidates(currentQuestionText);
    const scoredCandidates = this.scoreMatches(currentQuestionText, candidates);
    
    // Sort by score
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    const bestMatch = scoredCandidates[0];
    
    return {
      match: bestMatch?.score > 0.3 ? bestMatch.question : null,
      confidence: bestMatch?.score || 0,
      candidates: scoredCandidates.slice(0, 5), // Top 5 candidates
      processingTime: Date.now()
    };
  }

  /**
   * Find candidate questions using search index
   */
  findCandidates(questionText) {
    const keywords = this.extractKeywords(questionText);
    const candidateIndices = new Set();
    
    // Find questions that share keywords
    keywords.forEach(keyword => {
      const matches = this.searchIndex.get(keyword) || [];
      matches.forEach(index => candidateIndices.add(index));
    });
    
    // If too few candidates, expand search
    if (candidateIndices.size < 5) {
      keywords.forEach(keyword => {
        // Try partial keyword matches
        this.searchIndex.forEach((indices, indexedKeyword) => {
          if (indexedKeyword.includes(keyword) || keyword.includes(indexedKeyword)) {
            indices.forEach(index => candidateIndices.add(index));
          }
        });
      });
    }
    
    return Array.from(candidateIndices).map(index => this.questionDatabase[index]);
  }

  /**
   * Score potential matches using multiple algorithms
   */
  scoreMatches(currentText, candidates) {
    const currentKeywords = new Set(this.extractKeywords(currentText));
    const currentWords = new Set(currentText.toLowerCase().split(/\s+/));
    
    return candidates.map(candidate => {
      const candidateKeywords = new Set(this.extractKeywords(candidate.questionText));
      const candidateWords = new Set(candidate.questionText.toLowerCase().split(/\s+/));
      
      // Calculate multiple similarity metrics
      const keywordSimilarity = this.calculateSetSimilarity(currentKeywords, candidateKeywords);
      const wordSimilarity = this.calculateSetSimilarity(currentWords, candidateWords);
      const levenshteinSimilarity = this.calculateLevenshteinSimilarity(currentText, candidate.questionText);
      const semanticSimilarity = this.calculateSemanticSimilarity(currentText, candidate.questionText);
      
      // Weighted combination of similarities
      const finalScore = (
        keywordSimilarity * 0.3 +
        wordSimilarity * 0.2 +
        levenshteinSimilarity * 0.2 +
        semanticSimilarity * 0.3
      );
      
      return {
        question: candidate,
        score: finalScore,
        metrics: {
          keyword: keywordSimilarity,
          word: wordSimilarity,
          levenshtein: levenshteinSimilarity,
          semantic: semanticSimilarity
        }
      };
    });
  }

  /**
   * Calculate similarity between two sets
   */
  calculateSetSimilarity(set1, set2) {
    if (set1.size === 0 && set2.size === 0) return 1;
    if (set1.size === 0 || set2.size === 0) return 0;
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate Levenshtein similarity (normalized)
   */
  calculateLevenshteinSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate semantic similarity (simple version)
   */
  calculateSemanticSimilarity(text1, text2) {
    // Extract mathematical expressions, code patterns, etc.
    const patterns = [
      /\b\d+[x²³⁴⁵⁶⁷⁸⁹⁰]\b/g, // Math expressions
      /\b[a-z]+\([^)]*\)/g, // Function calls
      /\b[A-Z_][A-Z0-9_]*\b/g, // Constants
      /\b\d+\.\d+\b/g, // Decimal numbers
    ];
    
    let matches = 0;
    let total = 0;
    
    patterns.forEach(pattern => {
      const matches1 = text1.match(pattern) || [];
      const matches2 = text2.match(pattern) || [];
      
      total += Math.max(matches1.length, matches2.length);
      
      matches1.forEach(match1 => {
        if (matches2.includes(match1)) {
          matches++;
        }
      });
    });
    
    return total > 0 ? matches / total : 0;
  }

  /**
   * Levenshtein distance implementation
   */
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
}

// Worker message handler
self.onmessage = function(e) {
  const { action, data, id } = e.data;
  const worker = new QuestionMatchingWorker();
  
  try {
    let result;
    
    switch (action) {
      case 'initialize':
        result = worker.initialize(data.questions);
        break;
        
      case 'findMatch':
        result = worker.findMatch(data.questionText);
        break;
        
      default:
        result = { error: 'Unknown action' };
    }
    
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
