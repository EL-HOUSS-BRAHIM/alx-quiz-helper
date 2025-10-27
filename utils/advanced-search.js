/**
 * Advanced Search & Filtering Engine
 * Powerful search capabilities with fuzzy matching and advanced filters
 */

class AdvancedSearchEngine {
  constructor() {
    this.searchIndex = new Map();
    this.searchHistory = [];
    this.savedQueries = new Map();
    this.filterPresets = new Map();
    
    this.initializeFilters();
    this.setupSearchIndex();
  }

  /**
   * Initialize available filters
   */
  initializeFilters() {
    this.availableFilters = {
      subject: {
        type: 'select',
        options: ['programming', 'math', 'business', 'design', 'general'],
        label: 'Subject'
      },
      difficulty: {
        type: 'select',
        options: ['easy', 'medium', 'hard'],
        label: 'Difficulty'
      },
      dateRange: {
        type: 'daterange',
        label: 'Date Captured'
      },
      hasImages: {
        type: 'boolean',
        label: 'Has Images'
      },
      answerCount: {
        type: 'range',
        min: 2,
        max: 10,
        label: 'Number of Answers'
      },
      textLength: {
        type: 'range',
        min: 0,
        max: 1000,
        label: 'Question Length'
      },
      confidence: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.1,
        label: 'Match Confidence'
      }
    };

    // Setup filter presets
    this.filterPresets.set('programming', {
      subject: ['programming'],
      difficulty: ['medium', 'hard']
    });

    this.filterPresets.set('easy_questions', {
      difficulty: ['easy'],
      answerCount: { min: 2, max: 4 }
    });

    this.filterPresets.set('recent', {
      dateRange: { 
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    });
  }

  /**
   * Setup search index for fast searching
   */
  setupSearchIndex() {
    this.searchIndex.clear();
  }

