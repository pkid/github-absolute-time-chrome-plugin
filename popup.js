document.addEventListener('DOMContentLoaded', function () {
    const saveButton = document.getElementById('saveButton');
    const status = document.getElementById('status');
    const timeFormatRadios = document.querySelectorAll('input[name="timeFormat"]');
    const colorByDayCheckbox = document.getElementById('colorByDay');
    const dateFormatInput = document.getElementById('dateFormat');

    // Load saved settings
    chrome.storage.sync.get(['timeFormat', 'colorByDay', 'dateFormat'], function (result) {
        const savedFormat = result.timeFormat || 'auto';
        document.getElementById(`format-${savedFormat}`).checked = true;
        colorByDayCheckbox.checked = Boolean(result.colorByDay);
        dateFormatInput.value = result.dateFormat || '';
    });

    // Handle save button click
    saveButton.addEventListener('click', function () {
        const selectedFormat = document.querySelector('input[name="timeFormat"]:checked').value;
        const colorByDay = colorByDayCheckbox.checked;
        const dateFormat = dateFormatInput.value.trim() || 'auto';

        // Validate that YYYY is not used (only YY is allowed)
        if (dateFormat !== 'auto' && dateFormat.includes('YYYY')) {
            showStatus('Please use YY (2-digit year) instead of YYYY', 'error');
            return;
        }

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

                // Notify ALL GitHub tabs to update (not just active, since popup is open)
                chrome.tabs.query({ url: '*://github.com/*' }, function (tabs) {
                    tabs.forEach(function (tab) {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'updateSettings',
                            timeFormat: selectedFormat,
                            colorByDay: colorByDay,
                            dateFormat: dateFormat
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
