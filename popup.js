document.addEventListener('DOMContentLoaded', function () {
    const saveButton = document.getElementById('saveButton');
    const status = document.getElementById('status');
    const timeFormatRadios = document.querySelectorAll('input[name="timeFormat"]');
    const colorByDayCheckbox = document.getElementById('colorByDay');
    const dateFormatInput = document.getElementById('dateFormat');
    const stalenessEnabledCheckbox = document.getElementById('stalenessEnabled');
    const stalenessWarnDaysInput = document.getElementById('stalenessWarnDays');
    const stalenessCriticalDaysInput = document.getElementById('stalenessCriticalDays');
    const showStalenessBadgesCheckbox = document.getElementById('showStalenessBadges');
    const highlightStaleRowsCheckbox = document.getElementById('highlightStaleRows');

    const defaults = {
        timeFormat: 'auto',
        colorByDay: false,
        dateFormat: 'auto',
        stalenessEnabled: false,
        stalenessWarnDays: 7,
        stalenessCriticalDays: 14,
        showStalenessBadges: true,
        highlightStaleRows: true
    };

    function parsePositiveInt(value, fallback) {
        const parsed = parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return fallback;
        }
        return parsed;
    }

    function isSupportedGitHubUrl(url) {
        return url.includes('://github.com/')
            || url.includes('://github.wdf.sap.corp/')
            || url.includes('://github.tools.sap.corp/');
    }

    function updateStalenessControlState() {
        const disabled = !stalenessEnabledCheckbox.checked;
        stalenessWarnDaysInput.disabled = disabled;
        stalenessCriticalDaysInput.disabled = disabled;
        showStalenessBadgesCheckbox.disabled = disabled;
        highlightStaleRowsCheckbox.disabled = disabled;
    }

    function markDirty() {
        saveButton.disabled = false;
    }

    chrome.storage.sync.get(Object.keys(defaults), function (result) {
        const settings = {
            ...defaults,
            ...result
        };

        const selectedFormat = settings.timeFormat || defaults.timeFormat;
        const formatRadio = document.getElementById(`format-${selectedFormat}`);
        if (formatRadio) {
            formatRadio.checked = true;
        } else {
            document.getElementById(`format-${defaults.timeFormat}`).checked = true;
        }

        colorByDayCheckbox.checked = Boolean(settings.colorByDay);
        dateFormatInput.value = settings.dateFormat && settings.dateFormat !== 'auto' ? settings.dateFormat : '';
        stalenessEnabledCheckbox.checked = Boolean(settings.stalenessEnabled);
        stalenessWarnDaysInput.value = parsePositiveInt(settings.stalenessWarnDays, defaults.stalenessWarnDays);
        stalenessCriticalDaysInput.value = parsePositiveInt(settings.stalenessCriticalDays, defaults.stalenessCriticalDays);
        showStalenessBadgesCheckbox.checked = Boolean(settings.showStalenessBadges);
        highlightStaleRowsCheckbox.checked = Boolean(settings.highlightStaleRows);
        updateStalenessControlState();
        saveButton.disabled = true;
    });

    saveButton.addEventListener('click', function () {
        const selectedFormat = document.querySelector('input[name="timeFormat"]:checked')?.value || defaults.timeFormat;
        const colorByDay = colorByDayCheckbox.checked;
        const dateFormat = dateFormatInput.value.trim() || 'auto';
        const stalenessWarnDays = parsePositiveInt(stalenessWarnDaysInput.value, defaults.stalenessWarnDays);
        const stalenessCriticalDays = parsePositiveInt(stalenessCriticalDaysInput.value, defaults.stalenessCriticalDays);

        if (dateFormat !== 'auto' && dateFormat.includes('YYYY')) {
            showStatus('Please use YY (2-digit year) instead of YYYY', 'error');
            return;
        }

        if (stalenessCriticalDays <= stalenessWarnDays) {
            showStatus('Critical days must be greater than warning days', 'error');
            return;
        }

        const updatedSettings = {
            timeFormat: selectedFormat,
            colorByDay: colorByDay,
            dateFormat: dateFormat,
            stalenessEnabled: stalenessEnabledCheckbox.checked,
            stalenessWarnDays: stalenessWarnDays,
            stalenessCriticalDays: stalenessCriticalDays,
            showStalenessBadges: showStalenessBadgesCheckbox.checked,
            highlightStaleRows: highlightStaleRowsCheckbox.checked
        };

        chrome.storage.sync.set(updatedSettings, function () {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings', 'error');
                return;
            }

            showStatus('Settings saved successfully!', 'success');
            saveButton.disabled = true;

            chrome.tabs.query({}, function (tabs) {
                tabs.forEach(function (tab) {
                    if (!tab.id || !tab.url || !isSupportedGitHubUrl(tab.url)) {
                        return;
                    }

                    chrome.tabs.sendMessage(tab.id, {
                        action: 'updateSettings',
                        ...updatedSettings
                    });
                });
            });
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

    timeFormatRadios.forEach((radio) => {
        radio.addEventListener('change', markDirty);
    });
    colorByDayCheckbox.addEventListener('change', markDirty);
    dateFormatInput.addEventListener('input', markDirty);
    stalenessEnabledCheckbox.addEventListener('change', function () {
        updateStalenessControlState();
        markDirty();
    });
    stalenessWarnDaysInput.addEventListener('input', markDirty);
    stalenessCriticalDaysInput.addEventListener('input', markDirty);
    showStalenessBadgesCheckbox.addEventListener('change', markDirty);
    highlightStaleRowsCheckbox.addEventListener('change', markDirty);
});
