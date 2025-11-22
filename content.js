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
  return function (...args) {
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

// Default settings
let timeFormatSetting = 'auto';
let colorByDaySetting = false;
let dateFormatSetting = 'auto';

// Load settings from storage
chrome.storage.sync.get(['timeFormat', 'colorByDay', 'dateFormat'], function (result) {
  timeFormatSetting = result.timeFormat || 'auto';
  colorByDaySetting = Boolean(result.colorByDay);
  dateFormatSetting = result.dateFormat !== undefined ? result.dateFormat : 'auto';
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function (request) {
  if (request.action === 'updateSettings') {
    if (typeof request.timeFormat !== 'undefined') {
      timeFormatSetting = request.timeFormat;
    }
    if (typeof request.colorByDay !== 'undefined') {
      colorByDaySetting = Boolean(request.colorByDay);
    }
    if (typeof request.dateFormat !== 'undefined') {
      dateFormatSetting = request.dateFormat;
    }
    convertToAbsoluteTime();
  }
});

// Color palette for day-grouping (accessible, distinct)
const dayColors = [
  '#1f6feb', // blue
  '#2da44e', // green
  '#bf3989', // magenta
  '#9a6700', // mustard
  '#8957e5', // purple
  '#bc4c00', // orange
  '#0969da'  // dark blue
];

function getDayKey(dateString) {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getColorForDay(dayKey) {
  // Simple hash for stable color assignment
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) {
    hash = ((hash << 5) - hash) + dayKey.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % dayColors.length;
  return dayColors[idx];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const locale = navigator.language;

  // Format the date part based on user preference
  let datePart;
  if (!dateFormatSetting || dateFormatSetting === 'auto') {
    // Auto mode - use locale-based formatting
    datePart = date.toLocaleDateString(locale, {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric'
    });
  } else {
    // Custom format - parse the user's pattern
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Replace format tokens with actual values
    datePart = dateFormatSetting
      .replace(/YYYY/g, year)
      .replace(/YY/g, String(year).slice(-2))
      .replace(/MM/g, String(month).padStart(2, '0'))
      .replace(/M/g, month)
      .replace(/DD/g, String(day).padStart(2, '0'))
      .replace(/D/g, day);
  }

  // Determine hour12 setting based on user preference
  let hour12;
  if (timeFormatSetting === '12h') {
    hour12 = true;
  } else if (timeFormatSetting === '24h') {
    hour12 = false;
  } else {
    // Auto mode - use locale-based detection
    hour12 = locale.startsWith('en');
  }

  // Format the time part based on user preference
  let timePart;
  if (hour12) {
    // Manually format 12-hour time to ensure NO space before AM/PM
    const hours = date.getHours() % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    timePart = `${hours}:${minutes}${ampm}`;
  } else {
    timePart = date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
  }

  return `${datePart} ${timePart}`;
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

  // Apply optional day color
  if (colorByDaySetting) {
    const dayKey = getDayKey(title);
    const color = getColorForDay(dayKey);
    element.style.color = color;
  } else {
    element.style.color = '';
  }

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