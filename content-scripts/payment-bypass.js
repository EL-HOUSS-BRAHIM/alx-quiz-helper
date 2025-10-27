/**
 * ALX Payment Wall Bypass - Integrated Module
 * Automatically removes payment walls and restores interactivity
 */

(function() {
  'use strict';
  
  console.log('🔓 ALX Payment Wall Bypass: Active');
  
  let bypassCount = 0;
  
  function removePaymentWall() {
    let removedCount = 0;
    
    // 1. Remove dialog element
    const dialog = document.querySelector('dialog');
    if (dialog) {
      const text = dialog.textContent || '';
      if (text.includes('Payment') || text.includes('payment')) {
        dialog.remove();
        removedCount++;
        console.log('🔓 Bypass: Removed payment dialog');
      }
    }
    
    // 2. Remove the specific SDK blocking overlay
    const sdkOverlay = document.querySelector('div.sdk');
    if (sdkOverlay) {
      sdkOverlay.remove();
      removedCount++;
      console.log('🔓 Bypass: Removed .sdk overlay');
    }
    
    // 3. Remove payment-related elements
    const paymentSelectors = [
      '[class*="payment"]',
      '[class*="Payment"]', 
      '[id*="payment"]',
      '[id*="Payment"]',
      '[class*="modal"]',
      '[role="dialog"]',
      '[aria-modal="true"]'
    ];
    
    paymentSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent || '';
          if (text.includes('Payment required') || 
              text.includes('Make a payment') || 
              text.includes('ALX Access payment') ||
              text.includes('payment plan')) {
            el.remove();
            removedCount++;
          }
        });
      } catch (e) {
        // Silent fail
      }
    });
    
    // 4. Remove high z-index payment overlays
    try {
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        try {
          const styles = window.getComputedStyle(el);
          const zIndex = styles.zIndex;
          const text = el.textContent || '';
          const hasPaymentText = text.includes('Payment required') || 
                                 text.includes('Make a payment') ||
                                 text.includes('payment plan');
          
          if (zIndex && parseInt(zIndex) > 100 && hasPaymentText) {
            if (styles.position === 'fixed' || styles.position === 'absolute') {
              el.remove();
              removedCount++;
            }
          }
        } catch (e) {
          // Element might be removed during iteration
        }
      });
    } catch (e) {
      // Silent fail
    }
    
    // 5. Remove blocking overlays
    try {
      const allDivs = document.querySelectorAll('div, section, aside');
      allDivs.forEach(el => {
        try {
          const styles = window.getComputedStyle(el);
          const text = el.textContent || '';
          
          const hasPaymentText = text.includes('Payment required') || 
                                 text.includes('Make a payment') ||
                                 text.includes('payment plan') ||
                                 text.includes('ALX Access payment');
          
          if ((styles.position === 'fixed' || styles.position === 'absolute') && hasPaymentText) {
            const rect = el.getBoundingClientRect();
            const isLarge = rect.width >= window.innerWidth * 0.5 && rect.height >= window.innerHeight * 0.5;
            
            if (isLarge) {
              el.remove();
              removedCount++;
            }
          }
        } catch (e) {
          // Element might be removed during iteration
        }
      });
    } catch (e) {
      // Silent fail
    }
    
    // 6. Restore interactivity
    if (document.body) {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
      document.body.style.height = 'auto';
    }
    
    const root = document.documentElement;
    if (root) {
      root.style.pointerEvents = 'auto';
      root.style.overflow = 'auto';
    }
    
    // Fix pointer-events on blocked elements
    document.querySelectorAll('[style*="pointer-events"]').forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.pointerEvents === 'none') {
        const isNav = el.tagName === 'NAV' || 
                     el.tagName === 'HEADER' || 
                     el.closest('nav') !== null || 
                     el.closest('header') !== null;
        
        if (!isNav) {
          el.style.pointerEvents = 'auto';
        }
      }
    });
    
    // Check for invisible blocking overlays
    try {
      const mainContent = document.querySelector('main, article, [role="main"]');
      if (mainContent) {
        const rect = mainContent.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const topElement = document.elementFromPoint(centerX, centerY);
        
        if (topElement && topElement !== mainContent && !mainContent.contains(topElement)) {
          let currentEl = topElement;
          while (currentEl && currentEl !== document.body) {
            const styles = window.getComputedStyle(currentEl);
            const text = currentEl.textContent || '';
            
            const isPositioned = styles.position === 'fixed' || styles.position === 'absolute';
            const isLikelyNav = currentEl.tagName === 'NAV' || 
                               currentEl.tagName === 'HEADER' ||
                               styles.top === '0px' && currentEl.offsetHeight < 100;
            
            if (isPositioned && !isLikelyNav && text.includes('Payment')) {
              currentEl.remove();
              removedCount++;
              break;
            }
            currentEl = currentEl.parentElement;
          }
        }
      }
    } catch (e) {
      // Silent fail
    }
    
    if (removedCount > 0) {
      bypassCount += removedCount;
      console.log(`🔓 Bypass: Removed ${removedCount} payment elements (Total: ${bypassCount})`);
      
      // Notify popup of bypass activity
      chrome.runtime.sendMessage({
        action: 'bypassActivity',
        count: bypassCount
      }).catch(() => {});
    }
    
    return removedCount;
  }
  
  // Run immediately
  removePaymentWall();
  
  // Run at intervals to catch dynamic content
  setTimeout(() => removePaymentWall(), 500);
  setTimeout(() => removePaymentWall(), 1000);
  setTimeout(() => removePaymentWall(), 2000);
  setTimeout(() => removePaymentWall(), 3000);
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'triggerBypass') {
      console.log('🔓 Bypass: Manual trigger activated');
      const removed = removePaymentWall();
      sendResponse({ 
        success: true, 
        removed: removed,
        totalBypass: bypassCount
      });
    } else if (request.action === 'getBypassStatus') {
      sendResponse({
        success: true,
        bypassCount: bypassCount,
        isActive: true
      });
    }
    return true;
  });
  
  // Watch for DOM changes
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const text = node.textContent || '';
          if (text.includes('Payment required') || 
              text.includes('Make a payment') ||
              node.tagName === 'DIALOG') {
            shouldCheck = true;
          }
        }
      });
    });
    
    if (shouldCheck) {
      console.log('🔓 Bypass: Payment wall detected, removing...');
      removePaymentWall();
    }
  });
  
  // Start observing
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  console.log('🔓 Bypass: Monitoring active ✓');
  
})();
