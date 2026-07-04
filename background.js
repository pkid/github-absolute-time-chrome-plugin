// Registers the content script on user-configured GitHub Enterprise hosts.
//
// The default hosts (github.com and the baked-in SAP hosts) stay in the static
// `content_scripts` entry in the manifest, so existing users are unaffected.
// Only custom hosts added through the popup are handled here, gated behind an
// optional host permission the user explicitly grants.

const STORAGE_KEY = 'customHosts';
const DYNAMIC_SCRIPT_ID = 'custom-github-hosts';

// Keep only hosts the user has actually granted permission for. A host can be
// in storage but have its permission revoked from chrome://extensions.
async function grantedHosts() {
  const { [STORAGE_KEY]: customHosts = [] } = await chrome.storage.sync.get(STORAGE_KEY);
  const granted = [];
  for (const pattern of customHosts) {
    try {
      if (await chrome.permissions.contains({ origins: [pattern] })) {
        granted.push(pattern);
      }
    } catch (_) {
      // Ignore invalid patterns.
    }
  }
  return granted;
}

async function syncRegistrations() {
  const matches = await grantedHosts();

  let existing = [];
  try {
    existing = await chrome.scripting.getRegisteredContentScripts({ ids: [DYNAMIC_SCRIPT_ID] });
  } catch (_) {
    existing = [];
  }

  if (matches.length === 0) {
    if (existing.length > 0) {
      await chrome.scripting.unregisterContentScripts({ ids: [DYNAMIC_SCRIPT_ID] });
    }
    return;
  }

  const script = {
    id: DYNAMIC_SCRIPT_ID,
    js: ['content.js'],
    matches,
    runAt: 'document_idle'
  };

  if (existing.length > 0) {
    await chrome.scripting.updateContentScripts([script]);
  } else {
    await chrome.scripting.registerContentScripts([script]);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  syncRegistrations();
});

chrome.runtime.onStartup.addListener(() => {
  syncRegistrations();
});

// Re-sync when the user revokes an optional permission from chrome://extensions.
chrome.permissions.onRemoved.addListener(() => {
  syncRegistrations();
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request && request.action === 'syncCustomHosts') {
    syncRegistrations()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // Keep the message channel open for the async response.
  }
});
