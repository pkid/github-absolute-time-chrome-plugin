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
  const locale = navigator.language;

  // Format the date part based on locale
  const datePart = date.toLocaleDateString(locale, {
    year: '2-digit',
    month: 'numeric',
    day: 'numeric'
  });

  // Format the time part based on locale
  const timePart = date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: locale.startsWith('en') // Use 12-hour format only for English locales
  });

  return `${datePart}, ${timePart}`;
}

function convertElement(element) {
  // Skip conversion on GitHub Actions pages to prevent flickering
  if (location.pathname.includes('/actions/runs/')) {
    return;
  }
  
  const shadowRoot = element.shadowRoot;
  if (!shadowRoot) return;
  
  const title = element.getAttribute('title');
  if (!title) return;
  
  const formattedDate = formatDate(title);
  
  // Set the content to absolute format
  shadowRoot.textContent = formattedDate;
  
  // Watch for changes to this specific element and revert them
  if (!element._absoluteTimeObserver) {
    element._absoluteTimeObserver = new MutationObserver(() => {
      if (shadowRoot.textContent !== formattedDate) {
        shadowRoot.textContent = formattedDate;
      }
    });
    
    element._absoluteTimeObserver.observe(shadowRoot, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }
}

function convertToAbsoluteTime() {
  // Skip conversion on GitHub Actions pages to prevent flickering
  if (location.pathname.includes('/actions/runs/')) {
    return;
  }
  
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

// Cleanup on page unload
window.addEventListener('unload', () => {
  observer.disconnect();
  urlObserver.disconnect();
});