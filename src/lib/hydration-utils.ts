import { useEffect } from 'react';

/**
 * Utility functions to help with React hydration issues
 */

/**
 * Checks if a browser extension has modified the HTML element
 * and removes attributes that might cause hydration mismatches
 */
export function cleanHtmlElementForHydration() {
  if (typeof window !== 'undefined' && document.documentElement) {
    // Remove attributes that are commonly added by browser extensions
    const problematicAttributes = [
      'bbai-tooltip-injected',
      'data-extension-installed',
      'data-browser-extension'
    ];
    
    problematicAttributes.forEach(attr => {
      if (document.documentElement.hasAttribute(attr)) {
        document.documentElement.removeAttribute(attr);
      }
    });
  }
}

/**
 * A hook that should be used in your root layout to handle hydration issues
 * caused by browser extensions
 */
export function useBrowserExtensionHydrationFix() {
  useEffect(() => {
    // Clean up any attributes added by browser extensions
    cleanHtmlElementForHydration();
    
    // Set up a MutationObserver to watch for attributes added by extensions
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target === document.documentElement) {
          // If the attribute was added by a browser extension, remove it
          if (mutation.attributeName && 
              mutation.attributeName.includes('tooltip') && 
              mutation.attributeName.includes('bbai')) {
            document.documentElement.removeAttribute(mutation.attributeName);
          }
        }
      });
    });
    
    // Start observing
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['bbai-tooltip-injected']
    });
    
    // Clean up observer on unmount
    return () => {
      observer.disconnect();
    };
  }, []);
}