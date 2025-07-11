function waitForElement(selector) {
  return new Promise(resolve => {
    if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
            observer.disconnect();
            resolve(document.querySelector(selector));
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
  });
}

// Add throttling utility
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Debounce utility to prevent excessive calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Keep track of processed elements to avoid duplicates
const processedElements = new WeakSet();

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(navigator.language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function convertElement(element) {
  if (processedElements.has(element)) return;
  
  const shadowRoot = element.shadowRoot;
  if (!shadowRoot) return;
  
  const title = element.getAttribute('title');
  if (!title) return;
  
  const formattedDate = formatDate(title);
  shadowRoot.textContent = formattedDate;
  processedElements.add(element);
}

function convertToAbsoluteTime() {
  const relativeTimeElements = document.querySelectorAll('relative-time');
  relativeTimeElements.forEach(convertElement);
}

// Debounced version of the conversion function
const debouncedConvert = debounce(convertToAbsoluteTime, 100);

// Main observer for DOM changes
const observer = new MutationObserver((mutations) => {
  // Only process if there are actual changes
  if (mutations.some(mutation => mutation.addedNodes.length > 0)) {
    debouncedConvert();
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Handle URL changes
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    debouncedConvert();
  }
});

urlObserver.observe(document, { subtree: true, childList: true });

// Initial conversion
convertToAbsoluteTime();

// Handle popstate (back/forward navigation)
window.addEventListener('popstate', debouncedConvert);

// Cleanup on page unload
window.addEventListener('unload', () => {
  observer.disconnect();
  urlObserver.disconnect();
});