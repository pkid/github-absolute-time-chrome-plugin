const SETTINGS_DEFAULTS = {
  timeFormat: 'auto',
  colorByDay: false,
  dateFormat: 'auto',
  stalenessEnabled: false,
  stalenessWarnDays: 7,
  stalenessCriticalDays: 14,
  showStalenessBadges: true,
  highlightStaleRows: true
};

const STALE_ROW_WARNING_CLASS = 'gh-abs-row-stale-warning';
const STALE_ROW_CRITICAL_CLASS = 'gh-abs-row-stale-critical';
const STALE_BADGE_WARNING_CLASS = 'gh-abs-badge-warning';
const STALE_BADGE_CRITICAL_CLASS = 'gh-abs-badge-critical';
const STALENESS_ALLOWED_ROOT_ROUTES = new Set(['pulls', 'issues']);
const STALENESS_ALLOWED_REPO_SECTIONS = new Set(['pulls', 'pull', 'issues']);

const dayColors = [
  '#1f6feb',
  '#2da44e',
  '#bf3989',
  '#9a6700',
  '#8957e5',
  '#bc4c00',
  '#0969da'
];

let settings = { ...SETTINGS_DEFAULTS };

function shouldSkipPage() {
  return location.pathname.includes('/actions/runs/');
}

function shouldShowStalenessOnCurrentPage() {
  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  if (segments.length === 1) {
    return STALENESS_ALLOWED_ROOT_ROUTES.has(segments[0]);
  }

  if (segments.length >= 3) {
    const section = segments[2];
    return STALENESS_ALLOWED_REPO_SECTIONS.has(section);
  }

  return false;
}

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function normalizeSettings(partialSettings) {
  return {
    timeFormat: partialSettings.timeFormat || SETTINGS_DEFAULTS.timeFormat,
    colorByDay: Boolean(partialSettings.colorByDay),
    dateFormat: partialSettings.dateFormat !== undefined ? partialSettings.dateFormat : SETTINGS_DEFAULTS.dateFormat,
    stalenessEnabled: Boolean(partialSettings.stalenessEnabled),
    stalenessWarnDays: parsePositiveInt(partialSettings.stalenessWarnDays, SETTINGS_DEFAULTS.stalenessWarnDays),
    stalenessCriticalDays: parsePositiveInt(partialSettings.stalenessCriticalDays, SETTINGS_DEFAULTS.stalenessCriticalDays),
    showStalenessBadges: Boolean(partialSettings.showStalenessBadges),
    highlightStaleRows: Boolean(partialSettings.highlightStaleRows)
  };
}

function applySettings(partialSettings, refresh) {
  settings = normalizeSettings({
    ...settings,
    ...partialSettings
  });

  if (settings.stalenessCriticalDays <= settings.stalenessWarnDays) {
    settings.stalenessCriticalDays = settings.stalenessWarnDays + 1;
  }

  if (refresh) {
    convertToAbsoluteTime();
  }
}

function loadSettings() {
  chrome.storage.sync.get(Object.keys(SETTINGS_DEFAULTS), function (storedSettings) {
    applySettings(storedSettings || {}, true);
  });
}

chrome.runtime.onMessage.addListener(function (request) {
  if (request.action === 'updateSettings') {
    applySettings(request, true);
    return;
  }

  if (request.action === 'updateTimeFormat') {
    applySettings({ timeFormat: request.timeFormat }, true);
  }
});

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

