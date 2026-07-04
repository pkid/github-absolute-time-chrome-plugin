document.addEventListener('DOMContentLoaded', function () {
    const saveButton = document.getElementById('saveButton');
    const status = document.getElementById('status');
    const timeFormatRadios = document.querySelectorAll('input[name="timeFormat"]');
    const colorByDayCheckbox = document.getElementById('colorByDay');
    const dateFormatInput = document.getElementById('dateFormat');
    const hostInput = document.getElementById('hostInput');
    const addHostButton = document.getElementById('addHostButton');
    const hostList = document.getElementById('hostList');

    // Load saved settings
    chrome.storage.sync.get(['timeFormat', 'colorByDay', 'dateFormat'], function (result) {
        const savedFormat = result.timeFormat || 'auto';
        document.getElementById(`format-${savedFormat}`).checked = true;
        colorByDayCheckbox.checked = Boolean(result.colorByDay);
        dateFormatInput.value = result.dateFormat || '';
    });

    // --- Custom GitHub Enterprise host management ---

    // Convert user input into a valid https match pattern (e.g. https://host/*).
    function toMatchPattern(input) {
        const trimmed = (input || '').trim();
        if (!trimmed) return null;
        let url;
        try {
            url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
        } catch (_) {
            return null;
        }
        if (url.protocol !== 'https:' || !url.hostname) return null;
        return `https://${url.hostname}/*`;
    }

    function displayHost(pattern) {
        return pattern.replace(/^https:\/\//, '').replace(/\/\*$/, '');
    }

    function requestHostPermission(pattern) {
        hostInput.value = '';
        chrome.permissions.request({ origins: [pattern] }, function (granted) {
            if (chrome.runtime.lastError || !granted) {
                showStatus('Permission not granted', 'error');
                return;
            }

            chrome.runtime.sendMessage({
                action: 'storeGrantedHost',
                pattern: pattern
            }, function (response) {
                if (chrome.runtime.lastError || !response || !response.ok) {
                    showStatus('Site permission granted, but saving failed', 'error');
                    return;
                }
                showStatus('Site added. Reload it to see changes.', 'success');
                loadHosts();
            });
        });
    }

    function renderHosts(hosts) {
        hostList.innerHTML = '';
        hosts.forEach(function (host) {
            const pattern = host.pattern;
            const li = document.createElement('li');
            const label = document.createElement('span');
            label.className = 'host-label';
            label.textContent = displayHost(pattern);
            label.title = pattern;

            const actions = document.createElement('div');
            actions.className = 'host-actions';

            if (!host.granted) {
                const grantBtn = document.createElement('button');
                grantBtn.className = 'grant-host-button';
                grantBtn.type = 'button';
                grantBtn.textContent = 'Grant access';
                grantBtn.title = 'Grant access on this device';
                grantBtn.addEventListener('click', function () {
                    requestHostPermission(pattern);
                });
                actions.appendChild(grantBtn);
            }

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-host-button';
            removeBtn.type = 'button';
            removeBtn.textContent = '\u00d7';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', function () {
                removeHost(pattern);
            });
            actions.appendChild(removeBtn);

            li.appendChild(label);
            li.appendChild(actions);
            hostList.appendChild(li);
        });
    }

    function loadHosts() {
        chrome.runtime.sendMessage({ action: 'getCustomHostStatuses' }, function (response) {
            if (chrome.runtime.lastError || !response || !response.ok) {
                chrome.storage.sync.get(['customHosts'], function (result) {
                    const hosts = (result.customHosts || []).map(function (pattern) {
                        return { pattern: pattern, granted: false };
                    });
                    renderHosts(hosts);
                });
                return;
            }
            renderHosts(response.hosts || []);
        });
    }

    function addHost() {
        const pattern = toMatchPattern(hostInput.value);
        if (!pattern) {
            showStatus('Enter a valid https:// URL', 'error');
            return;
        }

        // Keep this request directly in the click handler path; Chrome requires
        // optional permission prompts to be triggered by a user gesture.
        requestHostPermission(pattern);
    }

    function removeHost(pattern) {
        chrome.runtime.sendMessage({
            action: 'removeCustomHost',
            pattern: pattern
        }, function (response) {
            if (chrome.runtime.lastError || !response || !response.ok) {
                showStatus('Could not remove site', 'error');
                return;
            }
            showStatus('Site removed', 'success');
            loadHosts();
        });
    }

    // Keep the list in sync when the background worker updates stored hosts.
    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === 'sync' && changes.customHosts) {
            loadHosts();
        }
    });

    addHostButton.addEventListener('click', addHost);
    hostInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            addHost();
        }
    });

    loadHosts();

    // Handle save button click
    saveButton.addEventListener('click', function () {
        const selectedFormat = document.querySelector('input[name="timeFormat"]:checked').value;
        const colorByDay = colorByDayCheckbox.checked;
        const dateFormat = dateFormatInput.value.trim() || 'auto';

        // Save to chrome storage
        chrome.storage.sync.set({
            timeFormat: selectedFormat,
            colorByDay: colorByDay,
            dateFormat: dateFormat
        }, function () {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings', 'error');
            } else {
                showStatus('Settings saved successfully!', 'success');

                // Notify all GitHub tabs (default + custom hosts) to update live.
                chrome.storage.sync.get(['customHosts'], function (result) {
                    const urlPatterns = ['*://github.com/*'].concat(result.customHosts || []);
                    chrome.tabs.query({ url: urlPatterns }, function (tabs) {
                        tabs.forEach(function (tab) {
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'updateSettings',
                                timeFormat: selectedFormat,
                                colorByDay: colorByDay,
                                dateFormat: dateFormat
                            }, function () {
                                void chrome.runtime.lastError;
                            });
                        });
                    });
                });
            }
        });
    });

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';

        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }

    // Handle radio button changes
    timeFormatRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            saveButton.disabled = false;
        });
    });

    colorByDayCheckbox.addEventListener('change', function () {
        saveButton.disabled = false;
    });

    dateFormatInput.addEventListener('input', function () {
        saveButton.disabled = false;
    });
});
