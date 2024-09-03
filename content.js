function convertToAbsoluteTime() {
    console.log("You are using GitHub Absolute Time plugin. If not needed, please disable it.");
    const relativeTimeElements = document.querySelectorAll('relative-time');
  
    relativeTimeElements.forEach((element, index) => {
      const shadowRoot = element.shadowRoot;
  
      if (!shadowRoot) {
        return;
      }
    
      const title = element.getAttribute('title');
      if (title) {
        shadowRoot.textContent = title;
      } else {
        console.log("No title attribute found");
      }
      });
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