function ensureStalenessStyles() {
  if (document.getElementById('gh-absolute-time-staleness-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'gh-absolute-time-staleness-styles';
  style.textContent = `
    .gh-abs-stale-badge {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 6px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.5;
      vertical-align: middle;
      white-space: nowrap;
    }

    .gh-abs-stale-badge.${STALE_BADGE_WARNING_CLASS} {
      background: #fff8c5;
      border-color: #d4a72c;
      color: #7d4e00;
    }

    .gh-abs-stale-badge.${STALE_BADGE_CRITICAL_CLASS} {
      background: #ffebe9;
      border-color: #cf222e66;
      color: #cf222e;
    }

    .${STALE_ROW_WARNING_CLASS} {
      box-shadow: inset 3px 0 0 rgba(157, 103, 0, 0.85);
      background-image: linear-gradient(to right, rgba(255, 226, 155, 0.22), rgba(255, 226, 155, 0));
    }

    .${STALE_ROW_CRITICAL_CLASS} {
      box-shadow: inset 3px 0 0 rgba(207, 34, 46, 0.9);
      background-image: linear-gradient(to right, rgba(255, 192, 188, 0.26), rgba(255, 192, 188, 0));
    }
  `;
  document.head.appendChild(style);
}

function getDayKey(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getColorForDay(dayKey) {
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) {
    hash = ((hash << 5) - hash) + dayKey.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % dayColors.length;
  return dayColors[index];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const locale = navigator.language;

  let datePart;
  if (!settings.dateFormat || settings.dateFormat === 'auto') {
    datePart = date.toLocaleDateString(locale, {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric'
    });
  } else {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    datePart = settings.dateFormat
      .replace(/YYYY/g, year)
      .replace(/YY/g, String(year).slice(-2))
      .replace(/MM/g, String(month).padStart(2, '0'))
      .replace(/M/g, month)
      .replace(/DD/g, String(day).padStart(2, '0'))
      .replace(/D/g, day);
  }

  let hour12;
  if (settings.timeFormat === '12h') {
    hour12 = true;
  } else if (settings.timeFormat === '24h') {
    hour12 = false;
  } else {
    hour12 = locale.startsWith('en');
  }

  let timePart;
  if (hour12) {
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

function getAgeDays(dateString) {
  const date = new Date(dateString);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const ageMs = Date.now() - timestamp;
  if (!Number.isFinite(ageMs)) {
    return null;
  }

  return Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
}

function getStalenessLevel(ageDays) {
  if (ageDays >= settings.stalenessCriticalDays) {
    return 'critical';
  }
  if (ageDays >= settings.stalenessWarnDays) {
    return 'warning';
  }
  return 'fresh';
}

function getStaleRowTarget(element) {
  return element.closest('[data-testid="issue-row"], div[js-issue-row], li.Box-row, div.Box-row, tr.js-navigation-item, tr');
}

function clearRowHighlight(rowTarget) {
  if (!rowTarget) {
    return;
  }
  rowTarget.classList.remove(STALE_ROW_WARNING_CLASS, STALE_ROW_CRITICAL_CLASS);
}

function applyRowHighlight(rowTarget, level) {
  if (!rowTarget) {
    return;
  }

  clearRowHighlight(rowTarget);
  if (!settings.highlightStaleRows) {
    return;
  }

  if (level === 'warning') {
    rowTarget.classList.add(STALE_ROW_WARNING_CLASS);
  } else if (level === 'critical') {
    rowTarget.classList.add(STALE_ROW_CRITICAL_CLASS);
  }
}

function removeStalenessBadge(element) {
  let sibling = element.nextElementSibling;
  while (sibling && sibling.getAttribute('data-gh-abs-stale-badge') === 'true') {
    const next = sibling.nextElementSibling;
    sibling.remove();
    sibling = next;
  }
  element._stalenessBadge = null;
}

function getOrCreateStalenessBadge(element) {
  const connectedBadge = element._stalenessBadge;
  if (connectedBadge && connectedBadge.isConnected) {
    return connectedBadge;
  }

  const adjacentBadges = [];
  let sibling = element.nextElementSibling;
  while (sibling && sibling.getAttribute('data-gh-abs-stale-badge') === 'true') {
    adjacentBadges.push(sibling);
    sibling = sibling.nextElementSibling;
  }

  if (adjacentBadges.length > 0) {
    const badge = adjacentBadges[0];
    for (let i = 1; i < adjacentBadges.length; i++) {
      adjacentBadges[i].remove();
    }
    element._stalenessBadge = badge;
    return badge;
  }

  const badge = document.createElement('span');
  badge.className = 'gh-abs-stale-badge';
  badge.setAttribute('data-gh-abs-stale-badge', 'true');
  element.insertAdjacentElement('afterend', badge);
  element._stalenessBadge = badge;
  return badge;
}

function applyStalenessBadge(element, level, ageDays) {
  if (!settings.showStalenessBadges || level === 'fresh') {
    removeStalenessBadge(element);
    return;
  }

  const badge = getOrCreateStalenessBadge(element);

  badge.classList.remove(STALE_BADGE_WARNING_CLASS, STALE_BADGE_CRITICAL_CLASS);
  if (level === 'warning') {
    badge.classList.add(STALE_BADGE_WARNING_CLASS);
    badge.textContent = `Aging ${ageDays}d`;
  } else if (level === 'critical') {
    badge.classList.add(STALE_BADGE_CRITICAL_CLASS);
    badge.textContent = `Stale ${ageDays}d`;
  }
}

function clearStalenessDecorations(element) {
  removeStalenessBadge(element);
  clearRowHighlight(getStaleRowTarget(element));
}

function clearAllStalenessArtifacts() {
  document.querySelectorAll('[data-gh-abs-stale-badge="true"]').forEach((badge) => {
    badge.remove();
  });

  document.querySelectorAll(`.${STALE_ROW_WARNING_CLASS}, .${STALE_ROW_CRITICAL_CLASS}`).forEach((row) => {
    row.classList.remove(STALE_ROW_WARNING_CLASS, STALE_ROW_CRITICAL_CLASS);
  });
}

function applyStalenessDecorations(element, title) {
  if (!settings.stalenessEnabled || !shouldShowStalenessOnCurrentPage()) {
    clearStalenessDecorations(element);
    return;
  }

  const ageDays = getAgeDays(title);
  if (ageDays === null) {
    clearStalenessDecorations(element);
    return;
  }

  const level = getStalenessLevel(ageDays);
  applyStalenessBadge(element, level, ageDays);
  applyRowHighlight(getStaleRowTarget(element), level);
}

function getOutputNode(element) {
  return element.shadowRoot || element;
}

function setupElementObserver(element, outputNode) {
  if (element._absoluteTimeObserver) {
    return;
  }

  element._absoluteTimeObserver = new MutationObserver(() => {
    const expectedText = element.getAttribute('data-gh-abs-formatted-time');
    if (!expectedText) {
      return;
    }

    if (outputNode.textContent !== expectedText) {
      outputNode.textContent = expectedText;
    }
  });

  element._absoluteTimeObserver.observe(outputNode, {
    childList: true,
    characterData: true,
    subtree: true
  });
}

function convertElement(element) {
  if (shouldSkipPage()) {
    return;
  }

  const title = element.getAttribute('title');
  if (!title) {
    clearStalenessDecorations(element);
    return;
  }

  const outputNode = getOutputNode(element);
  const formattedDate = formatDate(title);
  element.setAttribute('data-gh-abs-formatted-time', formattedDate);

  if (outputNode.textContent !== formattedDate) {
    outputNode.textContent = formattedDate;
  }

  if (settings.colorByDay) {
    const dayKey = getDayKey(title);
    element.style.color = getColorForDay(dayKey);
  } else {
    element.style.color = '';
  }

  setupElementObserver(element, outputNode);
  applyStalenessDecorations(element, title);
}

function convertToAbsoluteTime() {
  if (shouldSkipPage()) {
    return;
  }

  if (!settings.stalenessEnabled || !shouldShowStalenessOnCurrentPage()) {
    clearAllStalenessArtifacts();
  }

  const relativeTimeElements = document.querySelectorAll('relative-time');
  relativeTimeElements.forEach(convertElement);
}

const debouncedConvert = debounce(convertToAbsoluteTime, 100);

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
    debouncedConvert();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    debouncedConvert();
  }
});

urlObserver.observe(document, { subtree: true, childList: true });

window.addEventListener('unload', () => {
  observer.disconnect();
  urlObserver.disconnect();
});

ensureStalenessStyles();
loadSettings();
