/**
 * Enhanced Visual Feedback System
 * Provides rich visual feedback for quiz assistance
 */

class VisualFeedbackSystem {
  constructor() {
    this.currentTheme = this.detectTheme();
    this.animations = new Map();
    this.soundEnabled = true;
    this.setupStyles();
    this.setupSounds();
  }

  /**
   * Detect user's preferred theme
   */
  detectTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches ||
                   document.body.classList.contains('dark-mode') ||
                   document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark ? 'dark' : 'light';
  }

  /**
   * Setup dynamic styles for visual feedback
   */
  setupStyles() {
    const styleId = 'quiz-helper-enhanced-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    
    const themes = {
      light: {
        primary: '#ff6600',
        primaryLight: 'rgba(255, 102, 0, 0.1)',
        success: '#10b981',
        successLight: 'rgba(16, 185, 129, 0.1)',
        warning: '#f59e0b',
        warningLight: 'rgba(245, 158, 11, 0.1)',
        surface: '#ffffff',
        text: '#1f2937',
        shadow: 'rgba(0, 0, 0, 0.1)'
      },
      dark: {
        primary: '#ff8533',
        primaryLight: 'rgba(255, 133, 51, 0.15)',
        success: '#34d399',
        successLight: 'rgba(52, 211, 153, 0.15)',
        warning: '#fbbf24',
        warningLight: 'rgba(251, 191, 36, 0.15)',
        surface: '#1f2937',
        text: '#f9fafb',
        shadow: 'rgba(0, 0, 0, 0.3)'
      }
    };

    const colors = themes[this.currentTheme];

    style.textContent = `
      /* Enhanced Answer Highlighting */
      .quiz-helper-answer-enhanced {
        background: linear-gradient(135deg, ${colors.primaryLight}, ${colors.successLight}) !important;
        border: 2px solid ${colors.primary} !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 20px ${colors.shadow} !important;
        transform: translateY(-2px) !important;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        position: relative !important;
        overflow: hidden !important;
      }

      .quiz-helper-answer-enhanced:hover {
        transform: translateY(-4px) scale(1.02) !important;
        box-shadow: 0 8px 25px ${colors.shadow} !important;
      }

      .quiz-helper-answer-enhanced::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        animation: shimmer 2s infinite;
      }

      @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }

      /* Confidence Indicator */
      .quiz-helper-confidence {
        position: absolute;
        top: -8px;
        right: -8px;
        background: ${colors.success};
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        box-shadow: 0 2px 8px ${colors.shadow};
        animation: pulse-confidence 2s infinite;
      }

      @keyframes pulse-confidence {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      /* Enhanced Success Indicator */
      .quiz-helper-success-indicator {
        display: inline-flex;
        align-items: center;
        background: ${colors.success};
        color: white;
        padding: 4px 8px;
        border-radius: 16px;
        font-size: 11px;
        font-weight: 600;
        margin-left: 8px;
        box-shadow: 0 2px 8px ${colors.shadow};
        animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }

      @keyframes bounceIn {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.2); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }

      /* Progress Ring */
      .quiz-helper-progress-ring {
        position: fixed;
        top: 20px;
        left: 20px;
        width: 60px;
        height: 60px;
        z-index: 10001;
      }

      .quiz-helper-progress-ring circle {
        fill: none;
        stroke: ${colors.primary};
        stroke-width: 4;
        stroke-linecap: round;
        transform: rotate(-90deg);
        transform-origin: 50% 50%;
        transition: stroke-dasharray 0.3s ease;
      }

      .quiz-helper-progress-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        font-weight: bold;
        color: ${colors.text};
      }

      /* Floating Notification */
      .quiz-helper-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        min-width: 320px;
        background: ${colors.surface};
        color: ${colors.text};
        border-radius: 12px;
        box-shadow: 0 8px 32px ${colors.shadow};
        padding: 16px;
        z-index: 10002;
        transform: translateX(400px);
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        border-left: 4px solid ${colors.primary};
      }

      .quiz-helper-notification.show {
        transform: translateX(0);
      }

      .quiz-helper-notification-header {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
      }

      .quiz-helper-notification-icon {
        width: 20px;
        height: 20px;
        margin-right: 8px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }

      .quiz-helper-notification-title {
        font-weight: 600;
        font-size: 14px;
      }

      .quiz-helper-notification-body {
        font-size: 13px;
        opacity: 0.8;
        line-height: 1.4;
      }

      /* Streak Counter */
      .quiz-helper-streak {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, ${colors.success}, ${colors.primary});
        color: white;
        padding: 12px 16px;
        border-radius: 20px;
        font-weight: bold;
        box-shadow: 0 4px 16px ${colors.shadow};
        transform: scale(0);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .quiz-helper-streak.show {
        transform: scale(1);
      }

      /* Loading Skeleton */
      .quiz-helper-skeleton {
        background: linear-gradient(90deg, ${colors.primaryLight}, ${colors.successLight}, ${colors.primaryLight});
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 8px;
        height: 20px;
        margin: 4px 0;
      }

      @keyframes loading {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      /* Theme transition */
      * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Setup sound effects
   */
  setupSounds() {
    this.sounds = {
      success: this.createBeep(800, 0.1, 'sine'),
      error: this.createBeep(300, 0.2, 'square'),
      notification: this.createBeep([600, 800], 0.1, 'sine')
    };
  }

  /**
   * Create beep sound
   */
  createBeep(frequency, duration, type = 'sine') {
    return () => {
      if (!this.soundEnabled) return;
      
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (Array.isArray(frequency)) {
          // Play sequence of tones
          frequency.forEach((freq, index) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = freq;
            osc.type = type;
            
            const startTime = audioContext.currentTime + (index * duration);
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
          });
        } else {
          oscillator.frequency.value = frequency;
          oscillator.type = type;
          
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration);
        }
      } catch (error) {
        console.log('Audio not supported');
      }
    };
  }

  /**
   * Highlight answer with enhanced visuals and confidence indicator
   */
  highlightAnswer(element, confidence = 1.0, isCorrect = true) {
    // Remove any existing highlighting
    element.classList.remove('quiz-helper-answer-enhanced');
    
    // Add enhanced highlighting
    setTimeout(() => {
      element.classList.add('quiz-helper-answer-enhanced');
      
      // Add confidence indicator
      this.addConfidenceIndicator(element, confidence);
      
      // Add success indicator
      if (isCorrect) {
        this.addSuccessIndicator(element);
        this.sounds.success();
      }
      
      // Add hover effects
      this.setupHoverEffects(element);
      
    }, 50);
  }

  /**
   * Add confidence indicator
   */
  addConfidenceIndicator(element, confidence) {
    const existing = element.querySelector('.quiz-helper-confidence');
    if (existing) existing.remove();
    
    const indicator = document.createElement('div');
    indicator.className = 'quiz-helper-confidence';
    indicator.textContent = Math.round(confidence * 100) + '%';
    
    // Color based on confidence
    if (confidence >= 0.8) {
      indicator.style.background = '#10b981';
    } else if (confidence >= 0.6) {
      indicator.style.background = '#f59e0b';
    } else {
      indicator.style.background = '#ef4444';
    }
    
    element.style.position = 'relative';
    element.appendChild(indicator);
  }

  /**
   * Add success indicator
   */
  addSuccessIndicator(element) {
    const existing = element.querySelector('.quiz-helper-success-indicator');
    if (existing) existing.remove();
    
    const indicator = document.createElement('span');
    indicator.className = 'quiz-helper-success-indicator';
    indicator.innerHTML = '✓ CORRECT';
    
    element.appendChild(indicator);
  }

  /**
   * Setup hover effects for highlighted elements
   */
  setupHoverEffects(element) {
    element.addEventListener('mouseenter', () => {
      element.style.transform = 'translateY(-4px) scale(1.02)';
    });
    
    element.addEventListener('mouseleave', () => {
      element.style.transform = 'translateY(-2px) scale(1)';
    });
  }

  /**
   * Show enhanced notification
   */
  showNotification(title, message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = 'quiz-helper-notification';
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    
    notification.innerHTML = `
      <div class="quiz-helper-notification-header">
        <div class="quiz-helper-notification-icon" style="background: ${colors[type]}">
          ${icons[type]}
        </div>
        <div class="quiz-helper-notification-title">${title}</div>
      </div>
      <div class="quiz-helper-notification-body">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Play sound
    if (type === 'success') {
      this.sounds.success();
    } else if (type === 'error') {
      this.sounds.error();
    } else {
      this.sounds.notification();
    }
    
    // Auto remove
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 400);
    }, duration);
    
    return notification;
  }

  /**
   * Show progress ring
   */
  showProgress(current, total) {
    let progressRing = document.querySelector('.quiz-helper-progress-ring');
    
    if (!progressRing) {
      progressRing = document.createElement('div');
      progressRing.className = 'quiz-helper-progress-ring';
      progressRing.innerHTML = `
        <svg width="60" height="60">
          <circle cx="30" cy="30" r="25" stroke-width="4" stroke-dasharray="0 157" />
        </svg>
        <div class="quiz-helper-progress-text">${current}/${total}</div>
      `;
      document.body.appendChild(progressRing);
    }
    
    const circle = progressRing.querySelector('circle');
    const text = progressRing.querySelector('.quiz-helper-progress-text');
    
    const percentage = (current / total) * 100;
    const circumference = 2 * Math.PI * 25;
    const strokeDasharray = (percentage / 100) * circumference;
    
    circle.style.strokeDasharray = `${strokeDasharray} ${circumference}`;
    text.textContent = `${current}/${total}`;
  }

  /**
   * Show streak counter
   */
  showStreak(count) {
    let streak = document.querySelector('.quiz-helper-streak');
    
    if (!streak) {
      streak = document.createElement('div');
      streak.className = 'quiz-helper-streak';
      document.body.appendChild(streak);
    }
    
    streak.innerHTML = `🔥 ${count} streak!`;
    streak.classList.add('show');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      streak.classList.remove('show');
    }, 3000);
  }

  /**
   * Clear all visual feedback
   */
  clearAll() {
    // Remove highlights
    document.querySelectorAll('.quiz-helper-answer-enhanced').forEach(el => {
      el.classList.remove('quiz-helper-answer-enhanced');
    });
    
    // Remove indicators
    document.querySelectorAll('.quiz-helper-confidence, .quiz-helper-success-indicator').forEach(el => {
      el.remove();
    });
    
    // Remove notifications
    document.querySelectorAll('.quiz-helper-notification').forEach(el => {
      el.remove();
    });
    
    // Remove progress
    const progress = document.querySelector('.quiz-helper-progress-ring');
    if (progress) progress.remove();
  }

  /**
   * Toggle sound effects
   */
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  /**
   * Switch theme
   */
  switchTheme(theme) {
    this.currentTheme = theme;
    this.setupStyles(); // Recreate styles with new theme
  }
}

// Export for use in other scripts
window.VisualFeedbackSystem = VisualFeedbackSystem;
