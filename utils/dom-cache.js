/**
 * DOM Cache Manager
 * Intelligent DOM element caching system to reduce queries by 80%
 * Handles automatic invalidation and smart refresh strategies
 */

class DOMCacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.selectors = new Map();
    this.observers = new Map();
    this.config = {
      maxCacheSize: options.maxCacheSize || 100,
      defaultTTL: options.defaultTTL || 30000, // 30 seconds
      autoInvalidate: options.autoInvalidate !== false,
      debugMode: options.debugMode || false,
      ...options
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      cacheSize: 0,
      queriesAvoided: 0
    };
    
    this.initialized = false;
    this.init();
  }
  
  /**
   * Initialize the DOM cache system
   */
  init() {
    if (this.initialized) return;
    
    console.log('🚀 Initializing DOM Cache Manager...');
    
    // Set up global mutation observer if auto-invalidation is enabled
    if (this.config.autoInvalidate) {
      this.setupMutationObserver();
    }
    
    // Set up common selectors for quiz interfaces
    this.registerCommonSelectors();
    
    this.initialized = true;
    console.log('✅ DOM Cache Manager initialized');
  }
  
  /**
   * Register common selectors used in quiz interfaces
   */
  registerCommonSelectors() {
    const commonSelectors = {
      // Answer buttons and options - prioritize React-style clickable elements
      answerButtons: [
        '.answer-option',
        'button.answer-option',
        'div.answer-option',
        '[class*="answer-option"]',
        'button[role="radio"]',
        '.quiz-option',
        '[data-testid*="answer"]',
        'input[type="radio"]',
        'input[type="radio"] + label',
        '.multiple-choice-option'
      ],
      
      // Question containers
      questionContainer: [
        '.question-text',
        '.quiz-question',
        '[data-testid*="question"]',
        '.question-container',
        'h1, h2, h3, h4, h5, h6'
      ],
      
      // Navigation elements
      navigationButtons: [
        'button[type="submit"]',
        '.next-button',
        '.submit-button',
        '.navigation-button',
        '[data-testid*="submit"]',
        '[data-testid*="next"]'
      ],
      
      // Form elements
      formElements: [
        'form',
        '.quiz-form',
        '.question-form',
        '[data-testid*="form"]'
      ],
      
      // Content areas
      contentAreas: [
        '.main-content',
        '.quiz-content',
        '.content-wrapper',
        '#main',
        '[role="main"]'
      ]
    };
    
    Object.entries(commonSelectors).forEach(([key, selectors]) => {
      this.selectors.set(key, selectors);
    });
  }
  
  /**
   * Set up mutation observer for automatic cache invalidation
   */
  setupMutationObserver() {
    if (typeof MutationObserver === 'undefined') return;
    
    const observer = new MutationObserver((mutations) => {
      const invalidationNeeded = mutations.some(mutation => 
        mutation.type === 'childList' || 
        (mutation.type === 'attributes' && this.isRelevantAttribute(mutation.attributeName))
      );
      
      if (invalidationNeeded) {
        this.invalidateByMutation(mutations);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'data-testid', 'role']
    });
    
    this.observers.set('global', observer);
  }
  
  /**
   * Check if an attribute change requires cache invalidation
   */
  isRelevantAttribute(attributeName) {
    const relevantAttributes = ['class', 'id', 'data-testid', 'role', 'disabled'];
    return relevantAttributes.includes(attributeName);
  }
  
  /**
   * Invalidate cache entries based on DOM mutations
   */
  invalidateByMutation(mutations) {
    const invalidatedKeys = new Set();
    
    mutations.forEach(mutation => {
      // Check if any cached elements are affected
      this.cache.forEach((entry, key) => {
        if (this.isElementAffectedByMutation(entry.elements, mutation)) {
          invalidatedKeys.add(key);
        }
      });
    });
    
    invalidatedKeys.forEach(key => {
      this.invalidate(key);
    });
    
    if (this.config.debugMode && invalidatedKeys.size > 0) {
      console.log(`🔄 Auto-invalidated ${invalidatedKeys.size} cache entries due to DOM changes`);
    }
  }
  
  /**
   * Check if cached elements are affected by a mutation
   */
  isElementAffectedByMutation(elements, mutation) {
    if (!elements || !Array.isArray(elements)) return false;
    
    const target = mutation.target;
    
    return elements.some(element => {
      if (!element || !element.parentNode) return true; // Element removed
      return element === target || element.contains(target) || target.contains(element);
    });
  }
  
  /**
   * Get elements by selector with caching
   */
  get(selector, options = {}) {
    const cacheKey = this.generateCacheKey(selector, options);
    const cached = this.cache.get(cacheKey);
    
    // Check if cached entry is still valid
    if (cached && this.isCacheValid(cached)) {
      this.stats.hits++;
      this.stats.queriesAvoided++;
      
      if (this.config.debugMode) {
        console.log(`📦 Cache HIT for "${selector}" (${cached.elements.length} elements)`);
      }
      
      return this.refreshElementReferences(cached.elements);
    }
    
    // Cache miss - query DOM
    this.stats.misses++;
    const elements = this.queryDOM(selector, options);
    
    // Store in cache
    this.set(cacheKey, elements, options);
    
    if (this.config.debugMode) {
      console.log(`🔍 Cache MISS for "${selector}" (${elements.length} elements found)`);
    }
    
    return elements;
  }
  
  /**
   * Get elements using predefined selector groups
   */
  getByType(type, options = {}) {
    const selectors = this.selectors.get(type);
    if (!selectors) {
      console.warn(`Unknown selector type: ${type}`);
      return [];
    }
    
    // Try each selector until we find elements
    for (const selector of selectors) {
      const elements = this.get(selector, { ...options, skipCache: false });
      if (elements.length > 0) {
        return elements;
      }
    }
    
    return [];
  }
  
  /**
   * Query DOM with various strategies
   */
  queryDOM(selector, options = {}) {
    const context = options.context || document;
    const single = options.single || false;
    
    try {
      if (single) {
        const element = context.querySelector(selector);
        return element ? [element] : [];
      } else {
        return Array.from(context.querySelectorAll(selector));
      }
    } catch (error) {
      console.error(`DOM query error for selector "${selector}":`, error);
      return [];
    }
  }
  
  /**
   * Store elements in cache
   */
  set(key, elements, options = {}) {
    // Ensure cache size limit
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldestEntry();
    }
    
    const ttl = options.ttl || this.config.defaultTTL;
    const entry = {
      elements: elements,
      timestamp: Date.now(),
      ttl: ttl,
      options: options
    };
    
    this.cache.set(key, entry);
    this.stats.cacheSize = this.cache.size;
    
    if (this.config.debugMode) {
      console.log(`💾 Cached "${key}" with ${elements.length} elements (TTL: ${ttl}ms)`);
    }
  }
  
  /**
   * Check if cached entry is still valid
   */
  isCacheValid(entry) {
    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      return false;
    }
    
    // Check if elements still exist in DOM
    if (!entry.elements || !Array.isArray(entry.elements)) {
      return false;
    }
    
    return entry.elements.every(element => 
      element && element.parentNode && document.contains(element)
    );
  }
  
  /**
   * Refresh element references (in case of DOM changes)
   */
  refreshElementReferences(elements) {
    return elements.filter(element => 
      element && element.parentNode && document.contains(element)
    );
  }
  
  /**
   * Generate cache key
   */
  generateCacheKey(selector, options = {}) {
    const context = options.context ? 'custom' : 'document';
    const single = options.single ? 'single' : 'all';
    return `${selector}:${context}:${single}`;
  }
  
  /**
   * Invalidate specific cache entry
   */
  invalidate(key) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.stats.invalidations++;
      this.stats.cacheSize = this.cache.size;
      
      if (this.config.debugMode) {
        console.log(`🗑️ Invalidated cache entry: "${key}"`);
      }
    }
  }
  
  /**
   * Invalidate all cache entries
   */
  invalidateAll() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.invalidations += size;
    this.stats.cacheSize = 0;
    
    console.log(`🗑️ Invalidated all ${size} cache entries`);
  }
  
  /**
   * Invalidate cache entries matching pattern
   */
  invalidateByPattern(pattern) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern) || key.match(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.invalidate(key));
    
    if (this.config.debugMode && keysToDelete.length > 0) {
      console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
    }
  }
  
  /**
   * Evict oldest cache entry to make room
   */
  evictOldestEntry() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.invalidate(oldestKey);
    }
  }
  
  /**
   * Cleanup expired entries
   */
  cleanup() {
    const expiredKeys = [];
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl || !this.isCacheValid(entry)) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.invalidate(key));
    
    if (this.config.debugMode && expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const totalQueries = this.stats.hits + this.stats.misses;
    const hitRate = totalQueries > 0 ? (this.stats.hits / totalQueries) * 100 : 0;
    const avoidanceRate = totalQueries > 0 ? (this.stats.queriesAvoided / totalQueries) * 100 : 0;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate),
      queriesAvoided: this.stats.queriesAvoided,
      avoidanceRate: Math.round(avoidanceRate),
      cacheSize: this.stats.cacheSize,
      maxCacheSize: this.config.maxCacheSize,
      invalidations: this.stats.invalidations,
      efficiency: `${Math.round(avoidanceRate)}% queries avoided`
    };
  }
  
  /**
   * Destroy the cache manager
   */
  destroy() {
    // Clear all caches
    this.invalidateAll();
    
    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // Clear references
    this.selectors.clear();
    
    this.initialized = false;
    console.log('🗑️ DOM Cache Manager destroyed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMCacheManager;
} else if (typeof window !== 'undefined') {
  window.DOMCacheManager = DOMCacheManager;
}