  /**
   * Index questions for fast searching
   */
  indexQuestions(questions) {
    this.searchIndex.clear();
    
    questions.forEach((question, index) => {
      const searchableText = this.createSearchableText(question);
      const words = this.tokenize(searchableText);
      
      words.forEach(word => {
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, new Set());
        }
        this.searchIndex.get(word).add(index);
      });
    });
  }

  /**
   * Advanced search with multiple criteria
   */
  search(query, filters = {}, options = {}) {
    const searchOptions = {
      fuzzyTolerance: 0.8,
      includeScore: true,
      maxResults: 100,
      sortBy: 'relevance',
      ...options
    };

    const results = this.performSearch(query, searchOptions);
    const filtered = this.applyFilters(results, filters);
    const sorted = this.sortResults(filtered, searchOptions.sortBy);

    // Record search in history
    this.recordSearch(query, filters, sorted.length);

    return {
      results: sorted.slice(0, searchOptions.maxResults),
      totalCount: sorted.length,
      searchTime: Date.now() - this.searchStartTime,
      query: query,
      filters: filters
    };
  }

  /**
   * Perform the core search operation
   */
  performSearch(query, options) {
    this.searchStartTime = Date.now();
    
    if (!query || query.trim().length === 0) {
      return this.getAllQuestions();
    }

    const queryTerms = this.tokenize(query.toLowerCase());
    const candidateIndices = new Map(); // index -> score

    // Find matching questions
    queryTerms.forEach(term => {
      // Exact matches
      if (this.searchIndex.has(term)) {
        this.searchIndex.get(term).forEach(index => {
          candidateIndices.set(index, (candidateIndices.get(index) || 0) + 1);
        });
      }

      // Fuzzy matches
      if (options.fuzzyTolerance && options.fuzzyTolerance > 0) {
        this.searchIndex.forEach((indices, indexedTerm) => {
          const similarity = this.calculateStringSimilarity(term, indexedTerm);
          if (similarity >= options.fuzzyTolerance) {
            indices.forEach(index => {
              const score = similarity * 0.5; // Fuzzy matches get lower score
              candidateIndices.set(index, (candidateIndices.get(index) || 0) + score);
            });
          }
        });
      }
    });

    // Convert to result objects
    const results = Array.from(candidateIndices.entries()).map(([index, score]) => ({
      index,
      score: score / queryTerms.length, // Normalize score
      relevance: this.calculateRelevance(index, query, score)
    }));

    return results;
  }

  /**
   * Apply filters to search results
   */
  applyFilters(results, filters) {
    if (Object.keys(filters).length === 0) {
      return results;
    }

    return results.filter(result => {
      const question = this.getQuestionByIndex(result.index);
      if (!question) return false;

      return Object.entries(filters).every(([filterName, filterValue]) => {
        return this.applyFilter(question, filterName, filterValue);
      });
    });
  }

  /**
   * Apply a single filter to a question
   */
  applyFilter(question, filterName, filterValue) {
    switch (filterName) {
      case 'subject':
        return Array.isArray(filterValue) 
          ? filterValue.includes(question.subject || 'general')
          : (question.subject || 'general') === filterValue;

      case 'difficulty':
        return Array.isArray(filterValue)
          ? filterValue.includes(question.difficulty || 'medium')
          : (question.difficulty || 'medium') === filterValue;

      case 'hasImages':
        return question.hasImages === filterValue;

      case 'answerCount':
        const count = question.answerOptions?.length || 0;
        if (typeof filterValue === 'object') {
          return count >= (filterValue.min || 0) && count <= (filterValue.max || 100);
        }
        return count === filterValue;

      case 'textLength':
        const length = question.questionText?.length || 0;
        if (typeof filterValue === 'object') {
          return length >= (filterValue.min || 0) && length <= (filterValue.max || 10000);
        }
        return length === filterValue;

      case 'dateRange':
        if (typeof filterValue === 'object' && filterValue.start && filterValue.end) {
          const questionDate = new Date(question.capturedDate || question.timestamp || 0);
          const startDate = new Date(filterValue.start);
          const endDate = new Date(filterValue.end);
          return questionDate >= startDate && questionDate <= endDate;
        }
        return true;

      case 'confidence':
        const confidence = question.matchConfidence || 0.5;
        if (typeof filterValue === 'object') {
          return confidence >= (filterValue.min || 0) && confidence <= (filterValue.max || 1);
        }
        return confidence === filterValue;

      default:
        return true;
    }
  }

  /**
   * Sort search results
   */
  sortResults(results, sortBy) {
    switch (sortBy) {
      case 'relevance':
        return results.sort((a, b) => b.relevance - a.relevance);
      
      case 'score':
        return results.sort((a, b) => b.score - a.score);
      
      case 'date':
        return results.sort((a, b) => {
          const questionA = this.getQuestionByIndex(a.index);
          const questionB = this.getQuestionByIndex(b.index);
          const dateA = new Date(questionA?.capturedDate || 0);
          const dateB = new Date(questionB?.capturedDate || 0);
          return dateB - dateA;
        });
      
      case 'difficulty':
        const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
        return results.sort((a, b) => {
          const questionA = this.getQuestionByIndex(a.index);
          const questionB = this.getQuestionByIndex(b.index);
          const diffA = difficultyOrder[questionA?.difficulty || 'medium'];
          const diffB = difficultyOrder[questionB?.difficulty || 'medium'];
          return diffA - diffB;
        });
      
      case 'subject':
        return results.sort((a, b) => {
          const questionA = this.getQuestionByIndex(a.index);
          const questionB = this.getQuestionByIndex(b.index);
          const subjectA = questionA?.subject || 'general';
          const subjectB = questionB?.subject || 'general';
          return subjectA.localeCompare(subjectB);
        });
      
      default:
        return results;
    }
  }

  /**
   * Search with boolean operators
   */
  booleanSearch(query) {
    // Parse boolean query (AND, OR, NOT)
    const tokens = this.parseBooleanQuery(query);
    return this.evaluateBooleanQuery(tokens);
  }

  /**
   * Save a search query for later use
   */
  saveQuery(name, query, filters = {}) {
    this.savedQueries.set(name, {
      query,
      filters,
      savedDate: new Date().toISOString(),
      useCount: 0
    });
  }

  /**
   * Execute a saved query
   */
  executeSavedQuery(name) {
    const savedQuery = this.savedQueries.get(name);
    if (!savedQuery) {
      throw new Error(`Saved query '${name}' not found`);
    }

    savedQuery.useCount++;
    savedQuery.lastUsed = new Date().toISOString();

    return this.search(savedQuery.query, savedQuery.filters);
  }

  /**
   * Get search suggestions based on partial input
   */
  getSuggestions(partialQuery, maxSuggestions = 5) {
    const suggestions = [];
    
    // Suggestions from search history
    this.searchHistory
      .filter(entry => entry.query.toLowerCase().includes(partialQuery.toLowerCase()))
      .slice(0, maxSuggestions)
      .forEach(entry => {
        suggestions.push({
          type: 'history',
          text: entry.query,
          frequency: entry.resultCount
        });
      });

    // Suggestions from indexed terms
    const terms = Array.from(this.searchIndex.keys())
      .filter(term => term.startsWith(partialQuery.toLowerCase()))
      .slice(0, maxSuggestions)
      .map(term => ({
        type: 'term',
        text: term,
        frequency: this.searchIndex.get(term).size
      }));

    suggestions.push(...terms);

    return suggestions
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, maxSuggestions);
  }

  /**
   * Get popular search terms
   */
  getPopularSearches(limit = 10) {
    const termFrequency = new Map();
    
    this.searchHistory.forEach(entry => {
      const terms = this.tokenize(entry.query.toLowerCase());
      terms.forEach(term => {
        termFrequency.set(term, (termFrequency.get(term) || 0) + 1);
      });
    });

    return Array.from(termFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([term, frequency]) => ({ term, frequency }));
  }

  /**
   * Helper methods
   */
  createSearchableText(question) {
    const parts = [
      question.questionText || '',
      question.subject || '',
      question.difficulty || '',
      ...(question.answerOptions || []),
      ...(question.correctAnswerTexts || []),
      question.explanation || ''
    ];
    
    return parts.join(' ').toLowerCase();
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
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

  calculateRelevance(index, query, score) {
    const question = this.getQuestionByIndex(index);
    if (!question) return score;

    let relevance = score;
    
    // Boost relevance for exact phrase matches
    if (question.questionText?.toLowerCase().includes(query.toLowerCase())) {
      relevance += 0.5;
    }

    // Boost relevance for matches in question text vs answers
    const queryTerms = this.tokenize(query.toLowerCase());
    const questionTerms = this.tokenize(question.questionText?.toLowerCase() || '');
    const commonTerms = queryTerms.filter(term => questionTerms.includes(term));
    
    relevance += (commonTerms.length / queryTerms.length) * 0.3;

    return relevance;
  }

  getAllQuestions() {
    // This should be implemented to return all questions with their indices
    // For now, return empty array
    return [];
  }

  getQuestionByIndex(index) {
    // This should be implemented to return the question at the given index
    // For now, return null
    return null;
  }

  recordSearch(query, filters, resultCount) {
    this.searchHistory.push({
      query,
      filters,
      resultCount,
      timestamp: Date.now()
    });

    // Keep only last 100 searches
    if (this.searchHistory.length > 100) {
      this.searchHistory = this.searchHistory.slice(-100);
    }
  }

  parseBooleanQuery(query) {
    // Simple boolean query parser
    return query.split(/\s+(AND|OR|NOT)\s+/i);
  }

  evaluateBooleanQuery(tokens) {
    // Simple boolean query evaluation
    // This would need more sophisticated implementation
    return [];
  }

  /**
   * Get search statistics
   */
  getSearchStats() {
    return {
      totalSearches: this.searchHistory.length,
      uniqueQueries: new Set(this.searchHistory.map(h => h.query)).size,
      savedQueries: this.savedQueries.size,
      indexedTerms: this.searchIndex.size,
      popularTerms: this.getPopularSearches(5),
      averageResultCount: this.searchHistory.reduce((sum, h) => sum + h.resultCount, 0) / this.searchHistory.length || 0
    };
  }

  /**
   * Clear search history
   */
  clearHistory() {
    this.searchHistory = [];
  }

  /**
   * Export search data
   */
  exportSearchData() {
    return {
      history: this.searchHistory,
      savedQueries: Object.fromEntries(this.savedQueries),
      filterPresets: Object.fromEntries(this.filterPresets)
    };
  }
}

// Make available globally
window.AdvancedSearchEngine = AdvancedSearchEngine;
