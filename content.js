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

async function convertToAbsoluteTime() {
  // Wait for at least one relative-time element to exist
  await waitForElement('relative-time');
  
  const relativeTimeElements = document.querySelectorAll('relative-time');

  relativeTimeElements.forEach((element) => {
    const shadowRoot = element.shadowRoot;
    if (!shadowRoot) return;
    
    const title = element.getAttribute('title');
    if (title) {
      const date = new Date(title);
      const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      shadowRoot.textContent = formattedDate;

      const observer = new MutationObserver(() => {
        shadowRoot.textContent = formattedDate;
      });

      observer.observe(shadowRoot, { childList: true, subtree: true });
    }
  });
}

async function handleUrlChange() {
  await convertToAbsoluteTime();
}

// Initial conversion when page loads
handleUrlChange();

const observer = new MutationObserver(mutations => {
  for (let mutation of mutations) {
    if (mutation.addedNodes.length) {
      convertToAbsoluteTime();
      break;
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    handleUrlChange();
  }
}).observe(document, {subtree: true, childList: true});

window.addEventListener('popstate', handleUrlChange);