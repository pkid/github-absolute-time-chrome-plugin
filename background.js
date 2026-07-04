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

// Recover hosts that were granted but never recorded in storage (e.g. granted
// by an older version, or when the popup closed before its callback ran). Only
// optional host permissions the user granted show up here; the default static
// content-script hosts are not returned by getAll().
async function reconcileFromGrantedPermissions() {
  let all;
  try {
    all = await chrome.permissions.getAll();
  } catch (_) {
    return;
  }
  const origins = customHostOrigins(all);
  if (origins.length === 0) return;

  const { [STORAGE_KEY]: customHosts = [] } = await chrome.storage.sync.get(STORAGE_KEY);
  const merged = Array.from(new Set(customHosts.concat(origins)));
  if (merged.length !== customHosts.length) {
    await chrome.storage.sync.set({ [STORAGE_KEY]: merged });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await reconcileFromGrantedPermissions();
  await syncRegistrations();
});

chrome.runtime.onStartup.addListener(async () => {
  await reconcileFromGrantedPermissions();
  await syncRegistrations();
});

// Only track https host patterns the user grants for custom hosts. This
// excludes non-host optional permissions and keeps the stored list clean.
function customHostOrigins(permissions) {
  return ((permissions && permissions.origins) || []).filter((origin) =>
    /^https:\/\//.test(origin)
  );
}

// Persist granted hosts here rather than in the popup. Requesting a permission
// from the popup can close it before its callback runs (notably on macOS), so
// the popup can't be trusted to save the host. onAdded always fires.
chrome.permissions.onAdded.addListener(async (permissions) => {
  const origins = customHostOrigins(permissions);
  if (origins.length === 0) return;

  const { [STORAGE_KEY]: customHosts = [] } = await chrome.storage.sync.get(STORAGE_KEY);
  const merged = Array.from(new Set(customHosts.concat(origins)));
  await chrome.storage.sync.set({ [STORAGE_KEY]: merged });
  await syncRegistrations();
});

// Keep storage in sync when a permission is revoked (from the popup or from
// chrome://extensions) and re-register accordingly.
chrome.permissions.onRemoved.addListener(async (permissions) => {
  const origins = customHostOrigins(permissions);
  if (origins.length > 0) {
    const { [STORAGE_KEY]: customHosts = [] } = await chrome.storage.sync.get(STORAGE_KEY);
    const filtered = customHosts.filter((host) => !origins.includes(host));
    await chrome.storage.sync.set({ [STORAGE_KEY]: filtered });
  }
  await syncRegistrations();
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request && request.action === 'syncCustomHosts') {
    syncRegistrations()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // Keep the message channel open for the async response.
  }
});
