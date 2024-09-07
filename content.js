function convertToAbsoluteTime() {
  console.log("You are using GitHub Absolute Time plugin. If not needed, please disable it.");
  const relativeTimeElements = document.querySelectorAll('relative-time');

  relativeTimeElements.forEach((element) => {
    const shadowRoot = element.shadowRoot;
    if (!shadowRoot) return;
    
    const title = element.getAttribute('title');
    if (title) {
      const date = new Date(title);
      const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      shadowRoot.textContent = formattedDate;
    } else {
      console.log("No title attribute found");
    }
  });
}

function handleUrlChange() {
  console.log("URL changed, waiting for content to load...");
  // Wait a short time for content to load before converting
  setTimeout(convertToAbsoluteTime, 1000);
}

// Run the function when the page loads
convertToAbsoluteTime();

// Use a MutationObserver to handle dynamically loaded content
const observer = new MutationObserver(mutations => {
  for (let mutation of mutations) {
    if (mutation.addedNodes.length) {
      convertToAbsoluteTime();
      break;
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Listen for URL changes
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    handleUrlChange();
  }
}).observe(document, {subtree: true, childList: true});

// Listen for popstate events (back/forward navigation)
window.addEventListener('popstate', handleUrlChange);

// Add a periodic check to catch any missed conversions
setInterval(convertToAbsoluteTime, 5000);

// Listen for manual trigger from extension icon click
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "convertTime") {
    convertToAbsoluteTime();
  }
});